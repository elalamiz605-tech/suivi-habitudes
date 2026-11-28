// Rendu HTML de chaque page.
import { icon } from './icons.js';
import * as L from './logic.js';
import { isPaused, currentVacation, APP_VERSION } from './store.js';
import { weeklyInsights, moodStats, weeklyReview, reviewWeek } from './insights.js';
import { hasKey, cachedReview } from './coach.js';
import { isSignedIn, DEFAULT_URL, pushSupported, buddiesCached } from './cloud.js';
import { installState } from './pwa.js';
import { permission as notifPermission, supported as notifSupported } from './reminders.js';
import { listSnapshots } from './backup.js';
import { timer, TEMPLATES, TEMPLATE_CATS } from './forms.js';
import {
  esc, dateKey, today, addDays, addMonths, startOfMonth, startOfWeek, weekday, parseKey, fmtFull, fmtShort, fmtMonth, fmtDateTime, fmtClock,
  weekdays, weekdaysShort, pct, norm, relativeDue as relative,
} from './utils.js';
import { t, tn, LANGS, lang } from './i18n.js';

const activeHabits = (s) => s.habits.filter((h) => !h.archived);

// ---------- Composants ----------

const BADGE_IC = {
  'first-habit': 'plus', 'first-check': 'check', 'streak-7': 'flame', 'streak-30': 'zap', 'streak-100': 'award', 'checks-100': 'target',
  'perfect-day': 'sun', 'perfect-7': 'award', 'tasks-10': 'list', urgent: 'alert', 'level-5': 'layers', 'journal-7': 'book', 'rebound-5': 'restore', identity: 'user',
};

const tick = (c) => `<i class="tick" style="--c:${c}" aria-hidden="true"></i>`;

/** Une mesure de la bande de chiffres : libellé, valeur en chiffres tabulaires, précision. */
function metric({ label, value, sub = '', tone = '' }) {
  return `
  <div class="metric ${tone}">
    <p class="metric-label">${label}</p>
    <p class="metric-value">${value}</p>
    ${sub ? `<p class="metric-sub">${sub}</p>` : ''}
  </div>`;
}

/** Barre segmentée : un segment par habitude prévue, allumé quand elle est validée. */
function segments(done, total) {
  if (!total) return '<div class="segbar empty" aria-hidden="true"><i></i></div>';
  return `<div class="segbar" role="img" aria-label="${t('today.segbar', { done, total })}">${[...Array(total)].map((_, i) => `<i class="${i < done ? 'on' : ''}"></i>`).join('')}</div>`;
}

const empty = (title, text, action = '') => `
  <div class="empty"><h3>${title}</h3><p>${text}</p>${action}</div>`;

function prioChip(x) {
  const p = L.PRIORITIES[x.priority] || L.PRIORITIES[1];
  return `<span class="prio ${p.cls}">${p.label}</span>`;
}

function dueChip(x) {
  if (!x.due) return '';
  const k = dateKey(today());
  const cls = x.status === 'done' ? '' : x.due < k ? 'late' : x.due === k ? 'soon' : '';
  return `<span class="due ${cls}">${icon('calendar')}${relative(x.due)}</span>`;
}

function subProgress(x) {
  if (!x.subtasks.length) return '';
  const d = x.subtasks.filter((s) => s.done).length;
  return `<div class="sub-progress"><div class="meter"><span style="width:${(d / x.subtasks.length) * 100}%"></span></div><small>${d}/${x.subtasks.length}</small></div>`;
}

function habitMeta(h) {
  return [h.category && esc(h.category), L.scheduleLabel(h), h.time && `${icon('clock')}${h.time}`, h.reminders?.length ? `${icon('bell')}${h.reminders.length}` : '']
    .filter(Boolean).join('<i class="sep"></i>');
}

function dayCellClass(h, d, k, isLast) {
  const v = L.valueOn(h, k);
  if (L.isSkipped(h, k)) return 'skip';
  if (L.isDone(h, k)) return L.isMini(h, k) ? 'done mini' : 'done';
  if (v > 0) return 'part';
  if (isPaused(h, k)) return 'off';
  if (!L.isScheduled(h, d)) return L.isPeriodic(h) ? '' : 'off';
  if (L.isRequired(h, d) && !isLast && k >= h.createdAt) return 'miss';
  return '';
}

function weekDots(h) {
  const tday = today();
  const WS = weekdaysShort();
  return `<div class="dots">${[...Array(7)].map((_, i) => {
    const d = addDays(tday, i - 6), k = dateKey(d);
    const cls = dayCellClass(h, d, k, i === 6);
    return `<button class="dot ${cls} ${i === 6 ? 'is-today' : ''}" data-action="toggle-day" data-id="${h.id}" data-key="${k}" title="${fmtFull(d)}" aria-label="${esc(h.name)}, ${fmtFull(d)}"><span>${cls === 'skip' ? '↷' : WS[weekday(d)]}</span></button>`;
  }).join('')}</div>`;
}

function journalBtn(h, k) {
  const j = h.journal[k];
  return `<button class="icon-btn sm ${j ? 'has-note' : ''}" data-action="journal" data-id="${h.id}" title="${t('today.journal')}" aria-label="${t('today.journal')}">${icon('smile')}</button>`;
}

let neverTwice = true;
function habitItem(h, stamp) {
  const k = dateKey(today());
  const v = L.valueOn(h, k);
  const done = L.isDone(h, k);
  const streak = L.currentStreak(h);
  const isCount = h.kind === 'count';
  const isQuit = h.kind === 'quit';
  const canTime = isCount && /min/i.test(h.unit);
  const recovery = neverTwice && L.isRecovery(h);
  const mini = L.miniTarget(h);
  return `
  <article class="habit-item ${done ? 'is-done' : ''} ${isQuit ? 'is-quit' : ''} ${recovery ? 'is-recovery' : ''}" style="--c:${h.color}">
    ${tick(h.color)}
    <div class="hi-title"><h3><a class="hr-link" href="#/habit/${h.id}">${esc(h.name)}</a></h3><p>${habitMeta(h)}</p>
      ${recovery ? `<p class="recover-line">${icon('restore')}${t('recover.line')} <button class="link-btn" data-action="mini" data-id="${h.id}">${isCount ? t('recover.mini_count', { n: mini, unit: esc(h.unit) }) : t('recover.mini_check')}</button></p>` : ''}
      ${done && h.identity ? `<p class="vote-line">${icon('user')}${t('identity.vote', { identity: esc(h.identity) })}</p>` : ''}
    </div>
    ${weekDots(h)}
    <span class="streak ${streak ? 'live' : ''}" title="${t('habits.streak_title')}">${icon('flame')}<b>${streak ? (isQuit ? `${streak} ${t('habits.days_without')}` : L.streakLabel(h, streak)) : '0'}</b></span>
    <div class="hi-tools">
      ${canTime ? `<button class="icon-btn sm" data-action="timer" data-id="${h.id}" title="${t('today.timer')}" aria-label="${t('today.timer')}">${icon('timer')}</button>` : ''}
      ${journalBtn(h, k)}
      <button class="icon-btn sm" data-action="skip" data-id="${h.id}" title="${t('today.skip')}" aria-label="${t('today.skip')}">${icon('skip')}</button>
    </div>
    ${isCount ? `
    <div class="counter">
      <button class="icon-btn sm" data-action="dec" data-id="${h.id}" aria-label="${t('habits.remove1')}">${icon('minus')}</button>
      <span><b>${v}</b>/${h.target}<small>${esc(h.unit)}</small></span>
      <button class="icon-btn sm" data-action="inc" data-id="${h.id}" aria-label="${t('habits.add1')}">${icon('plus')}</button>
    </div>` : ''}
    <button class="check ${done ? 'on' : ''} ${stamp ? 'stamp' : ''}" data-action="check" data-id="${h.id}" aria-pressed="${done}" aria-label="${t('habits.check', { name: esc(h.name) })}" ${isQuit ? `title="${t('habits.quit_label')}"` : ''}>
      <svg class="seal" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18"/></svg>${icon('check')}
    </button>
  </article>`;
}

