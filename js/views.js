// Rendu HTML de chaque page.
import { icon } from './icons.js';
import * as L from './logic.js';
import {
  esc, dateKey, today, addDays, startOfWeek, weekday, parseKey, fmtFull, fmtShort,
  WEEKDAYS, WEEKDAYS_SHORT, relativeDue, plural, pct, norm,
} from './utils.js';

const activeHabits = (s) => s.habits.filter((h) => !h.archived);
const RING_C = 2 * Math.PI * 52;

// ---------- Composants ----------

const BADGE_IC = {
  'first-habit': 'plus', 'first-check': 'check', 'streak-7': 'flame', 'streak-30': 'zap', 'checks-100': 'target',
  'perfect-day': 'sun', 'perfect-7': 'award', 'tasks-10': 'list', urgent: 'alert', 'level-5': 'layers',
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
  return `<div class="segbar" role="img" aria-label="${done} sur ${total} habitudes validées">${[...Array(total)].map((_, i) => `<i class="${i < done ? 'on' : ''}"></i>`).join('')}</div>`;
}

const empty = (title, text, action = '') => `
  <div class="empty"><h3>${title}</h3><p>${text}</p>${action}</div>`;

function prioChip(t) {
  const p = L.PRIORITIES[t.priority] || L.PRIORITIES[1];
  return `<span class="prio ${p.cls}">${p.label}</span>`;
}

function dueChip(t) {
  if (!t.due) return '';
  const k = dateKey(today());
  const cls = t.status === 'done' ? '' : t.due < k ? 'late' : t.due === k ? 'soon' : '';
  return `<span class="due ${cls}">${icon('calendar')}${relativeDue(t.due)}</span>`;
}

function subProgress(t) {
  if (!t.subtasks.length) return '';
  const d = t.subtasks.filter((x) => x.done).length;
  return `<div class="sub-progress"><div class="meter"><span style="width:${(d / t.subtasks.length) * 100}%"></span></div><small>${d}/${t.subtasks.length}</small></div>`;
}

function habitMeta(h) {
  return [h.category && esc(h.category), L.scheduleLabel(h), h.time && `${icon('clock')}${h.time}`]
    .filter(Boolean).join('<i class="sep"></i>');
}

function weekDots(h) {
  const t = today();
  return `<div class="dots">${[...Array(7)].map((_, i) => {
    const d = addDays(t, i - 6), k = dateKey(d);
    const v = L.valueOn(h, k);
    const cls = L.isDone(h, k) ? 'done' : v > 0 ? 'part' : L.isRequired(h, d) && i < 6 && k >= h.createdAt ? 'miss' : '';
    return `<button class="dot ${cls} ${i === 6 ? 'is-today' : ''}" data-action="toggle-day" data-id="${h.id}" data-key="${k}" title="${fmtFull(d)}" aria-label="${esc(h.name)}, ${fmtFull(d)}"><span>${WEEKDAYS_SHORT[weekday(d)]}</span></button>`;
  }).join('')}</div>`;
}

function habitItem(h, stamp) {
  const k = dateKey(today());
  const v = L.valueOn(h, k);
  const done = L.isDone(h, k);
  const streak = L.currentStreak(h);
  const isCount = h.kind === 'count';
  return `
  <article class="habit-item ${done ? 'is-done' : ''}" style="--c:${h.color}">
    ${tick(h.color)}
    <div class="hi-title"><h3>${esc(h.name)}</h3><p>${habitMeta(h)}</p></div>
    ${weekDots(h)}
    <span class="streak ${streak ? 'live' : ''}" title="Série en cours">${icon('flame')}<b>${streak ? L.streakLabel(h, streak) : '0'}</b></span>
    ${isCount ? `
    <div class="counter">
      <button class="icon-btn sm" data-action="dec" data-id="${h.id}" aria-label="Retirer 1">${icon('minus')}</button>
      <span><b>${v}</b>/${h.target}<small>${esc(h.unit)}</small></span>
      <button class="icon-btn sm" data-action="inc" data-id="${h.id}" aria-label="Ajouter 1">${icon('plus')}</button>
    </div>` : ''}
    <button class="check ${done ? 'on' : ''} ${stamp ? 'stamp' : ''}" data-action="check" data-id="${h.id}" aria-pressed="${done}" aria-label="Valider ${esc(h.name)}">
      <svg class="seal" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18"/></svg>${icon('check')}
    </button>
  </article>`;
}

