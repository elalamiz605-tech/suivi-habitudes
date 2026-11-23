// Notifications discrètes en bas de l'écran.
import { esc } from './utils.js';

export function toast(message, { action, timeout = 4500 } = {}) {
  const root = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.innerHTML = `<span class="toast-msg">${esc(message)}</span>${action ? `<button class="toast-btn" type="button">${esc(action.label)}</button>` : ''}`;
  root.append(el);
  requestAnimationFrame(() => el.classList.add('in'));
  const dismiss = () => {
    clearTimeout(timer);
    el.classList.remove('in');
    setTimeout(() => el.remove(), 250);
  };
  const timer = setTimeout(dismiss, timeout);
  if (action) el.querySelector('button').addEventListener('click', () => { action.fn(); dismiss(); });
}
