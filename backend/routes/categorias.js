// Rutas de categorías (solo lectura).
const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /api/categorias
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id, nombre FROM categorias ORDER BY nombre');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