function taskRow(t) {
  const done = t.status === 'done';
  return `
  <div class="task-row ${L.PRIORITIES[t.priority].cls}" data-action="edit-task" data-id="${t.id}" tabindex="0">
    <button class="tcheck ${done ? 'on' : ''}" data-action="task-done" data-id="${t.id}" aria-label="Marquer comme terminée">${icon('check')}</button>
    <div class="tr-main">
      <p class="tr-title">${esc(t.title)}</p>
      <div class="tr-meta">${prioChip(t)}${t.project ? `<span class="tag">#${esc(t.project)}</span>` : ''}${t.status === 'doing' ? '<span class="tag doing">En cours</span>' : ''}${t.subtasks.length ? `<span class="tag">${t.subtasks.filter((x) => x.done).length}/${t.subtasks.length} sous-tâches</span>` : ''}</div>
    </div>
    ${dueChip(t)}
  </div>`;
}

// ---------- Aujourd'hui ----------

export function viewToday(s, ui = {}) {
  const t = today();
  const habits = activeHabits(s);
  const prog = L.todayProgress(habits);
  const later = habits.filter((h) => !L.isDueToday(h, t));
  const focus = L.focusTasks(s.tasks).slice(0, 6);
  const overdue = s.tasks.filter(L.isOverdue).length;
  const rate7 = L.overallRate(habits, 7);
  const top = habits.map((h) => ({ h, n: L.currentStreak(h) })).sort((a, b) => b.n - a.n)[0];
  const left = prog.total - prog.done;
  const status = !prog.total
    ? "Rien de prévu aujourd'hui"
    : left === 0 ? 'Journée complète' : `${plural(left, 'habitude restante', 'habitudes restantes')}`;

  return `
  <header class="page-head">
    <div>
      <h1>Aujourd'hui${s.settings.name ? `<span class="who">, ${esc(s.settings.name)}</span>` : ''}</h1>
      <p class="lead"><time datetime="${dateKey(t)}">${fmtFull(t)}</time><i class="sep"></i>${status}${overdue ? `<i class="sep"></i><span class="late-text">${plural(overdue, 'tâche en retard', 'tâches en retard')}</span>` : ''}</p>
    </div>
    <div class="head-actions">
      <button class="btn ghost hide-sm" data-action="palette">${icon('search')}Rechercher<kbd>Ctrl K</kbd></button>
      <button class="btn" data-action="new-task">${icon('plus')}Tâche</button>
      <button class="btn primary" data-action="new-habit">${icon('plus')}Habitude</button>
    </div>
  </header>

  <section class="band" aria-label="Résumé du jour">
    <div class="metric metric-main">
      <p class="metric-label">Progression du jour</p>
      <p class="metric-value"><b>${prog.done}</b><span>/${prog.total}</span></p>
      ${segments(prog.done, prog.total)}
    </div>
    ${metric({ label: 'Réussite 7 jours', value: `<b>${Math.round(rate7 * 100)}</b><span>%</span>` })}
    ${metric({ label: 'Meilleure série', value: `<b>${top && top.n ? top.n : 0}</b><span>${top && top.h.schedule.type === 'weekly' ? 'sem.' : 'j'}</span>`, sub: top && top.n ? esc(top.h.name) : '' })}
    ${metric({ label: 'Tâches à traiter', value: `<b>${focus.length}</b>`, sub: overdue ? `dont ${overdue} en retard` : '', tone: overdue ? 'warn' : '' })}
  </section>

  <section class="section">
    <div class="section-head"><h2>Habitudes du jour</h2><a href="#/habits" class="link">Tout gérer${icon('chev-r')}</a></div>
    ${prog.due.length
      ? `<div class="list">${prog.due.map((h) => habitItem(h, ui.stamp === h.id)).join('')}</div>`
      : empty("Rien de prévu aujourd'hui", 'Créez une habitude ou profitez de votre journée de repos.', `<button class="btn primary" data-action="new-habit">${icon('plus')}Créer une habitude</button>`)}
    ${later.length ? `<div class="later"><span>Pas prévues aujourd'hui</span>${later.map((h) => `<button class="chip" data-action="edit-habit" data-id="${h.id}">${tick(h.color)}${esc(h.name)}</button>`).join('')}</div>` : ''}
  </section>

  <section class="section">
    <div class="section-head"><h2>Tâches prioritaires</h2><a href="#/tasks" class="link">Ouvrir le tableau${icon('chev-r')}</a></div>
    ${focus.length
      ? `<div class="list">${focus.map(taskRow).join('')}</div>`
      : empty('Aucune tâche urgente', 'Les tâches urgentes, en cours ou à échéance apparaissent ici.', `<button class="btn" data-action="new-task">${icon('plus')}Nouvelle tâche</button>`)}
  </section>`;
}

// ---------- Habitudes ----------

function habitStrip(h) {
  const t = today();
  return `<div class="strip">${[...Array(14)].map((_, i) => {
    const d = addDays(t, i - 13), k = dateKey(d);
    const v = L.valueOn(h, k);
    let cls = L.isDone(h, k) ? 'done' : v > 0 ? 'part' : !L.isScheduled(h, d) ? 'off' : L.isRequired(h, d) && i < 13 && k >= h.createdAt ? 'miss' : '';
    if (i === 13) cls += ' is-today';
    return `<button class="cell ${cls}" data-action="toggle-day" data-id="${h.id}" data-key="${k}" title="${fmtFull(d)}${h.kind === 'count' ? ` · ${v}/${h.target}` : ''}" aria-label="${esc(h.name)}, ${fmtFull(d)}"><span>${WEEKDAYS_SHORT[weekday(d)]}</span><em>${d.getDate()}</em></button>`;
  }).join('')}</div>`;
}

function habitRow(h) {
  const rate = L.completionRate(h, 30);
  const streak = L.currentStreak(h);
  const best = L.bestStreak(h);
  return `
  <article class="habit-row" style="--c:${h.color}">
    <div class="hr-main">
      ${tick(h.color)}
      <div class="hr-title">
        <h3>${esc(h.name)}</h3>
        <p>${habitMeta(h)}${h.kind === 'count' ? `<i class="sep"></i>${h.target} ${esc(h.unit)}/jour` : ''}</p>
        ${h.notes ? `<p class="hr-notes">${esc(h.notes)}</p>` : ''}
      </div>
    </div>
    ${habitStrip(h)}
    <div class="hr-stats">
      <div><b>${rate === null ? '—' : pct(rate)}</b><span>30 jours</span></div>
      <div><b>${streak}</b><span>série</span></div>
      <div><b>${best}</b><span>record</span></div>
    </div>
    <div class="hr-actions">
      <button class="icon-btn" data-action="edit-habit" data-id="${h.id}" title="Modifier" aria-label="Modifier">${icon('edit')}</button>
      <button class="icon-btn" data-action="archive-habit" data-id="${h.id}" title="Archiver" aria-label="Archiver">${icon('archive')}</button>
      <button class="icon-btn danger" data-action="delete-habit" data-id="${h.id}" title="Supprimer" aria-label="Supprimer">${icon('trash')}</button>
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
      <h1>Habitudes</h1>
      <p class="lead">${plural(habits.length, 'habitude active', 'habitudes actives')} · réussite moyenne sur 30 jours : <b>${pct(L.overallRate(habits, 30))}</b></p>
    </div>
    <button class="btn primary" data-action="new-habit">${icon('plus')}Nouvelle habitude</button>
  </header>
  ${cats.length ? `<div class="chips">${['', ...cats].map((c) => `<button class="chip-btn ${c === cat ? 'on' : ''}" data-action="filter-cat" data-cat="${esc(c)}">${c ? esc(c) : 'Toutes'}</button>`).join('')}</div>` : ''}
  <div class="list">
    ${list.length ? list.map(habitRow).join('') : empty('Aucune habitude', 'Créez votre première habitude : boire de l’eau, lire, faire du sport…', `<button class="btn primary" data-action="new-habit">${icon('plus')}Créer une habitude</button>`)}
  </div>
  <p class="hint">Astuce : cliquez sur un jour pour le valider ou l’annuler. Les jours barrés ne sont pas prévus.</p>
  ${archived.length ? `
  <details class="archived">
    <summary>${icon('archive')}Archivées (${archived.length})</summary>
    ${archived.map((h) => `<div class="arch-row"><span>${tick(h.color)}${esc(h.name)}</span><span class="spacer"></span><button class="btn sm" data-action="unarchive-habit" data-id="${h.id}">${icon('restore')}Restaurer</button><button class="icon-btn danger" data-action="delete-habit" data-id="${h.id}" aria-label="Supprimer">${icon('trash')}</button></div>`).join('')}
  </details>` : ''}`;
}

// ---------- Tâches ----------

function taskCard(t) {
  const p = L.PRIORITIES[t.priority] || L.PRIORITIES[1];
  const idx = L.STATUSES.findIndex((x) => x.id === t.status);
  return `
  <article class="task-card ${p.cls} ${L.isOverdue(t) ? 'overdue' : ''} ${t.status === 'done' ? 'is-done' : ''}" draggable="true" data-action="edit-task" data-id="${t.id}" tabindex="0">
    <div class="tc-top">${prioChip(t)}${t.project ? `<span class="tag">#${esc(t.project)}</span>` : ''}</div>
    <h4>${esc(t.title)}</h4>
    ${t.notes ? `<p class="tc-notes">${esc(t.notes.length > 110 ? `${t.notes.slice(0, 110)}…` : t.notes)}</p>` : ''}
    ${subProgress(t)}
    <div class="tc-bottom">
      ${dueChip(t) || '<span></span>'}
      <div class="tc-actions">
        <button class="icon-btn sm" data-action="task-move" data-id="${t.id}" data-dir="-1" ${idx === 0 ? 'disabled' : ''} aria-label="Colonne précédente">${icon('chev-l')}</button>
        <button class="icon-btn sm" data-action="task-move" data-id="${t.id}" data-dir="1" ${idx === 2 ? 'disabled' : ''} aria-label="Colonne suivante">${icon('chev-r')}</button>
      </div>
    </div>
  </article>`;
}

export function boardHTML(s, ui) {
  const q = norm(ui.taskQ);
  const list = s.tasks.filter((t) =>
    (!q || norm(`${t.title} ${t.notes} ${t.project} ${t.subtasks.map((x) => x.title).join(' ')}`).includes(q)) &&
    (ui.taskPrio === '' || t.priority === Number(ui.taskPrio)) &&
    (!ui.taskProj || t.project === ui.taskProj));
  return L.STATUSES.map((st) => {
    const items = list.filter((t) => t.status === st.id)
      .sort(st.id === 'done' ? (a, b) => (b.doneAt || '').localeCompare(a.doneAt || '') : L.taskSorter(ui.taskSort));
    return `
    <section class="col" data-col="${st.id}">
      <header class="col-head"><span class="col-dot ${st.id}"></span><h3>${st.label}</h3><span class="count">${items.length}</span>
        <button class="icon-btn sm" data-action="new-task" data-status="${st.id}" aria-label="Ajouter dans ${st.label}">${icon('plus')}</button></header>
      <div class="col-body">${items.map(taskCard).join('') || '<p class="col-empty">Glissez une tâche ici</p>'}</div>
    </section>`;
  }).join('');
}

export function viewTasks(s, ui) {
  const projects = [...new Set(s.tasks.map((t) => t.project).filter(Boolean))].sort();
  const open = s.tasks.filter((t) => t.status !== 'done').length;
  const overdue = s.tasks.filter(L.isOverdue).length;
  const opt = (v, label, cur) => `<option value="${esc(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(label)}</option>`;
  return `
  <header class="page-head">
    <div>
      <h1>Tâches</h1>
      <p class="lead">${plural(open, 'tâche ouverte', 'tâches ouvertes')}${overdue ? ` · <span class="late-text">${overdue} en retard</span>` : ''} · déplacez les cartes d’une colonne à l’autre</p>
    </div>
    <button class="btn primary" data-action="new-task">${icon('plus')}Nouvelle tâche</button>
  </header>
  <div class="toolbar">
    <label class="search">${icon('search')}<input id="task-q" type="search" placeholder="Rechercher une tâche…" value="${esc(ui.taskQ)}" aria-label="Rechercher une tâche"></label>
    <select id="task-prio" aria-label="Filtrer par priorité">${opt('', 'Toutes priorités', ui.taskPrio)}${[3, 2, 1, 0].map((i) => opt(i, L.PRIORITIES[i].label, ui.taskPrio)).join('')}</select>
    <select id="task-proj" aria-label="Filtrer par projet">${opt('', 'Tous projets', ui.taskProj)}${projects.map((p) => opt(p, `#${p}`, ui.taskProj)).join('')}</select>
    <select id="task-sort" aria-label="Trier">${opt('prio', 'Tri : priorité', ui.taskSort)}${opt('due', 'Tri : échéance', ui.taskSort)}${opt('recent', 'Tri : plus récentes', ui.taskSort)}</select>
  </div>
  <div id="board" class="board">${boardHTML(s, ui)}</div>`;
}

// ---------- Statistiques ----------

function barChart(habits) {
  const t = today();
  const days = [...Array(30)].map((_, i) => addDays(t, i - 29));
  const data = days.map((d) => { const { req, done } = L.dayStats(habits, d); return { d, req, done, r: req ? done / req : 0 }; });
  const W = 640, H = 200, left = 34, bottom = 26, top = 10;
  const bw = (W - left) / data.length;
  const y = (r) => top + (1 - r) * (H - top - bottom);
  const withData = data.filter((x) => x.req);
  const avg = withData.length ? withData.reduce((a, x) => a + x.r, 0) / withData.length : 0;
  return `
  <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Taux de réussite des 30 derniers jours">
    ${[0, 0.5, 1].map((r) => `<line class="grid" x1="${left}" x2="${W}" y1="${y(r)}" y2="${y(r)}"/><text class="axis" x="${left - 8}" y="${y(r) + 4}" text-anchor="end">${r * 100}%</text>`).join('')}
    ${data.map((x, i) => {
      const h = Math.max(2, (H - top - bottom) * x.r);
      return `<rect x="${left + i * bw + 3}" y="${y(x.r) - (x.r ? 0 : 2)}" width="${bw - 6}" height="${x.r ? h : 2}" rx="1.5" class="bar ${x.r >= 1 ? 'full' : x.r ? '' : 'zero'}"><title>${fmtFull(x.d)} : ${x.done}/${x.req}</title></rect>`;
    }).join('')}
    <line class="avg" x1="${left}" x2="${W}" y1="${y(avg)}" y2="${y(avg)}"><title>Moyenne : ${Math.round(avg * 100)} %</title></line>
    ${data.map((x, i) => (i % 7 === 2 || i === 29 ? `<text class="axis" x="${left + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${i === 29 ? "auj." : fmtShort(x.d)}</text>` : '')).join('')}
  </svg>`;
}

function heatmap(habits) {
  const weeks = 20;
  const t = today();
  const start = addDays(startOfWeek(t), -7 * (weeks - 1));
  let cols = '';
  for (let w = 0; w < weeks; w++) {
    let cells = '';
    for (let d = 0; d < 7; d++) {
      const day = addDays(start, w * 7 + d);
      if (day > t) { cells += '<i class="hm future"></i>'; continue; }
      const { req, done } = L.dayStats(habits, day);
      const r = req ? done / req : -1;
      const lvl = r < 0 ? 'none' : r === 0 ? 'l0' : r < 0.34 ? 'l1' : r < 0.67 ? 'l2' : r < 1 ? 'l3' : 'l4';
      cells += `<i class="hm ${lvl}" title="${fmtFull(day)} : ${req ? `${done}/${req}` : 'rien de prévu'}"></i>`;
    }
    cols += `<div class="hm-col">${cells}</div>`;
  }
  return `
  <div class="heatmap">
    <div class="hm-days">${WEEKDAYS.map((d, i) => `<span>${i % 2 === 0 ? d : ''}</span>`).join('')}</div>
    <div class="hm-grid">${cols}</div>
  </div>
  <div class="hm-legend"><span>Moins</span><i class="hm l0"></i><i class="hm l1"></i><i class="hm l2"></i><i class="hm l3"></i><i class="hm l4"></i><span>Plus</span></div>`;
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
    <svg class="donut" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="40" stroke="#1b1e24"/>${arcs}</svg>
    <ul class="legend">${parts.map((p) => `<li><i style="background:${p.color}"></i>${p.label}<b>${p.n}</b></li>`).join('')}</ul>
  </div>`;
}

