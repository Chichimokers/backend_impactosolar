const path = require('path');
const dotenv = require('dotenv');

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '.env.prod' : '.env.local';
dotenv.config({ path: path.resolve(__dirname, envFile) });

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('./config/passport');
const authRoutes = require('./routes/auth');
const playerRoutes = require('./routes/players');
require('./db'); // initialise DB and admin user
require('./scheduler'); // start background scheduler

const app = express();
const PORT = process.env.PORT || 5500;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session setup
app.use(session({
  secret: process.env.JWT_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' } // set to true if https
}));

// Passport init
app.use(passport.initialize());
app.use(passport.session());

// Routes prefixed with /dota
app.use('/dota/auth', authRoutes);
app.use('/dota/players', playerRoutes);

app.get('/dota', (req, res) => {
  res.json({ message: 'DotaRankNExt backend - API running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT} (Env: ${process.env.NODE_ENV || 'local'})`);
});
