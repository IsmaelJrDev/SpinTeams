// routes/auth.routes.js
const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('../controllers/auth.controller.js');
const { verifyToken } = require('../middlewares/auth.middleware.js');

// ─────────────────────────────────────────────
// AUTH LOCAL (email + password)
// ─────────────────────────────────────────────

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/logout
router.post('/logout', verifyToken, authController.logout);


// ─────────────────────────────────────────────
// AUTH GOOGLE (OAuth 2.0)
// ─────────────────────────────────────────────

// GET /api/auth/google  → redirige a Google
router.get('/google', (req, res, next) => {
  // Capturamos el rol del query param y lo enviamos a Google via 'state'
  const role = req.query.role || '';
  passport.authenticate('google', {
    scope: ['openid', 'email', 'profile'],
    session: false,
    state: role  // Google nos devuelve este valor en el callback
  })(req, res, next);
});

// GET /api/auth/google/callback  → Google regresa aquí
router.get('/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/login?error=google_auth_failed'
  }),
  authController.googleCallback
);


// ─────────────────────────────────────────────
// RUTAS PROTEGIDAS (requieren JWT válido)
// ─────────────────────────────────────────────

// GET /api/auth/me → datos del usuario actual
router.get('/me', verifyToken, authController.me);

module.exports = router;