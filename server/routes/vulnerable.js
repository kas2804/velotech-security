/**
 * Vulnerable Route Handler (/login-vulnerable)
 * Demonstrates NIST AAL1 (Single-Factor Authentication) with Insecure Session Cookies
 * 
 * Flaws demonstrated:
 * 1. Single Factor (Password Only) - susceptible to credential stuffing and AitM interception.
 * 2. Unflagged Cookie: Missing HttpOnly (accessible via JS document.cookie),
 *    Missing Secure (can be transmitted over plain HTTP),
 *    Missing SameSite (vulnerable to CSRF).
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const { USERS } = require('../data/users');

// Serve the vulnerable login page
router.get('/login-vulnerable', (req, res) => {
  if (req.session && req.session.authenticated) {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'login-vulnerable.html'));
});

// Process Vulnerable Login (Single-Factor)
router.post('/login-vulnerable', (req, res) => {
  const { username, password } = req.body;
  const user = USERS[username];

  if (user && user.password === password) {
    // Deliberately Insecure Setup:
    // Mark session as authenticated without MFA or session binding
    req.session.authenticated = true;
    req.session.user = {
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      department: user.department
    };
    req.session.isSecureSession = false; // Flag indicating vulnerable mode

    // Explicitly unflagged cookie properties matching PRD Section 3 Acceptance Criteria:
    // "Set-Cookie: session=1234" (No HttpOnly, No Secure, No SameSite)
    req.session.cookie.httpOnly = false;
    req.session.cookie.secure = false;
    req.session.cookie.sameSite = false;

    return req.session.save((err) => {
      if (err) console.error('Session save error:', err);
      
      if (req.xhr || req.headers.accept?.includes('json')) {
        return res.json({
          success: true,
          redirect: '/dashboard',
          message: 'Authenticated (Insecure / Unflagged Cookie Issued)',
          cookieValue: `session=${req.sessionID}`
        });
      }

      return res.redirect('/dashboard');
    });
  }

  // Authentication failure
  const errorMsg = 'Invalid username or password';
  if (req.xhr || req.headers.accept?.includes('json')) {
    return res.status(401).json({ success: false, error: errorMsg });
  }

  return res.status(401).send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Login Failed</title>
        <link rel="stylesheet" href="/css/style.css">
      </head>
      <body>
        <div class="main-content">
          <div class="auth-card" style="border-color: var(--accent-red);">
            <h2 style="color: var(--accent-red);">Authentication Failed</h2>
            <p style="margin: 1rem 0; color: var(--text-muted);">The credentials provided do not match our records.</p>
            <a href="/login-vulnerable" class="btn btn-vulnerable">Try Again</a>
          </div>
        </div>
      </body>
    </html>
  `);
});

module.exports = router;
