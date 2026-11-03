/**
 * Vulnerable Login Page Interactive Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('vulnerableLoginForm');
  const loginCard = document.getElementById('vulnerableAuthCard');
  const alertContainer = document.getElementById('alertContainer');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const togglePasswordBtn = document.getElementById('togglePassword');
  const quickFillBtn = document.getElementById('quickFillCreds');

  // Password toggle
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

  // Form submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      alertContainer.innerHTML = '';

      const username = usernameInput.value.trim();
      const password = passwordInput.value;

      if (!username || !password) {
        triggerShake('Please enter both username and password.');
        return;
      }

      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Authenticating...</span>';

      try {
        const response = await fetch('/login-vulnerable', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          alertContainer.innerHTML = `
            <div class="alert alert-success">
              <span>Authentication successful. Redirecting to dashboard...</span>
            </div>
          `;
          setTimeout(() => {
            window.location.href = data.redirect || '/dashboard';
          }, 600);
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

  function triggerShake(message) {
    alertContainer.innerHTML = `
      <div class="alert alert-danger">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>${message}</span>
      </div>
    `;

    loginCard.classList.remove('shake-animation');
    void loginCard.offsetWidth; // Trigger reflow
    loginCard.classList.add('shake-animation');
  }
});
