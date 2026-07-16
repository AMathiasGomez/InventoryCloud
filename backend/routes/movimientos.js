// Rutas de movimientos: historial + registrar entrada/salida de stock.
const express = require('express');
const pool = require('../db');

const router = express.Router();

function mapMovimiento(row) {
  return {
    id: row.id,
    productId: row.producto_id,
    productName: row.producto_nombre,
    type: row.tipo,
    qty: row.cantidad,
    date: row.fecha,
  };
}

// GET /api/movimientos?tipo=Entrada|Salida
router.get('/', async (req, res, next) => {
  try {
    const { tipo } = req.query;
    let sql = 'SELECT id, producto_id, producto_nombre, tipo, cantidad, fecha FROM movimientos';
    const params = [];
    if (tipo === 'Entrada' || tipo === 'Salida') {
      sql += ' WHERE tipo = ?';
      params.push(tipo);
    }
    sql += ' ORDER BY fecha DESC, id DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows.map(mapMovimiento));
  } catch (err) {
    next(err);
  }
});

// Lógica común para entrada/salida, dentro de una transacción atómica.
async function registrarMovimiento(tipo, productoId, cantidad) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Bloquea la fila del producto mientras se actualiza.
    const [rows] = await conn.query(
      'SELECT id, nombre, stock FROM productos WHERE id = ? FOR UPDATE',
      [productoId]
    );
    const producto = rows[0];
    if (!producto) {
      const e = new Error('El producto no existe.');
      e.status = 404;
      throw e;
    }

    if (tipo === 'Salida' && cantidad > producto.stock) {
      const e = new Error('El stock no puede ser negativo. La cantidad supera el stock actual.');
      e.status = 400;
      throw e;
    }

    const nuevoStock = tipo === 'Entrada' ? producto.stock + cantidad : producto.stock - cantidad;

    await conn.query('UPDATE productos SET stock = ? WHERE id = ?', [nuevoStock, productoId]);
    await conn.query(
      'INSERT INTO movimientos (producto_id, producto_nombre, tipo, cantidad) VALUES (?, ?, ?, ?)',
      [productoId, producto.nombre, tipo, cantidad]
    );

    await conn.commit();
    return { productName: producto.nombre, nuevoStock };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// POST /api/movimientos/entrada  { productId, qty }
router.post('/entrada', async (req, res, next) => {
  try {
    const productId = Number(req.body.productId);
    const qty = parseInt(req.body.qty, 10);
    if (!productId) return res.status(400).json({ error: 'Selecciona un producto.' });
    if (isNaN(qty) || qty <= 0) return res.status(400).json({ error: 'Ingresa una cantidad válida mayor a 0.' });

    const result = await registrarMovimiento('Entrada', productId, qty);
    res.status(201).json({ ok: true, ...result });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// POST /api/movimientos/salida  { productId, qty }
router.post('/salida', async (req, res, next) => {
  try {
    const productId = Number(req.body.productId);
    const qty = parseInt(req.body.qty, 10);
    if (!productId) return res.status(400).json({ error: 'Selecciona un producto.' });
    if (isNaN(qty) || qty <= 0) return res.status(400).json({ error: 'Ingresa una cantidad válida mayor a 0.' });

    const result = await registrarMovimiento('Salida', productId, qty);
    res.status(201).json({ ok: true, ...result });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

module.exports = router;
