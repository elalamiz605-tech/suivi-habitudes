// État de l'application + sauvegarde dans le navigateur (localStorage).
import { uid, dateKey, addDays, today, setDayStart } from './utils.js';
import { setLang, detectLang, t } from './i18n.js';

const KEY = 'momentum:v2';
const LEGACY_KEY = 'suivi-habitudes:v1'; // données de la première version
export const APP_VERSION = '3.3';

export const COLORS = ['#ff5b3a', '#e6e8eb', '#7ea6e0', '#8fbf8a', '#d9b36c', '#b39ddb', '#6fc3c9', '#e08a9a'];
// Couleurs de la première palette, converties vers la palette sobre actuelle.
const OLD_COLORS = { '#7c5cff': '#b39ddb', '#22d3ee': '#6fc3c9', '#34d399': '#8fbf8a', '#fbbf24': '#d9b36c', '#f472b6': '#e08a9a', '#fb7185': '#ff5b3a', '#60a5fa': '#7ea6e0', '#a3e635': '#8fbf8a' };

export function newHabit(o = {}) {
  return {
    id: uid(),
    name: '',
    icon: '✅',
    color: COLORS[0],
    category: '',
    kind: 'check', // 'check' (oui/non) · 'count' (objectif chiffré) · 'quit' (mauvaise habitude : chaque jour tenu compte)
    target: 1,
    unit: '',
    // daily | days | weekly (perWeek) | interval (every N jours) | monthly (perMonth)
    schedule: { type: 'daily', days: [0, 1, 2, 3, 4], perWeek: 3, every: 2, perMonth: 10 },
    time: '',
    reminders: [], // heures de rappel "HH:MM"
    notes: '',
    archived: false,
    createdAt: dateKey(today()),
    log: {}, // { 'AAAA-MM-JJ': valeur }
    skips: {}, // { 'AAAA-MM-JJ': true } jours passés volontairement (la série continue)
    pauses: [], // [{ from, to }] périodes de pause ; to = '' → pause en cours
    journal: {}, // { 'AAAA-MM-JJ': { mood: 1..5, note } }
    identity: '', // « quelqu'un qui lit tous les jours » : chaque validation est un vote
    mini: {}, // { 'AAAA-MM-JJ': true } jours validés en version réduite (reprise après un raté)
    ...o,
  };
}

export function newTask(o = {}) {
  return {
    id: uid(),
    title: '',
    notes: '',
    priority: 1, // 0 basse · 1 moyenne · 2 haute · 3 urgente
    due: '',
    project: '',
    status: 'todo', // todo | doing | done
    subtasks: [],
    createdAt: dateKey(today()),
    doneAt: null,
    ...o,
  };
}

export function defaultSettings() {
  return {
    motion: true,
    name: '',
    lang: detectLang(),
    theme: 'dark', // auto | dark | light
    dayStart: 0, // heure de début de journée (0-6)
    notify: false,
    recapTime: '', // rappel du soir, '' = désactivé
    vacations: [], // [{ from, to }] ; to = '' → en cours
    heatmap: 'short', // short (20 semaines) | year
    installDismissed: false,
    onboarded: false, // écran de bienvenue vu (prénom, langue, premières habitudes)
    neverTwice: true, // mode « jamais deux fois » : reprise guidée après un raté
    ai: { key: '', model: 'claude-opus-5-5' }, // coach IA optionnel (clé stockée dans ce navigateur)
    lastReviewWeek: '', // dernière semaine dont le bilan a été consulté
    reviews: {}, // { 'AAAA-MM-JJ (lundi)': { ai: 'texte du coach' } }
    sync: { token: '', gistId: '', auto: false, lastAt: '' },
    cloud: { url: '', token: '', email: '', version: 0, auto: true, lastAt: '' }, // compte Momentum Cloud (optionnel)
  };
}

export function emptyState() {
  return { version: 2, habits: [], tasks: [], profile: { badges: [], perfectDays: [] }, settings: defaultSettings(), updatedAt: new Date().toISOString() };
}

