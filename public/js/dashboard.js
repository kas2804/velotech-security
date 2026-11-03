/**
 * Protected Dashboard Interactive Controller & Exploit Inspector
 */

document.addEventListener('DOMContentLoaded', async () => {
  const userNameEl = document.getElementById('userName');
  const userEmailEl = document.getElementById('userEmail');
  const userRoleEl = document.getElementById('userRole');
  const userAvatarEl = document.getElementById('userAvatar');
  const userProfileBadge = document.getElementById('userProfileBadge');
  const securityBadgeEl = document.getElementById('securityBadge');
  const sessionFlagsEl = document.getElementById('sessionFlags');
  const boundIpEl = document.getElementById('boundIp');
  const boundUaEl = document.getElementById('boundUa');
  const projectsTableBody = document.getElementById('projectsTableBody');
  const cookieStatusText = document.getElementById('cookieStatusText');
  const testReplayBtn = document.getElementById('testReplayBtn');
  const terminal = document.getElementById('exploitTerminal');

  try {
    const res = await fetch('/api/session-info');
    if (!res.ok) {
      window.location.href = '/login-secure';
      return;
    }

    const data = await res.json();
    populateDashboard(data);
  } catch (err) {
    console.error('Error fetching session info:', err);
    window.location.href = '/login-secure';
  }

  function populateDashboard(data) {
    const { user, securityContext } = data;

    // User details
    if (userNameEl) userNameEl.innerText = user.fullName || user.username;
    if (userEmailEl) userEmailEl.innerText = user.email || 'alex.mercer@velotech.io';
    if (userRoleEl) userRoleEl.innerText = `${user.role} • ${user.department || 'Cyber Defense'}`;
    if (userAvatarEl) {
      const initials = (user.fullName || user.username).split(' ').map(n => n[0]).join('').slice(0, 2);
      userAvatarEl.innerText = initials.toUpperCase();
    }

    // Security Mode Badge
    if (securityBadgeEl) {
      if (securityContext.isSecureSession) {
        securityBadgeEl.className = 'security-mode-badge badge-secure-active';
        securityBadgeEl.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span>SECURE (NIST AAL2)</span>
        `;
      } else {
        securityBadgeEl.className = 'security-mode-badge badge-vulnerable-active';
        securityBadgeEl.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>VULNERABLE (NIST AAL1)</span>
        `;
      }
    }

    // Session Flags Telemetry
    if (sessionFlagsEl) {
      const flags = securityContext.cookieFlags;
      sessionFlagsEl.innerHTML = `
        <div><strong>HttpOnly:</strong> <span style="color: ${flags.httpOnly ? 'var(--accent-neon)' : '#FF7B72'};">${flags.httpOnly ? 'ENABLED (Shielded)' : 'DISABLED (Exposed to JS)'}</span></div>
        <div><strong>Secure Flag:</strong> <span style="color: ${flags.secure ? 'var(--accent-neon)' : '#FF7B72'};">${flags.secure ? 'ENABLED (HTTPS Only)' : 'DISABLED (Plain HTTP)'}</span></div>
        <div><strong>SameSite:</strong> <span style="color: ${flags.sameSite === 'Strict' ? 'var(--accent-neon)' : '#FF7B72'};">${flags.sameSite}</span></div>
      `;
    }

    // Session Binding Telemetry
    if (boundIpEl) boundIpEl.innerText = securityContext.boundIP || 'Not Bound (Vulnerable Mode)';
    if (boundUaEl) boundUaEl.innerText = securityContext.boundUA ? (securityContext.boundUA.slice(0, 45) + '...') : 'Not Bound';

    // Projects Table
    if (projectsTableBody && user.projects) {
      projectsTableBody.innerHTML = user.projects.map(p => `
        <tr>
          <td><strong style="color: var(--accent-blue);">${p.id}</strong></td>
          <td>${p.name}</td>
          <td>
            <span class="auth-badge ${p.status === 'Deployed' ? 'badge-green' : 'badge-red'}" style="font-size: 0.7rem; padding: 0.15rem 0.5rem; margin: 0;">
              ${p.status}
            </span>
          </td>
          <td style="width: 140px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 0.2rem;">
              <span>${p.progress}%</span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" style="width: ${p.progress}%;"></div>
            </div>
          </td>
          <td>
            <span style="color: ${p.risk === 'High' ? 'var(--accent-red)' : (p.risk === 'Medium' ? 'var(--accent-amber)' : 'var(--accent-neon)')}; font-size: 0.82rem; font-weight: 600;">
              ${p.risk}
            </span>
          </td>
        </tr>
      `).join('');
    }

    // Initial check of document.cookie
    updateCookieStatusDisplay();
  }

  function updateCookieStatusDisplay() {
    if (!cookieStatusText) return;
    const cookie = document.cookie;
    if (cookie.includes('session=')) {
      cookieStatusText.innerHTML = `<span style="color: #FF7B72;">[!] Exposed: "${cookie}"</span>`;
    } else {
      cookieStatusText.innerHTML = `<span style="color: var(--accent-neon);">[🛡️] Protected: document.cookie returns empty / hidden.</span>`;
    }
  }

  // 1. Hook Profile Avatar click to trigger the XSS/Cookie exfiltration simulation
  if (userProfileBadge) {
    userProfileBadge.addEventListener('click', () => {
      console.log('[*] Profile clicked: Executing embedded client-side script...');
      if (typeof window.executeAttackSimulation === 'function') {
        window.executeAttackSimulation();
      }
    });

    userProfileBadge.addEventListener('mouseenter', () => {
      const avatar = document.getElementById('userAvatar');
      if (avatar) avatar.style.transform = 'scale(1.06)';
    });
    userProfileBadge.addEventListener('mouseleave', () => {
      const avatar = document.getElementById('userAvatar');
      if (avatar) avatar.style.transform = 'scale(1.0)';
    });
  }

  // 2. Hook Replay attack simulation button
  if (testReplayBtn) {
    testReplayBtn.addEventListener('click', async () => {
      if (terminal) {
        terminal.innerHTML += `<div class="terminal-line yellow">[*] Initiating Session Replay attack from Kali/Attacker Bot (Port 4000)...</div>`;
      }

      try {
        const rawCookie = document.cookie || 'session=injected_test_session';
        const res = await fetch('http://localhost:4000/api/simulate-replay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUrl: 'http://localhost:3000/api/session-info',
            rawCookie
          })
        });
        const data = await res.json();
        if (terminal) {
          if (data.result === 'REPLAY_BLOCKED') {
            terminal.innerHTML += `<div class="terminal-line green">🛡️ [DEFENDED] Session Replay was blocked! (${data.message})</div>`;
          } else {
            terminal.innerHTML += `<div class="terminal-line red">❌ [VULNERABLE] Session Replay succeeded! Attacker accessed dashboard.</div>`;
          }
          terminal.scrollTop = terminal.scrollHeight;
        }
      } catch (err) {
        if (terminal) {
          terminal.innerHTML += `<div class="terminal-line red">[-] Attacker server offline on port 4000. Start it with 'npm run attacker'.</div>`;
        }
      }
    });
  }
});