export function viewStats(s) {
  const habits = activeHabits(s);
  const t = today();
  const rate30 = L.overallRate(habits, 30);
  const checks = L.totalChecks(s.habits);
  const best = Math.max(0, ...s.habits.filter((h) => h.schedule.type !== 'weekly').map((h) => L.bestStreak(h)));
  const weekAgo = dateKey(addDays(t, -6));
  const doneWeek = s.tasks.filter((x) => x.status === 'done' && x.doneAt && x.doneAt >= weekAgo).length;
  const lv = L.levelFor(L.computeXP(s));
  const days30 = [...Array(30)].map((_, i) => L.dayStats(habits, addDays(t, -i))).filter((x) => x.req);
  const avg30 = days30.length ? days30.reduce((a, x) => a + x.done / x.req, 0) / days30.length : 0;
  const ranking = habits.map((h) => ({ h, r: L.completionRate(h, 30) ?? 0 })).sort((a, b) => b.r - a.r);
  const open = s.tasks.filter((x) => x.status !== 'done');
  const unlocked = new Set(L.BADGES.filter((b) => b.test(s)).map((b) => b.id));

  return `
  <header class="page-head">
    <div><h1>Statistiques</h1><p class="lead">Vos tendances, vos records et votre progression.</p></div>
  </header>

  <section class="band" aria-label="Chiffres clés">
    ${metric({ label: 'Réussite 30 jours', value: `<b>${Math.round(rate30 * 100)}</b><span>%</span>`, sub: 'Toutes habitudes confondues' })}
    ${metric({ label: 'Validations', value: `<b>${checks}</b>`, sub: `${checks * 10} XP gagnés` })}
    ${metric({ label: 'Record de série', value: `<b>${best}</b><span>j</span>`, sub: 'Votre plus longue série' })}
    ${metric({ label: 'Tâches terminées', value: `<b>${doneWeek}</b>`, sub: `7 derniers jours · niveau ${lv.level}` })}
  </section>

  <section class="grid-2">
    <article class="panel">
      <div class="panel-head"><h3>30 derniers jours</h3><span class="muted"><i class="avg-key"></i>moyenne ${pct(avg30)}</span></div>
      ${habits.length ? barChart(habits) : '<p class="muted">Pas encore de données.</p>'}
    </article>
    <article class="panel">
      <div class="panel-head"><h3>Régularité</h3><span class="muted">20 dernières semaines</span></div>
      ${heatmap(habits)}
    </article>
  </section>

  <section class="grid-2">
    <article class="panel">
      <div class="panel-head"><h3>Classement des habitudes</h3><span class="muted">réussite sur 30 jours</span></div>
      <div class="rank">${ranking.map(({ h, r }) => `
        <div class="rank-row" style="--c:${h.color}"><span class="rank-name">${tick(h.color)}${esc(h.name)}</span><div class="rank-bar"><span style="width:${r * 100}%"></span></div><b>${pct(r)}</b></div>`).join('') || '<p class="muted">Aucune habitude.</p>'}
      </div>
    </article>
    <article class="panel">
      <div class="panel-head"><h3>Tâches</h3><span class="muted">${open.length} ouvertes</span></div>
      ${donut([
        { label: 'À faire', n: s.tasks.filter((x) => x.status === 'todo').length, color: '#4b515b' },
        { label: 'En cours', n: s.tasks.filter((x) => x.status === 'doing').length, color: '#c3c8d0' },
        { label: 'Terminées', n: s.tasks.filter((x) => x.status === 'done').length, color: '#ff5b3a' },
      ])}
      <div class="prio-bars">${[3, 2, 1, 0].map((p) => { const n = open.filter((x) => x.priority === p).length; return `<div class="prio-bar ${L.PRIORITIES[p].cls}"><span>${L.PRIORITIES[p].label}</span><div><i style="width:${open.length ? (n / open.length) * 100 : 0}%"></i></div><b>${n}</b></div>`; }).join('')}</div>
    </article>
  </section>

  <section class="section">
    <div class="section-head"><h2>Badges</h2><span class="muted">${unlocked.size} / ${L.BADGES.length} débloqués</span></div>
    <div class="badges">${L.BADGES.map((b) => `
      <div class="badge ${unlocked.has(b.id) ? 'on' : ''}"><span class="badge-ic">${icon(BADGE_IC[b.id] || 'award')}</span><div><b>${b.name}</b><small>${b.desc}</small></div><span class="badge-state">${unlocked.has(b.id) ? 'Obtenu' : 'Verrouillé'}</span></div>`).join('')}
    </div>
  </section>`;
}