// Générateur pseudo-aléatoire déterministe (même démo à chaque fois).
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Données de démonstration pour découvrir l'application. */
export function demoState() {
  const r = rng(7);
  const tday = today();
  const k = (n) => dateKey(addDays(tday, n));
  const created = k(-34);
  const fr = (key) => t(key);

  const habits = [
    newHabit({ name: fr('demo.water'), icon: '💧', color: '#6fc3c9', category: fr('cat.health'), kind: 'count', target: 8, unit: fr('tpl.u_glasses'), createdAt: created }),
    newHabit({ name: fr('demo.meditate'), icon: '🧘', color: '#e08a9a', category: fr('cat.mind'), schedule: { ...newHabit().schedule, type: 'days', days: [0, 1, 2, 3, 4] }, time: '07:00', reminders: ['07:00'], createdAt: created }),
    newHabit({ name: fr('demo.sport'), icon: '🏋️', color: '#8fbf8a', category: fr('cat.health'), schedule: { ...newHabit().schedule, type: 'weekly', perWeek: 3 }, time: '18:30', identity: fr('demo.id_athlete'), createdAt: created }),
    newHabit({ name: fr('demo.read'), icon: '📚', color: '#b39ddb', category: fr('cat.mind'), time: '21:30', reminders: ['21:30'], identity: fr('demo.id_reader'), createdAt: created }),
    newHabit({ name: fr('demo.walk'), icon: '🚶', color: '#d9b36c', category: fr('cat.health'), kind: 'count', target: 30, unit: fr('tpl.u_minutes'), identity: fr('tpl.id_body'), createdAt: created }),
    newHabit({ name: fr('demo.nosugar'), icon: '🚫', color: '#e6e8eb', category: fr('cat.health'), kind: 'quit', createdAt: k(-20) }),
  ];
  const odds = [0.85, 0.8, 0.45, 0.72, 0.8, 0.9];
  habits.forEach((h, i) => {
    for (let d = 34; d >= 1; d--) {
      if (k(-d) < h.createdAt) continue;
      if (r() < odds[i]) h.log[k(-d)] = h.target;
      else if (h.kind === 'count' && r() < 0.6) h.log[k(-d)] = 2 + Math.floor(r() * (h.target - 2));
    }
  });
  for (let d = 1; d <= 11; d++) habits[3].log[k(-d)] = 1; // belle série en lecture
  for (let d = 1; d <= 9; d++) habits[5].log[k(-d)] = 1; // 9 jours sans sucre
  habits[0].log[k(0)] = 3;
  habits[1].log[k(0)] = 1;
  habits[4].skips[k(-3)] = true; // un jour passé volontairement
  habits[3].journal[k(-1)] = { mood: 4, note: fr('demo.journal_note') };
  habits[3].journal[k(-2)] = { mood: 5, note: '' };

  const st = (title, done = false) => ({ id: uid(), title, done });
  const tasks = [
    newTask({ title: fr('demo.t1'), priority: 2, due: k(2), project: fr('cat.career'), status: 'doing', notes: fr('demo.t1_notes'), subtasks: [st(fr('demo.t1_s1'), true), st(fr('demo.t1_s2'), true), st(fr('demo.t1_s3')), st(fr('demo.t1_s4'))], createdAt: k(-6) }),
    newTask({ title: fr('demo.t2'), priority: 3, due: k(-1), project: fr('demo.proj_freelance'), notes: fr('demo.t2_notes'), createdAt: k(-4) }),
    newTask({ title: fr('demo.t3'), priority: 2, due: k(0), project: fr('demo.proj_freelance'), subtasks: [st(fr('demo.t3_s1')), st(fr('demo.t3_s2'), true), st(fr('demo.t3_s3'))], createdAt: k(-3) }),
    newTask({ title: fr('demo.t4'), priority: 1, due: k(6), project: fr('demo.proj_learning'), createdAt: k(-2) }),
    newTask({ title: fr('demo.t5'), priority: 0, project: fr('cat.career'), status: 'doing', createdAt: k(-8) }),
    newTask({ title: fr('demo.t6'), priority: 1, due: k(10), project: fr('cat.career'), createdAt: k(-1) }),
    newTask({ title: fr('demo.t7'), priority: 2, project: fr('demo.proj_freelance'), status: 'done', doneAt: k(-2), createdAt: k(-9) }),
    newTask({ title: fr('demo.t8'), priority: 0, project: fr('demo.proj_perso'), status: 'done', doneAt: k(-1), createdAt: k(-3) }),
  ];

  const s = emptyState();
  s.habits = habits;
  s.tasks = tasks;
  return s;
}

function migrateLegacy(raw) {
  const old = JSON.parse(raw);
  if (!Array.isArray(old)) return null;
  const s = emptyState();
  s.habits = old.map((o) => {
    const log = {};
    (o.done || []).forEach((key) => (log[key] = 1));
    const first = Object.keys(log).sort()[0];
    const createdAt = [o.createdAt, first].filter(Boolean).sort()[0] || dateKey(today());
    return newHabit({ name: String(o.name || 'Habitude'), icon: o.emoji || '✅', createdAt, log });
  });
  return s;
}

/** Complète les champs manquants (import, anciennes versions). */
export function normalize(s) {
  const base = emptyState();
  const def = defaultSettings();
  return {
    ...base,
    ...s,
    habits: (s.habits || []).map((h) => newHabit({
      ...h,
      color: OLD_COLORS[h.color] || h.color || COLORS[0],
      id: h.id || uid(),
      schedule: { ...newHabit().schedule, ...(h.schedule || {}) },
      reminders: Array.isArray(h.reminders) ? h.reminders.filter(Boolean).slice(0, 3) : [],
      log: h.log || {},
      skips: h.skips || {},
      pauses: Array.isArray(h.pauses) ? h.pauses : [],
      journal: h.journal || {},
      identity: h.identity || '',
      mini: h.mini || {},
    })),
    tasks: (s.tasks || []).map((t) => newTask({ ...t, id: t.id || uid(), subtasks: t.subtasks || [] })),
    profile: { ...base.profile, ...(s.profile || {}) },
    settings: { ...def, ...(s.settings || {}), sync: { ...def.sync, ...((s.settings || {}).sync || {}) }, ai: { ...def.ai, ...((s.settings || {}).ai || {}) }, cloud: { ...def.cloud, ...((s.settings || {}).cloud || {}) }, reviews: (s.settings || {}).reviews || {} },
    updatedAt: s.updatedAt || new Date().toISOString(),
    version: 2,
  };
}

