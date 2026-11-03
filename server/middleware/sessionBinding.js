/**
 * Session Binding Middleware
 * Enforces NIST SP 800-63B guidelines by binding the active session token to the
 * client's environmental context (Client IP address & User-Agent string).
 * 
 * If a session cookie is stolen and presented by an adversary from a different machine/IP,
 * this middleware invalidates the hijacked session immediately.
 */

function sessionBinding(req, res, next) {
  // If not an authenticated session, pass through to let auth guards handle it
  if (!req.session || !req.session.authenticated) {
    return next();
  }

  // If the session was established under the Secure Flow (Session Binding enabled)
  if (req.session.isSecureSession && req.session.boundIP && req.session.boundUA) {
    const currentIP = req.ip || req.connection.remoteAddress;
    const currentUA = req.headers['user-agent'] || 'unknown';

    const isIPMatch = req.session.boundIP === currentIP;
    const isUAMatch = req.session.boundUA === currentUA;

    if (!isIPMatch || !isUAMatch) {
      console.warn(`[SECURITY ALERT] Session Binding Mismatch detected!`);
      console.warn(` - Expected IP: ${req.session.boundIP} | Received IP: ${currentIP}`);
      console.warn(` - Expected UA: ${req.session.boundUA} | Received UA: ${currentUA}`);

      // Invalidate the session immediately
      req.session.destroy((err) => {
        if (err) console.error('Error destroying hijacked session:', err);
      });

      // Clear the cookie in the response
      res.clearCookie('session');

      if (req.xhr || req.headers.accept?.includes('json')) {
        return res.status(401).json({
          error: 'Session Hijacking Blocked',
          message: 'Session invalidated: Environmental fingerprint mismatch (IP/User-Agent does not match bound credentials).'
        });
      }

      return res.status(401).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>401 - Session Binding Mismatch</title>
          <link rel="stylesheet" href="/css/style.css">
        </head>
        <body>
          <div class="main-content">
            <div class="auth-wrapper">
              <div class="auth-card" style="border-color: var(--accent-red);">
                <div class="auth-header">
                  <span class="auth-badge badge-red">🚨 Security Violation</span>
                  <h1 class="auth-title">Session Hijack Blocked</h1>
                  <p class="auth-subtitle">Session Binding Policy Enforced</p>
                </div>
                <div class="alert alert-danger">
                  <strong>Environment Mismatch:</strong><br>
                  The session token was presented from an unauthorized IP address or User-Agent profile. The session has been terminated.
                </div>
                <div class="exploit-terminal">
                  <div class="terminal-line red">[!] Expected IP: ${req.session?.boundIP || 'Bound IP'}</div>
                  <div class="terminal-line red">[!] Attacker IP: ${currentIP}</div>
                  <div class="terminal-line red">[!] Status: Session Revoked & Terminated</div>
                </div>
                <a href="/login-secure" class="btn btn-outline-neon" style="margin-top: 1rem;">Return to Secure Login</a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `);
    }
  }

  next();
}

module.exports = sessionBinding;
