const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login', authController.login);

// Steam Auth Routes
router.get('/steam', passport.authenticate('steam', { failureRedirect: '/' }), (req, res) => {
  // The request will be redirected to Steam for authentication, so this function will not be called.
});

router.get('/steam/return', 
  passport.authenticate('steam', { failureRedirect: '/' }),
  authController.steamCallback
);

module.exports = router;
