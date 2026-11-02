/**
 * Register Page Controller
 */

import { apiRequest } from './api.js';
import { saveSession, requireGuest } from './auth.js';
import { showToast } from './utils.js';

requireGuest();

const form = document.getElementById('register-form');
const btnSubmit = document.getElementById('btn-submit');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const fullName = document.getElementById('fullName').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

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
    }, 600);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.classList.remove('btn-loading');
  }
});
