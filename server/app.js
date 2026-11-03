/**
 * VeloTech Security PoC - Main Express Application Server
 * Demonstrates NIST SP 800-63B Authentication Levels & Cookie Security Controls
 */

const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

const vulnerableRoutes = require('./routes/vulnerable');
const secureRoutes = require('./routes/secure');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

// Trust reverse proxies / localhost IP detection
app.set('trust proxy', 1);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static Assets
app.use(express.static(path.join(__dirname, '..', 'public')));

// Session Middleware (In-memory store for PoC scope)
app.use(session({
  name: 'session', // Cookie name
  secret: process.env.SESSION_SECRET || 'velotech-cyber-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: false, // Default to false so vulnerable route emits unflagged cookie; secure route explicitly enables httpOnly
    secure: false,   // Default to false; secure route explicitly enables secure
    sameSite: false, // Default to false; secure route explicitly enables sameSite: 'strict'
    maxAge: 3600000  // 1 hour
  }
}));

// Route Registration
app.use(vulnerableRoutes);
app.use(secureRoutes);
app.use(dashboardRoutes);

// Root landing redirects to secure login by default
app.get('/', (req, res) => {
  if (req.session && req.session.authenticated) {
    return res.redirect('/dashboard');
  }
  res.redirect('/login-secure');
});

// Port configuration
const HTTP_PORT = process.env.HTTP_PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 8443;

// Certificate paths
const certDir = path.join(__dirname, 'certs');
const certPath = path.join(certDir, 'localhost.pem');
const keyPath = path.join(certDir, 'localhost-key.pem');

// Start HTTP Server
const httpServer = http.createServer(app);
httpServer.listen(HTTP_PORT, () => {
  console.log(`[+] VeloTech HTTP Server listening on http://localhost:${HTTP_PORT}`);
});

// Start HTTPS Server if certificates are present
if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  try {
    const sslOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    };

    const httpsServer = https.createServer(sslOptions, app);
    httpsServer.listen(HTTPS_PORT, () => {
      console.log(`[+] VeloTech HTTPS Server listening on https://localhost:${HTTPS_PORT}`);
      console.log(`[!] Note: Open https://localhost:${HTTPS_PORT} in your browser to test Secure Cookies with HttpOnly & SameSite=Strict.`);
    });
  } catch (err) {
    console.error('[-] Error starting HTTPS server:', err.message);
  }
} else {
  console.warn('[-] SSL certificates not found in server/certs/. Run `npm run certs` to generate them.');
}

module.exports = { app, httpServer };
