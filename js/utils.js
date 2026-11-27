// Petites fonctions utilitaires : dates, texte, formatage.
import { t, locale, onLangChange } from './i18n.js';

export const uid = () =>
  Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-5);

// Heure à laquelle commence la « journée » (0 = minuit). Avant cette heure,
// on considère qu'on est encore la veille (pour les couche-tard).
let dayStart = 0;
export const setDayStart = (h) => { dayStart = Math.max(0, Math.min(6, Number(h) || 0)); };
export const getDayStart = () => dayStart;

/** Date locale au format AAAA-MM-JJ (pas de décalage de fuseau horaire). */
export function dateKey(d = today()) {
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

export function addMonths(date, n) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

/** La date « logique » du jour, en tenant compte du début de journée. */
export function today() {
  const d = new Date();
  d.setHours(d.getHours() - dayStart);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Heure courante "HH:MM" (vraie heure, indépendante du début de journée). */
export function nowHM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 0 = lundi … 6 = dimanche */
export const weekday = (d) => (d.getDay() + 6) % 7;
export const startOfWeek = (d) => addDays(d, -weekday(d));
export const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
export const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export function daysBetween(a, b) {
  return Math.round((parseKey(dateKey(b)) - parseKey(dateKey(a))) / 864e5);
}

export const weekdays = () => [0, 1, 2, 3, 4, 5, 6].map((i) => t(`weekday.${i}`));
export const weekdaysShort = () => [0, 1, 2, 3, 4, 5, 6].map((i) => t(`weekdayS.${i}`));
export const weekdayLong = (i) => t(`weekdayL.${i}`);

let fFull, fShort, fWeekday, fMonth, fDateTime;
function buildFormats() {
  const l = locale();
  fFull = new Intl.DateTimeFormat(l, { weekday: 'long', day: 'numeric', month: 'long' });
  fShort = new Intl.DateTimeFormat(l, { day: 'numeric', month: 'short' });
  fWeekday = new Intl.DateTimeFormat(l, { weekday: 'long' });
  fMonth = new Intl.DateTimeFormat(l, { month: 'short' });
  fDateTime = new Intl.DateTimeFormat(l, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
buildFormats();
onLangChange(buildFormats);

export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const fmtFull = (d) => cap(fFull.format(d));
export const fmtShort = (d) => fShort.format(d);
export const fmtMonth = (d) => cap(fMonth.format(d));
export const fmtDateTime = (d) => fDateTime.format(d);

export function relativeDue(key) {
  const n = daysBetween(today(), parseKey(key));
  if (n === 0) return t('common.today');
  if (n === 1) return t('common.tomorrow');
  if (n === -1) return t('common.yesterday');
  if (n < 0) return t('due.late', { n: -n });
  if (n < 7) return cap(fWeekday.format(parseKey(key)));
  return fmtShort(parseKey(key));
}

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const pct = (x) => `${Math.round((x ?? 0) * 100)} %`;

/** Minuscules sans accents, pour la recherche. */
export const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Télécharge un texte comme fichier. */
export function download(name, content, type = 'application/json') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Durée mm:ss pour le minuteur. */
export const fmtClock = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