function applySettings(s) {
  setDayStart(s.settings.dayStart);
  setLang(s.settings.lang);
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.version === 2) {
        const n = normalize(s);
        applySettings(n);
        return n;
      }
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const s = migrateLegacy(legacy);
      if (s && s.habits.length) return s;
    }
  } catch (_) { /* stockage indisponible ou données illisibles */ }
  // Premier lancement : application vide, l'écran de bienvenue guide l'utilisateur.
  const d = emptyState();
  applySettings(d);
  d.fresh = true;
  return d;
}

export const store = { state: load() };
const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function save() {
  store.state.updatedAt = new Date().toISOString();
  try { localStorage.setItem(KEY, JSON.stringify(store.state)); } catch (_) {}
}

/** Sauvegarde puis prévient l'interface qu'il faut se mettre à jour. */
export function commit() {
  save();
  listeners.forEach((fn) => fn(store.state));
}

export function replaceState(s, { silent = false } = {}) {
  store.state = normalize(s);
  delete store.state.fresh;
  applySettings(store.state);
  if (silent) save();
  else commit();
}

/** Réglages modifiés : réapplique langue et début de journée, puis sauvegarde. */
export function updateSettings(patch) {
  Object.assign(store.state.settings, patch);
  applySettings(store.state);
  commit();
}

// ---------- Actions ----------

export const findHabit = (id) => store.state.habits.find((h) => h.id === id);
export const findTask = (id) => store.state.tasks.find((t) => t.id === id);

export function setLog(h, key, value) {
  value = Math.max(0, Math.min(999, Math.round(value)));
  if (value === 0) delete h.log[key];
  else h.log[key] = value;
  if (key < h.createdAt) h.createdAt = key;
}

export function toggleSkip(h, key) {
  if (h.skips[key]) delete h.skips[key];
  else {
    h.skips[key] = true;
    delete h.log[key];
  }
}

export function setMini(h, key) {
  h.mini[key] = true;
  if (valueOn(h, key) < 1) h.log[key] = h.kind === 'count' ? Math.max(1, Math.ceil(h.target / 2)) : 1;
}

const valueOn = (h, key) => h.log[key] || 0;

export function setJournal(h, key, { mood = 0, note = '' }) {
  if (!mood && !note.trim()) delete h.journal[key];
  else h.journal[key] = { mood: Number(mood) || 0, note: note.trim() };
}

export function pauseHabit(h, from = dateKey(today())) {
  if (h.pauses.some((p) => !p.to)) return;
  h.pauses.push({ from, to: '' });
}

export function resumeHabit(h, on = dateKey(today())) {
  const p = h.pauses.find((x) => !x.to);
  if (!p) return;
  const yesterday = dateKey(addDays(today(), -1));
  if (p.from >= on) h.pauses.splice(h.pauses.indexOf(p), 1); // pause commencée aujourd'hui : on l'oublie
  else p.to = yesterday;
}

export const isPaused = (h, key = dateKey(today())) => h.pauses.some((p) => key >= p.from && (!p.to || key <= p.to));

export function setVacation(on, until = '') {
  const v = store.state.settings.vacations;
  const cur = v.find((x) => !x.to || x.to >= dateKey(today()));
  if (on) {
    if (cur) cur.to = until;
    else v.push({ from: dateKey(today()), to: until });
  } else if (cur) {
    const yesterday = dateKey(addDays(today(), -1));
    if (cur.from >= dateKey(today())) v.splice(v.indexOf(cur), 1);
    else cur.to = yesterday;
  }
}

export const currentVacation = (s = store.state) => s.settings.vacations.find((x) => x.from <= dateKey(today()) && (!x.to || x.to >= dateKey(today())));
export const isVacation = (s, key) => s.settings.vacations.some((x) => key >= x.from && (!x.to || key <= x.to));

export function setTaskStatus(t, status) {
  t.status = status;
  t.doneAt = status === 'done' ? dateKey(today()) : null;
}

/** Supprime un élément et renvoie une fonction d'annulation. */
export function removeWithUndo(list, item) {
  const i = list.indexOf(item);
  if (i === -1) return () => {};
  list.splice(i, 1);
  return () => {
    list.splice(Math.min(i, list.length), 0, item);
    commit();
  };
}
