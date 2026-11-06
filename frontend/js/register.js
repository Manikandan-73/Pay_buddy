/**
 * PayBuddy Premium Register Controller
 * Dynamic Strength Evaluation & Atomic Provisioning
 */

import { apiRequest } from './api.js';
import { saveSession, requireGuest } from './auth.js';
import { showToast } from './utils.js';

requireGuest();

const form = document.getElementById('register-form');
const btnSubmit = document.getElementById('btn-submit');
const pwdInput = document.getElementById('password');
const strengthBar = document.getElementById('strength-bar');
const strengthText = document.getElementById('strength-text');

// Dynamic Password Strength Meter
pwdInput?.addEventListener('input', () => {
  const val = pwdInput.value;
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;

  if (val.length === 0) {
    strengthBar.style.width = '0%';
    strengthText.textContent = 'Password strength: minimum 8 characters';
  } else if (score <= 1) {
    strengthBar.style.width = '25%';
    strengthBar.style.backgroundColor = 'var(--color-error)';
    strengthText.textContent = 'Weak password';
  } else if (score === 2) {
    strengthBar.style.width = '50%';
    strengthBar.style.backgroundColor = 'var(--color-warning)';
    strengthText.textContent = 'Moderate password';
  } else if (score === 3) {
    strengthBar.style.width = '75%';
    strengthBar.style.backgroundColor = 'var(--color-secondary)';
    strengthText.textContent = 'Strong password';
  } else {
    strengthBar.style.width = '100%';
    strengthBar.style.backgroundColor = 'var(--color-success)';
    strengthText.textContent = 'Excellent bank-grade password';
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const fullName = document.getElementById('fullName').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = pwdInput.value;

  if (password.length < 8) {
    showToast('Password must be at least 8 characters.', 'error');
    return;
  }

  btnSubmit.disabled = true;
  btnSubmit.classList.add('btn-loading');

  try {
    const response = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ fullName, phone, email, password })
    });

    saveSession(response.data);
    showToast('Wallet provisioned successfully!', 'success');

    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 500);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.classList.remove('btn-loading');
  }
});
