// ---------- Cliente API ----------
const API_URL = (window.INVENTORY_API_URL || 'http://localhost:3000/api').replace(/\/+$/, '');
const TOKEN_KEY = 'inventoryCloudToken';

function getToken() { return sessionStorage.getItem(TOKEN_KEY); }
function isLoggedIn() { return !!getToken(); }

// Helper genérico para llamar a la API. Adjunta el token, parsea JSON
// y lanza un Error con el mensaje del servidor si la respuesta falla.
async function api(path, { method = 'GET', body } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté disponible.');
  }

  let data = null;
  try { data = await res.json(); } catch { /* respuesta sin cuerpo */ }

  if (res.status === 401) {
    handleUnauthorized();
    throw new Error((data && data.error) || 'Sesión expirada. Inicia sesión de nuevo.');
  }
  if (!res.ok) {
    throw new Error((data && data.error) || 'Ocurrió un error en el servidor.');
  }
  return data;
}

// ---------- Autenticación / sesión ----------
const loginScreen = document.getElementById('loginScreen');
const appRoot = document.getElementById('appRoot');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

function showLoginScreen() {
  appRoot.classList.add('hidden');
  loginScreen.classList.remove('hidden');
}

function showLogin() {
  showLoginScreen();
  loginForm.reset();
  loginError.classList.add('hidden');
}

function handleUnauthorized() {
  sessionStorage.removeItem(TOKEN_KEY);
  showLoginScreen();
}

// Carga los datos del inventario y movimientos desde la API a la caché local.
async function loadData() {
  const [prods, movs] = await Promise.all([api('/productos'), api('/movimientos')]);
  products = prods;
  movements = movs;
}

async function showApp() {
  try {
    await loadData();
  } catch (err) {
    handleUnauthorized();
    loginError.textContent = err.message;
    loginError.classList.remove('hidden');
    return;
  }
  loginScreen.classList.add('hidden');
  appRoot.classList.remove('hidden');
  goto('dashboard');
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  const submitBtn = loginForm.querySelector('button[type="submit"]');

  submitBtn.disabled = true;
  try {
    const { token } = await api('/login', { method: 'POST', body: { username, password } });
    sessionStorage.setItem(TOKEN_KEY, token);
    loginError.classList.add('hidden');
    await showApp();
  } catch (err) {
    loginError.textContent = err.message || 'Usuario o contraseña incorrectos';
    loginError.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem(TOKEN_KEY);
  showLogin();
});

// ---------- Estado en memoria (caché de la API) ----------
let products = [];
let movements = [];
let activeCategory = '';
let searchTerm = '';
let statusFilter = '';
let sortBy = 'name-asc';
let historyFilter = '';
let currentDetailId = null;

const isLow = (p) => p.stock < p.min;

// ---------- Navigation ----------
const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item');

function goto(viewName) {
  if (!isLoggedIn()) {
    showLogin();
    return;
  }
  views.forEach(v => v.classList.toggle('active', v.id === `view-${viewName}`));
  navItems.forEach(n => n.classList.toggle('active', n.dataset.view === viewName));
  if (viewName === 'dashboard') renderDashboard();
  if (viewName === 'stockin') renderStockSelectors();
  if (viewName === 'stockout') renderStockSelectors();
  if (viewName === 'alerts') renderAlerts();
  if (viewName === 'register') resetRegisterForm();
  if (viewName === 'detail') renderDetail();
  if (viewName === 'history') renderHistory();
}

navItems.forEach(item => {
  item.addEventListener('click', () => goto(item.dataset.view));
});

document.querySelectorAll('[data-goto]').forEach(btn => {
  btn.addEventListener('click', () => goto(btn.dataset.goto));
});

// ---------- Dashboard ----------
const productTableBody = document.getElementById('productTableBody');
const emptyState = document.getElementById('emptyState');

