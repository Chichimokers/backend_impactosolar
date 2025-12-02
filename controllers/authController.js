const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_jwt_key';

const login = (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username y password requeridos' });

  const user = userModel.findByUsername(username);
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

  const match = bcrypt.compareSync(password, user.password_hash);
  if (!match) return res.status(401).json({ error: 'Credenciales inválidas' });

  const token = jwt.sign({ username: user.username, id: user.id, role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
};

const steamCallback = (req, res) => {
  // req.user contains the user info from passport-steam strategy
  if (!req.user) {
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
  }

  // Generate JWT for the steam user
  const token = jwt.sign({ steam_id: req.user.steam_id, role: 'player' }, JWT_SECRET, { expiresIn: '7d' });

  // Redirect to frontend with token
  res.redirect(`${process.env.FRONTEND_URL}/rankdota/auth/callback?token=${token}`);
};

module.exports = { login, steamCallback };
