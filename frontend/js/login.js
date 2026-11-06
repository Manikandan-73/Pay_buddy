/**
 * PayBuddy Premium Login Controller
 */

import { apiRequest } from './api.js';
import { saveSession, requireGuest } from './auth.js';
import { showToast } from './utils.js';

requireGuest();

const form = document.getElementById('login-form');
const btnSubmit = document.getElementById('btn-submit');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const btnTogglePwd = document.getElementById('btn-toggle-password');
const eyeIcon = document.getElementById('pwd-eye-icon');

// Password Visibility Toggle
btnTogglePwd?.addEventListener('click', () => {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';

  if (isPassword) {
    eyeIcon.innerHTML = `
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    `;
  } else {
    eyeIcon.innerHTML = `
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    `;
  }
});

// Quick Demo Fills
document.getElementById('fill-alice')?.addEventListener('click', () => {
  emailInput.value = 'alice@paybuddy.local';
  passwordInput.value = 'Password@123';
});

document.getElementById('fill-bob')?.addEventListener('click', () => {
  emailInput.value = 'bob@paybuddy.local';
  passwordInput.value = 'Password@123';
});

document.getElementById('fill-charlie')?.addEventListener('click', () => {
  emailInput.value = 'charlie@paybuddy.local';
  passwordInput.value = 'Password@123';
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showToast('Please enter both credentials.', 'error');
    return;
  }

  btnSubmit.disabled = true;
  btnSubmit.classList.add('btn-loading');

  try {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    saveSession(response.data);
    showToast('Login verified! Launching wallet...', 'success');

    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 450);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.classList.remove('btn-loading');
  }
});
