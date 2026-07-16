// ---------- Auth ----------
const USERS_KEY = 'inventoryCloudUsers';
const SESSION_KEY = 'sesionActiva';

function ensureDefaultUser() {
  if (!localStorage.getItem(USERS_KEY)) {
    localStorage.setItem(USERS_KEY, JSON.stringify([{ username: 'admin', password: 'admin123' }]));
  }
}
ensureDefaultUser();

function isLoggedIn() {
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}

function checkCredentials(username, password) {
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  return users.some(u => u.username === username && u.password === password);
}

const loginScreen = document.getElementById('loginScreen');
const appRoot = document.getElementById('appRoot');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

function showLogin() {
  appRoot.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  loginForm.reset();
  loginError.classList.add('hidden');
}

function showApp() {
  loginScreen.classList.add('hidden');
  appRoot.classList.remove('hidden');
  goto('dashboard');
}

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;

  if (checkCredentials(username, password)) {
    sessionStorage.setItem(SESSION_KEY, 'true');
    loginError.classList.add('hidden');
    showApp();
  } else {
    loginError.textContent = 'Usuario o contraseña incorrectos';
    loginError.classList.remove('hidden');
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem(SESSION_KEY);
  showLogin();
});

const STORAGE_KEY = 'inventoryCloudProducts';

const seedProducts = [
  { id: 1, name: 'Cuaderno Premium A4', category: 'Cuadernos', stock: 45, min: 15, price: 3.5 },
  { id: 2, name: 'Bolígrafo Azul Punta Fina', category: 'Escritura', stock: 8, min: 20, price: 0.8 },
  { id: 3, name: 'Set de Acuarelas 12 colores', category: 'Arte', stock: 12, min: 10, price: 6.2 },
  { id: 4, name: 'Papel Bond A4 80g (Resma)', category: 'Oficina', stock: 150, min: 30, price: 4.0 },
  { id: 5, name: 'Lápiz Mecánico 0.5mm', category: 'Escritura', stock: 4, min: 40, price: 1.2 },
  { id: 6, name: 'Marcadores Punta Fina x12', category: 'Arte', stock: 25, min: 10, price: 5.5 },
];

function loadProducts() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedProducts));
    return [...seedProducts];
  }
  try { return JSON.parse(raw); } catch { return [...seedProducts]; }
}

function saveProducts(products) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

const MOVEMENTS_KEY = 'inventoryCloudMovements';

function loadMovements() {
  const raw = localStorage.getItem(MOVEMENTS_KEY);
  try { return raw ? JSON.parse(raw) : []; } catch { return []; }
}

function saveMovements(movements) {
  localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(movements));
}

function addMovement(product, type, qty) {
  movements.push({
    id: Date.now() + Math.random(),
    productId: product.id,
    productName: product.name,
    type,
    qty,
    date: new Date().toISOString(),
  });
  saveMovements(movements);
}

let products = loadProducts();
let movements = loadMovements();
let activeCategory = '';
let searchTerm = '';
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
    return matchesCat && matchesSearch;
  });

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
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.del);
      if (confirm('¿Eliminar este producto del inventario?')) {
        products = products.filter(p => p.id !== id);
        saveProducts(products);
        renderDashboard();
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

// ---------- Register product ----------
const registerForm = document.getElementById('registerForm');
const registerError = document.getElementById('registerError');

function resetRegisterForm() {
  registerForm.reset();
  registerError.classList.add('hidden');
}

registerForm.addEventListener('submit', (e) => {
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

  const newProduct = {
    id: Date.now(),
    name,
    category: category || 'Oficina',
    stock: qty,
    min: isNaN(min) ? 0 : min,
    price: isNaN(price) ? 0 : price,
  };

  products.push(newProduct);
  saveProducts(products);
  registerError.classList.add('hidden');
  goto('dashboard');
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

document.getElementById('inSubmit').addEventListener('click', () => {
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
  p.stock += qty;
  saveProducts(products);
  addMovement(p, 'Entrada', qty);
  inError.classList.add('hidden');
  renderStockSelectors();
  inProduct.value = String(p.id);
  inCurrentStock.textContent = `${p.stock} unidades`;
  alert(`Entrada registrada: +${qty} unidades de "${p.name}". Nuevo stock: ${p.stock}.`);
});

document.getElementById('outSubmit').addEventListener('click', () => {
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
  p.stock -= qty;
  saveProducts(products);
  addMovement(p, 'Salida', qty);
  outError.classList.add('hidden');
  renderStockSelectors();
  outProduct.value = String(p.id);
  outCurrentStock.textContent = `${p.stock} unidades`;
  alert(`Salida registrada: -${qty} unidades de "${p.name}". Nuevo stock: ${p.stock}.`);
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

detailForm.addEventListener('submit', (e) => {
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

  p.name = name;
  p.category = category;
  p.stock = stock;
  p.min = min;
  p.price = price;
  saveProducts(products);
  detailError.classList.add('hidden');
  currentDetailId = null;
  goto('dashboard');
});

document.getElementById('detailDelete').addEventListener('click', () => {
  const p = products.find(pr => pr.id === currentDetailId);
  if (!p) return;
  if (confirm(`¿Eliminar "${p.name}" del inventario? Esta acción no se puede deshacer.`)) {
    products = products.filter(pr => pr.id !== p.id);
    saveProducts(products);
    currentDetailId = null;
    goto('dashboard');
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
renderStockSelectors();
renderAlerts();

if (isLoggedIn()) {
  showApp();
} else {
  showLogin();
}
