// Rappels : notifications à l'heure prévue et récapitulatif du soir.
// Fonctionne quand l'application (onglet ou PWA installée) est ouverte ; sans serveur,
// un navigateur ne peut pas réveiller la page tout seul.
import { store } from './store.js';
import * as L from './logic.js';
import { t } from './i18n.js';
import { nowHM, dateKey, today } from './utils.js';
import { swRegistration } from './pwa.js';
import { toast } from './ui.js';

const FIRED_KEY = 'momentum:fired';
let fired = new Set();
try { fired = new Set(JSON.parse(localStorage.getItem(FIRED_KEY) || '[]')); } catch (_) {}

export const supported = () => 'Notification' in window;
export const permission = () => (supported() ? Notification.permission : 'unsupported');

export async function requestPermission() {
  if (!supported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try { return await Notification.requestPermission(); } catch (_) { return Notification.permission; }
}

/** Affiche une notification (via le service worker si possible), sinon un toast. */
export async function notify(title, body = '', { tag = 'momentum', url = './app.html#/today' } = {}) {
  if (permission() !== 'granted') {
    toast(`${title}${body ? ' · ' + body : ''}`, { timeout: 8000 });
    return;
  }
  const reg = swRegistration() || (navigator.serviceWorker && await navigator.serviceWorker.getRegistration());
  try {
    if (reg?.active) {
      reg.active.postMessage({ type: 'notify', title, body, tag, url });
      return;
    }
    new Notification(title, { body, tag, icon: './assets/icons/icon-192.png' });
  } catch (_) {
    toast(`${title}${body ? ' · ' + body : ''}`, { timeout: 8000 });
  }
}

function remember(id) {
  fired.add(id);
  // On ne garde que les identifiants du jour.
  const k = dateKey(today());
  fired = new Set([...fired].filter((x) => x.startsWith(k)));
  try { localStorage.setItem(FIRED_KEY, JSON.stringify([...fired])); } catch (_) {}
}

const minutes = (hm) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));

let lastHM = nowHM();

/** Vérifie les rappels dus depuis le dernier passage (tolérance de 10 min). */
export function tick() {
  const s = store.state;
  const hm = nowHM();
  const from = minutes(lastHM), to = minutes(hm);
  lastHM = hm;
  if (!s.settings.notify || permission() !== 'granted') return;
  const inWindow = (time) => {
    const m = minutes(time);
    if (to < from) return m > from || m <= to; // passage de minuit
    return m > from && m <= to && to - m <= 10;
  };
  const k = dateKey(today());
  const due = s.habits.filter((h) => !h.archived && L.isDueToday(h) && !L.isDone(h, k));
  for (const h of due) {
    for (const time of h.reminders || []) {
      const id = `${k}|${h.id}|${time}`;
      if (inWindow(time) && !fired.has(id)) {
        remember(id);
        notify(h.name, t('remind.body', { time }), { tag: `habit-${h.id}` });
      }
    }
  }
  const recap = s.settings.recapTime;
  if (recap && due.length && inWindow(recap) && !fired.has(`${k}|recap`)) {
    remember(`${k}|recap`);
    const title = due.length === 1 ? t('remind.recap_one') : t('remind.recap_title', { n: due.length });
    notify(title, due.map((h) => h.name).join(' · '), { tag: 'recap' });
  }
}

export function startReminders() {
  tick();
  setInterval(tick, 20_000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
}
