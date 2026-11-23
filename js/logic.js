// Règles métier : planning des habitudes, séries, taux de réussite, XP, badges.
import { dateKey, addDays, today, weekday, startOfWeek, parseKey, WEEKDAYS, plural } from './utils.js';

// ---------- Habitudes ----------

export const valueOn = (h, key) => h.log[key] || 0;
export const isDone = (h, key) => valueOn(h, key) >= (h.target || 1);

/** L'habitude peut-elle être faite ce jour-là ? */
export function isScheduled(h, d) {
  return h.schedule.type === 'days' ? h.schedule.days.includes(weekday(d)) : true;
}

/** Ce jour est-il obligatoire ? (les habitudes « X fois par semaine » n'ont pas de jour imposé) */
export const isRequired = (h, d) => h.schedule.type !== 'weekly' && isScheduled(h, d);

export function weekDoneCount(h, d) {
  const s = startOfWeek(d);
  let n = 0;
  for (let i = 0; i < 7; i++) if (isDone(h, dateKey(addDays(s, i)))) n++;
  return n;
}

export function isDueToday(h, t = today()) {
  if (h.archived) return false;
  if (h.schedule.type === 'weekly') return weekDoneCount(h, t) < h.schedule.perWeek || isDone(h, dateKey(t));
  return isScheduled(h, t);
}

/** Série en cours, en jours (ou en semaines pour « X fois par semaine »). */
export function currentStreak(h, t = today()) {
  if (h.schedule.type === 'weekly') {
    let w = startOfWeek(t);
    if (weekDoneCount(h, w) < h.schedule.perWeek) w = addDays(w, -7);
    let n = 0;
    while (n < 520 && dateKey(addDays(w, 6)) >= h.createdAt && weekDoneCount(h, w) >= h.schedule.perWeek) {
      n++;
      w = addDays(w, -7);
    }
    return n;
  }
  let d = t;
  // Aujourd'hui pas encore fait : la série n'est pas cassée pour autant.
  if (isScheduled(h, d) && !isDone(h, dateKey(d))) d = addDays(d, -1);
  let n = 0;
  for (let i = 0; i < 3650; i++) {
    const k = dateKey(d);
    if (k < h.createdAt) break;
    if (isScheduled(h, d)) {
      if (isDone(h, k)) n++;
      else break;
    }
    d = addDays(d, -1);
  }
  return n;
}

export function bestStreak(h, t = today()) {
  const end = dateKey(t);
  let best = 0, run = 0;
  if (h.schedule.type === 'weekly') {
    for (let w = startOfWeek(parseKey(h.createdAt)); dateKey(w) <= end; w = addDays(w, 7)) {
      if (weekDoneCount(h, w) >= h.schedule.perWeek) best = Math.max(best, ++run);
      else if (dateKey(addDays(w, 6)) < end) run = 0;
    }
    return best;
  }
  for (let d = parseKey(h.createdAt); dateKey(d) <= end; d = addDays(d, 1)) {
    if (!isScheduled(h, d)) continue;
    const k = dateKey(d);
    if (isDone(h, k)) best = Math.max(best, ++run);
    else if (k !== end) run = 0;
  }
  return best;
}

/** Réussite sur les N derniers jours : { ok, req } */
export function rateParts(h, days = 30, t = today()) {
  let ok = 0, req = 0;
  if (h.schedule.type === 'weekly') {
    const per = h.schedule.perWeek;
    const w0 = startOfWeek(t);
    for (let i = 0; i < Math.ceil(days / 7); i++) {
      const w = addDays(w0, -7 * i);
      if (dateKey(addDays(w, 6)) < h.createdAt) break;
      const c = Math.min(weekDoneCount(h, w), per);
      if (i === 0 && c < per) continue; // semaine en cours pas encore finie
      ok += c;
      req += per;
    }
    return { ok, req };
  }
  for (let i = 0; i < days; i++) {
    const d = addDays(t, -i);
    const k = dateKey(d);
    if (k < h.createdAt) break;
    if (!isScheduled(h, d)) continue;
    if (i === 0 && !isDone(h, k)) continue; // la journée n'est pas finie
    req++;
    if (isDone(h, k)) ok++;
  }
  return { ok, req };
}

export function completionRate(h, days = 30) {
  const { ok, req } = rateParts(h, days);
  return req ? ok / req : null;
}

export function overallRate(habits, days = 30) {
  let ok = 0, req = 0;
  habits.forEach((h) => {
    const p = rateParts(h, days);
    ok += p.ok;
    req += p.req;
  });
  return req ? ok / req : 0;
}

/** Pour les graphiques : validations / attendues sur une journée. */
export function dayStats(habits, d) {
  const k = dateKey(d);
  let req = 0, done = 0;
  for (const h of habits) {
    if (k < h.createdAt) continue;
    const ok = isDone(h, k);
    if (isRequired(h, d)) {
      req++;
      if (ok) done++;
    } else if (ok) {
      req++;
      done++;
    }
  }
  return { req, done };
}

