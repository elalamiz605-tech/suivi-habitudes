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

export function ring(ratio, size = 'lg') {
  return `
  <div class="ring ring-${size}">
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <defs><linearGradient id="ring-grad-${size}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c5cff"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs>
      <circle class="ring-bg" cx="60" cy="60" r="52"/>
      <circle class="ring-fg" cx="60" cy="60" r="52" stroke="url(#ring-grad-${size})"
        style="stroke-dasharray:${RING_C}" data-ring="${RING_C * (1 - ratio)}"/>
    </svg>
    <div class="ring-label"><b data-count="${Math.round(ratio * 100)}">${Math.round(ratio * 100)}</b><span>%</span></div>
  </div>`;
}

function kpi({ label, value, sub, ic, tone = '', i = 0 }) {
  return `
  <article class="card kpi tilt ${tone}" style="--i:${i}">
    <div class="kpi-top"><span class="kpi-icon">${icon(ic)}</span><p class="kpi-label">${label}</p></div>
    <p class="kpi-value">${value}</p>
    <p class="kpi-sub">${sub}</p>
  </article>`;
}

const empty = (title, text, action = '') => `
  <div class="empty card"><div class="empty-orb"></div><h3>${title}</h3><p>${text}</p>${action}</div>`;

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

function habitCard(h, i) {
  const k = dateKey(today());
  const v = L.valueOn(h, k);
  const done = L.isDone(h, k);
  const streak = L.currentStreak(h);
  const isCount = h.kind === 'count';
  return `
  <article class="card habit-card tilt ${done ? 'is-done' : ''}" style="--c:${h.color};--i:${i}">
    <div class="hc-top">
      <div class="hc-icon">${esc(h.icon)}</div>
      <div class="hc-title"><h3>${esc(h.name)}</h3><p>${habitMeta(h)}</p></div>
      <button class="check ${done ? 'on' : ''}" data-action="check" data-id="${h.id}" aria-pressed="${done}" aria-label="Valider ${esc(h.name)}">${icon('check')}</button>
    </div>
    ${isCount ? `
    <div class="counter-row">
      <div class="meter"><span style="width:${Math.min(100, (v / h.target) * 100)}%"></span></div>
      <div class="counter">
        <button class="icon-btn sm" data-action="dec" data-id="${h.id}" aria-label="Retirer 1">${icon('minus')}</button>
        <span><b>${v}</b> / ${h.target} ${esc(h.unit)}</span>
        <button class="icon-btn sm" data-action="inc" data-id="${h.id}" aria-label="Ajouter 1">${icon('plus')}</button>
      </div>
    </div>` : ''}
    <div class="hc-bottom">
      <span class="streak ${streak ? 'hot' : ''}">${icon('flame')}${streak ? L.streakLabel(h, streak) : 'Pas de série'}</span>
      ${weekDots(h)}
    </div>
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

export function viewToday(s) {
  const t = today();
  const habits = activeHabits(s);
  const prog = L.todayProgress(habits);
  const later = habits.filter((h) => !L.isDueToday(h, t));
  const focus = L.focusTasks(s.tasks).slice(0, 6);
  const overdue = s.tasks.filter(L.isOverdue).length;
  const rate7 = L.overallRate(habits, 7);
  const top = habits.map((h) => ({ h, n: L.currentStreak(h) })).sort((a, b) => b.n - a.n)[0];
  const hour = new Date().getHours();
  const greet = hour < 5 ? 'Bonne nuit' : hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const left = prog.total - prog.done;
  const lead = !prog.total
    ? "Aucune habitude prévue aujourd'hui. Profitez-en pour planifier la suite."
    : left === 0
      ? 'Journée parfaite : tout est validé. Continuez sur cette lancée.'
      : `Encore ${plural(left, 'habitude', 'habitudes')} à valider aujourd'hui${overdue ? ` et ${plural(overdue, 'tâche en retard', 'tâches en retard')}` : ''}.`;

  return `
  <section class="hero" style="--i:0">
    <p class="eyebrow"><span class="pulse"></span>${fmtFull(t)}</p>
    <h1>${greet}${s.settings.name ? `, <span class="grad-text">${esc(s.settings.name)}</span>` : ''}</h1>
    <p class="lead">${lead}</p>
    <div class="hero-actions">
      <button class="btn primary" data-action="new-habit">${icon('plus')}Nouvelle habitude</button>
      <button class="btn" data-action="new-task">${icon('list')}Nouvelle tâche</button>
      <button class="btn ghost hide-sm" data-action="palette">${icon('search')}Rechercher<kbd>Ctrl K</kbd></button>
    </div>
  </section>

  <section class="kpis stagger" style="--i:1">
    <article class="card ring-card tilt" style="--i:0">
      ${ring(prog.ratio)}
      <div><p class="kpi-label">Progression du jour</p><p class="ring-sub"><b>${prog.done}</b> / ${prog.total} habitude${prog.total > 1 ? 's' : ''}</p>
      <p class="kpi-sub">${left > 0 ? 'Chaque validation rapporte 10 XP' : prog.total ? '+25 XP de bonus journée parfaite' : 'Ajoutez une habitude pour commencer'}</p></div>
    </article>
    ${kpi({ i: 1, ic: 'flame', tone: 'warm', label: 'Meilleure série en cours', value: top && top.n ? `<b data-count="${top.n}">${top.n}</b><small>${top.h.schedule.type === 'weekly' ? 'sem.' : 'jours'}</small>` : '<b>0</b>', sub: top && top.n ? `${esc(top.h.icon)} ${esc(top.h.name)}` : 'Validez une habitude pour lancer une série' })}
    ${kpi({ i: 2, ic: 'target', tone: 'cool', label: 'Réussite sur 7 jours', value: `<b data-count="${Math.round(rate7 * 100)}">${Math.round(rate7 * 100)}</b><small>%</small>`, sub: rate7 >= 0.8 ? 'Excellent rythme' : rate7 >= 0.5 ? 'Bon rythme, on accélère ?' : 'On repart du bon pied' })}
    ${kpi({ i: 3, ic: 'list', tone: overdue ? 'hot' : '', label: 'Tâches à traiter', value: `<b data-count="${focus.length}">${focus.length}</b><small>${overdue ? `dont ${overdue} en retard` : 'prioritaires'}</small>`, sub: `${s.tasks.filter((x) => x.status === 'doing').length} en cours · ${s.tasks.filter((x) => x.status === 'done').length} terminées` })}
  </section>

  <section class="section" style="--i:2">
    <div class="section-head"><h2>Habitudes du jour</h2><a href="#/habits" class="link">Tout gérer${icon('chev-r')}</a></div>
    ${prog.due.length
      ? `<div class="habit-grid stagger">${prog.due.map(habitCard).join('')}</div>`
      : empty("Rien de prévu aujourd'hui", 'Créez une habitude ou profitez de votre journée de repos.', `<button class="btn primary" data-action="new-habit">${icon('plus')}Créer une habitude</button>`)}
    ${later.length ? `<div class="later"><span>Pas prévues aujourd'hui</span>${later.map((h) => `<button class="chip" style="--c:${h.color}" data-action="edit-habit" data-id="${h.id}">${esc(h.icon)} ${esc(h.name)}</button>`).join('')}</div>` : ''}
  </section>

  <section class="section" style="--i:3">
    <div class="section-head"><h2>Focus tâches</h2><a href="#/tasks" class="link">Ouvrir le tableau${icon('chev-r')}</a></div>
    ${focus.length
      ? `<div class="card focus-list">${focus.map(taskRow).join('')}</div>`
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

function habitRow(h, i) {
  const rate = L.completionRate(h, 30);
  const streak = L.currentStreak(h);
  const best = L.bestStreak(h);
  return `
  <article class="card habit-row tilt tilt-soft" style="--c:${h.color};--i:${i}">
    <div class="hr-main">
      <div class="hc-icon">${esc(h.icon)}</div>
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
  <header class="page-head" style="--i:0">
    <div>
      <p class="eyebrow">Routine</p>
      <h1>Habitudes</h1>
      <p class="lead">${plural(habits.length, 'habitude active', 'habitudes actives')} · réussite moyenne sur 30 jours : <b>${pct(L.overallRate(habits, 30))}</b></p>
    </div>
    <button class="btn primary" data-action="new-habit">${icon('plus')}Nouvelle habitude</button>
  </header>
  ${cats.length ? `<div class="chips" style="--i:1">${['', ...cats].map((c) => `<button class="chip-btn ${c === cat ? 'on' : ''}" data-action="filter-cat" data-cat="${esc(c)}">${c ? esc(c) : 'Toutes'}</button>`).join('')}</div>` : ''}
  <div class="habit-list stagger" style="--i:2">
    ${list.length ? list.map(habitRow).join('') : empty('Aucune habitude', 'Créez votre première habitude : boire de l’eau, lire, faire du sport…', `<button class="btn primary" data-action="new-habit">${icon('plus')}Créer une habitude</button>`)}
  </div>
  <p class="hint" style="--i:3">Astuce : cliquez sur un jour pour le valider ou l’annuler. Les jours barrés ne sont pas prévus.</p>
  ${archived.length ? `
  <details class="archived card" style="--i:4">
    <summary>${icon('archive')}Archivées (${archived.length})</summary>
    ${archived.map((h) => `<div class="arch-row"><span>${esc(h.icon)} ${esc(h.name)}</span><span class="spacer"></span><button class="btn sm" data-action="unarchive-habit" data-id="${h.id}">${icon('restore')}Restaurer</button><button class="icon-btn danger" data-action="delete-habit" data-id="${h.id}" aria-label="Supprimer">${icon('trash')}</button></div>`).join('')}
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
    <section class="col card" data-col="${st.id}">
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
  <header class="page-head" style="--i:0">
    <div>
      <p class="eyebrow">Organisation</p>
      <h1>Tâches</h1>
      <p class="lead">${plural(open, 'tâche ouverte', 'tâches ouvertes')}${overdue ? ` · <span class="late-text">${overdue} en retard</span>` : ''} · déplacez les cartes d’une colonne à l’autre</p>
    </div>
    <button class="btn primary" data-action="new-task">${icon('plus')}Nouvelle tâche</button>
  </header>
  <div class="toolbar card" style="--i:1">
    <label class="search">${icon('search')}<input id="task-q" type="search" placeholder="Rechercher une tâche…" value="${esc(ui.taskQ)}" aria-label="Rechercher une tâche"></label>
    <select id="task-prio" aria-label="Filtrer par priorité">${opt('', 'Toutes priorités', ui.taskPrio)}${[3, 2, 1, 0].map((i) => opt(i, L.PRIORITIES[i].label, ui.taskPrio)).join('')}</select>
    <select id="task-proj" aria-label="Filtrer par projet">${opt('', 'Tous projets', ui.taskProj)}${projects.map((p) => opt(p, `#${p}`, ui.taskProj)).join('')}</select>
    <select id="task-sort" aria-label="Trier">${opt('prio', 'Tri : priorité', ui.taskSort)}${opt('due', 'Tri : échéance', ui.taskSort)}${opt('recent', 'Tri : plus récentes', ui.taskSort)}</select>
  </div>
  <div id="board" class="board" style="--i:2">${boardHTML(s, ui)}</div>`;
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
    <defs><linearGradient id="bar-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#7c5cff"/></linearGradient></defs>
    ${[0, 0.5, 1].map((r) => `<line class="grid" x1="${left}" x2="${W}" y1="${y(r)}" y2="${y(r)}"/><text class="axis" x="${left - 8}" y="${y(r) + 4}" text-anchor="end">${r * 100}%</text>`).join('')}
    ${data.map((x, i) => {
      const h = Math.max(2, (H - top - bottom) * x.r);
      return `<rect class="bar" style="--d:${i * 18}ms" x="${left + i * bw + 3}" y="${y(x.r) - (x.r ? 0 : 2)}" width="${bw - 6}" height="${x.r ? h : 2}" rx="3" fill="${x.r ? 'url(#bar-g)' : 'rgba(255,255,255,.12)'}"><title>${fmtFull(x.d)} : ${x.done}/${x.req}</title></rect>`;
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
    <svg class="donut" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,.06)"/>${arcs}</svg>
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
  <header class="page-head" style="--i:0">
    <div><p class="eyebrow">Analyse</p><h1>Statistiques</h1><p class="lead">Vos tendances, vos records et votre progression.</p></div>
  </header>

  <section class="kpis stagger" style="--i:1">
    ${kpi({ i: 0, ic: 'target', tone: 'cool', label: 'Réussite 30 jours', value: `<b data-count="${Math.round(rate30 * 100)}">${Math.round(rate30 * 100)}</b><small>%</small>`, sub: 'Toutes habitudes confondues' })}
    ${kpi({ i: 1, ic: 'check', label: 'Validations', value: `<b data-count="${checks}">${checks}</b><small>au total</small>`, sub: `${checks * 10} XP gagnés` })}
    ${kpi({ i: 2, ic: 'flame', tone: 'warm', label: 'Record de série', value: `<b data-count="${best}">${best}</b><small>jours</small>`, sub: 'Votre plus longue série' })}
    ${kpi({ i: 3, ic: 'zap', label: 'Tâches terminées', value: `<b data-count="${doneWeek}">${doneWeek}</b><small>en 7 jours</small>`, sub: `Niveau ${lv.level} · ${lv.xp} XP` })}
  </section>

  <section class="grid-2" style="--i:2">
    <article class="card panel">
      <div class="panel-head"><h3>30 derniers jours</h3><span class="muted"><i class="avg-key"></i>moyenne ${pct(avg30)}</span></div>
      ${habits.length ? barChart(habits) : '<p class="muted">Pas encore de données.</p>'}
    </article>
    <article class="card panel">
      <div class="panel-head"><h3>Régularité</h3><span class="muted">20 dernières semaines</span></div>
      ${heatmap(habits)}
    </article>
  </section>

  <section class="grid-2" style="--i:3">
    <article class="card panel">
      <div class="panel-head"><h3>Classement des habitudes</h3><span class="muted">réussite sur 30 jours</span></div>
      <div class="rank">${ranking.map(({ h, r }) => `
        <div class="rank-row" style="--c:${h.color}"><span class="rank-name">${esc(h.icon)} ${esc(h.name)}</span><div class="rank-bar"><span style="width:${r * 100}%"></span></div><b>${pct(r)}</b></div>`).join('') || '<p class="muted">Aucune habitude.</p>'}
      </div>
    </article>
    <article class="card panel">
      <div class="panel-head"><h3>Tâches</h3><span class="muted">${open.length} ouvertes</span></div>
      ${donut([
        { label: 'À faire', n: s.tasks.filter((x) => x.status === 'todo').length, color: '#7c5cff' },
        { label: 'En cours', n: s.tasks.filter((x) => x.status === 'doing').length, color: '#22d3ee' },
        { label: 'Terminées', n: s.tasks.filter((x) => x.status === 'done').length, color: '#34d399' },
      ])}
      <div class="prio-bars">${[3, 2, 1, 0].map((p) => { const n = open.filter((x) => x.priority === p).length; return `<div class="prio-bar ${L.PRIORITIES[p].cls}"><span>${L.PRIORITIES[p].label}</span><div><i style="width:${open.length ? (n / open.length) * 100 : 0}%"></i></div><b>${n}</b></div>`; }).join('')}</div>
    </article>
  </section>

  <section class="section" style="--i:4">
    <div class="section-head"><h2>Badges</h2><span class="muted">${unlocked.size} / ${L.BADGES.length} débloqués</span></div>
    <div class="badges stagger">${L.BADGES.map((b, i) => `
      <div class="badge card tilt ${unlocked.has(b.id) ? 'on' : ''}" style="--i:${i}"><span class="badge-ic">${b.icon}</span><b>${b.name}</b><small>${b.desc}</small></div>`).join('')}
    </div>
  </section>`;
}

// ---------- Réglages ----------

export function viewSettings(s) {
  const lv = L.levelFor(L.computeXP(s));
  return `
  <header class="page-head" style="--i:0">
    <div><p class="eyebrow">Préférences</p><h1>Réglages</h1><p class="lead">Personnalisez Momentum et gérez vos données.</p></div>
  </header>
  <section class="settings stagger" style="--i:1">
    <article class="card panel" style="--i:0">
      <div class="panel-head"><h3>${icon('user')}Profil</h3></div>
      <label class="field"><span>Votre prénom (pour l’accueil)</span><input data-setting="name" value="${esc(s.settings.name)}" maxlength="30" placeholder="Ex. Ziad"></label>
      <p class="muted">Niveau ${lv.level} · ${lv.xp} XP au total · ${s.profile.perfectDays.length} journée(s) parfaite(s)</p>
    </article>
    <article class="card panel" style="--i:1">
      <div class="panel-head"><h3>${icon('cube')}Animation 3D</h3></div>
      <label class="switch"><input type="checkbox" data-setting="motion" ${s.settings.motion ? 'checked' : ''}><span class="track"></span><span>Décor 3D animé en arrière-plan</span></label>
      <p class="muted">Désactivez-la pour économiser la batterie. Elle est aussi mise en pause quand l’onglet est caché.</p>
    </article>
    <article class="card panel" style="--i:2">
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
    <article class="card panel" style="--i:3">
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
