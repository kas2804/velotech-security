/**
 * Secure Route Handler (/login-secure)
 * Implements NIST SP 800-63B AAL2 (Multi-Factor Authentication & Hardened Session Management)
 * 
 * Mitigations demonstrated:
 * 1. Two-Step Authentication Flow: Primary Password -> Secondary TOTP 6-digit MFA.
 * 2. Hardened Session Cookies: HttpOnly (blocks JS document.cookie theft),
 *    Secure (transmits exclusively over HTTPS),
 *    SameSite=Strict (mitigates CSRF).
 * 3. Session Binding: Records IP and User-Agent; subsequent requests are strictly validated.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const { authenticator } = require('otplib');
const qrcode = require('qrcode');
const { USERS, DEMO_TOTP_SECRET } = require('../data/users');

// Configure otplib TOTP parameters
authenticator.options = {
  window: 1 // Allow 1 step backward/forward for slight clock drift
};

// Serve the secure login page
router.get('/login-secure', (req, res) => {
  if (req.session && req.session.authenticated) {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'login-secure.html'));
});

// Serve the MFA Enrollment & QR Code Setup page
router.get('/mfa-setup', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'mfa-setup.html'));
});

// Step 1: Validate primary credentials (Password)
router.post('/login-secure/step1', (req, res) => {
  const { username, password } = req.body;
  const user = USERS[username];

  if (!user || user.password !== password) {
    return res.status(401).json({
      success: false,
      error: 'Invalid username or password'
    });
  }

  // Stash pending authentication state — NOT full dashboard access yet
  req.session.pendingUser = username;
  req.session.pendingMFA = true;
  req.session.authenticated = false;

  req.session.save((err) => {
    if (err) console.error('Session save error in Step 1:', err);
    return res.json({
      success: true,
      step: 'mfa_required',
      message: 'Primary credentials validated. Please submit your 6-digit Authenticator code.'
    });
  });
});

// Step 2: Validate secondary factor (TOTP 6-digit code)
router.post('/login-secure/step2', (req, res) => {
  const { code } = req.body;
  const pendingUsername = req.session.pendingUser;

  if (!pendingUsername) {
    return res.status(400).json({
      success: false,
      error: 'Authentication sequence error. Please submit primary credentials first.'
    });
  }

  const user = USERS[pendingUsername];
  if (!user) {
    return res.status(401).json({ success: false, error: 'User record not found.' });
  }

  // Clean code input (remove spaces if user copied with formatting)
  const cleanCode = (code || '').toString().replace(/\s+/g, '').trim();

  // Verify TOTP code against user secret using otplib
  const isValid = authenticator.verify({
    token: cleanCode,
    secret: user.totpSecret
  });

  if (!isValid) {
    return res.status(401).json({
      success: false,
      error: 'Invalid TOTP code. Please check your Authenticator app and try again.'
    });
  }

  // Authentication successful - Upgrade session to fully authenticated
  req.session.authenticated = true;
  req.session.isSecureSession = true;
  req.session.user = {
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    department: user.department,
    securityClearance: user.securityClearance
  };

  // Implement Session Binding: Record client environmental attributes
  const clientIP = req.ip || req.connection.remoteAddress || '127.0.0.1';
  const clientUA = req.headers['user-agent'] || 'unknown';

  req.session.boundIP = clientIP;
  req.session.boundUA = clientUA;

  // Clear pending flags
  delete req.session.pendingUser;
  delete req.session.pendingMFA;

  // Issue Hardened Session Cookie with HttpOnly, Secure, SameSite=Strict matching PRD & TechStack
  req.session.cookie.httpOnly = true;
  req.session.cookie.sameSite = 'strict';
  req.session.cookie.secure = req.secure || req.headers['x-forwarded-proto'] === 'https' || true;

  return req.session.save((err) => {
    if (err) console.error('Session save error in Step 2:', err);
    return res.json({
      success: true,
      redirect: '/dashboard',
      message: 'MFA Verified. Secure session established.'
    });
  });
});

// API endpoint to generate scannable TOTP QR Code & Secret
router.get('/api/mfa-qr', async (req, res) => {
  try {
    const user = USERS.admin;
    const otpauth = authenticator.keyuri(user.email, 'VeloTech Security Portal', user.totpSecret);
    const qrDataUrl = await qrcode.toDataURL(otpauth, {
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    res.json({
      success: true,
      qrDataUrl,
      secret: user.totpSecret,
      email: user.email,
      issuer: 'VeloTech Security Portal'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to generate QR code' });
  }
});

// API helper endpoint returning current TOTP code (for seamless testing/demos)
router.get('/api/totp-current', (req, res) => {
  const currentToken = authenticator.generate(DEMO_TOTP_SECRET);
  const step = 30;
  const remainingSeconds = step - (Math.floor(Date.now() / 1000) % step);

  res.json({
    token: currentToken,
    remainingSeconds,
    secret: DEMO_TOTP_SECRET
  });
});

module.exports = router;