export function todayProgress(habits) {
  const t = today();
  const k = dateKey(t);
  const due = habits
    .filter((h) => isDueToday(h, t))
    .sort((a, b) => (a.time || '99').localeCompare(b.time || '99') || a.name.localeCompare(b.name));
  const done = due.filter((h) => isDone(h, k)).length;
  return { due, done, total: due.length, ratio: due.length ? done / due.length : 0 };
}

export function scheduleLabel(h) {
  const s = h.schedule;
  if (s.type === 'daily') return 'Tous les jours';
  if (s.type === 'weekly') return `${s.perWeek}× par semaine`;
  const days = [...s.days].sort();
  if (days.join() === '0,1,2,3,4') return 'En semaine';
  if (days.join() === '5,6') return 'Le week-end';
  return days.map((d) => WEEKDAYS[d]).join(' · ');
}

export const streakLabel = (h, n) =>
  h.schedule.type === 'weekly' ? plural(n, 'semaine', 'semaines') : plural(n, 'jour', 'jours');

export const totalChecks = (habits) =>
  habits.reduce((sum, h) => sum + Object.keys(h.log).filter((k) => isDone(h, k)).length, 0);

// ---------- Tâches ----------

export const PRIORITIES = [
  { label: 'Basse', cls: 'p0' },
  { label: 'Moyenne', cls: 'p1' },
  { label: 'Haute', cls: 'p2' },
  { label: 'Urgente', cls: 'p3' },
];

export const STATUSES = [
  { id: 'todo', label: 'À faire' },
  { id: 'doing', label: 'En cours' },
  { id: 'done', label: 'Terminé' },
];

export const isOverdue = (t) => t.status !== 'done' && !!t.due && t.due < dateKey(today());

export function taskSorter(mode = 'prio') {
  const due = (t) => t.due || '9999';
  if (mode === 'due') return (a, b) => due(a).localeCompare(due(b)) || b.priority - a.priority;
  if (mode === 'recent') return (a, b) => b.createdAt.localeCompare(a.createdAt);
  return (a, b) => b.priority - a.priority || due(a).localeCompare(due(b));
}

/** Les tâches à traiter en priorité aujourd'hui. */
export function focusTasks(tasks) {
  const k = dateKey(today());
  return tasks
    .filter((t) => t.status !== 'done' && (t.status === 'doing' || t.priority === 3 || (t.due && t.due <= k)))
    .sort(taskSorter('prio'));
}

// ---------- XP, niveaux, badges ----------

const TASK_XP = [10, 15, 25, 40];

export function computeXP(s) {
  let xp = totalChecks(s.habits) * 10;
  for (const t of s.tasks) {
    if (t.status === 'done') xp += TASK_XP[t.priority] || 10;
    xp += t.subtasks.filter((x) => x.done).length * 3;
  }
  return xp + s.profile.perfectDays.length * 25;
}

export function levelFor(xp) {
  let level = 1, need = 100, acc = 0;
  while (xp >= acc + need) {
    acc += need;
    level++;
    need = Math.round(need * 1.25);
  }
  return { level, into: xp - acc, need, xp };
}

const maxBest = (s) => Math.max(0, ...s.habits.filter((h) => h.schedule.type !== 'weekly').map((h) => bestStreak(h)));
const tasksDone = (s) => s.tasks.filter((t) => t.status === 'done').length;

export const BADGES = [
  { id: 'first-habit', icon: '🌱', name: 'Premier pas', desc: 'Créer une habitude', test: (s) => s.habits.length >= 1 },
  { id: 'first-check', icon: '✅', name: "C'est parti", desc: 'Première validation', test: (s) => totalChecks(s.habits) >= 1 },
  { id: 'streak-7', icon: '🔥', name: 'Semaine en feu', desc: 'Série de 7 jours', test: (s) => maxBest(s) >= 7 },
  { id: 'streak-30', icon: '⚡', name: 'Inarrêtable', desc: 'Série de 30 jours', test: (s) => maxBest(s) >= 30 },
  { id: 'checks-100', icon: '💯', name: 'Centurion', desc: '100 validations', test: (s) => totalChecks(s.habits) >= 100 },
  { id: 'perfect-day', icon: '🌟', name: 'Journée parfaite', desc: 'Tout valider en une journée', test: (s) => s.profile.perfectDays.length >= 1 },
  { id: 'perfect-7', icon: '🏆', name: 'Perfectionniste', desc: '7 journées parfaites', test: (s) => s.profile.perfectDays.length >= 7 },
  { id: 'tasks-10', icon: '🎯', name: 'Exécutant', desc: '10 tâches terminées', test: (s) => tasksDone(s) >= 10 },
  { id: 'urgent', icon: '🚒', name: 'Pompier', desc: 'Terminer une tâche urgente', test: (s) => s.tasks.some((t) => t.status === 'done' && t.priority === 3) },
  { id: 'level-5', icon: '👑', name: 'Niveau 5', desc: 'Atteindre le niveau 5', test: (s) => levelFor(computeXP(s)).level >= 5 },
];
