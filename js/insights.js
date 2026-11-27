// Analyse hebdomadaire : des phrases concrètes tirées des données.
import * as L from './logic.js';
import { dateKey, addDays, today, startOfWeek, weekday, weekdayLong } from './utils.js';
import { t, tn } from './i18n.js';

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
