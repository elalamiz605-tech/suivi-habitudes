// Analyse hebdomadaire : des phrases concrètes tirées des données.
import * as L from './logic.js';
import { store, commit } from './store.js';
import { dateKey, addDays, today, startOfWeek, weekday, weekdayLong, fmtShort } from './utils.js';
import { t } from './i18n.js';
import { toast } from './ui.js';

const pc = (x) => Math.round(x * 100);

/** Taux global sur une plage de jours [from, to] (clés incluses). */
function rangeRate(habits, from, to) {
  let ok = 0, req = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const { req: r, done } = L.dayStats(habits, d);
    req += r;
    ok += done;
  }
  return req ? ok / req : null;
}

export function weeklyInsights(s) {
  const habits = s.habits.filter((h) => !h.archived);
  const out = [];
  if (!habits.length) return [t('insight.none')];
  const tday = today();
  const k = dateKey(tday);

  // Semaine en cours vs semaine passée (jours écoulés uniquement)
  const w0 = startOfWeek(tday);
  const cur = rangeRate(habits, w0, addDays(tday, -1));
  const prev = rangeRate(habits, addDays(w0, -7), addDays(w0, -1));
  if (cur !== null && prev !== null) {
    const d = pc(cur) - pc(prev);
    out.push(t(d > 2 ? 'insight.week_up' : d < -2 ? 'insight.week_down' : 'insight.week_flat', { cur: pc(cur), d: Math.abs(d) }));
  }

  // Jour de la semaine le plus faible / le plus fort sur 8 semaines
  const byDay = [...Array(7)].map(() => ({ ok: 0, req: 0 }));
  for (let i = 1; i <= 56; i++) {
    const d = addDays(tday, -i);
    const { req, done } = L.dayStats(habits, d);
    byDay[weekday(d)].req += req;
    byDay[weekday(d)].ok += done;
  }
  const rated = byDay.map((x, i) => ({ i, r: x.req >= 3 ? x.ok / x.req : null })).filter((x) => x.r !== null);
  if (rated.length >= 4) {
    const weak = [...rated].sort((a, b) => a.r - b.r)[0];
    const strong = [...rated].sort((a, b) => b.r - a.r)[0];
    if (strong.r - weak.r >= 0.15) {
      out.push(t('insight.weak_day', { day: weekdayLong(weak.i), rate: pc(weak.r) }));
      out.push(t('insight.strong_day', { day: weekdayLong(strong.i), rate: pc(strong.r) }));
    }
  }

  // Séries en jeu aujourd'hui
  const atRisk = habits.filter((h) => L.isDueToday(h) && !L.isDone(h, k) && !L.isPeriodic(h) && L.currentStreak(h) >= 3)
    .sort((a, b) => L.currentStreak(b) - L.currentStreak(a));
  if (atRisk.length === 1) out.push(t('insight.at_risk_one', { names: atRisk[0].name, n: L.streakLabel(atRisk[0], L.currentStreak(atRisk[0])) }));
  else if (atRisk.length > 1) out.push(t('insight.at_risk_other', { names: atRisk.slice(0, 4).map((h) => `${h.name} (${L.currentStreak(h)})`).join(', ') }));

  // Habitude en difficulté / en progrès
  const rates = habits.map((h) => ({ h, r30: L.completionRate(h, 30), r14: L.completionRate(h, 14), rPrev: L.completionRate(h, 14, addDays(tday, -14)) }));
  const struggling = rates.filter((x) => x.r30 !== null && x.r30 < 0.5 && L.rateParts(x.h, 30).req >= 6).sort((a, b) => a.r30 - b.r30)[0];
  if (struggling) out.push(t('insight.struggling', { name: struggling.h.name, rate: pc(struggling.r30) }));
  const improving = rates.filter((x) => x.r14 !== null && x.rPrev !== null && x.r14 - x.rPrev >= 0.15).sort((a, b) => (b.r14 - b.rPrev) - (a.r14 - a.rPrev))[0];
  if (improving) out.push(t('insight.improving', { name: improving.h.name, prev: pc(improving.rPrev), cur: pc(improving.r14) }));

  // Meilleure série en cours
  const best = habits.map((h) => ({ h, n: L.currentStreak(h) })).sort((a, b) => b.n - a.n)[0];
  if (best && best.n >= 3) out.push(t('insight.best_streak_now', { name: best.h.name, n: L.streakLabel(best.h, best.n) }));

  // Journées parfaites sur 30 jours
  const perfect = s.profile.perfectDays.filter((d) => d >= dateKey(addDays(tday, -30))).length;
  if (perfect) out.push(t('insight.perfect', { n: perfect }));

  // Humeur selon réussite
  const moods = { good: [], bad: [] };
  for (let i = 1; i <= 30; i++) {
    const d = addDays(tday, -i), kk = dateKey(d);
    const dayMoods = habits.map((h) => h.journal[kk]?.mood).filter(Boolean);
    if (!dayMoods.length) continue;
    const { req, done } = L.dayStats(habits, d);
    const avg = dayMoods.reduce((a, b) => a + b, 0) / dayMoods.length;
    (req && done === req ? moods.good : moods.bad).push(avg);
  }
  if (moods.good.length >= 2 && moods.bad.length >= 2) {
    const m = (a) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
    out.push(t('insight.mood', { good: m(moods.good), bad: m(moods.bad) }));
  }

  return out.length ? out : [t('insight.none')];
}

