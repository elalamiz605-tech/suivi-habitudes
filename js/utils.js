// Petites fonctions utilitaires : dates, texte, formatage.

export const uid = () =>
  Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-5);

/** Date locale au format AAAA-MM-JJ (pas de décalage de fuseau horaire). */
export function dateKey(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date, n) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + n);
  return d;
}

export function today() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** 0 = lundi … 6 = dimanche */
export const weekday = (d) => (d.getDay() + 6) % 7;
export const startOfWeek = (d) => addDays(d, -weekday(d));

export function daysBetween(a, b) {
  return Math.round((parseKey(dateKey(b)) - parseKey(dateKey(a))) / 864e5);
}

export const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
export const WEEKDAYS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const fFull = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const fShort = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const fWeekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' });

export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const fmtFull = (d) => cap(fFull.format(d));
export const fmtShort = (d) => fShort.format(d);

export function relativeDue(key) {
  const n = daysBetween(today(), parseKey(key));
  if (n === 0) return "Aujourd'hui";
  if (n === 1) return 'Demain';
  if (n === -1) return 'Hier';
  if (n < 0) return `En retard de ${-n} j`;
  if (n < 7) return cap(fWeekday.format(parseKey(key)));
  return fmtShort(parseKey(key));
}

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const pct = (x) => `${Math.round((x ?? 0) * 100)} %`;
export const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

/** Minuscules sans accents, pour la recherche. */
export const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