function renderDashboard() {
  document.getElementById('statTotal').textContent = products.length;
  document.getElementById('statLow').textContent = products.filter(isLow).length;
  const cats = new Set(products.map(p => p.category));
  document.getElementById('statCats').textContent = cats.size;
  const totalValue = products.reduce((sum, p) => sum + p.stock * p.price, 0);
  document.getElementById('statValue').textContent = `$${totalValue.toFixed(2)}`;

  renderNotifications();

  const filtered = products.filter(p => {
    const matchesCat = !activeCategory || p.category === activeCategory;
    const matchesSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter
      || (statusFilter === 'low' && isLow(p))
      || (statusFilter === 'ok' && !isLow(p));
    return matchesCat && matchesSearch && matchesStatus;
  });

  const sorters = {
    'name-asc': (a, b) => a.name.localeCompare(b.name, 'es'),
    'name-desc': (a, b) => b.name.localeCompare(a.name, 'es'),
    'stock-asc': (a, b) => a.stock - b.stock,
    'stock-desc': (a, b) => b.stock - a.stock,
    'price-asc': (a, b) => a.price - b.price,
    'price-desc': (a, b) => b.price - a.price,
  };
  filtered.sort(sorters[sortBy] || sorters['name-asc']);

  productTableBody.innerHTML = '';
  emptyState.classList.toggle('hidden', filtered.length > 0);

  filtered.forEach(p => {
    const low = isLow(p);
    const tr = document.createElement('tr');
    tr.className = low ? 'low-row' : '';
    tr.innerHTML = `
      <td><button type="button" class="prod-name-link ${low ? 'low' : ''}" data-open="${p.id}">${escapeHtml(p.name)}</button></td>
      <td><span class="badge">${escapeHtml(p.category)}</span></td>
      <td>${p.stock} unidades</td>
      <td><span class="status-dot ${low ? 'low' : ''}">${low ? 'Stock bajo' : 'En stock'}</span></td>
      <td>
        <div class="row-actions">
          <button class="icon-action" title="Ver detalle" data-open="${p.id}">✎</button>
          <button class="icon-action danger" title="Eliminar producto" data-del="${p.id}">🗑</button>
        </div>
      </td>
    `;
    productTableBody.appendChild(tr);
  });

  productTableBody.querySelectorAll('[data-open]').forEach(btn => {
    btn.addEventListener('click', () => openDetail(Number(btn.dataset.open)));
  });

  productTableBody.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.del);
      if (!confirm('¿Eliminar este producto del inventario?')) return;
      try {
        await api(`/productos/${id}`, { method: 'DELETE' });
        await loadData();
        renderDashboard();
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.getElementById('catFilters').addEventListener('click', (e) => {
  const btn = e.target.closest('.cat-btn');
  if (!btn) return;
  activeCategory = btn.dataset.cat;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.toggle('active', b === btn));
  renderDashboard();
});

document.getElementById('globalSearch').addEventListener('input', (e) => {
  searchTerm = e.target.value;
  renderDashboard();
});

document.getElementById('statusFilter').addEventListener('change', (e) => {
  statusFilter = e.target.value;
  renderDashboard();
});

document.getElementById('sortFilter').addEventListener('change', (e) => {
  sortBy = e.target.value;
  renderDashboard();
});

document.getElementById('clearFilters').addEventListener('click', () => {
  activeCategory = '';
  searchTerm = '';
  statusFilter = '';
  sortBy = 'name-asc';
  document.getElementById('globalSearch').value = '';
  document.getElementById('statusFilter').value = '';
  document.getElementById('sortFilter').value = 'name-asc';
  document.querySelectorAll('#catFilters .cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === ''));
  renderDashboard();
});

// ---------- Register product ----------
const registerForm = document.getElementById('registerForm');
const registerError = document.getElementById('registerError');

function resetRegisterForm() {
  registerForm.reset();
  registerError.classList.add('hidden');
}

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('pName').value.trim();
  const category = document.getElementById('pCategory').value;
  const price = parseFloat(document.getElementById('pPrice').value);
  const qty = parseInt(document.getElementById('pQty').value, 10);
  const min = parseInt(document.getElementById('pMin').value, 10);

  if (!name || isNaN(qty)) {
    registerError.textContent = 'El nombre y la cantidad inicial son obligatorios.';
    registerError.classList.remove('hidden');
    return;
  }

  try {
    await api('/productos', {
      method: 'POST',
      body: {
        name,
        category: category || 'Oficina',
        stock: qty,
        min: isNaN(min) ? 0 : min,
        price: isNaN(price) ? 0 : price,
      },
    });
    await loadData();
    registerError.classList.add('hidden');
    goto('dashboard');
  } catch (err) {
    registerError.textContent = err.message;
    registerError.classList.remove('hidden');
  }
});