/** Humeur moyenne sur 30 jours et nombre de notes. */
export function moodStats(habits) {
  const tday = today();
  let sum = 0, n = 0, notes = 0;
  for (let i = 0; i < 30; i++) {
    const kk = dateKey(addDays(tday, -i));
    for (const h of habits) {
      const j = h.journal[kk];
      if (!j) continue;
      notes++;
      if (j.mood) { sum += j.mood; n++; }
    }
  }
  return { avg: n ? sum / n : null, notes };
}

// ---------- Bilan de la semaine ----------

/** Semaine du bilan : la semaine passée le lundi, sinon la semaine en cours. */
export function reviewWeek(tday = today()) {
  const start = weekday(tday) === 0 ? addDays(startOfWeek(tday), -7) : startOfWeek(tday);
  const end = addDays(start, 6);
  const last = end < tday ? end : addDays(tday, -1); // dernier jour écoulé (la journée en cours n'est pas finie)
  return { start, end, last, key: dateKey(start), partial: end > tday };
}

const habitRange = (h, from, to) => {
  let ok = 0, req = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const k = dateKey(d);
    if (k < h.createdAt || L.isOff(h, k)) continue;
    if (L.isRequired(h, d)) { req++; if (L.isDone(h, k)) ok++; } else if (L.isDone(h, k)) { req++; ok++; }
  }
  return { ok, req };
};

/** Taux de réussite d'une habitude un jour de semaine donné, sur 8 semaines. */
function weekdayRate(h, wd, tday) {
  let ok = 0, req = 0;
  for (let i = 1; i <= 56; i++) {
    const d = addDays(tday, -i);
    if (weekday(d) !== wd) continue;
    const k = dateKey(d);
    if (k < h.createdAt || !L.isRequired(h, d)) continue;
    req++;
    if (L.isDone(h, k)) ok++;
  }
  return req >= 3 ? ok / req : null;
}

/** Suggestions concrètes, chacune avec une action applicable en un clic. */
export function suggestions(s) {
  const habits = s.habits.filter((h) => !h.archived);
  const tday = today();
  const out = [];
  for (const h of habits) {
    const r30 = L.completionRate(h, 30);
    const req30 = L.rateParts(h, 30).req;
    if (h.schedule.type === 'daily' && r30 !== null && r30 < 0.5 && req30 >= 6) {
      out.push({ id: `weekly-${h.id}`, icon: 'repeat', text: t('review.sug_weekly', { name: h.name, rate: pc(r30) }), apply() { h.schedule.type = 'weekly'; h.schedule.perWeek = 3; } });
      continue;
    }
    if (h.time && !(h.reminders || []).length && r30 !== null && r30 < 0.7 && req30 >= 5) {
      out.push({ id: `remind-${h.id}`, icon: 'bell', text: t('review.sug_reminder', { name: h.name, time: h.time }), apply() { h.reminders = [h.time]; } });
    }
    if (h.kind === 'count' && r30 !== null && r30 >= 0.9 && req30 >= 14) {
      const next = Math.max(h.target + 1, Math.round(h.target * 1.2));
      out.push({ id: `raise-${h.id}`, icon: 'zap', text: t('review.sug_raise', { name: h.name, from: h.target, to: next, unit: h.unit }), apply() { h.target = next; } });
    }
    if (h.schedule.type === 'daily') {
      const rates = [0, 1, 2, 3, 4, 5, 6].map((wd) => ({ wd, r: weekdayRate(h, wd, tday) })).filter((x) => x.r !== null);
      const weak = rates.sort((a, b) => a.r - b.r)[0];
      if (weak && weak.r < 0.35 && rates.length >= 5 && r30 !== null && r30 >= 0.5) {
        out.push({ id: `drop-${h.id}-${weak.wd}`, icon: 'calendar', text: t('review.sug_drop_day', { name: h.name, day: weekdayLong(weak.wd), rate: pc(weak.r) }), apply() { h.schedule.type = 'days'; h.schedule.days = [0, 1, 2, 3, 4, 5, 6].filter((d) => d !== weak.wd); } });
      }
    }
    if (!h.identity && L.votesFor(h) >= 5) {
      out.push({ id: `identity-${h.id}`, icon: 'user', text: t('review.sug_identity', { name: h.name }), edit: h.id });
    }
  }
  // Une seule suggestion « identité », en dernier : le reste est plus concret.
  const ids = out.filter((x) => x.edit);
  return [...out.filter((x) => !x.edit), ...ids.slice(0, 1)].slice(0, 5);
}