// ---------- Réglages ----------

export function viewSettings(s) {
  const lv = L.levelFor(L.computeXP(s));
  return `
  <header class="page-head">
    <div><h1>Réglages</h1><p class="lead">Personnalisez Momentum et gérez vos données.</p></div>
  </header>
  <section class="settings">
    <article class="panel">
      <div class="panel-head"><h3>${icon('user')}Profil</h3></div>
      <label class="field"><span>Votre prénom (pour l’accueil)</span><input data-setting="name" value="${esc(s.settings.name)}" maxlength="30" placeholder="Ex. Ziad"></label>
      <p class="muted">Niveau ${lv.level} · ${lv.xp} XP au total · ${s.profile.perfectDays.length} journée(s) parfaite(s)</p>
    </article>
    <article class="panel">
      <div class="panel-head"><h3>${icon('grid')}Fond animé</h3></div>
      <label class="switch"><input type="checkbox" data-setting="motion" ${s.settings.motion ? 'checked' : ''}><span class="track"></span><span>Champ de points animé en arrière-plan</span></label>
      <p class="muted">Désactivez-le pour économiser la batterie. Il se met aussi en pause quand l’onglet est caché.</p>
    </article>
    <article class="panel">
      <div class="panel-head"><h3>${icon('layers')}Données</h3></div>
      <p class="muted">Tout est enregistré dans ce navigateur, sans compte ni serveur. Exportez régulièrement une sauvegarde.</p>
      <div class="btn-row">
        <button class="btn" data-action="export">${icon('download')}Exporter (.json)</button>
        <label class="btn">${icon('upload')}Importer<input type="file" id="import-file" accept="application/json,.json" hidden></label>
      </div>
      <div class="btn-row">
        <button class="btn ghost" data-action="load-demo">${icon('restore')}Recharger la démo</button>
        <button class="btn danger" data-action="reset">${icon('trash')}Tout effacer</button>
      </div>
    </article>
    <article class="panel">
      <div class="panel-head"><h3>${icon('keyboard')}Raccourcis clavier</h3></div>
      <ul class="shortcuts">
        <li><kbd>Ctrl</kbd><kbd>K</kbd><span>Palette de commandes</span></li>
        <li><kbd>N</kbd><span>Nouvelle habitude</span></li>
        <li><kbd>T</kbd><span>Nouvelle tâche</span></li>
        <li><kbd>1</kbd>…<kbd>5</kbd><span>Changer de page</span></li>
        <li><kbd>Échap</kbd><span>Fermer une fenêtre</span></li>
      </ul>
    </article>
  </section>`;
}

export function levelCard(s) {
  const lv = L.levelFor(L.computeXP(s));
  const initial = (s.settings.name || 'M').trim().charAt(0).toUpperCase();
  return `
  <div class="lv-top"><span class="avatar">${esc(initial)}</span><div><b>Niveau ${lv.level}</b><small>${lv.into} / ${lv.need} XP</small></div></div>
  <div class="meter xp"><span style="width:${(lv.into / lv.need) * 100}%"></span></div>`;
}
