// Servidor principal de la API de InventoryCloud.
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const pool = require('./db');
const { authRequired } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const categoriasRoutes = require('./routes/categorias');
const productosRoutes = require('./routes/productos');
const movimientosRoutes = require('./routes/movimientos');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'conectada' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'sin conexión', detail: err.message });
  }
});

// Rutas públicas (login).
app.use('/api', authRoutes);

// Rutas protegidas: requieren token de sesión.
app.use('/api/categorias', authRequired, categoriasRoutes);
app.use('/api/productos', authRequired, productosRoutes);
app.use('/api/movimientos', authRequired, movimientosRoutes);

// Servir el frontend (archivos estáticos de la raíz del proyecto).
// Así todo queda en el mismo servicio/URL y no hay problemas de CORS.
// Los archivos que empiezan por "." (como .env) quedan ocultos por defecto.
const FRONTEND_DIR = path.join(__dirname, '..');
app.use(express.static(FRONTEND_DIR));

// 404: JSON para rutas de API, index.html para el resto (frontend).
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Ruta no encontrada.' });
  }
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// Manejador central de errores.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

app.listen(PORT, () => {
  console.log(`InventoryCloud API escuchando en el puerto ${PORT}`);
});
