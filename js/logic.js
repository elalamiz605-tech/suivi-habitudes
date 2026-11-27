// Règles métier : planning des habitudes, séries, taux de réussite, XP, badges.
import { dateKey, addDays, today, weekday, startOfWeek, startOfMonth, addMonths, parseKey, weekdays } from './utils.js';
import { store, isPaused, isVacation } from './store.js';
import { t, tn } from './i18n.js';

// ---------- Habitudes ----------

export const valueOn = (h, key) => h.log[key] || 0;
export const isDone = (h, key) => valueOn(h, key) >= (h.target || 1);
export const isSkipped = (h, key) => !!h.skips[key];
export const isPeriodic = (h) => h.schedule.type === 'weekly' || h.schedule.type === 'monthly';

/** Jour neutralisé : passé volontairement, habitude en pause, ou vacances. Ne compte ni réussi ni manqué. */
export const isOff = (h, key) => isSkipped(h, key) || isPaused(h, key) || isVacation(store.state, key);

/** « Tous les N jours » : prévu si aucune validation dans les N-1 jours précédents. */
function intervalScheduled(h, d) {
  const n = Math.max(1, h.schedule.every || 2);
  const k = dateKey(d);
  if (isDone(h, k)) return true;
  for (let i = 1; i < n; i++) {
    const kk = dateKey(addDays(d, -i));
    if (isDone(h, kk)) return false;
  }
  return true;
}

/** L'habitude peut-elle être faite ce jour-là ? */
export function isScheduled(h, d) {
  const k = dateKey(d);
  if (isOff(h, k)) return false;
  const s = h.schedule;
  if (s.type === 'days') return s.days.includes(weekday(d));
  if (s.type === 'interval') return intervalScheduled(h, d);
  return true;
}

/** Ce jour est-il obligatoire ? (les habitudes « X fois par semaine / mois » n'ont pas de jour imposé) */
export const isRequired = (h, d) => !isPeriodic(h) && isScheduled(h, d);

// ---------- Périodes (semaine / mois) ----------

function periodStart(h, d) {
  return h.schedule.type === 'monthly' ? startOfMonth(d) : startOfWeek(d);
}
function periodShift(h, start, n) {
  return h.schedule.type === 'monthly' ? addMonths(start, n) : addDays(start, 7 * n);
}
function periodEnd(h, start) {
  return addDays(periodShift(h, start, 1), -1);
}
/** Objectif de la période, réduit au prorata des jours neutralisés (pause, vacances, jours passés). */
function periodNeed(h, start) {
  const per = h.schedule.type === 'monthly' ? h.schedule.perMonth : h.schedule.perWeek;
  const end = periodEnd(h, start);
  let total = 0, off = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    total++;
    if (isOff(h, dateKey(d))) off++;
  }
  if (!off) return per;
  return Math.max(0, Math.round(per * (total - off) / total));
}
function periodDone(h, start) {
  const end = periodEnd(h, start);
  let n = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) if (isDone(h, dateKey(d))) n++;
  return n;
}
const periodOk = (h, start) => periodDone(h, start) >= periodNeed(h, start);

export const weekDoneCount = (h, d) => periodDone(h, startOfWeek(d));

export function isDueToday(h, tday = today()) {
  if (h.archived) return false;
  const k = dateKey(tday);
  if (isOff(h, k)) return false;
  if (isPeriodic(h)) {
    const start = periodStart(h, tday);
    return periodDone(h, start) < periodNeed(h, start) || isDone(h, k);
  }
  return isScheduled(h, tday);
}

