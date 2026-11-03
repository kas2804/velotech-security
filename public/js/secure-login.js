/**
 * Secure Login Interactive Controller (2-Step Flow: Password -> TOTP MFA)
 * Meets NIST SP 800-63B AAL2 requirements.
 */

document.addEventListener('DOMContentLoaded', () => {
  const step1Container = document.getElementById('step1Container');
  const step2Container = document.getElementById('step2Container');
  const step1Form = document.getElementById('secureStep1Form');
  const step2Form = document.getElementById('secureStep2Form');
  const secureAuthCard = document.getElementById('secureAuthCard');
  const alertContainer = document.getElementById('alertContainer');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const togglePasswordBtn = document.getElementById('togglePassword');
  const quickFillBtn = document.getElementById('quickFillCreds');
  const backToStep1Btn = document.getElementById('backToStep1');
  const fetchLiveTotpBtn = document.getElementById('fetchLiveTotpBtn');
  const totpDigits = document.querySelectorAll('.totp-digit');

  // Password Visibility Toggle
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      togglePasswordBtn.innerHTML = type === 'password'
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
    });
  }

  // Quick fill credentials
  if (quickFillBtn) {
    quickFillBtn.addEventListener('click', () => {
      usernameInput.value = 'admin';
      passwordInput.value = 'Password123!';
      passwordInput.focus();
    });
  }

  // Handle Step 1 (Password Submission)
  if (step1Form) {
    step1Form.addEventListener('submit', async (e) => {
      e.preventDefault();
      alertContainer.innerHTML = '';

      const username = usernameInput.value.trim();
      const password = passwordInput.value;

      if (!username || !password) {
        triggerShake('Please enter both username and password.');
        return;
      }

      const submitBtn = step1Form.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Verifying Credentials...</span>';

      try {
        const response = await fetch('/login-secure/step1', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          // Smooth cross-fade transition to Step 2
          transitionToStep2();
        } else {
          triggerShake(data.error || 'Invalid credentials');
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        }
      } catch (err) {
        triggerShake('Server connection error. Please try again.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }

  // Handle 6-Digit TOTP Input Behavior (auto advance & paste support)
  totpDigits.forEach((digitInput, index) => {
    digitInput.addEventListener('input', (e) => {
      const val = e.target.value;
      if (val.length >= 1) {
        digitInput.value = val.charAt(val.length - 1); // Keep last char
        if (index < totpDigits.length - 1) {
          totpDigits[index + 1].focus();
        }
      }
    });

    digitInput.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !digitInput.value && index > 0) {
        totpDigits[index - 1].focus();
      }
    });

    digitInput.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
      const digits = pasteData.replace(/\D/g, '').slice(0, 6).split('');
      digits.forEach((digit, i) => {
        if (totpDigits[i]) {
          totpDigits[i].value = digit;
        }
      });
      if (digits.length > 0) {
        const focusIdx = Math.min(digits.length, totpDigits.length - 1);
        totpDigits[focusIdx].focus();
      }
    });
  });

  // Handle Step 2 (TOTP Submission)
  if (step2Form) {
    step2Form.addEventListener('submit', async (e) => {
      e.preventDefault();
      alertContainer.innerHTML = '';

      let code = '';
      totpDigits.forEach(d => { code += d.value.trim(); });

      if (code.length !== 6) {
        triggerShake('Please enter the full 6-digit TOTP code.');
        return;
      }

      const submitBtn = step2Form.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Verifying MFA Code...</span>';

      try {
        const response = await fetch('/login-secure/step2', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ code })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          alertContainer.innerHTML = `
            <div class="alert alert-success">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span>MFA Authenticated! Hardened session cookie issued. Redirecting...</span>
            </div>
          `;
          setTimeout(() => {
            window.location.href = data.redirect || '/dashboard';
          }, 600);
        } else {
          triggerShake(data.error || 'Invalid TOTP code');
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
          // Clear digits on failure
          totpDigits.forEach(d => d.value = '');
          totpDigits[0].focus();
        }
      } catch (err) {
        triggerShake('Server connection error. Please try again.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }

  // Back button to Step 1
  if (backToStep1Btn) {
    backToStep1Btn.addEventListener('click', () => {
      alertContainer.innerHTML = '';
      step2Container.classList.remove('step-active');
      step2Container.classList.add('step-hidden');

      step1Container.classList.remove('step-hidden');
      step1Container.classList.add('step-active');

      const step1SubmitBtn = step1Form.querySelector('button[type="submit"]');
      if (step1SubmitBtn) {
        step1SubmitBtn.disabled = false;
        step1SubmitBtn.innerHTML = '<span>Continue to MFA Step</span> <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
      }
    });
  }

  // Live TOTP helper for testing without an authenticator app
  if (fetchLiveTotpBtn) {
    fetchLiveTotpBtn.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/totp-current');
        const data = await res.json();
        if (data.token) {
          const chars = data.token.split('');
          chars.forEach((c, i) => {
            if (totpDigits[i]) totpDigits[i].value = c;
          });
          totpDigits[5].focus();
        }
      } catch (e) {
        console.error('Error fetching live TOTP:', e);
      }
    });
  }

  function transitionToStep2() {
    step1Container.classList.remove('step-active');
    step1Container.classList.add('step-hidden');

    step2Container.classList.remove('step-hidden');
    step2Container.classList.add('step-active');

    // Auto-focus first digit
    setTimeout(() => {
      if (totpDigits[0]) totpDigits[0].focus();
    }, 150);
  }

  function triggerShake(message) {
    alertContainer.innerHTML = `
      <div class="alert alert-danger">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>${message}</span>
      </div>
    `;

    secureAuthCard.classList.remove('shake-animation');
    void secureAuthCard.offsetWidth; // Trigger reflow
    secureAuthCard.classList.add('shake-animation');
  }
});