export function applySuggestion(id) {
  const sug = suggestions(store.state).find((x) => x.id === id);
  if (!sug || !sug.apply) return false;
  sug.apply();
  commit();
  toast(t('review.applied'));
  return true;
}

/** Données structurées du bilan : chiffres, par habitude, phrases, suggestions. */
export function weeklyReview(s) {
  const habits = s.habits.filter((h) => !h.archived);
  const w = reviewWeek();
  const prevStart = addDays(w.start, -7), prevEnd = addDays(w.start, -1);
  const cur = rangeRate(habits, w.start, w.last);
  const prev = rangeRate(habits, prevStart, prevEnd);
  const perfect = s.profile.perfectDays.filter((d) => d >= w.key && d <= dateKey(w.last)).length;
  const tasksDone = s.tasks.filter((x) => x.status === 'done' && x.doneAt && x.doneAt >= w.key && x.doneAt <= dateKey(w.last)).length;
  const rows = habits.map((h) => {
    const a = habitRange(h, w.start, w.last), b = habitRange(h, prevStart, prevEnd);
    const rate = a.req ? a.ok / a.req : null, prevRate = b.req ? b.ok / b.req : null;
    return { h, ok: a.ok, req: a.req, rate, prevRate, trend: rate !== null && prevRate !== null ? Math.round((rate - prevRate) * 100) : null, streak: L.currentStreak(h) };
  }).sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));
  const rb = L.reboundStats(habits, 7);
  return { week: w, cur, prev, perfect, tasksDone, rows, rebounds: rb, sentences: weeklyInsights(s), suggestions: suggestions(s), moods: moodStats(habits) };
}

/** Résumé compact (texte) du bilan, pour le coach IA. */
export function reviewSummary(s) {
  const r = weeklyReview(s);
  const lines = [
    `Semaine du ${fmtShort(r.week.start)} au ${fmtShort(r.week.end)}${r.week.partial ? ' (en cours)' : ''}.`,
    `Réussite : ${r.cur === null ? 'n/a' : pc(r.cur) + ' %'} (semaine précédente : ${r.prev === null ? 'n/a' : pc(r.prev) + ' %'}). Journées parfaites : ${r.perfect}. Tâches terminées : ${r.tasksDone}.`,
    `Rebonds après un raté : ${r.rebounds.rebounds}, doubles ratés : ${r.rebounds.doubles}.`,
    'Habitudes :',
    ...r.rows.map((x) => `- ${x.h.name}${x.h.identity ? ` (identité : ${x.h.identity})` : ''} : ${x.ok}/${x.req}${x.rate !== null ? ` (${pc(x.rate)} %)` : ''}, série ${x.streak}, tendance ${x.trend === null ? 'n/a' : (x.trend > 0 ? '+' : '') + x.trend + ' pts'}`),
    'Observations : ' + r.sentences.join(' '),
  ];
  if (r.moods.avg) lines.push(`Humeur moyenne : ${r.moods.avg.toFixed(1)}/5 sur ${r.moods.notes} notes.`);
  const notes = s.habits.flatMap((h) => Object.entries(h.journal).filter(([k, j]) => k >= r.week.key && j.note).map(([k, j]) => `${k} ${h.name} : ${j.note}`));
  if (notes.length) lines.push('Notes de la semaine : ' + notes.slice(0, 8).join(' | '));
  return lines.join('\n');
}