/** Série en cours, en jours (ou en semaines / mois pour les habitudes périodiques). */
export function currentStreak(h, tday = today()) {
  if (isPeriodic(h)) {
    let p = periodStart(h, tday);
    if (!periodOk(h, p)) p = periodShift(h, p, -1); // période en cours pas encore finie
    let n = 0;
    while (n < 520 && dateKey(periodEnd(h, p)) >= h.createdAt && periodOk(h, p)) {
      n++;
      p = periodShift(h, p, -1);
    }
    return n;
  }
  let d = tday;
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

export function bestStreak(h, tday = today()) {
  const end = dateKey(tday);
  let best = 0, run = 0;
  if (isPeriodic(h)) {
    for (let p = periodStart(h, parseKey(h.createdAt)); dateKey(p) <= end; p = periodShift(h, p, 1)) {
      if (periodOk(h, p)) best = Math.max(best, ++run);
      else if (dateKey(periodEnd(h, p)) < end) run = 0;
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
export function rateParts(h, days = 30, tday = today()) {
  let ok = 0, req = 0;
  if (isPeriodic(h)) {
    const p0 = periodStart(h, tday);
    const span = h.schedule.type === 'monthly' ? Math.ceil(days / 30) : Math.ceil(days / 7);
    for (let i = 0; i < span; i++) {
      const p = periodShift(h, p0, -i);
      if (dateKey(periodEnd(h, p)) < h.createdAt) break;
      const need = periodNeed(h, p);
      const c = Math.min(periodDone(h, p), need);
      if (i === 0 && c < need) continue; // période en cours pas encore finie
      ok += c;
      req += need;
    }
    return { ok, req };
  }
  for (let i = 0; i < days; i++) {
    const d = addDays(tday, -i);
    const k = dateKey(d);
    if (k < h.createdAt) break;
    if (!isScheduled(h, d)) continue;
    if (i === 0 && !isDone(h, k)) continue; // la journée n'est pas finie
    req++;
    if (isDone(h, k)) ok++;
  }
  return { ok, req };
}

export function completionRate(h, days = 30, tday = today()) {
  const { ok, req } = rateParts(h, days, tday);
  return req ? ok / req : null;
}

export function overallRate(habits, days = 30, tday = today()) {
  let ok = 0, req = 0;
  habits.forEach((h) => {
    const p = rateParts(h, days, tday);
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
    if (k < h.createdAt || isOff(h, k)) continue;
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

/** Moment de la journée d'après l'heure prévue. */
export function timeOfDay(h) {
  if (!h.time) return 'anytime';
  const hh = Number(h.time.slice(0, 2));
  return hh < 12 ? 'morning' : hh < 18 ? 'afternoon' : 'evening';
}

export function todayProgress(habits) {
  const tday = today();
  const k = dateKey(tday);
  const due = habits
    .filter((h) => isDueToday(h, tday))
    .sort((a, b) => (a.time || '99').localeCompare(b.time || '99') || a.name.localeCompare(b.name));
  const done = due.filter((h) => isDone(h, k)).length;
  return { due, done, total: due.length, ratio: due.length ? done / due.length : 0 };
}

export function scheduleLabel(h) {
  const s = h.schedule;
  if (s.type === 'daily') return t('sched.daily');
  if (s.type === 'weekly') return t('sched.weekly', { n: s.perWeek });
  if (s.type === 'monthly') return t('sched.monthly', { n: s.perMonth });
  if (s.type === 'interval') return s.every > 1 ? t('sched.interval', { n: s.every }) : t('sched.interval1');
  const days = [...s.days].sort();
  if (days.join() === '0,1,2,3,4') return t('sched.weekdays');
  if (days.join() === '5,6') return t('sched.weekend');
  const W = weekdays();
  return days.map((d) => W[d]).join(' · ');
}

export const streakUnit = (h) => (h.schedule.type === 'weekly' ? 'week' : h.schedule.type === 'monthly' ? 'month' : 'day');
export const streakLabel = (h, n) => tn(n, `streak.${streakUnit(h)}`);
export const streakShort = (h) => t(h.schedule.type === 'weekly' ? 'common.weeks' : h.schedule.type === 'monthly' ? 'common.months' : 'common.days');

export const totalChecks = (habits) =>
  habits.reduce((sum, h) => sum + Object.keys(h.log).filter((k) => isDone(h, k)).length, 0);

export const journalCount = (habits) => habits.reduce((n, h) => n + Object.keys(h.journal).length, 0);

// ---------- Tâches ----------

export const PRIORITIES = [
  { get label() { return t('prio.0'); }, cls: 'p0' },
  { get label() { return t('prio.1'); }, cls: 'p1' },
  { get label() { return t('prio.2'); }, cls: 'p2' },
  { get label() { return t('prio.3'); }, cls: 'p3' },
];

export const STATUSES = [
  { id: 'todo', get label() { return t('status.todo'); } },
  { id: 'doing', get label() { return t('status.doing'); } },
  { id: 'done', get label() { return t('status.done'); } },
];

export const isOverdue = (x) => x.status !== 'done' && !!x.due && x.due < dateKey(today());

export function taskSorter(mode = 'prio') {
  const due = (x) => x.due || '9999';
  if (mode === 'due') return (a, b) => due(a).localeCompare(due(b)) || b.priority - a.priority;
  if (mode === 'recent') return (a, b) => b.createdAt.localeCompare(a.createdAt);
  return (a, b) => b.priority - a.priority || due(a).localeCompare(due(b));
}

/** Les tâches à traiter en priorité aujourd'hui. */
export function focusTasks(tasks) {
  const k = dateKey(today());
  return tasks
    .filter((x) => x.status !== 'done' && (x.status === 'doing' || x.priority === 3 || (x.due && x.due <= k)))
    .sort(taskSorter('prio'));
}

// ---------- XP, niveaux, badges ----------

const TASK_XP = [10, 15, 25, 40];

export function computeXP(s) {
  let xp = totalChecks(s.habits) * 10;
  for (const x of s.tasks) {
    if (x.status === 'done') xp += TASK_XP[x.priority] || 10;
    xp += x.subtasks.filter((y) => y.done).length * 3;
  }
  return xp + s.profile.perfectDays.length * 25 + journalCount(s.habits) * 2;
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

const maxBest = (s) => Math.max(0, ...s.habits.filter((h) => !isPeriodic(h)).map((h) => bestStreak(h)));
const tasksDone = (s) => s.tasks.filter((x) => x.status === 'done').length;

const badge = (id, test) => ({ id, get name() { return t(`badge.${id}`); }, get desc() { return t(`badge.${id}.d`); }, test });
export const BADGES = [
  badge('first-habit', (s) => s.habits.length >= 1),
  badge('first-check', (s) => totalChecks(s.habits) >= 1),
  badge('streak-7', (s) => maxBest(s) >= 7),
  badge('streak-30', (s) => maxBest(s) >= 30),
  badge('streak-100', (s) => maxBest(s) >= 100),
  badge('checks-100', (s) => totalChecks(s.habits) >= 100),
  badge('perfect-day', (s) => s.profile.perfectDays.length >= 1),
  badge('perfect-7', (s) => s.profile.perfectDays.length >= 7),
  badge('tasks-10', (s) => tasksDone(s) >= 10),
  badge('urgent', (s) => s.tasks.some((x) => x.status === 'done' && x.priority === 3)),
  badge('journal-7', (s) => journalCount(s.habits) >= 7),
  badge('level-5', (s) => levelFor(computeXP(s)).level >= 5),
];
