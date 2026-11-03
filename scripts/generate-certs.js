const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const certDir = path.join(__dirname, '..', 'server', 'certs');
const certPath = path.join(certDir, 'localhost.pem');
const keyPath = path.join(certDir, 'localhost-key.pem');

if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
}

console.log('[*] Checking SSL/TLS certificates for localhost HTTPS...');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  console.log('[+] Certificates already exist in server/certs/');
  process.exit(0);
}

// Try using mkcert first (as recommended in TECHSTACK.md)
let generated = false;

try {
  console.log('[*] Attempting to generate certs via mkcert...');
  execSync(`mkcert -cert-file "${certPath}" -key-file "${keyPath}" localhost 127.0.0.1 ::1`, {
    stdio: 'inherit'
  });
  console.log('[+] Successfully generated localhost certs using mkcert!');
  generated = true;
} catch (e) {
  console.log('[-] mkcert not found or failed. Falling back to OpenSSL self-signed certificate...');
}

if (!generated) {
  try {
    const opensslCmd = `openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"`;
    execSync(opensslCmd, { stdio: 'inherit' });
    console.log('[+] Successfully generated self-signed certificate via OpenSSL in server/certs/!');
    generated = true;
  } catch (err) {
    console.error('[-] Failed to run openssl command. Generating fallback JS certificate...');
    // If openssl isn't in PATH, create a placeholder or throw
    console.error(err);
    process.exit(1);
  }
}