function taskRow(x) {
  const done = x.status === 'done';
  return `
  <div class="task-row ${L.PRIORITIES[x.priority].cls}" data-action="edit-task" data-id="${x.id}" tabindex="0">
    <button class="tcheck ${done ? 'on' : ''}" data-action="task-done" data-id="${x.id}" aria-label="${t('tasks.mark_done')}">${icon('check')}</button>
    <div class="tr-main">
      <p class="tr-title">${esc(x.title)}</p>
      <div class="tr-meta">${prioChip(x)}${x.project ? `<span class="tag">#${esc(x.project)}</span>` : ''}${x.status === 'doing' ? `<span class="tag doing">${t('status.doing')}</span>` : ''}${x.subtasks.length ? `<span class="tag">${t('tasks.subtasks', { done: x.subtasks.filter((s) => s.done).length, total: x.subtasks.length })}</span>` : ''}</div>
    </div>
    ${dueChip(x)}
  </div>`;
}

// ---------- Aujourd'hui ----------

export function viewToday(s, ui = {}) {
  const tday = today();
  const k = dateKey(tday);
  const habits = activeHabits(s);
  const prog = L.todayProgress(habits);
  const skipped = habits.filter((h) => L.isSkipped(h, k));
  const paused = habits.filter((h) => isPaused(h, k));
  const later = habits.filter((h) => !L.isDueToday(h, tday) && !L.isSkipped(h, k) && !isPaused(h, k));
  const focus = L.focusTasks(s.tasks).slice(0, 6);
  const overdue = s.tasks.filter(L.isOverdue).length;
  const rate7 = L.overallRate(habits, 7);
  const top = habits.map((h) => ({ h, n: L.currentStreak(h) })).sort((a, b) => b.n - a.n)[0];
  const left = prog.total - prog.done;
  const vacation = currentVacation(s);
  const status = !prog.total
    ? t('today.nothing')
    : left === 0 ? t('today.complete') : tn(left, 'today.left');

  // Regroupement par moment de la journée (si au moins une heure est renseignée)
  const groups = [['morning', t('today.morning')], ['afternoon', t('today.afternoon')], ['evening', t('today.evening')], ['anytime', t('today.anytime')]];
  const hasTimes = prog.due.some((h) => h.time);
  const listHTML = hasTimes
    ? groups.map(([g, label]) => {
      const items = prog.due.filter((h) => L.timeOfDay(h) === g);
      return items.length ? `<div class="group"><h3 class="group-title">${label}<small>${items.filter((h) => L.isDone(h, k)).length}/${items.length}</small></h3><div class="list">${items.map((h) => habitItem(h, ui.stamp === h.id)).join('')}</div></div>` : '';
    }).join('')
    : `<div class="list">${prog.due.map((h) => habitItem(h, ui.stamp === h.id)).join('')}</div>`;

  neverTwice = s.settings.neverTwice !== false;
  const rw = reviewWeek();
  const dow = weekday(tday);
  const showReview = (dow === 6 || dow === 0) && s.settings.lastReviewWeek !== rw.key;
  const recovering = neverTwice ? prog.due.filter((h) => L.isRecovery(h)).length : 0;
  const install = installState();
  const showInstall = !s.settings.installDismissed && (install === 'ready' || (install === 'ios' && !sessionStorage.getItem('ios-banner')));

  return `
  <header class="page-head">
    <div>
      <h1>${t('today.title')}${s.settings.name ? `<span class="who">, ${esc(s.settings.name)}</span>` : ''}</h1>
      <p class="lead"><time datetime="${k}">${fmtFull(tday)}</time><i class="sep"></i>${status}${overdue ? `<i class="sep"></i><span class="late-text">${tn(overdue, 'today.overdue')}</span>` : ''}</p>
    </div>
    <div class="head-actions">
      <button class="btn ghost hide-sm" data-action="palette">${icon('search')}${t('common.search')}<kbd>Ctrl K</kbd></button>
      <button class="btn" data-action="new-task">${icon('plus')}${t('today.task')}</button>
      <button class="btn primary" data-action="new-habit">${icon('plus')}${t('today.habit')}</button>
    </div>
  </header>

  ${vacation ? `<div class="banner">${icon('plane')}<span>${t('today.vacation', { date: vacation.to ? fmtShort(parseKey(vacation.to)) : '…' })}</span><button class="btn sm" data-action="vacation-off">${t('today.vacation_end')}</button></div>` : ''}
  ${showInstall ? `<div class="banner install">${icon('phone')}<span>${t('today.install_banner')}</span>${install === 'ready' ? `<button class="btn sm primary" data-action="install">${t('today.install')}</button>` : ''}<button class="icon-btn sm" data-action="install-dismiss" aria-label="${t('today.later')}">${icon('x')}</button>${install === 'ios' ? `<span class="muted small">${t('settings.install_ios')}</span>` : ''}</div>` : ''}
  ${showReview ? `<div class="banner review-banner">${icon('sparkle')}<span>${t('review.banner')}</span><a class="btn sm primary" href="#/review">${t('review.open')}</a></div>` : ''}
  ${recovering ? `<div class="banner recover-banner">${icon('restore')}<span>${tn(recovering, 'recover.banner')}</span></div>` : ''}
  ${timer.total ? `<div class="banner timer-banner" data-action="timer-open">${icon('timer')}<span>${t('timer.running', { t: fmtClock(timer.left) })} · ${esc(timer.label)}</span></div>` : ''}

  <section class="band" aria-label="${t('today.summary')}">
    <div class="metric metric-main">
      <p class="metric-label">${t('today.progress')}</p>
      <p class="metric-value"><b>${prog.done}</b><span>/${prog.total}</span></p>
      ${segments(prog.done, prog.total)}
    </div>
    ${metric({ label: t('today.rate7'), value: `<b>${Math.round(rate7 * 100)}</b><span>%</span>` })}
    ${metric({ label: t('today.best_streak'), value: `<b>${top && top.n ? top.n : 0}</b><span>${top ? L.streakShort(top.h) : t('common.days')}</span>`, sub: top && top.n ? esc(top.h.name) : '' })}
    ${metric({ label: t('today.tasks_todo'), value: `<b>${focus.length}</b>`, sub: overdue ? t('today.of_overdue', { n: overdue }) : '', tone: overdue ? 'warn' : '' })}
  </section>

  ${s.routines?.length ? routinesStrip(s, k) : ''}

  <section class="section">
    <div class="section-head"><h2>${t('today.habits_of_day')}</h2><a href="#/habits" class="link">${t('today.manage')}${icon('chev-r')}</a></div>
    ${prog.due.length
      ? listHTML
      : empty(t('today.nothing'), t('today.empty_text'), `<button class="btn primary" data-action="new-habit">${icon('plus')}${t('today.create_habit')}</button>`)}
    ${later.length ? `<div class="later"><span>${t('today.not_planned')}</span>${later.map((h) => `<button class="chip" data-action="edit-habit" data-id="${h.id}">${tick(h.color)}${esc(h.name)}</button>`).join('')}</div>` : ''}
    ${skipped.length ? `<div class="later"><span>${t('today.skipped')}</span>${skipped.map((h) => `<button class="chip" data-action="skip" data-id="${h.id}" title="${t('today.unskip')}">${icon('skip')}${esc(h.name)}</button>`).join('')}</div>` : ''}
    ${paused.length ? `<div class="later"><span>${t('today.paused')}</span>${paused.map((h) => `<button class="chip" data-action="resume-habit" data-id="${h.id}" title="${t('habits.resume')}">${icon('pause')}${esc(h.name)}</button>`).join('')}</div>` : ''}
  </section>

  ${isSignedIn() && buddiesCached().length ? `
  <section class="section buddies-strip" aria-label="${t('buddy.title')}">
    <div class="section-head"><h2>${t('buddy.today_title')}</h2><a href="#/settings" class="link">${t('buddy.manage')}${icon('chev-r')}</a></div>
    <div class="buddy-cards">${buddiesCached().map((b) => `<div class="buddy-card ${b.today.perfect ? 'perfect' : ''}"><span class="avatar">${esc((b.name || '?').charAt(0).toUpperCase())}</span><div><b>${esc(b.name)}</b><small>${b.today.total ? t('buddy.progress', { done: b.today.done, total: b.today.total }) : t('buddy.nothing')}${b.today.perfect ? ' · ' + t('buddy.perfect') : ''}</small></div><span class="buddy-streak">${icon('flame')}${b.bestStreak}</span></div>`).join('')}</div>
  </section>` : ''}

  <section class="section">
    <div class="section-head"><h2>${t('today.priority_tasks')}</h2><a href="#/tasks" class="link">${t('today.open_board')}${icon('chev-r')}</a></div>
    ${focus.length
      ? `<div class="list">${focus.map(taskRow).join('')}</div>`
      : empty(t('today.no_urgent'), t('today.no_urgent_text'), `<button class="btn" data-action="new-task">${icon('plus')}${t('today.new_task')}</button>`)}
  </section>`;
}

// ---------- Routines ----------

function routinesStrip(s, k) {
  return `
  <section class="section" aria-label="${t('routine.title')}">
    <div class="section-head"><h2>${t('routine.title')}</h2><a href="#/habits" class="link">${t('routine.manage')}${icon('chev-r')}</a></div>
    <div class="routine-cards">${s.routines.map((r) => {
    const p = L.routineProgress(r, k);
    const full = p.total > 0 && p.done === p.total;
    return `<div class="routine-card ${full ? 'is-done' : ''}">
      <div class="rc-main"><b>${esc(r.name)}</b><small>${t(`routine.when_${r.when}`)} · ${tn(p.total, 'routine.steps')}</small>${segments(p.done, p.total)}</div>
      ${full ? `<span class="rc-done">${icon('check')}${t('routine.all_done')}</span>` : `<button class="btn sm primary" data-action="routine-start" data-id="${r.id}">${icon('play')}${p.done ? t('routine.continue') : t('routine.start')}</button>`}
    </div>`;
  }).join('')}</div>
  </section>`;
}

function routineRow(r, k) {
  const p = L.routineProgress(r, k);
  return `
  <article class="routine-row">
    <div class="rr-title"><h3>${esc(r.name)}</h3><p>${t(`routine.when_${r.when}`)} · ${tn(p.total, 'routine.steps')} · ${t('routine.today_progress', { done: p.done, total: p.total })}</p></div>
    <div class="rr-habits">${p.habits.map((h) => `<span>${tick(h.color)}${esc(h.name)}</span>`).join('')}</div>
    <div class="hr-actions">
      <button class="btn sm" data-action="routine-start" data-id="${r.id}">${icon('play')}${t('routine.start')}</button>
      <button class="icon-btn" data-action="edit-routine" data-id="${r.id}" title="${t('common.edit')}" aria-label="${t('common.edit')}">${icon('edit')}</button>
      <button class="icon-btn danger" data-action="delete-routine" data-id="${r.id}" title="${t('common.delete')}" aria-label="${t('common.delete')}">${icon('trash')}</button>
    </div>
  </article>`;
}

// ---------- Habitudes ----------

function habitStrip(h) {
  const tday = today();
  const WS = weekdaysShort();
  return `<div class="strip">${[...Array(14)].map((_, i) => {
    const d = addDays(tday, i - 13), k = dateKey(d);
    const v = L.valueOn(h, k);
    let cls = dayCellClass(h, d, k, i === 13);
    if (i === 13) cls += ' is-today';
    return `<button class="cell ${cls}" data-action="toggle-day" data-id="${h.id}" data-key="${k}" title="${fmtFull(d)}${h.kind === 'count' ? ` · ${v}/${h.target}` : ''}" aria-label="${esc(h.name)}, ${fmtFull(d)}"><span>${cls.startsWith('skip') ? '↷' : WS[weekday(d)]}</span><em>${d.getDate()}</em></button>`;
  }).join('')}</div>`;
}

function habitRow(h) {
  const rate = L.completionRate(h, 30);
  const streak = L.currentStreak(h);
  const best = L.bestStreak(h);
  const paused = isPaused(h);
  const pause = h.pauses.find((p) => !p.to);
  return `
  <article class="habit-row ${paused ? 'is-paused' : ''}" style="--c:${h.color}">
    <div class="hr-main">
      ${tick(h.color)}
      <div class="hr-title">
        <h3><a class="hr-link" href="#/habit/${h.id}">${esc(h.name)}</a>${h.kind === 'quit' ? ` <span class="tag">${t('form.kind_quit')}</span>` : ''}</h3>
        <p>${habitMeta(h)}${h.kind === 'count' ? `<i class="sep"></i>${h.target} ${esc(h.unit)}${t('habits.per_day')}` : ''}</p>
        ${paused && pause ? `<p class="hr-notes">${icon('pause')}${t('habits.paused_since', { date: fmtShort(parseKey(pause.from)) })}</p>` : h.identity ? `<p class="hr-notes identity">${icon('user')}${esc(h.identity)} · ${t('identity.votes', { n: L.votesFor(h) })}</p>` : h.notes ? `<p class="hr-notes">${esc(h.notes)}</p>` : ''}
      </div>
    </div>
    ${habitStrip(h)}
    <div class="hr-stats">
      <div><b>${rate === null ? '—' : pct(rate)}</b><span>${t('habits.30d')}</span></div>
      <div><b>${streak}</b><span>${h.kind === 'quit' ? t('habits.days_without') : t('habits.streak')}</span></div>
      <div><b>${best}</b><span>${t('habits.record')}</span></div>
    </div>
    <div class="hr-actions">
      <button class="icon-btn" data-action="edit-habit" data-id="${h.id}" title="${t('common.edit')}" aria-label="${t('common.edit')}">${icon('edit')}</button>
      ${paused
        ? `<button class="icon-btn" data-action="resume-habit" data-id="${h.id}" title="${t('habits.resume')}" aria-label="${t('habits.resume')}">${icon('play')}</button>`
        : `<button class="icon-btn" data-action="pause-habit" data-id="${h.id}" title="${t('habits.pause')}" aria-label="${t('habits.pause')}">${icon('pause')}</button>`}
      <button class="icon-btn" data-action="archive-habit" data-id="${h.id}" title="${t('common.archive')}" aria-label="${t('common.archive')}">${icon('archive')}</button>
      <button class="icon-btn danger" data-action="delete-habit" data-id="${h.id}" title="${t('common.delete')}" aria-label="${t('common.delete')}">${icon('trash')}</button>
    </div>
  </article>`;
}

export function viewHabits(s, ui) {
  const habits = activeHabits(s);
  const cats = [...new Set(habits.map((h) => h.category).filter(Boolean))].sort();
  const cat = cats.includes(ui.habitCat) ? ui.habitCat : '';
  const list = habits.filter((h) => !cat || h.category === cat);
  const archived = s.habits.filter((h) => h.archived);
  return `
  <header class="page-head">
    <div>
      <h1>${t('nav.habits')}</h1>
      <p class="lead">${tn(habits.length, 'habits.active')} · ${t('habits.avg30')} <b>${pct(L.overallRate(habits, 30))}</b></p>
    </div>
    <button class="btn primary" data-action="new-habit">${icon('plus')}${t('habits.new')}</button>
  </header>
  ${cats.length ? `<div class="chips">${['', ...cats].map((c) => `<button class="chip-btn ${c === cat ? 'on' : ''}" data-action="filter-cat" data-cat="${esc(c)}">${c ? esc(c) : t('common.all')}</button>`).join('')}</div>` : ''}
  <div class="list">
    ${list.length ? list.map(habitRow).join('') : empty(t('habits.none'), t('habits.none_text'), `<button class="btn primary" data-action="new-habit">${icon('plus')}${t('today.create_habit')}</button>`)}
  </div>
  <p class="hint">${t('habits.hint')}</p>

  <section class="section">
    <div class="section-head"><h2>${t('routine.title')}</h2><button class="btn sm" data-action="new-routine">${icon('plus')}${t('routine.new')}</button></div>
    ${s.routines.length
      ? `<div class="list">${s.routines.map((r) => routineRow(r, dateKey(today()))).join('')}</div>`
      : empty(t('routine.none'), t('routine.none_text'), `<button class="btn" data-action="new-routine">${icon('plus')}${t('routine.new')}</button>`)}
  </section>
  ${archived.length ? `
  <details class="archived">
    <summary>${icon('archive')}${t('habits.archived', { n: archived.length })}</summary>
    ${archived.map((h) => `<div class="arch-row"><span>${tick(h.color)}${esc(h.name)}</span><span class="spacer"></span><button class="btn sm" data-action="unarchive-habit" data-id="${h.id}">${icon('restore')}${t('common.restore')}</button><button class="icon-btn danger" data-action="delete-habit" data-id="${h.id}" aria-label="${t('common.delete')}">${icon('trash')}</button></div>`).join('')}
  </details>` : ''}`;
}

// ---------- Détail d'une habitude ----------

const MOOD_FACES = ['😣', '😕', '😐', '🙂', '😄'];

function calendar(h, month, tday) {
  const first = startOfMonth(month);
  const offset = weekday(first);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const tk = dateKey(tday);
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push('<i></i>');
  for (let d = 1; d <= days; d++) {
    const date = new Date(month.getFullYear(), month.getMonth(), d), k = dateKey(date);
    const future = k > tk, before = k < h.createdAt;
    const cls = future ? 'future' : before ? 'before' : dayCellClass(h, date, k, k === tk);
    const v = L.valueOn(h, k);
    cells.push(`<button class="cal-day ${cls} ${k === tk ? 'is-today' : ''}" ${future ? 'disabled' : ''} data-action="toggle-day" data-id="${h.id}" data-key="${k}" title="${fmtFull(date)}${h.kind === 'count' ? ` · ${v}/${h.target}` : ''}" aria-label="${esc(h.name)}, ${fmtFull(date)}"><em>${d}</em>${h.kind === 'count' && v && !L.isDone(h, k) ? `<small>${v}</small>` : ''}</button>`);
  }
  return `<div class="cal"><div class="cal-head">${weekdaysShort().map((w) => `<span>${w}</span>`).join('')}</div><div class="cal-grid">${cells.join('')}</div></div>`;
}

function trend(hist) {
  const W = 520, H = 120, bw = W / hist.length;
  const bars = hist.map((w, i) => {
    const r = w.req ? w.ok / w.req : null;
    const hh = r === null ? 0 : Math.max(3, r * (H - 24));
    const cls = r === null ? 'none' : r >= 0.8 ? 'hi' : r >= 0.5 ? 'mid' : 'lo';
    return `<rect x="${(i * bw + 2).toFixed(1)}" y="${(H - 18 - hh).toFixed(1)}" width="${(bw - 4).toFixed(1)}" height="${hh.toFixed(1)}" rx="2" class="${cls}"><title>${fmtShort(w.start)} · ${r === null ? '—' : pct(r)}</title></rect>`;
  }).join('');
  const last = hist.length - 1;
  const labels = hist.map((w, i) => (i % 8 === 0 || (i === last && last % 8 >= 4) ? `<text x="${(i * bw + bw / 2).toFixed(1)}" y="${H - 4}" text-anchor="middle">${fmtShort(w.start)}</text>` : '')).join('');
  return `<svg class="trend" viewBox="0 0 ${W} ${H}" role="img" aria-label="${t('detail.trend')}">${bars}${labels}</svg>`;
}

export function viewHabit(s, ui = {}) {
  const h = s.habits.find((x) => x.id === ui.habitId);
  if (!h) return empty(t('detail.missing'), '', `<a class="btn" href="#/habits">${icon('chev-l')}${t('detail.back')}</a>`);
  const tday = today();
  const month = addMonths(tday, ui.calOffset || 0);
  const streak = L.currentStreak(h), best = L.bestStreak(h);
  const rate30 = L.completionRate(h, 30), rate90 = L.completionRate(h, 90);
  const total = Object.keys(h.log).filter((k) => L.isDone(h, k)).length;
  const hist = L.weeklyHistory(h, 26);
  const span = hist.reduce((a, w) => ({ ok: a.ok + w.ok, req: a.req + w.req }), { ok: 0, req: 0 });
  const notes = Object.entries(h.journal).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 8);
  const paused = isPaused(h);
  return `
  <header class="page-head">
    <div>
      <a class="link back" href="#/habits">${icon('chev-l')}${t('detail.back')}</a>
      <h1>${tick(h.color)}${esc(h.name)}${h.kind === 'quit' ? ` <span class="tag">${t('form.kind_quit')}</span>` : ''}${h.archived ? ` <span class="tag">${t('common.archive')}</span>` : ''}</h1>
      <p class="lead">${habitMeta(h)}${h.kind === 'count' ? `<i class="sep"></i>${h.target} ${esc(h.unit)}${t('habits.per_day')}` : ''}<i class="sep"></i>${t('detail.since', { date: fmtShort(parseKey(h.createdAt)) })}</p>
      ${h.identity ? `<p class="hr-notes identity">${icon('user')}${esc(h.identity)} · ${t('identity.votes', { n: L.votesFor(h) })}</p>` : ''}
    </div>
    <div class="head-actions">
      <button class="btn" data-action="edit-habit" data-id="${h.id}">${icon('edit')}${t('common.edit')}</button>
      ${paused
        ? `<button class="btn" data-action="resume-habit" data-id="${h.id}">${icon('play')}${t('habits.resume')}</button>`
        : `<button class="btn ghost" data-action="pause-habit" data-id="${h.id}">${icon('pause')}${t('habits.pause')}</button>`}
      ${h.archived
        ? `<button class="btn ghost" data-action="unarchive-habit" data-id="${h.id}">${icon('restore')}${t('common.restore')}</button>`
        : `<button class="btn ghost" data-action="archive-habit" data-id="${h.id}">${icon('archive')}${t('common.archive')}</button>`}
    </div>
  </header>

  <section class="band" aria-label="${t('today.summary')}">
    ${metric({ label: h.kind === 'quit' ? t('habits.days_without') : t('habits.streak'), value: `<b>${streak}</b><span>${L.streakShort(h)}</span>` })}
    ${metric({ label: t('habits.record'), value: `<b>${best}</b><span>${L.streakShort(h)}</span>` })}
    ${metric({ label: t('habits.30d'), value: `<b>${rate30 === null ? '—' : Math.round(rate30 * 100)}</b><span>%</span>`, sub: rate90 === null ? '' : t('detail.rate90', { p: pct(rate90) }) })}
    ${metric({ label: t('detail.total'), value: `<b>${total}</b>`, sub: span.req ? t('detail.span', { p: pct(span.ok / span.req) }) : '' })}
  </section>

  <div class="grid-2 detail-grid">
    <article class="panel">
      <div class="panel-head"><h3>${icon('calendar')}${fmtMonth(month)}</h3><div class="cal-nav"><button class="icon-btn" data-action="cal-prev" aria-label="${t('detail.prev')}">${icon('chev-l')}</button><button class="icon-btn" data-action="cal-next" ${(ui.calOffset || 0) >= 0 ? 'disabled' : ''} aria-label="${t('detail.next')}">${icon('chev-r')}</button></div></div>
      ${calendar(h, month, tday)}
      <p class="muted">${t('detail.cal_hint')}</p>
    </article>
    <article class="panel">
      <div class="panel-head"><h3>${icon('chart')}${t('detail.trend')}</h3><span class="muted">${t('detail.trend_sub')}</span></div>
      ${trend(hist)}
      <p class="muted">${t('detail.trend_hint')}</p>
    </article>
  </div>

  <article class="panel detail-notes">
    <div class="panel-head"><h3>${icon('book')}${t('detail.notes')}</h3><button class="btn sm" data-action="journal" data-id="${h.id}">${icon('plus')}${t('today.journal')}</button></div>
    ${notes.length
      ? `<ul class="note-list">${notes.map(([k, j]) => `<li><span class="mood">${MOOD_FACES[j.mood - 1] || '·'}</span><div><b>${fmtShort(parseKey(k))}</b>${j.note ? `<p>${esc(j.note)}</p>` : ''}</div><button class="icon-btn sm" data-action="journal-day" data-id="${h.id}" data-key="${k}" aria-label="${t('common.edit')}">${icon('edit')}</button></li>`).join('')}</ul>`
      : `<p class="muted">${t('detail.no_notes')}</p>`}
    ${h.notes ? `<p class="hr-notes">${icon('info')}${esc(h.notes)}</p>` : ''}
  </article>`;
}

// ---------- Tâches ----------

function taskCard(x) {
  const p = L.PRIORITIES[x.priority] || L.PRIORITIES[1];
  const idx = L.STATUSES.findIndex((y) => y.id === x.status);
  return `
  <article class="task-card ${p.cls} ${L.isOverdue(x) ? 'overdue' : ''} ${x.status === 'done' ? 'is-done' : ''}" draggable="true" data-action="edit-task" data-id="${x.id}" tabindex="0">
    <div class="tc-top">${prioChip(x)}${x.project ? `<span class="tag">#${esc(x.project)}</span>` : ''}</div>
    <h4>${esc(x.title)}</h4>
    ${x.notes ? `<p class="tc-notes">${esc(x.notes.length > 110 ? `${x.notes.slice(0, 110)}…` : x.notes)}</p>` : ''}
    ${subProgress(x)}
    <div class="tc-bottom">
      ${dueChip(x) || '<span></span>'}
      <div class="tc-actions">
        <button class="icon-btn sm" data-action="task-move" data-id="${x.id}" data-dir="-1" ${idx === 0 ? 'disabled' : ''} aria-label="${t('tasks.prev_col')}">${icon('chev-l')}</button>
        <button class="icon-btn sm" data-action="task-move" data-id="${x.id}" data-dir="1" ${idx === 2 ? 'disabled' : ''} aria-label="${t('tasks.next_col')}">${icon('chev-r')}</button>
      </div>
    </div>
  </article>`;
}

export function boardHTML(s, ui) {
  const q = norm(ui.taskQ);
  const list = s.tasks.filter((x) =>
    (!q || norm(`${x.title} ${x.notes} ${x.project} ${x.subtasks.map((y) => y.title).join(' ')}`).includes(q)) &&
    (ui.taskPrio === '' || x.priority === Number(ui.taskPrio)) &&
    (!ui.taskProj || x.project === ui.taskProj));
  return L.STATUSES.map((st) => {
    const items = list.filter((x) => x.status === st.id)
      .sort(st.id === 'done' ? (a, b) => (b.doneAt || '').localeCompare(a.doneAt || '') : L.taskSorter(ui.taskSort));
    return `
    <section class="col" data-col="${st.id}">
      <header class="col-head"><span class="col-dot ${st.id}"></span><h3>${st.label}</h3><span class="count">${items.length}</span>
        <button class="icon-btn sm" data-action="new-task" data-status="${st.id}" aria-label="${t('tasks.add_in', { col: st.label })}">${icon('plus')}</button></header>
      <div class="col-body">${items.map(taskCard).join('') || `<p class="col-empty">${t('tasks.drop_here')}</p>`}</div>
    </section>`;
  }).join('');
}

export function viewTasks(s, ui) {
  const projects = [...new Set(s.tasks.map((x) => x.project).filter(Boolean))].sort();
  const open = s.tasks.filter((x) => x.status !== 'done').length;
  const overdue = s.tasks.filter(L.isOverdue).length;
  const opt = (v, label, cur) => `<option value="${esc(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(label)}</option>`;
  return `
  <header class="page-head">
    <div>
      <h1>${t('nav.tasks')}</h1>
      <p class="lead">${tn(open, 'tasks.open')}${overdue ? ` · <span class="late-text">${t('tasks.overdue', { n: overdue })}</span>` : ''} · ${t('tasks.drag_hint')}</p>
    </div>
    <button class="btn primary" data-action="new-task">${icon('plus')}${t('tasks.new')}</button>
  </header>
  <div class="toolbar">
    <label class="search">${icon('search')}<input id="task-q" type="search" placeholder="${t('tasks.search_ph')}" value="${esc(ui.taskQ)}" aria-label="${t('tasks.search_ph')}"></label>
    <select id="task-prio" aria-label="${t('tasks.filter_prio')}">${opt('', t('tasks.all_prio'), ui.taskPrio)}${[3, 2, 1, 0].map((i) => opt(i, L.PRIORITIES[i].label, ui.taskPrio)).join('')}</select>
    <select id="task-proj" aria-label="${t('tasks.filter_proj')}">${opt('', t('tasks.all_proj'), ui.taskProj)}${projects.map((p) => opt(p, `#${p}`, ui.taskProj)).join('')}</select>
    <select id="task-sort" aria-label="${t('tasks.sort')}">${opt('prio', t('tasks.sort_prio'), ui.taskSort)}${opt('due', t('tasks.sort_due'), ui.taskSort)}${opt('recent', t('tasks.sort_recent'), ui.taskSort)}</select>
  </div>
  <div id="board" class="board">${boardHTML(s, ui)}</div>`;
}

// ---------- Statistiques ----------

function barChart(habits) {
  const tday = today();
  const days = [...Array(30)].map((_, i) => addDays(tday, i - 29));
  const data = days.map((d) => { const { req, done } = L.dayStats(habits, d); return { d, req, done, r: req ? done / req : 0 }; });
  const W = 640, H = 200, left = 34, bottom = 26, top = 10;
  const bw = (W - left) / data.length;
  const y = (r) => top + (1 - r) * (H - top - bottom);
  const withData = data.filter((x) => x.req);
  const avg = withData.length ? withData.reduce((a, x) => a + x.r, 0) / withData.length : 0;
  return `
  <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${t('stats.chart_label')}">
    ${[0, 0.5, 1].map((r) => `<line class="grid" x1="${left}" x2="${W}" y1="${y(r)}" y2="${y(r)}"/><text class="axis" x="${left - 8}" y="${y(r) + 4}" text-anchor="end">${r * 100}%</text>`).join('')}
    ${data.map((x, i) => {
      const h = Math.max(2, (H - top - bottom) * x.r);
      return `<rect x="${left + i * bw + 3}" y="${y(x.r) - (x.r ? 0 : 2)}" width="${bw - 6}" height="${x.r ? h : 2}" rx="1.5" class="bar ${x.r >= 1 ? 'full' : x.r ? '' : 'zero'}"><title>${fmtFull(x.d)} : ${x.done}/${x.req}</title></rect>`;
    }).join('')}
    <line class="avg" x1="${left}" x2="${W}" y1="${y(avg)}" y2="${y(avg)}"><title>${t('stats.avg_title', { n: Math.round(avg * 100) })}</title></line>
    ${data.map((x, i) => (i % 7 === 2 || i === 29 ? `<text class="axis" x="${left + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${i === 29 ? t('common.today').toLowerCase().slice(0, 4) + '.' : fmtShort(x.d)}</text>` : '')).join('')}
  </svg>`;
}

function heatmap(habits, weeks) {
  const tday = today();
  const start = addDays(startOfWeek(tday), -7 * (weeks - 1));
  const W = weekdays();
  let cols = '', months = '';
  let lastMonth = -1, lastLabel = -9;
  for (let w = 0; w < weeks; w++) {
    let cells = '';
    const first = addDays(start, w * 7);
    if (first.getMonth() !== lastMonth) {
      lastMonth = first.getMonth();
      // Pas d'étiquette collée à la précédente (deux mois dans les trois premières colonnes).
      if (w - lastLabel >= 3 && (w > 0 || addDays(first, 21).getMonth() === lastMonth)) { months += `<span style="grid-column:${w + 1}">${fmtMonth(first)}</span>`; lastLabel = w; }
    }
    for (let d = 0; d < 7; d++) {
      const day = addDays(start, w * 7 + d);
      if (day > tday) { cells += '<i class="hm future"></i>'; continue; }
      const { req, done } = L.dayStats(habits, day);
      const r = req ? done / req : -1;
      const lvl = r < 0 ? 'none' : r === 0 ? 'l0' : r < 0.34 ? 'l1' : r < 0.67 ? 'l2' : r < 1 ? 'l3' : 'l4';
      cells += `<i class="hm ${lvl}" title="${fmtFull(day)} : ${req ? `${done}/${req}` : t('stats.nothing_planned')}"></i>`;
    }
    cols += `<div class="hm-col">${cells}</div>`;
  }
  return `
  <div class="heatmap ${weeks > 30 ? 'year' : ''}">
    <div class="hm-days"><span></span>${W.map((d, i) => `<span>${i % 2 === 0 ? d : ''}</span>`).join('')}</div>
    <div class="hm-body"><div class="hm-months" style="grid-template-columns:repeat(${weeks}, 14px)">${months}</div><div class="hm-grid">${cols}</div></div>
  </div>
  <div class="hm-legend"><span>${t('stats.less')}</span><i class="hm l0"></i><i class="hm l1"></i><i class="hm l2"></i><i class="hm l3"></i><i class="hm l4"></i><span>${t('stats.more')}</span></div>`;
}

function donut(parts) {
  const total = parts.reduce((a, p) => a + p.n, 0) || 1;
  const C = 2 * Math.PI * 40;
  let off = 0;
  const arcs = parts.map((p) => {
    const len = (p.n / total) * C;
    const a = `<circle cx="50" cy="50" r="40" stroke="${p.color}" stroke-dasharray="${Math.max(0, len - 2)} ${C}" stroke-dashoffset="${-off}"/>`;
    off += len;
    return a;
  }).join('');
  return `
  <div class="donut-wrap">
    <svg class="donut" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="40" class="donut-bg"/>${arcs}</svg>
    <ul class="legend">${parts.map((p) => `<li><i style="background:${p.color}"></i>${p.label}<b>${p.n}</b></li>`).join('')}</ul>
  </div>`;
}

export function viewStats(s) {
  const habits = activeHabits(s);
  const tday = today();
  const rate30 = L.overallRate(habits, 30);
  const checks = L.totalChecks(s.habits);
  const best = Math.max(0, ...s.habits.filter((h) => !L.isPeriodic(h)).map((h) => L.bestStreak(h)));
  const weekAgo = dateKey(addDays(tday, -6));
  const doneWeek = s.tasks.filter((x) => x.status === 'done' && x.doneAt && x.doneAt >= weekAgo).length;
  const lv = L.levelFor(L.computeXP(s));
  const days30 = [...Array(30)].map((_, i) => L.dayStats(habits, addDays(tday, -i))).filter((x) => x.req);
  const avg30 = days30.length ? days30.reduce((a, x) => a + x.done / x.req, 0) / days30.length : 0;
  const ranking = habits.map((h) => ({ h, r: L.completionRate(h, 30) ?? 0 })).sort((a, b) => b.r - a.r);
  const open = s.tasks.filter((x) => x.status !== 'done');
  const unlocked = new Set(L.BADGES.filter((b) => b.test(s)).map((b) => b.id));
  const year = s.settings.heatmap === 'year';
  const insights = weeklyInsights(s);
  const mood = moodStats(habits);
  const rb = L.reboundStats(habits, 30);
  const ids = L.identities(habits);

  return `
  <header class="page-head">
    <div><h1>${t('stats.title')}</h1><p class="lead">${t('stats.lead')}</p></div>
    <div class="head-actions">
      <a class="btn" href="#/review">${icon('sparkle')}${t('review.title')}</a>
      <button class="btn" data-action="export-csv">${icon('file')}${t('stats.export_csv')}</button>
    </div>
  </header>

  <section class="band" aria-label="${t('stats.key')}">
    ${metric({ label: t('stats.rate30'), value: `<b>${Math.round(rate30 * 100)}</b><span>%</span>`, sub: t('stats.all_habits') })}
    ${metric({ label: t('stats.checks'), value: `<b>${checks}</b>`, sub: t('stats.xp_earned', { n: checks * 10 }) })}
    ${metric({ label: t('stats.record'), value: `<b>${best}</b><span>${t('common.days')}</span>`, sub: t('stats.longest') })}
    ${metric({ label: t('stats.rebounds'), value: `<b>${rb.rebounds}</b><span>/${rb.rebounds + rb.doubles}</span>`, sub: t('stats.rebounds_sub', { n: rb.doubles }), tone: rb.doubles > rb.rebounds ? 'warn' : '' })}
  </section>

  <section class="panel insights">
    <div class="panel-head"><h3>${icon('sparkle')}${t('stats.insights')}</h3><span class="muted">${t('stats.insights_sub')}</span></div>
    <ul class="insight-list">${insights.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
  </section>

  <section class="grid-2">
    <article class="panel">
      <div class="panel-head"><h3>${t('stats.last30')}</h3><span class="muted"><i class="avg-key"></i>${t('stats.avg', { v: pct(avg30) })}</span></div>
      ${habits.length ? barChart(habits) : `<p class="muted">${t('stats.no_data')}</p>`}
    </article>
    <article class="panel ${year ? 'wide' : ''}">
      <div class="panel-head"><h3>${t('stats.regularity')}</h3><button class="link" data-action="toggle-heatmap">${year ? t('stats.show_20w') : t('stats.show_year')}${icon('chev-r')}</button></div>
      ${heatmap(habits, year ? 53 : 20)}
    </article>
  </section>

  <section class="grid-2">
    <article class="panel">
      <div class="panel-head"><h3>${t('stats.ranking')}</h3><span class="muted">${t('stats.rank_sub')}</span></div>
      <div class="rank">${ranking.map(({ h, r }) => `
        <div class="rank-row" style="--c:${h.color}"><span class="rank-name">${tick(h.color)}${esc(h.name)}</span><div class="rank-bar"><span style="width:${r * 100}%"></span></div><b>${pct(r)}</b></div>`).join('') || `<p class="muted">${t('stats.no_habit')}</p>`}
      </div>
      ${mood.notes ? `<p class="muted mood-line">${icon('smile')}${t('stats.mood')} : <b>${mood.avg ? mood.avg.toFixed(1) : '—'}</b>/5 · ${t('stats.journal_entries', { n: mood.notes })}</p>` : ''}
    </article>
    <article class="panel">
      <div class="panel-head"><h3>${t('stats.tasks')}</h3><span class="muted">${t('stats.open', { n: open.length })} · ${t('stats.done_week', { n: doneWeek })}</span></div>
      ${donut([
        { label: t('status.todo'), n: s.tasks.filter((x) => x.status === 'todo').length, color: 'var(--donut-1)' },
        { label: t('status.doing'), n: s.tasks.filter((x) => x.status === 'doing').length, color: 'var(--donut-2)' },
        { label: t('status.done'), n: s.tasks.filter((x) => x.status === 'done').length, color: 'var(--signal)' },
      ])}
      <div class="prio-bars">${[3, 2, 1, 0].map((p) => { const n = open.filter((x) => x.priority === p).length; return `<div class="prio-bar ${L.PRIORITIES[p].cls}"><span>${L.PRIORITIES[p].label}</span><div><i style="width:${open.length ? (n / open.length) * 100 : 0}%"></i></div><b>${n}</b></div>`; }).join('')}</div>
    </article>
  </section>

  ${ids.length ? `
  <section class="panel identities">
    <div class="panel-head"><h3>${icon('user')}${t('identity.title')}</h3><span class="muted">${t('identity.sub')}</span></div>
    <div class="id-grid">${ids.map((x) => `<div class="id-card"><b>${esc(x.identity)}</b><span class="id-votes">${x.votes}</span><small>${t('identity.votes_long', { n: x.votes })} · ${x.habits.map((h) => esc(h.name)).join(', ')}</small></div>`).join('')}</div>
  </section>` : ''}

  <section class="section">
    <div class="section-head"><h2>${t('stats.badges')}</h2><span class="muted">${t('stats.unlocked', { n: unlocked.size, total: L.BADGES.length })}</span></div>
    <div class="badges">${L.BADGES.map((b) => `
      <div class="badge ${unlocked.has(b.id) ? 'on' : ''}"><span class="badge-ic">${icon(BADGE_IC[b.id] || 'award')}</span><div><b>${b.name}</b><small>${b.desc}</small></div><span class="badge-state">${unlocked.has(b.id) ? t('stats.got') : t('stats.locked')}</span></div>`).join('')}
    </div>
  </section>`;
}

// ---------- Réglages ----------

export function viewSettings(s, ui = {}) {
  const lv = L.levelFor(L.computeXP(s));
  const st = s.settings;
  const install = installState();
  const perm = notifPermission();
  const vacation = currentVacation(s);
  const snaps = listSnapshots();
  const opt = (v, label, cur) => `<option value="${esc(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(label)}</option>`;
  return `
  <header class="page-head">
    <div><h1>${t('settings.title')}</h1><p class="lead">${t('settings.lead')}</p></div>
  </header>
  <section class="settings">
    <article class="panel">
      <div class="panel-head"><h3>${icon('user')}${t('settings.profile')}</h3></div>
      <label class="field"><span>${t('settings.name')}</span><input data-setting="name" value="${esc(st.name)}" maxlength="30" placeholder="${t('settings.name_ph')}"></label>
      <p class="muted">${t('settings.level_line', { level: lv.level, xp: lv.xp, n: s.profile.perfectDays.length })}</p>
    </article>

    <article class="panel">
      <div class="panel-head"><h3>${icon('moon')}${t('settings.appearance')}</h3></div>
      <div class="field-row">
        <label class="field grow"><span>${t('settings.theme')}</span><select data-setting="theme">${opt('auto', t('settings.theme_auto'), st.theme)}${opt('dark', t('settings.theme_dark'), st.theme)}${opt('light', t('settings.theme_light'), st.theme)}</select></label>
        <label class="field grow"><span>${icon('globe')}${t('settings.lang')}</span><select data-setting="lang">${LANGS.map((l) => opt(l.id, l.label, lang())).join('')}</select></label>
      </div>
      <label class="switch"><input type="checkbox" data-setting="motion" ${st.motion ? 'checked' : ''}><span class="track"></span><span>${t('settings.motion_label')}</span></label>
      <p class="muted">${t('settings.motion_hint')}</p>
    </article>

    <article class="panel">
      <div class="panel-head"><h3>${icon('sun')}${t('settings.day')}</h3></div>
      <label class="switch"><input type="checkbox" data-setting="neverTwice" ${st.neverTwice !== false ? 'checked' : ''}><span class="track"></span><span>${t('settings.never_twice')}</span></label>
      <p class="muted">${t('settings.never_twice_hint')}</p>
      <label class="field"><span>${t('settings.day_start')}</span><select data-setting="dayStart">${[0, 1, 2, 3, 4, 5, 6].map((h) => opt(h, h === 0 ? t('settings.midnight') : t('settings.hour', { h }), st.dayStart)).join('')}</select></label>
      <p class="muted">${t('settings.day_start_hint')}</p>
      <div class="panel-head"><h3>${icon('plane')}${t('settings.vacation')}</h3></div>
      <label class="switch"><input type="checkbox" data-setting="vacation" ${vacation ? 'checked' : ''}><span class="track"></span><span>${t('settings.vacation_label')}</span></label>
      ${vacation ? `<label class="field"><span>${t('settings.vacation_until')}</span><input type="date" data-setting="vacationUntil" value="${esc(vacation.to)}" min="${dateKey(today())}"></label>` : ''}
      <p class="muted">${t('settings.vacation_hint')}</p>
    </article>

    <article class="panel">
      <div class="panel-head"><h3>${icon('bell')}${t('settings.reminders')}</h3></div>
      <label class="switch"><input type="checkbox" data-setting="notify" ${st.notify && perm === 'granted' ? 'checked' : ''} ${!notifSupported() ? 'disabled' : ''}><span class="track"></span><span>${t('settings.notify_label')}</span></label>
      ${!notifSupported() ? `<p class="muted">${t('settings.notify_unsupported')}</p>` : perm === 'denied' ? `<p class="muted warn-text">${t('settings.notify_denied')}</p>` : `<p class="muted">${t('settings.notify_hint')}</p>`}
      <div class="field-row">
        <label class="field grow"><span>${t('settings.recap')}</span><input type="time" data-setting="recapTime" value="${esc(st.recapTime)}"></label>
        <button class="btn sm self-end" data-action="test-notify" ${perm !== 'granted' ? 'disabled' : ''}>${icon('bell')}${t('settings.test_notify')}</button>
      </div>
      <p class="muted">${t('settings.recap_hint')}</p>
      <div class="panel-head"><h3>${icon('cloud')}${t('push.title')}</h3></div>
      ${isSignedIn()
        ? (pushSupported()
          ? `<label class="switch"><input type="checkbox" data-setting="push" ${ui.pushOn ? 'checked' : ''}><span class="track"></span><span>${t('push.label')}</span></label>
             <p class="muted">${t('push.hint')}</p>
             <div class="btn-row"><button class="btn sm" data-action="push-test" ${ui.pushOn ? '' : 'disabled'}>${icon('bell')}${t('settings.test_notify')}</button></div>`
          : `<p class="muted">${t('push.unsupported')}</p>`)
        : `<p class="muted">${t('push.need_account')}</p>`}
    </article>

    ${isSignedIn() ? `
    <article class="panel">
      <div class="panel-head"><h3>${icon('user')}${t('buddy.title')}</h3><span class="muted">${t('buddy.sub')}</span></div>
      <p class="muted">${t('buddy.hint')}</p>
      ${(ui.buddies || []).length ? `<ul class="buddies">${ui.buddies.map((b) => `<li><b>${esc(b.name)}</b><span class="buddy-today ${b.today.perfect ? 'perfect' : ''}">${b.today.done}/${b.today.total}${b.today.perfect ? ' ✓' : ''}</span><small>${t('buddy.best', { n: b.bestStreak })}</small><button class="icon-btn sm" data-action="buddy-remove" data-id="${b.id}" aria-label="${t('common.delete')}">${icon('x')}</button></li>`).join('')}</ul>` : `<p class="muted">${t('buddy.none')}</p>`}
      <div class="btn-row">
        <button class="btn" data-action="buddy-invite">${icon('sparkle')}${t('buddy.invite')}</button>
        ${ui.inviteCode ? `<code class="invite-code" id="invite-code">${esc(ui.inviteCode)}</code><button class="btn sm" data-action="buddy-copy">${icon('copy')}${t('common.copy')}</button>` : ''}
      </div>
      ${ui.inviteCode ? `<p class="muted">${t('buddy.invite_hint')}</p>` : ''}
      <form class="buddy-join" id="buddy-form"><label class="field grow"><span>${t('buddy.code')}</span><input id="buddy-code" maxlength="6" placeholder="ABC234" autocomplete="off" style="text-transform:uppercase"></label><button class="btn" type="submit">${t('buddy.join')}</button></form>
      <p class="form-error" id="buddy-error" hidden></p>
    </article>` : ''}

    <article class="panel">
      <div class="panel-head"><h3>${icon('phone')}${t('settings.install')}</h3></div>
      ${install === 'installed' ? `<p class="muted">${t('settings.installed')}</p>`
        : install === 'ready' ? `<p class="muted">${t('settings.install_hint')}</p><div class="btn-row"><button class="btn primary" data-action="install">${icon('download')}${t('settings.install_btn')}</button></div>`
        : install === 'ios' ? `<p class="muted">${t('settings.install_hint')}</p><p class="muted">${t('settings.install_ios')}</p>`
        : `<p class="muted">${t('settings.install_unsupported')}</p>`}
    </article>

    <article class="panel">
      <div class="panel-head"><h3>${icon('cloud')}${t('cloud.title')}</h3>${isSignedIn() ? `<span class="muted">${esc(st.cloud.email)}</span>` : ''}</div>
      ${isSignedIn() ? `
      <p class="muted">${t('cloud.signed_in_hint')}</p>
      <label class="switch"><input type="checkbox" data-setting="cloudAuto" ${st.cloud.auto !== false ? 'checked' : ''}><span class="track"></span><span>${t('cloud.auto')}</span></label>
      <div class="btn-row">
        <button class="btn" data-action="cloud-push">${icon('upload')}${t('settings.sync_push')}</button>
        <button class="btn" data-action="cloud-pull">${icon('download')}${t('settings.sync_pull')}</button>
        <button class="btn ghost" data-action="cloud-logout">${t('cloud.sign_out')}</button>
      </div>
      <p class="muted">${st.cloud.lastAt ? t('settings.sync_last', { date: fmtDateTime(new Date(st.cloud.lastAt)) }) : t('settings.sync_never')}</p>
      <details class="more"><summary>${t('cloud.danger')}</summary>
        <p class="muted">${t('recovery.settings_hint')}</p>
        <div class="btn-row"><button class="btn" data-action="cloud-recovery">${icon('key')}${t('recovery.new_code')}</button><button class="btn ghost" data-action="cloud-logout-all">${t('cloud.sign_out_all')}</button><button class="btn danger" data-action="cloud-delete">${icon('trash')}${t('cloud.delete')}</button></div>
      </details>`
      : `
      <p class="muted">${t('cloud.hint')}</p>
      <form class="cloud-form" id="cloud-form">
        <label class="field"><span>${t('cloud.email')}</span><input id="cloud-email" type="email" autocomplete="email" required placeholder="you@example.com"></label>
        <label class="field"><span>${t('cloud.password')}</span><input id="cloud-password" type="password" autocomplete="current-password" minlength="8" required placeholder="${t('cloud.password_ph')}"></label>
        <div class="btn-row">
          <button class="btn primary" type="submit" data-action="cloud-login">${t('cloud.sign_in')}</button>
          <button class="btn" type="button" data-action="cloud-register">${t('cloud.create')}</button>
        </div>
        <p class="form-error" id="cloud-error" hidden></p>
        <p class="muted"><button type="button" class="link-btn quiet" data-action="cloud-forgot">${t('recovery.forgot_link')}</button></p>
      </form>
      <details class="more"><summary>${t('cloud.advanced')}</summary>
        <label class="field"><span>${t('cloud.url')}</span><input data-setting="cloudUrl" value="${esc(st.cloud.url)}" placeholder="${DEFAULT_URL}" autocomplete="off"></label>
        <p class="muted">${t('cloud.url_hint')}</p>
      </details>`}
    </article>

    <article class="panel">
      <div class="panel-head"><h3>${icon('layers')}${t('settings.data')}</h3></div>
      <p class="muted">${t('settings.data_hint')}</p>
      <div class="btn-row">
        <button class="btn" data-action="export">${icon('download')}${t('settings.export')}</button>
        <label class="btn">${icon('upload')}${t('settings.import')}<input type="file" id="import-file" accept="application/json,.json" hidden></label>
        <button class="btn" data-action="share">${icon('share')}${t('settings.share')}</button>
        <button class="btn" data-action="export-csv">${icon('file')}${t('settings.csv')}</button>
      </div>
      <div class="btn-row">
        <button class="btn ghost" data-action="load-demo">${icon('restore')}${t('settings.demo')}</button>
        <button class="btn danger" data-action="reset">${icon('trash')}${t('settings.reset')}</button>
      </div>
    </article>

    <article class="panel">
      <div class="panel-head"><h3>${icon('copy')}${t('settings.transfer')}</h3></div>
      <p class="muted">${t('settings.transfer_hint')}</p>
      <div class="btn-row"><button class="btn" data-action="transfer-make">${icon('copy')}${t('settings.transfer_make')}</button></div>
      <textarea id="transfer-code" rows="3" class="code" placeholder="${t('settings.transfer_ph')}" aria-label="${t('settings.transfer_paste')}"></textarea>
      <div class="btn-row"><button class="btn" data-action="transfer-apply">${icon('upload')}${t('settings.transfer_apply')}</button></div>
    </article>

    <article class="panel">
      <div class="panel-head"><h3>${icon('reset')}${t('settings.snapshots')}</h3></div>
      <p class="muted">${t('settings.snapshots_hint')}</p>
      ${snaps.length ? `<ul class="snaps">${snaps.map((x) => `<li><span>${t('settings.snapshot_line', { date: fmtShort(parseKey(x.date)), habits: x.habits, tasks: x.tasks })}</span><button class="btn sm" data-action="snapshot-restore" data-date="${x.date}">${t('settings.snapshot_restore')}</button></li>`).join('')}</ul>` : `<p class="muted">${t('settings.snapshot_none')}</p>`}
    </article>

    <article class="panel">
      <div class="panel-head"><h3>${icon('cloud')}${t('settings.sync')}</h3></div>
      <p class="muted">${t('settings.sync_hint')}</p>
      <label class="field"><span>${t('settings.sync_token')}</span><input type="password" data-setting="syncToken" value="${esc(st.sync.token)}" placeholder="${t('settings.sync_token_ph')}" autocomplete="off"></label>
      <label class="switch"><input type="checkbox" data-setting="syncAuto" ${st.sync.auto ? 'checked' : ''}><span class="track"></span><span>${t('settings.sync_auto')}</span></label>
      <div class="btn-row">
        <button class="btn" data-action="sync-push">${icon('upload')}${t('settings.sync_push')}</button>
        <button class="btn" data-action="sync-pull">${icon('download')}${t('settings.sync_pull')}</button>
      </div>
      <p class="muted">${st.sync.lastAt ? t('settings.sync_last', { date: fmtDateTime(new Date(st.sync.lastAt)) }) : t('settings.sync_never')}</p>
    </article>

    <article class="panel">
      <div class="panel-head"><h3>${icon('sparkle')}${t('settings.coach')}</h3></div>
      <p class="muted">${t('settings.coach_hint')}</p>
      <label class="field"><span>${t('settings.coach_key')}</span><input type="password" data-setting="aiKey" value="${esc(st.ai.key)}" placeholder="sk-ant-…" autocomplete="off"></label>
      <p class="muted">${t('settings.coach_privacy')}</p>
    </article>

    <article class="panel">
      <div class="panel-head"><h3>${icon('keyboard')}${t('settings.shortcuts')}</h3></div>
      <ul class="shortcuts">
        <li><kbd>Ctrl</kbd><kbd>K</kbd><span>${t('settings.sc_palette')}</span></li>
        <li><kbd>N</kbd><span>${t('settings.sc_habit')}</span></li>
        <li><kbd>T</kbd><span>${t('settings.sc_task')}</span></li>
        <li><kbd>1</kbd>…<kbd>6</kbd><span>${t('settings.sc_pages')}</span></li>
        <li><kbd>${t('settings.sc_esc')}</kbd><span>${t('settings.sc_close')}</span></li>
      </ul>
    </article>

    <article class="panel">
      <div class="panel-head"><h3>${icon('info')}${t('settings.about')}</h3><span class="muted">${t('settings.version', { v: APP_VERSION })}</span></div>
      <p class="muted">${t('settings.about_text')}</p>
      <p class="muted"><a class="link" href="https://github.com/elalamiz605-tech/suivi-habitudes" target="_blank" rel="noopener">GitHub ${icon('chev-r')}</a></p>
    </article>
  </section>`;
}

export function levelCard(s) {
  const lv = L.levelFor(L.computeXP(s));
  const initial = (s.settings.name || 'M').trim().charAt(0).toUpperCase();
  return `
  <div class="lv-top"><span class="avatar">${esc(initial)}</span><div><b>${t('level.title', { n: lv.level })}</b><small>${t('level.xp', { into: lv.into, need: lv.need })}</small></div></div>
  <div class="meter xp"><span style="width:${(lv.into / lv.need) * 100}%"></span></div>`;
}

// ---------- Mon année (3D) ----------

/** 371 valeurs (53 semaines), la dernière = aujourd'hui : part des habitudes tenues chaque jour. */
export function yearData(s) {
  const tday = today();
  const out = [];
  for (let i = 370; i >= 0; i--) {
    const d = addDays(tday, -i);
    const { req, done } = L.dayStats(s.habits, d);
    out.push(req ? done / req : 0);
  }
  return out;
}

export function yearStats(s) {
  const data = yearData(s);
  const kept = data.filter((v) => v > 0).length;
  const full = data.filter((v) => v >= 1).length;
  const best = Math.max(0, ...s.habits.filter((h) => !L.isPeriodic(h)).map((h) => L.bestStreak(h)));
  const first = s.habits.map((h) => h.createdAt).sort()[0];
  const days = first ? Math.min(371, Math.max(1, Math.round((today() - parseKey(first)) / 864e5) + 1)) : 0;
  return { data, kept, full, best, days, checks: L.totalChecks(s.habits) };
}

export function viewYear(s, ui = {}) {
  const st = yearStats(s);
  const stage = ui.yearStage ?? 0;
  return `
  <header class="page-head">
    <div><h1>${t('year.title')}</h1><p class="lead">${t('year.lead')}</p></div>
    <div class="head-actions">
      <button class="btn primary" data-action="share-year">${icon('share')}${t('year.share')}</button>
    </div>
  </header>
  <div class="year-wrap">
    <canvas id="year3d" class="year-canvas" aria-label="${t('year.aria')}"></canvas>
    <div class="year-controls">
      ${[['0', t('year.calendar')], ['1', t('year.spiral')], ['2', t('year.rings')]].map(([v, l]) => `<button class="chip-btn ${String(stage) === v ? 'on' : ''}" data-action="year-stage" data-stage="${v}">${l}</button>`).join('')}
    </div>
  </div>
  <section class="band" aria-label="${t('year.stats')}">
    ${metric({ label: t('year.kept'), value: `<b>${st.kept}</b><span>/${st.days || 371}</span>`, sub: t('year.kept_sub') })}
    ${metric({ label: t('year.full'), value: `<b>${st.full}</b>`, sub: t('year.full_sub') })}
    ${metric({ label: t('stats.record'), value: `<b>${st.best}</b><span>${t('common.days')}</span>`, sub: t('stats.longest') })}
    ${metric({ label: t('stats.checks'), value: `<b>${st.checks}</b>`, sub: t('year.checks_sub') })}
  </section>
  <p class="hint">${t('year.hint')}</p>`;
}

// ---------- Bilan de la semaine ----------

export function viewReview(s, ui = {}) {
  const r = weeklyReview(s);
  const w = r.week;
  const ai = cachedReview();
  const trend = r.cur !== null && r.prev !== null ? Math.round((r.cur - r.prev) * 100) : null;
  const habits = s.habits.filter((h) => !h.archived);
  return `
  <header class="page-head">
    <div>
      <h1>${t('review.title')}</h1>
      <p class="lead">${t('review.range', { from: fmtShort(w.start), to: fmtShort(w.end) })}${w.partial ? ` · ${t('review.partial')}` : ''}</p>
    </div>
    <div class="head-actions"><a class="btn" href="#/stats">${icon('chart')}${t('nav.stats')}</a></div>
  </header>

  <section class="band" aria-label="${t('stats.key')}">
    ${metric({ label: t('review.rate'), value: `<b>${r.cur === null ? '—' : Math.round(r.cur * 100)}</b><span>%</span>`, sub: trend === null ? t('review.no_prev') : t('review.vs_prev', { d: (trend > 0 ? '+' : '') + trend }), tone: trend !== null && trend < -5 ? 'warn' : '' })}
    ${metric({ label: t('review.perfect'), value: `<b>${r.perfect}</b><span>/7</span>` })}
    ${metric({ label: t('review.rebounds'), value: `<b>${r.rebounds.rebounds}</b><span>/${r.rebounds.rebounds + r.rebounds.doubles}</span>`, sub: t('stats.rebounds_sub', { n: r.rebounds.doubles }) })}
    ${metric({ label: t('stats.tasks_done'), value: `<b>${r.tasksDone}</b>` })}
  </section>

  <section class="grid-2 review-grid">
    <article class="panel">
      <div class="panel-head"><h3>${icon('sparkle')}${t('review.coach')}</h3>${hasKey() ? `<button class="link" data-action="ai-review" ${ui.aiBusy ? 'disabled' : ''}>${ai ? t('review.ai_redo') : t('review.ai_write')}${icon('chev-r')}</button>` : ''}</div>
      ${ui.aiBusy ? `<p class="muted">${t('review.ai_busy')}</p>` : ai ? `<div class="coach-text">${ai.split(/\n+/).map((p) => `<p>${esc(p)}</p>`).join('')}</div>` : `
      <ul class="insight-list">${r.sentences.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      ${hasKey() ? '' : `<p class="muted coach-cta">${t('review.ai_hint')} <a class="link" href="#/settings">${t('nav.settings')}${icon('chev-r')}</a></p>`}`}
      ${ui.aiError ? `<p class="form-error">${esc(ui.aiError)}</p>` : ''}
    </article>
    <article class="panel">
      <div class="panel-head"><h3>${icon('zap')}${t('review.next')}</h3><span class="muted">${t('review.next_sub')}</span></div>
      ${r.suggestions.length ? `<ul class="sugs">${r.suggestions.map((x) => `<li>${icon(x.icon)}<span>${esc(x.text)}</span>${x.apply ? `<button class="btn sm" data-action="apply-suggestion" data-id="${x.id}">${t('review.apply')}</button>` : `<button class="btn sm" data-action="edit-habit" data-id="${x.edit}">${t('common.edit')}</button>`}</li>`).join('')}</ul>` : `<p class="muted">${t('review.no_sug')}</p>`}
    </article>
  </section>

  <section class="panel">
    <div class="panel-head"><h3>${t('review.by_habit')}</h3><span class="muted">${t('review.by_habit_sub')}</span></div>
    ${habits.length ? `<table class="review-table"><thead><tr><th>${t('today.habit')}</th><th>${t('review.col_done')}</th><th>${t('review.col_rate')}</th><th>${t('review.col_trend')}</th><th>${t('habits.streak')}</th></tr></thead><tbody>
      ${r.rows.map((x) => `<tr style="--c:${x.h.color}"><td>${tick(x.h.color)}${esc(x.h.name)}</td><td class="num">${x.ok}/${x.req}</td><td class="num">${x.rate === null ? '—' : pct(x.rate)}</td><td class="num ${x.trend === null ? '' : x.trend > 0 ? 'up' : x.trend < 0 ? 'down' : ''}">${x.trend === null ? '—' : (x.trend > 0 ? '+' : '') + x.trend}</td><td class="num">${x.streak}</td></tr>`).join('')}
    </tbody></table>` : `<p class="muted">${t('stats.no_habit')}</p>`}
  </section>`;
}

// ---------- Bienvenue (premier lancement) ----------

/** L'écran de bienvenue s'affiche tant qu'aucune habitude n'existe et que l'accueil n'a pas été passé. */
export const needsOnboarding = (s) => !s.settings.onboarded && !s.habits.length && !s.tasks.length;

export function viewWelcome(s, ui = {}) {
  const picks = ui.obPicks || new Set();
  return `
  <div class="welcome">
    <div class="welcome-card">
      <div class="welcome-brand"><img src="assets/favicon.svg" alt="" width="36" height="36"><span>Momentum</span></div>
      <h1>${t('ob.title')}</h1>
      <p class="lead">${t('ob.lead')}</p>

      <div class="field-row">
        <label class="field grow"><span>${t('ob.name')} <small>${t('common.optional')}</small></span><input id="ob-name" value="${esc(ui.obName || '')}" maxlength="30" placeholder="${t('settings.name_ph')}" autocomplete="given-name"></label>
        <label class="field"><span>${t('settings.lang')}</span><select id="ob-lang">${LANGS.map((l) => `<option value="${l.id}" ${l.id === lang() ? 'selected' : ''}>${l.label}</option>`).join('')}</select></label>
      </div>

      <div class="field">
        <span class="label">${t('ob.pick')} <small>${t('ob.pick_hint')}</small></span>
        ${TEMPLATE_CATS.map((cat) => `<div class="ob-cat"><h3 class="group-title">${esc(t(cat))}</h3><div class="ob-grid">${TEMPLATES.map((x, i) => [x, i]).filter(([x]) => x.cat === cat).map(([x, i]) => `<button type="button" class="ob-chip ${picks.has(i) ? 'on' : ''}" data-action="ob-toggle" data-i="${i}" aria-pressed="${picks.has(i)}"><span class="ob-ic">${x.icon}</span><b>${esc(t(`tpl.${x.k}`))}</b><small>${x.kind === 'count' ? `${x.target} ${esc(t(x.unit))}` : x.kind === 'quit' ? esc(t('form.kind_quit')) : x.freq === 'weekly' ? esc(t('sched.weekly', { n: x.perWeek })) : x.freq === 'interval' ? esc(t('sched.interval', { n: x.every })) : x.time ? x.time : esc(t('sched.daily'))}</small></button>`).join('')}</div></div>`).join('')}
      </div>

      <div class="welcome-actions">
        <button class="btn primary lg" data-action="ob-start">${icon('check')}${picks.size ? tn(picks.size, 'ob.start') : t('ob.start_empty')}</button>
        <p class="muted">${t('ob.privacy')}</p>
      </div>
      <p class="ob-demo"><button class="link" data-action="ob-demo">${t('ob.demo')}${icon('chev-r')}</button></p>
    </div>
  </div>`;
}