// ---------- Stock In / Stock Out ----------
const inProduct = document.getElementById('inProduct');
const outProduct = document.getElementById('outProduct');
const inCurrentStock = document.getElementById('inCurrentStock');
const outCurrentStock = document.getElementById('outCurrentStock');
const inError = document.getElementById('inError');
const outError = document.getElementById('outError');

function renderStockSelectors() {
  const options = products.map(p => `<option value="${p.id}">${escapeHtml(p.name)} (${escapeHtml(p.category)})</option>`).join('');
  inProduct.innerHTML = `<option value="">Seleccione un producto...</option>${options}`;
  outProduct.innerHTML = `<option value="">Seleccione un producto...</option>${options}`;
  inCurrentStock.textContent = '--';
  outCurrentStock.textContent = '--';
  document.getElementById('inQty').value = '';
  document.getElementById('outQty').value = '';
  inError.classList.add('hidden');
  outError.classList.add('hidden');
}

inProduct.addEventListener('change', () => {
  const p = products.find(p => p.id === Number(inProduct.value));
  inCurrentStock.textContent = p ? `${p.stock} unidades` : '--';
});

outProduct.addEventListener('change', () => {
  const p = products.find(p => p.id === Number(outProduct.value));
  outCurrentStock.textContent = p ? `${p.stock} unidades` : '--';
});

document.getElementById('inSubmit').addEventListener('click', async () => {
  const p = products.find(p => p.id === Number(inProduct.value));
  const qty = parseInt(document.getElementById('inQty').value, 10);
  if (!p) {
    inError.textContent = 'Selecciona un producto.';
    inError.classList.remove('hidden');
    return;
  }
  if (isNaN(qty) || qty <= 0) {
    inError.textContent = 'Ingresa una cantidad válida mayor a 0.';
    inError.classList.remove('hidden');
    return;
  }
  try {
    const res = await api('/movimientos/entrada', { method: 'POST', body: { productId: p.id, qty } });
    await loadData();
    inError.classList.add('hidden');
    renderStockSelectors();
    inProduct.value = String(p.id);
    inCurrentStock.textContent = `${res.nuevoStock} unidades`;
    showStockModal({ tipo: 'Entrada', productName: p.name, qty, nuevoStock: res.nuevoStock });
  } catch (err) {
    inError.textContent = err.message;
    inError.classList.remove('hidden');
  }
});

document.getElementById('outSubmit').addEventListener('click', async () => {
  const p = products.find(p => p.id === Number(outProduct.value));
  const qty = parseInt(document.getElementById('outQty').value, 10);
  if (!p) {
    outError.textContent = 'Selecciona un producto.';
    outError.classList.remove('hidden');
    return;
  }
  if (isNaN(qty) || qty <= 0) {
    outError.textContent = 'Ingresa una cantidad válida mayor a 0.';
    outError.classList.remove('hidden');
    return;
  }
  if (qty > p.stock) {
    outError.textContent = 'El stock no puede ser negativo. Cantidad supera el stock actual.';
    outError.classList.remove('hidden');
    return;
  }
  try {
    const res = await api('/movimientos/salida', { method: 'POST', body: { productId: p.id, qty } });
    await loadData();
    outError.classList.add('hidden');
    renderStockSelectors();
    outProduct.value = String(p.id);
    outCurrentStock.textContent = `${res.nuevoStock} unidades`;
    showStockModal({ tipo: 'Salida', productName: p.name, qty, nuevoStock: res.nuevoStock });
  } catch (err) {
    outError.textContent = err.message;
    outError.classList.remove('hidden');
  }
});

// ---------- Alerts ----------
const alertsGrid = document.getElementById('alertsGrid');
const alertsEmpty = document.getElementById('alertsEmpty');
const alertsSubtitle = document.getElementById('alertsSubtitle');

