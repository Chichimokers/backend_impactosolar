const db = require('../db');

const findByUsername = (username) => db.prepare('SELECT * FROM users WHERE username = ?').get(username);

module.exports = { findByUsername };
