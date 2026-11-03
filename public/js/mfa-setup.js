/**
 * MFA Enrollment & Authenticator Setup Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const qrImageEl = document.getElementById('qrImage');
  const secretKeyEl = document.getElementById('secretKey');
  const copySecretBtn = document.getElementById('copySecretBtn');
  const liveTokenEl = document.getElementById('liveToken');
  const countdownTimerEl = document.getElementById('countdownTimer');

  try {
    const res = await fetch('/api/mfa-qr');
    const data = await res.json();

    if (data.success) {
      qrImageEl.src = data.qrDataUrl;
      secretKeyEl.innerText = data.secret;
    }
  } catch (err) {
    console.error('Failed to load QR code:', err);
  }

  // Copy secret key
  if (copySecretBtn) {
    copySecretBtn.addEventListener('click', () => {
      const secret = secretKeyEl.innerText;
      navigator.clipboard.writeText(secret).then(() => {
        const originalText = copySecretBtn.innerText;
        copySecretBtn.innerText = 'Copied!';
        setTimeout(() => copySecretBtn.innerText = originalText, 2000);
      });
    });
  }

  // Polling loop for live token demonstration
  async function updateLiveToken() {
    try {
      const res = await fetch('/api/totp-current');
      const data = await res.json();
      if (liveTokenEl) liveTokenEl.innerText = data.token;
      if (countdownTimerEl) countdownTimerEl.innerText = `${data.remainingSeconds}s`;
    } catch (e) {
      console.error(e);
    }
  }

  updateLiveToken();
  setInterval(updateLiveToken, 1000);
});
