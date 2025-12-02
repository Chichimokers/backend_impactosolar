const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const db = require('../db');

// Serialize user to session (just save the steamid)
passport.serializeUser((user, done) => {
  done(null, user.steam_id);
});

// Deserialize user from session (find by steamid)
passport.deserializeUser((id, done) => {
  // For now, we just return the id and basic info if needed.
  // In a real app, you might query the DB here.
  const user = db.prepare('SELECT * FROM players WHERE steam_id = ?').get(id);
  done(null, user || { steam_id: id });
});

passport.use(new SteamStrategy({
    returnURL: process.env.RETURN_URL || 'http://localhost:5500/dota/auth/steam/return',
    realm: process.env.REALM || 'http://localhost:5500/',
    apiKey: process.env.STEAM_API_KEY
  },
  function(identifier, profile, done) {
    // identifier is the OpenID identifier, profile contains steam info
    // profile.id is the 64-bit steamid
    const steamId = profile.id;
    const displayName = profile.displayName;
    const photos = profile.photos || [];
    const avatar = photos.length > 0 ? photos[photos.length - 1].value : null;

    // Insert or update player in DB
    try {
      // We use the existing logic or direct DB call
      // Let's use direct DB call here for simplicity or reuse the model if possible.
      // But since this is config, let's keep it self-contained or require the model.
      // Let's require the model to be clean.
      const playerModel = require('../models/playerModel');
      
      // Ensure player exists
      let player = playerModel.findBySteamId(steamId);
      if (!player) {
        playerModel.insertOrIgnorePlayer(steamId, displayName);
      } else {
        // Update name/avatar if needed? For now just ensure existence.
      }
      
      // Return user object
      return done(null, { steam_id: steamId, name: displayName, avatar });
    } catch (err) {
      return done(err);
    }
  }
));

module.exports = passport;
