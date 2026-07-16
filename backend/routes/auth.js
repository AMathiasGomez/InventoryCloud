// Rutas de autenticación: login del administrador.
const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';

// POST /api/login  { username, password }
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son obligatorios.' });
    }

    const [rows] = await pool.query(
      'SELECT id, username, password FROM usuarios WHERE username = ? LIMIT 1',
      [username]
    );

    const user = rows[0];
    // Nota: el esquema guarda la contraseña en texto plano (admin123).
    // En producción se debería guardar un hash (bcrypt) y comparar con bcrypt.compare.
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES,
    });

    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