function renderAlerts() {
  const lowProducts = products.filter(isLow);
  alertsSubtitle.textContent = lowProducts.length
    ? `Hay actualmente ${lowProducts.length} producto(s) por debajo del stock mínimo.`
    : 'Productos por debajo del stock mínimo definido.';

  alertsGrid.innerHTML = '';
  alertsEmpty.classList.toggle('hidden', lowProducts.length > 0);

  lowProducts.forEach(p => {
    const ratio = p.min > 0 ? p.stock / p.min : 0;
    const critical = ratio <= 0.5;
    const card = document.createElement('div');
    card.className = 'alert-card';
    card.innerHTML = `
      <div class="alert-head">
        <div>
          <div class="alert-name">${escapeHtml(p.name)}</div>
          <div class="alert-cat">${escapeHtml(p.category)}</div>
        </div>
        <span class="alert-badge ${critical ? 'critical' : 'warning'}">${critical ? 'CRÍTICO' : 'ADVERTENCIA'}</span>
      </div>
      <div class="alert-stats">
        <div><div>Stock actual</div><div class="cur">${p.stock} unidades</div></div>
        <div><div>Mínimo requerido</div><div>${p.min} unidades</div></div>
      </div>
      <button class="alert-restock" data-restock="${p.id}">Reabastecer ahora</button>
    `;
    alertsGrid.appendChild(card);
  });

  alertsGrid.querySelectorAll('[data-restock]').forEach(btn => {
    btn.addEventListener('click', () => {
      goto('stockin');
      inProduct.value = btn.dataset.restock;
      inProduct.dispatchEvent(new Event('change'));
    });
  });

  renderNotifications();
}

// ---------- Notifications (bell) ----------
const notifBell = document.getElementById('notifBell');
const notifPanel = document.getElementById('notifPanel');
const notifList = document.getElementById('notifList');
const notifDot = document.getElementById('notifDot');
const notifCount = document.getElementById('notifCount');

function renderNotifications() {
  const lowProducts = products.filter(isLow);
  notifDot.classList.toggle('hidden', lowProducts.length === 0);
  notifCount.textContent = lowProducts.length;

  if (lowProducts.length === 0) {
    notifList.innerHTML = '<div class="notif-empty">No hay notificaciones nuevas.</div>';
    return;
  }

  notifList.innerHTML = lowProducts.map(p => {
    const critical = (p.min > 0 ? p.stock / p.min : 0) <= 0.5;
    return `
      <button class="notif-item" data-notif="${p.id}">
        <span class="notif-icon ${critical ? 'critical' : 'warning'}">⚠</span>
        <span class="notif-text">
          <span class="notif-title">${escapeHtml(p.name)}</span>
          <span class="notif-desc">Stock bajo: ${p.stock} / mín. ${p.min} unidades</span>
        </span>
      </button>
    `;
  }).join('');

  notifList.querySelectorAll('[data-notif]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeNotifPanel();
      openDetail(Number(btn.dataset.notif));
    });
  });
}

function closeNotifPanel() {
  notifPanel.classList.add('hidden');
}

notifBell.addEventListener('click', (e) => {
  e.stopPropagation();
  renderNotifications();
  notifPanel.classList.toggle('hidden');
});

document.getElementById('notifSeeAll').addEventListener('click', () => {
  closeNotifPanel();
  goto('alerts');
});

document.addEventListener('click', (e) => {
  if (!notifPanel.classList.contains('hidden') && !e.target.closest('.notif-wrap')) {
    closeNotifPanel();
  }
});

// ---------- Modal de confirmación (entrada/salida) ----------
const modalOverlay = document.getElementById('modalOverlay');
const modalIcon = document.getElementById('modalIcon');
const modalTitle = document.getElementById('modalTitle');
const modalProduct = document.getElementById('modalProduct');
const modalChange = document.getElementById('modalChange');
const modalStock = document.getElementById('modalStock');
const modalClose = document.getElementById('modalClose');

function showStockModal({ tipo, productName, qty, nuevoStock }) {
  const esEntrada = tipo === 'Entrada';
  modalOverlay.classList.toggle('salida', !esEntrada);
  modalIcon.textContent = esEntrada ? '↘' : '↗';
  modalTitle.textContent = esEntrada ? 'Entrada registrada' : 'Salida registrada';
  modalProduct.textContent = productName;
  modalChange.textContent = `${esEntrada ? '+' : '−'}${qty} unidades`;
  modalStock.textContent = `${nuevoStock} unidades`;
  modalOverlay.classList.remove('hidden');
  modalClose.focus();
}

