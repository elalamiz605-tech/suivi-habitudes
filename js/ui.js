// Effets d'interface : notifications, confettis 3D, inclinaison 3D des cartes, compteurs animés.
import { esc, prefersReducedMotion } from './utils.js';

export function toast(message, { icon = '', action, timeout = 4500 } = {}) {
  const root = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.innerHTML = `${icon ? `<span class="toast-ic">${icon}</span>` : ''}<span class="toast-msg">${esc(message)}</span>${action ? `<button class="toast-btn" type="button">${esc(action.label)}</button>` : ''}`;
  root.append(el);
  requestAnimationFrame(() => el.classList.add('in'));
  const dismiss = () => {
    clearTimeout(timer);
    el.classList.remove('in');
    setTimeout(() => el.remove(), 400);
  };
  const timer = setTimeout(dismiss, timeout);
  if (action) el.querySelector('button').addEventListener('click', () => { action.fn(); dismiss(); });
}

export function confetti() {
  if (prefersReducedMotion()) return;
  const colors = ['#7c5cff', '#22d3ee', '#34d399', '#fbbf24', '#f472b6', '#ffffff'];
  for (let i = 0; i < 110; i++) {
    const p = document.createElement('i');
    p.className = 'confetti';
    p.style.background = colors[i % colors.length];
    p.style.left = `${50 + (Math.random() - 0.5) * 20}vw`;
    p.style.width = `${6 + Math.random() * 6}px`;
    p.style.height = `${10 + Math.random() * 8}px`;
    document.body.append(p);
    const dx = (Math.random() - 0.5) * window.innerWidth * 0.9;
    const up = -(200 + Math.random() * window.innerHeight * 0.45);
    const rx = 360 + Math.random() * 720, ry = 360 + Math.random() * 1080;
    p.animate(
      [
        { transform: 'translate3d(0,0,0) rotateX(0) rotateY(0)', opacity: 1 },
        { transform: `translate3d(${dx * 0.6}px, ${up}px, 0) rotateX(${rx / 2}deg) rotateY(${ry / 2}deg)`, opacity: 1, offset: 0.35 },
        { transform: `translate3d(${dx}px, ${window.innerHeight * 0.75}px, 0) rotateX(${rx}deg) rotateY(${ry}deg)`, opacity: 0 },
      ],
      { duration: 2000 + Math.random() * 1400, easing: 'cubic-bezier(.15,.6,.35,1)' },
    ).onfinish = () => p.remove();
  }
}

/** Cartes qui s'inclinent en 3D sous la souris, avec un reflet lumineux. */
export function initTilt(root) {
  if (matchMedia('(pointer: coarse)').matches || prefersReducedMotion()) return;
  let cur = null;
  const reset = (el) => { if (el) el.style.transform = ''; };
  root.addEventListener('pointermove', (e) => {
    const el = e.target.closest('.tilt');
    if (cur !== el) reset(cur);
    cur = el;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const max = el.classList.contains('tilt-soft') ? 2.5 : 8;
    el.style.transform = `perspective(900px) rotateX(${(0.5 - y) * max}deg) rotateY(${(x - 0.5) * max}deg) translateZ(0)`;
    el.style.setProperty('--mx', `${x * 100}%`);
    el.style.setProperty('--my', `${y * 100}%`);
  });
  root.addEventListener('pointerleave', () => { reset(cur); cur = null; });
}

/** Fait défiler les chiffres de 0 jusqu'à leur valeur. */
export function countUp(root) {
  if (prefersReducedMotion()) return;
  root.querySelectorAll('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    if (!end) return;
    const t0 = performance.now(), dur = 1000;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    el.textContent = '0';
    requestAnimationFrame(step);
  });
}
