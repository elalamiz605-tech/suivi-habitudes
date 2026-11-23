// État de l'application + sauvegarde dans le navigateur (localStorage).
import { uid, dateKey, addDays, today } from './utils.js';

const KEY = 'momentum:v2';
const LEGACY_KEY = 'suivi-habitudes:v1'; // données de la première version

export const COLORS = ['#7c5cff', '#22d3ee', '#34d399', '#fbbf24', '#f472b6', '#fb7185', '#60a5fa', '#a3e635'];

export function newHabit(o = {}) {
  return {
    id: uid(),
    name: '',
    icon: '✅',
    color: COLORS[0],
    category: '',
    kind: 'check', // 'check' (oui/non) ou 'count' (objectif chiffré)
    target: 1,
    unit: '',
    schedule: { type: 'daily', days: [0, 1, 2, 3, 4], perWeek: 3 }, // daily | days | weekly
    time: '',
    notes: '',
    archived: false,
    createdAt: dateKey(today()),
    log: {}, // { 'AAAA-MM-JJ': valeur }
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

export function emptyState() {
  return { version: 2, habits: [], tasks: [], profile: { badges: [], perfectDays: [] }, settings: { motion: true, name: '' } };
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
  const t = today();
  const k = (n) => dateKey(addDays(t, n));
  const created = k(-34);

  const habits = [
    newHabit({ name: "Boire de l'eau", icon: '💧', color: '#22d3ee', category: 'Santé', kind: 'count', target: 8, unit: 'verres', createdAt: created }),
    newHabit({ name: 'Méditation 10 min', icon: '🧘', color: '#f472b6', category: 'Esprit', schedule: { type: 'days', days: [0, 1, 2, 3, 4], perWeek: 3 }, time: '07:00', createdAt: created }),
    newHabit({ name: 'Séance de sport', icon: '🏋️', color: '#34d399', category: 'Santé', schedule: { type: 'weekly', days: [], perWeek: 3 }, time: '18:30', createdAt: created }),
    newHabit({ name: 'Lecture 20 pages', icon: '📚', color: '#7c5cff', category: 'Esprit', time: '21:30', createdAt: created }),
    newHabit({ name: 'Coder 1 heure', icon: '💻', color: '#fbbf24', category: 'Carrière', schedule: { type: 'days', days: [0, 1, 2, 3, 4, 5], perWeek: 3 }, createdAt: created }),
  ];
  const odds = [0.85, 0.8, 0.45, 0.72, 0.8];
  habits.forEach((h, i) => {
    for (let d = 34; d >= 1; d--) {
      if (r() < odds[i]) h.log[k(-d)] = h.target;
      else if (h.kind === 'count' && r() < 0.6) h.log[k(-d)] = 2 + Math.floor(r() * (h.target - 2));
    }
  });
  for (let d = 1; d <= 11; d++) habits[3].log[k(-d)] = 1; // belle série en lecture
  habits[0].log[k(0)] = 3;
  habits[1].log[k(0)] = 1;

  const st = (title, done = false) => ({ id: uid(), title, done });
  const tasks = [
    newTask({ title: 'Mettre en ligne le portfolio GitHub', priority: 2, due: k(2), project: 'Carrière', status: 'doing', notes: 'Mettre en avant 3 projets avec captures et démos en ligne.', subtasks: [st('Choisir les 3 meilleurs projets', true), st('Écrire des README clairs', true), st('Activer GitHub Pages'), st('Partager sur LinkedIn')], createdAt: k(-6) }),
    newTask({ title: 'Relancer le client du salon', priority: 3, due: k(-1), project: 'Freelance', notes: 'Envoyer le devis mis à jour et la nouvelle maquette.', createdAt: k(-4) }),
    newTask({ title: 'Préparer la réunion client', priority: 2, due: k(0), project: 'Freelance', subtasks: [st('Ordre du jour'), st('Chiffres du mois', true), st('Démo de la maquette')], createdAt: k(-3) }),
    newTask({ title: 'Suivre le tutoriel Three.js', priority: 1, due: k(6), project: 'Apprentissage', createdAt: k(-2) }),
    newTask({ title: 'Optimiser les images du site', priority: 0, project: 'Carrière', status: 'doing', createdAt: k(-8) }),
    newTask({ title: 'Mettre à jour le CV', priority: 1, due: k(10), project: 'Carrière', createdAt: k(-1) }),
    newTask({ title: 'Facturer le projet restaurant', priority: 2, project: 'Freelance', status: 'done', doneAt: k(-2), createdAt: k(-9) }),
    newTask({ title: 'Faire les courses', priority: 0, project: 'Perso', status: 'done', doneAt: k(-1), createdAt: k(-3) }),
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
function normalize(s) {
  const base = emptyState();
  return {
    ...base,
    ...s,
    habits: (s.habits || []).map((h) => newHabit({ ...h, id: h.id || uid(), schedule: { ...newHabit().schedule, ...(h.schedule || {}) }, log: h.log || {} })),
    tasks: (s.tasks || []).map((t) => newTask({ ...t, id: t.id || uid(), subtasks: t.subtasks || [] })),
    profile: { ...base.profile, ...(s.profile || {}) },
    settings: { ...base.settings, ...(s.settings || {}) },
    version: 2,
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.version === 2) return normalize(s);
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const s = migrateLegacy(legacy);
      if (s && s.habits.length) return s;
    }
  } catch (_) { /* stockage indisponible ou données illisibles */ }
  return demoState();
}

export const store = { state: load() };
const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(store.state)); } catch (_) {}
}

/** Sauvegarde puis prévient l'interface qu'il faut se mettre à jour. */
export function commit() {
  save();
  listeners.forEach((fn) => fn(store.state));
}

export function replaceState(s) {
  store.state = normalize(s);
  commit();
}

// ---------- Actions ----------

export const findHabit = (id) => store.state.habits.find((h) => h.id === id);
export const findTask = (id) => store.state.tasks.find((t) => t.id === id);

export function setLog(h, key, value) {
  value = Math.max(0, Math.min(99, Math.round(value)));
  if (value === 0) delete h.log[key];
  else h.log[key] = value;
  if (key < h.createdAt) h.createdAt = key;
}

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