function closeModal() {
  modalOverlay.classList.add('hidden');
}

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modalOverlay.classList.contains('hidden')) closeModal();
});

// ---------- Product detail / edit ----------
const detailForm = document.getElementById('detailForm');
const detailEmpty = document.getElementById('detailEmpty');
const detailError = document.getElementById('detailError');

function openDetail(id) {
  currentDetailId = id;
  goto('detail');
}

function renderDetail() {
  const p = products.find(pr => pr.id === currentDetailId);
  if (!p) {
    detailForm.classList.add('hidden');
    detailEmpty.classList.remove('hidden');
    return;
  }
  detailForm.classList.remove('hidden');
  detailEmpty.classList.add('hidden');
  document.getElementById('detailName').value = p.name;
  document.getElementById('detailCategory').value = p.category;
  document.getElementById('detailStock').value = p.stock;
  document.getElementById('detailMin').value = p.min;
  document.getElementById('detailPrice').value = p.price;
  detailError.classList.add('hidden');
}

detailForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const p = products.find(pr => pr.id === currentDetailId);
  if (!p) return;

  const name = document.getElementById('detailName').value.trim();
  const category = document.getElementById('detailCategory').value;
  const stock = parseInt(document.getElementById('detailStock').value, 10);
  const min = parseInt(document.getElementById('detailMin').value, 10);
  const price = parseFloat(document.getElementById('detailPrice').value);

  if (!name) {
    detailError.textContent = 'El nombre del producto es obligatorio.';
    detailError.classList.remove('hidden');
    return;
  }
  if (isNaN(stock) || stock < 0 || isNaN(min) || min < 0 || isNaN(price) || price < 0) {
    detailError.textContent = 'La cantidad, el stock mínimo y el precio deben ser números válidos y no negativos.';
    detailError.classList.remove('hidden');
    return;
  }

  try {
    await api(`/productos/${p.id}`, { method: 'PUT', body: { name, category, stock, min, price } });
    await loadData();
    detailError.classList.add('hidden');
    currentDetailId = null;
    goto('dashboard');
  } catch (err) {
    detailError.textContent = err.message;
    detailError.classList.remove('hidden');
  }
});

document.getElementById('detailDelete').addEventListener('click', async () => {
  const p = products.find(pr => pr.id === currentDetailId);
  if (!p) return;
  if (!confirm(`¿Eliminar "${p.name}" del inventario? Esta acción no se puede deshacer.`)) return;
  try {
    await api(`/productos/${p.id}`, { method: 'DELETE' });
    await loadData();
    currentDetailId = null;
    goto('dashboard');
  } catch (err) {
    detailError.textContent = err.message;
    detailError.classList.remove('hidden');
  }
});

// ---------- Movement history ----------
const historyTableBody = document.getElementById('historyTableBody');
const historyTableWrap = document.getElementById('historyTableWrap');
const historyEmpty = document.getElementById('historyEmpty');

function renderHistory() {
  const filtered = movements
    .filter(m => !historyFilter || m.type === historyFilter)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  historyTableBody.innerHTML = '';
  historyTableWrap.classList.toggle('hidden', filtered.length === 0);
  historyEmpty.classList.toggle('hidden', filtered.length > 0);

  filtered.forEach(m => {
    const dateStr = new Date(m.date).toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${dateStr}</td>
      <td class="prod-name">${escapeHtml(m.productName)}</td>
      <td><span class="status-dot ${m.type === 'Salida' ? 'low' : ''}">${m.type}</span></td>
      <td>${m.qty} unidades</td>
    `;
    historyTableBody.appendChild(tr);
  });
}

document.getElementById('historyFilters').addEventListener('click', (e) => {
  const btn = e.target.closest('.cat-btn');
  if (!btn) return;
  historyFilter = btn.dataset.type;
  document.querySelectorAll('#historyFilters .cat-btn').forEach(b => b.classList.toggle('active', b === btn));
  renderHistory();
});

// ---------- Init ----------
if (isLoggedIn()) {
  showApp();
} else {
  showLogin();
}
