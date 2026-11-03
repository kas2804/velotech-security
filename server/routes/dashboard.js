/**
 * Protected Dashboard & Session Telemetry Routes
 * Requires authenticated session and valid Session Binding.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const requireAuth = require('../middleware/authCheck');
const sessionBinding = require('../middleware/sessionBinding');
const { USERS } = require('../data/users');

// Protected Dashboard UI Route
router.get('/dashboard', requireAuth, sessionBinding, (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'dashboard.html'));
});

// API: Retrieve Session & Security Telemetry
router.get('/api/session-info', requireAuth, sessionBinding, (req, res) => {
  const user = USERS[req.session.user?.username] || req.session.user;
  const isSecure = req.session.isSecureSession === true;

  res.json({
    authenticated: true,
    user: {
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      department: user.department,
      securityClearance: user.securityClearance,
      projects: user.projects || []
    },
    securityContext: {
      isSecureSession: isSecure,
      assuranceLevel: isSecure ? 'NIST AAL2 (Multi-Factor)' : 'NIST AAL1 (Single-Factor Insecure)',
      boundIP: req.session.boundIP || null,
      boundUA: req.session.boundUA || null,
      currentIP: req.ip || req.connection.remoteAddress,
      currentUA: req.headers['user-agent'],
      cookieFlags: {
        httpOnly: isSecure,
        secure: isSecure,
        sameSite: isSecure ? 'Strict' : 'None/Unspecified'
      }
    }
  });
});

// Logout endpoint
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Error during logout:', err);
    res.clearCookie('session');
    res.redirect('/login-secure');
  });
});

module.exports = router;
