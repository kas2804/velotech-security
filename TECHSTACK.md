# VeloTech Secure Authentication PoC — Tech Stack Document

**Companion to:** VeloTech Secure Authentication PoC PRD v1.0

---

## 1. Stack Summary

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js (v18+) | Matches PRD's `express-session` reference; huge ecosystem for auth demos |
| Web framework | Express.js | Minimal, unopinionated, easy to show raw headers/cookies in |
| Session management | `express-session` | In-memory store — no DB needed, matches PRD scope |
| MFA / TOTP | `otplib` | Generates & verifies 6-digit TOTP codes compatible with Google Authenticator |
| QR code (for enrolling MFA) | `qrcode` | Turns the TOTP secret into a scannable QR for your authenticator app |
| Cookie handling | `cookie-parser` | Read/inspect cookies server-side for the demo |
| HTTPS locally | `mkcert` | Issues a locally-trusted cert so `Secure` cookies actually work on localhost |
| Frontend | Vanilla HTML/CSS/JS | No framework — keeps the `document.cookie` exploit/mitigation crystal clear |
| "Attacker" simulation | Second Express app on a different port | Simulates a cross-origin attacker page attempting cookie theft/replay |

---

## 2. Folder Structure

```
velotech-poc/
├── server/
│   ├── app.js                 # main Express app
│   ├── routes/
│   │   ├── vulnerable.js      # /login-vulnerable
│   │   └── secure.js          # /login-secure (2-step: password → TOTP)
│   ├── middleware/
│   │   └── sessionBinding.js  # IP + User-Agent check
│   ├── data/
│   │   └── users.js           # hardcoded credentials + TOTP secret
│   └── certs/                 # mkcert-generated localhost cert/key
├── public/
│   ├── login-vulnerable.html
│   ├── login-secure.html
│   ├── dashboard.html
│   └── js/
│       ├── attack.js          # reads document.cookie, sends to attacker
│       └── mfa-setup.js       # renders QR code for TOTP enrollment
├── attacker-server/
│   └── attacker.js            # standalone server on another port, receives stolen cookie
├── package.json
└── README.md
```

---

## 3. Package Installation

```bash
mkdir velotech-poc && cd velotech-poc
npm init -y
npm install express express-session cookie-parser otplib qrcode
npm install --save-dev nodemon
```

For local HTTPS:
```bash
# macOS
brew install mkcert
mkcert -install
mkcert localhost

# Windows (via Chocolatey)
choco install mkcert
mkcert -install
mkcert localhost
```
This produces `localhost.pem` and `localhost-key.pem` — move these into `server/certs/`.

---

## 4. Key Implementation Notes (mapped to PRD requirements)

### 4.1 Vulnerable Login (`/login-vulnerable`)
```js
app.post('/login-vulnerable', (req, res) => {
  const { username, password } = req.body;
  if (username === USER.username && password === USER.password) {
    // Deliberately insecure: no flags at all
    res.setHeader('Set-Cookie', `session=${sessionId}`);
    res.redirect('/dashboard');
  }
});
```

### 4.2 Secure Login — Step 1 (password) → Step 2 (TOTP)
```js
app.post('/login-secure/step1', (req, res) => {
  // validate password, then stash a "pending" state — NOT full access yet
  req.session.pendingUser = username;
  res.redirect('/mfa-challenge');
});

app.post('/login-secure/step2', (req, res) => {
  const isValid = authenticator.verify({ token: req.body.code, secret: USER.totpSecret });
  if (isValid) {
    req.session.authenticated = true;
    req.session.boundIP = req.ip;
    req.session.boundUA = req.headers['user-agent'];
    res.cookie('session', req.sessionID, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict'
    });
    res.redirect('/dashboard');
  }
});
```

### 4.3 Session Binding Middleware
```js
function sessionBinding(req, res, next) {
  if (req.session.boundIP !== req.ip || req.session.boundUA !== req.headers['user-agent']) {
    req.session.destroy();
    return res.status(401).send('Session invalidated — environment mismatch.');
  }
  next();
}
```

### 4.4 Running over HTTPS
```js
const https = require('https');
const fs = require('fs');

https.createServer({
  key: fs.readFileSync('server/certs/localhost-key.pem'),
  cert: fs.readFileSync('server/certs/localhost.pem')
}, app).listen(443);
```

---

## 5. Demo Script Alignment

| PRD Flow | How the stack supports it |
|---|---|
| Flow A (attack) | `attack.js` runs `fetch(document.cookie)` against the vulnerable session — succeeds because no `HttpOnly` flag |
| Flow B (mitigation, same JS) | Same script run against the secure session — `document.cookie` returns `undefined` because of `HttpOnly` |
| Flow B, step 6 | Manually replay the stolen secure cookie from `attacker-server` (different origin/IP context) — `sessionBinding` middleware rejects it |

---

## 6. NIST SP 800-63B Alignment Notes

- **AAL1 (vulnerable flow):** single factor (password only) — matches AAL1 definition.
- **AAL2 (secure flow):** password + TOTP (something you know + something you have) — matches AAL2's two-factor requirement, plus the secure session handling AAL2 expects.

---

## 7. Out of Scope (per PRD)
- No real database — credentials/TOTP secret hardcoded in `server/data/users.js`
- No password reset
- No user registration/self-enrollment flow (TOTP secret is pre-generated for the demo)
