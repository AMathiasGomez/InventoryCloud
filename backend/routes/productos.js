// Rutas de productos (CRUD).
// La API expone los productos con la misma forma que usa el frontend:
//   { id, name, category, stock, min, price, estado }
const express = require('express');
const pool = require('../db');

const router = express.Router();

// Convierte una fila de la BD al formato que espera el frontend.
function mapProducto(row) {
  return {
    id: row.id,
    name: row.nombre,
    category: row.categoria,
    stock: row.stock,
    min: row.stock_minimo,
    price: Number(row.precio),
    estado: row.stock < row.stock_minimo ? 'Stock bajo' : 'En stock',
  };
}

const SELECT_BASE = `
  SELECT p.id, p.nombre, c.nombre AS categoria, p.stock, p.stock_minimo, p.precio
  FROM productos p
  JOIN categorias c ON c.id = p.categoria_id
`;

// Busca el id de una categoría por su nombre.
async function categoriaIdPorNombre(nombre) {
  const [rows] = await pool.query('SELECT id FROM categorias WHERE nombre = ? LIMIT 1', [nombre]);
  return rows[0] ? rows[0].id : null;
}

// Valida los campos numéricos de un producto.
function validarNumeros({ stock, min, price }) {
  if ([stock, min, price].some((v) => v === undefined || v === null || isNaN(v))) {
    return 'La cantidad, el stock mínimo y el precio deben ser números válidos.';
  }
  if (stock < 0 || min < 0 || price < 0) {
    return 'La cantidad, el stock mínimo y el precio no pueden ser negativos.';
  }
  return null;
}

// GET /api/productos
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`${SELECT_BASE} ORDER BY p.nombre`);
    res.json(rows.map(mapProducto));
  } catch (err) {
    next(err);
  }
});

// GET /api/productos/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`${SELECT_BASE} WHERE p.id = ?`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Producto no encontrado.' });
    res.json(mapProducto(rows[0]));
  } catch (err) {
    next(err);
  }
});

// POST /api/productos  { name, category, stock, min, price }
router.post('/', async (req, res, next) => {
  try {
    const { name, category } = req.body || {};
    const stock = parseInt(req.body.stock, 10);
    const min = parseInt(req.body.min, 10);
    const price = parseFloat(req.body.price);

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'El nombre del producto es obligatorio.' });
    }
    const errNum = validarNumeros({ stock, min, price });
    if (errNum) return res.status(400).json({ error: errNum });

    const categoriaId = await categoriaIdPorNombre(category);
    if (!categoriaId) return res.status(400).json({ error: 'La categoría no es válida.' });

    const [result] = await pool.query(
      'INSERT INTO productos (nombre, categoria_id, stock, stock_minimo, precio) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), categoriaId, stock, min, price]
    );

    const [rows] = await pool.query(`${SELECT_BASE} WHERE p.id = ?`, [result.insertId]);
    res.status(201).json(mapProducto(rows[0]));
  } catch (err) {
    next(err);
  }
});

// PUT /api/productos/:id  { name, category, stock, min, price }
router.put('/:id', async (req, res, next) => {
  try {
    const { name, category } = req.body || {};
    const stock = parseInt(req.body.stock, 10);
    const min = parseInt(req.body.min, 10);
    const price = parseFloat(req.body.price);

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'El nombre del producto es obligatorio.' });
    }
    const errNum = validarNumeros({ stock, min, price });
    if (errNum) return res.status(400).json({ error: errNum });

    const categoriaId = await categoriaIdPorNombre(category);
    if (!categoriaId) return res.status(400).json({ error: 'La categoría no es válida.' });

    const [result] = await pool.query(
      'UPDATE productos SET nombre = ?, categoria_id = ?, stock = ?, stock_minimo = ?, precio = ? WHERE id = ?',
      [name.trim(), categoriaId, stock, min, price, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Producto no encontrado.' });

    const [rows] = await pool.query(`${SELECT_BASE} WHERE p.id = ?`, [req.params.id]);
    res.json(mapProducto(rows[0]));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/productos/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const [result] = await pool.query('DELETE FROM productos WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Producto no encontrado.' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
