// Point d'entrée : navigation, actions, récompenses, palette de commandes, réglages.
import { icon } from './icons.js';
import * as S from './store.js';
import * as L from './logic.js';
import * as V from './views.js';
import * as F from './forms.js';
import * as B from './backup.js';
import { toast } from './ui.js';
import { t, onLangChange } from './i18n.js';
import { initPWA, promptInstall, onInstallChange } from './pwa.js';
import { startReminders, requestPermission, permission, notify } from './reminders.js';
import { dateKey, today, norm, esc, prefersReducedMotion, fmtClock } from './utils.js';

const NAV = [
  { id: 'today', key: 'nav.today', ic: 'sun' },
  { id: 'habits', key: 'nav.habits', ic: 'repeat' },
  { id: 'tasks', key: 'nav.tasks', ic: 'list' },
  { id: 'stats', key: 'nav.stats', ic: 'chart' },
  { id: 'settings', key: 'nav.settings', ic: 'sliders' },
];
const VIEWS = { today: V.viewToday, habits: V.viewHabits, tasks: V.viewTasks, stats: V.viewStats, settings: V.viewSettings };

const viewEl = document.getElementById('view');
const ui = { habitCat: '', taskQ: '', taskPrio: '', taskProj: '', taskSort: 'prio', stamp: '' };
let route = currentRoute();
let entering = true;
let scene = null;
let lastLevel = 0;
const st = () => S.store.state;

// ---------- Thème ----------

const darkQuery = matchMedia('(prefers-color-scheme: dark)');
function resolvedTheme() {
  const pref = st().settings.theme;
  return pref === 'auto' ? (darkQuery.matches ? 'dark' : 'light') : pref;
}
function applyTheme() {
  const th = resolvedTheme();
  document.documentElement.dataset.theme = th;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', th === 'light' ? '#f4f5f7' : '#090a0c');
  try { localStorage.setItem('momentum:theme', th); } catch (_) {}
  scene?.setTheme?.(th);
}
darkQuery.addEventListener('change', () => { if (st().settings.theme === 'auto') applyTheme(); });

// ---------- Fond animé ----------

function startScene() {
  if (scene) return;
  import('./scene.js')
    .then(({ createScene }) => {
      scene = createScene(document.getElementById('bg3d'), { motion: st().settings.motion && !prefersReducedMotion(), theme: resolvedTheme() });
      scene.setRoute(route);
      scene.setProgress(L.todayProgress(st().habits.filter((h) => !h.archived)).ratio);
      document.body.classList.add('has-3d');
    })
    .catch((err) => {
      console.warn('Fond animé indisponible :', err);
      document.body.classList.add('no-3d');
    });
}

// ---------- Rendu ----------

function currentRoute() {
  const r = location.hash.replace(/^#\/?/, '');
  return VIEWS[r] ? r : 'today';
}

function renderNav() {
  document.getElementById('nav').innerHTML = NAV.map((n, i) => `
    <a href="#/${n.id}" class="${n.id === route ? 'active' : ''}" ${n.id === route ? 'aria-current="page"' : ''}>
      ${icon(n.ic)}<span>${t(n.key)}</span><kbd>${i + 1}</kbd>
    </a>`).join('');
  document.getElementById('level').innerHTML = V.levelCard(st());
}

function render() {
  const s = st();
  viewEl.classList.toggle('enter', entering);
  viewEl.innerHTML = VIEWS[route](s, ui);
  renderNav();

  ui.stamp = '';
  entering = false;

  scene?.setProgress(L.todayProgress(s.habits.filter((h) => !h.archived)).ratio);
  document.title = `${t(NAV.find((n) => n.id === route).key)} · Momentum`;
}

function go(r) {
  if (location.hash !== `#/${r}`) location.hash = `#/${r}`;
}

window.addEventListener('hashchange', () => {
  route = currentRoute();
  entering = true;
  render();
  scene?.setRoute(route);
  window.scrollTo({ top: 0 });
});

// ---------- Récompenses ----------

function checkRewards(silent = false) {
  const s = st();
  let changed = false;

  // Journée parfaite
  const prog = L.todayProgress(s.habits.filter((h) => !h.archived));
  const k = dateKey(today());
  if (prog.total && prog.done === prog.total && !s.profile.perfectDays.includes(k)) {
    s.profile.perfectDays.push(k);
    changed = true;
    if (!silent) {
      toast(t('reward.perfect'));
      scene?.burst();
    }
  }

  // Badges
  for (const b of L.BADGES) {
    if (!s.profile.badges.includes(b.id) && b.test(s)) {
      s.profile.badges.push(b.id);
      changed = true;
      if (!silent) setTimeout(() => toast(t('reward.badge', { name: b.name }), {}), 600);
    }
  }

  // Niveau
  const lv = L.levelFor(L.computeXP(s)).level;
  if (!silent && lastLevel && lv > lastLevel) {
    setTimeout(() => toast(t('reward.level', { n: lv })), 300);
    scene?.burst();
  }
  lastLevel = lv;
  if (changed) S.save();
}

S.subscribe(() => {
  checkRewards();
  render();
  B.autoSync('change');
});

onLangChange(() => { render(); });
onInstallChange(() => { if (route === 'today' || route === 'settings') render(); });

// ---------- Actions ----------

function setDay(h, key, value) {
  S.setLog(h, key, value);
  S.commit();
}

const actions = {
  'new-habit': () => F.openHabitModal(),
  'new-task': (el) => F.openTaskModal(null, el.dataset.status ? { status: el.dataset.status } : {}),
  palette: () => openPalette(),
  check(el) {
    const h = S.findHabit(el.dataset.id);
    const k = dateKey(today());
    const done = L.isDone(h, k);
    ui.stamp = done ? '' : h.id;
    setDay(h, k, done ? 0 : h.target);
  },
  inc(el) {
    const h = S.findHabit(el.dataset.id);
    const k = dateKey(today());
    setDay(h, k, L.valueOn(h, k) + 1);
  },
  dec(el) {
    const h = S.findHabit(el.dataset.id);
    const k = dateKey(today());
    setDay(h, k, L.valueOn(h, k) - 1);
  },
  'toggle-day'(el) {
    const h = S.findHabit(el.dataset.id);
    const k = el.dataset.key;
    if (L.isSkipped(h, k)) { S.toggleSkip(h, k); S.commit(); return; }
    setDay(h, k, L.isDone(h, k) ? 0 : h.target);
  },
  skip(el) {
    const h = S.findHabit(el.dataset.id);
    const k = dateKey(today());
    const was = L.isSkipped(h, k);
    S.toggleSkip(h, k);
    S.commit();
    if (!was) toast(`${h.name} · ${t('today.skipped')}`, { action: { label: t('common.undo'), fn: () => { S.toggleSkip(h, k); S.commit(); } } });
  },
  journal: (el) => F.openJournalModal(S.findHabit(el.dataset.id)),
  timer: (el) => F.openTimerModal(S.findHabit(el.dataset.id)),
  'timer-open': () => F.openTimerModal(F.timer.habit),
  'edit-habit': (el) => F.openHabitModal(S.findHabit(el.dataset.id)),
  'delete-habit': (el) => F.deleteHabit(S.findHabit(el.dataset.id)),
  'archive-habit'(el) {
    const h = S.findHabit(el.dataset.id);
    h.archived = true;
    S.commit();
    toast(t('habits.archived_toast', { name: h.name }), { action: { label: t('common.undo'), fn: () => { h.archived = false; S.commit(); } } });
  },
  'unarchive-habit'(el) {
    S.findHabit(el.dataset.id).archived = false;
    S.commit();
  },
  'pause-habit'(el) {
    const h = S.findHabit(el.dataset.id);
    S.pauseHabit(h);
    S.commit();
    toast(t('habits.paused_toast', { name: h.name }), { action: { label: t('common.undo'), fn: () => { S.resumeHabit(h); S.commit(); } } });
  },
  'resume-habit'(el) {
    const h = S.findHabit(el.dataset.id);
    S.resumeHabit(h);
    S.commit();
    toast(t('habits.resumed_toast', { name: h.name }));
  },
  'vacation-off'() {
    S.setVacation(false);
    S.commit();
    toast(t('settings.vacation_off'));
  },
  'filter-cat'(el) {
    ui.habitCat = el.dataset.cat;
    render();
  },
  'edit-task': (el) => F.openTaskModal(S.findTask(el.dataset.id)),
  'task-done'(el) {
    const x = S.findTask(el.dataset.id);
    const finishing = x.status !== 'done';
    S.setTaskStatus(x, finishing ? 'done' : 'todo');
    S.commit();
    if (finishing) toast(t('tasks.done_toast', { title: x.title }), { action: { label: t('common.undo'), fn: () => { S.setTaskStatus(x, 'todo'); S.commit(); } } });
  },
  'task-move'(el) {
    const x = S.findTask(el.dataset.id);
    const i = L.STATUSES.findIndex((y) => y.id === x.status) + Number(el.dataset.dir);
    if (i < 0 || i >= L.STATUSES.length) return;
    S.setTaskStatus(x, L.STATUSES[i].id);
    S.commit();
  },
  'toggle-heatmap'() {
    S.updateSettings({ heatmap: st().settings.heatmap === 'year' ? 'short' : 'year' });
  },
  export: () => B.exportJSON(),
  'export-csv': () => B.exportCSV(),
  share: () => B.shareBackup(),
  async 'transfer-make'() {
    const code = await B.makeTransferCode();
    const ta = document.getElementById('transfer-code');
    if (ta) { ta.value = code; ta.select(); }
    try { await navigator.clipboard.writeText(code); toast(t('common.copied')); } catch (_) { /* presse-papiers indisponible */ }
  },
  'transfer-apply'() {
    const ta = document.getElementById('transfer-code');
    if (ta?.value.trim()) B.applyTransferCode(ta.value);
  },
  'snapshot-restore': (el) => B.restoreSnapshot(el.dataset.date),
  'sync-push': () => B.pushSync(),
  'sync-pull': () => B.pullSync(),
  'test-notify': () => notify(t('settings.notify_test_title'), t('settings.notify_test_body'), { tag: 'test' }),
  install: () => promptInstall(),
  'install-dismiss'() {
    sessionStorage.setItem('ios-banner', '1');
    S.updateSettings({ installDismissed: true });
  },
  'load-demo'() {
    if (confirm(t('settings.demo_confirm'))) {
      S.replaceState(S.demoState());
      toast(t('settings.demo_loaded'));
    }
  },
  reset() {
    if (confirm(t('settings.reset_confirm'))) {
      S.replaceState(S.emptyState());
      toast(t('settings.reset_done'));
    }
  },
};

viewEl.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (el && actions[el.dataset.action]) {
    e.preventDefault();
    actions[el.dataset.action](el, e);
  }
});

// Clavier : Entrée sur une carte de tâche = ouvrir
viewEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.matches('.task-card, .task-row')) actions['edit-task'](e.target);
});

// Filtres des tâches : on ne redessine que le tableau (le champ garde le focus)
viewEl.addEventListener('input', (e) => {
  if (e.target.id === 'task-q') {
    ui.taskQ = e.target.value;
    document.getElementById('board').innerHTML = V.boardHTML(st(), ui);
  }
});

// ---------- Réglages ----------

const settingHandlers = {
  name: (el) => S.updateSettings({ name: el.value.trim() }),
  motion(el) {
    st().settings.motion = el.checked;
    S.save();
    if (scene) scene.setMotion(el.checked);
    else startScene();
    renderNav();
  },
  theme(el) {
    st().settings.theme = el.value;
    S.save();
    applyTheme();
  },
  lang: (el) => S.updateSettings({ lang: el.value }),
  dayStart: (el) => S.updateSettings({ dayStart: Number(el.value) }),
  vacation(el) {
    S.setVacation(el.checked);
    S.commit();
    toast(t(el.checked ? 'settings.vacation_on' : 'settings.vacation_off'));
  },
  vacationUntil(el) {
    const v = S.currentVacation();
    if (v) { v.to = el.value; S.commit(); }
  },
  async notify(el) {
    if (el.checked) {
      const p = await requestPermission();
      if (p !== 'granted') { el.checked = false; render(); return; }
      S.updateSettings({ notify: true });
      toast(t('settings.notify_on'));
    } else {
      S.updateSettings({ notify: false });
      toast(t('settings.notify_off'));
    }
  },
  recapTime: (el) => S.updateSettings({ recapTime: el.value }),
  syncToken(el) {
    st().settings.sync.token = el.value.trim();
    S.save();
  },
  syncAuto(el) {
    st().settings.sync.auto = el.checked;
    S.save();
    if (el.checked) B.autoSync('change');
  },
};

viewEl.addEventListener('change', (e) => {
  const el = e.target;
  const map = { 'task-prio': 'taskPrio', 'task-proj': 'taskProj', 'task-sort': 'taskSort' };
  if (map[el.id]) {
    ui[map[el.id]] = el.value;
    document.getElementById('board').innerHTML = V.boardHTML(st(), ui);
  } else if (el.dataset.setting && settingHandlers[el.dataset.setting]) {
    settingHandlers[el.dataset.setting](el);
  } else if (el.id === 'import-file') {
    B.importFile(el.files[0]);
    el.value = '';
  }
});

// Glisser-déposer des tâches entre colonnes
viewEl.addEventListener('dragstart', (e) => {
  const card = e.target.closest?.('.task-card');
  if (!card) return;
  e.dataTransfer.setData('text/plain', card.dataset.id);
  e.dataTransfer.effectAllowed = 'move';
  requestAnimationFrame(() => card.classList.add('dragging'));
});
viewEl.addEventListener('dragend', () => {
  viewEl.querySelectorAll('.dragging, .over').forEach((x) => x.classList.remove('dragging', 'over'));
});
viewEl.addEventListener('dragover', (e) => {
  const col = e.target.closest('[data-col]');
  if (!col) return;
  e.preventDefault();
  viewEl.querySelectorAll('.col.over').forEach((c) => c !== col && c.classList.remove('over'));
  col.classList.add('over');
});
viewEl.addEventListener('drop', (e) => {
  const col = e.target.closest('[data-col]');
  if (!col) return;
  e.preventDefault();
  const x = S.findTask(e.dataTransfer.getData('text/plain'));
  if (x && x.status !== col.dataset.col) {
    const finishing = col.dataset.col === 'done';
    S.setTaskStatus(x, col.dataset.col);
    S.commit();
    if (finishing) toast(t('tasks.done_toast', { title: x.title }));
  } else render();
});

// Minuteur : la bannière se met à jour sans redessiner la page
document.addEventListener('timer-tick', () => {
  const span = viewEl.querySelector('.timer-banner span');
  if (F.timer.total && span) span.textContent = `${t('timer.running', { t: fmtClock(F.timer.left) })} · ${F.timer.label}`;
  else if (route === 'today' && (!!F.timer.total !== !!span)) render();
});

// ---------- Palette de commandes (Ctrl+K) ----------

function openPalette() {
  const pal = document.getElementById('palette');
  if (pal.open) return;
  const s = st();
  const vacation = S.currentVacation(s);
  const cmds = [
    ...NAV.map((n, i) => ({ label: t('palette.goto', { page: t(n.key) }), ic: n.ic, hint: String(i + 1), run: () => go(n.id) })),
    { label: t('palette.new_habit'), ic: 'plus', hint: 'N', run: () => F.openHabitModal() },
    { label: t('palette.new_task'), ic: 'plus', hint: 'T', run: () => F.openTaskModal() },
    { label: t('palette.timer'), ic: 'timer', run: () => F.openTimerModal(null, 25) },
    { label: t('palette.export'), ic: 'download', run: B.exportJSON },
    { label: t('palette.theme'), ic: 'moon', run: () => { s.settings.theme = resolvedTheme() === 'dark' ? 'light' : 'dark'; S.save(); applyTheme(); if (route === 'settings') render(); } },
    { label: t(vacation ? 'palette.vacation_off' : 'palette.vacation_on'), ic: 'plane', run: () => { S.setVacation(!vacation); S.commit(); toast(t(vacation ? 'settings.vacation_off' : 'settings.vacation_on')); } },
    { label: t(s.settings.motion ? 'palette.motion_off' : 'palette.motion_on'), ic: 'grid', run: () => { s.settings.motion = !s.settings.motion; S.commit(); scene ? scene.setMotion(s.settings.motion) : startScene(); } },
    ...s.habits.filter((h) => !h.archived).map((h) => ({ label: h.name, group: t('palette.habit'), ic: 'repeat', run: () => F.openHabitModal(h) })),
    ...s.tasks.map((x) => ({ label: x.title, group: x.status === 'done' ? t('palette.task_done') : t('palette.task'), ic: 'list', run: () => F.openTaskModal(x) })),
  ];
  pal.innerHTML = `
    <div class="palette-card">
      <label class="pal-input">${icon('search')}<input placeholder="${t('palette.ph')}" aria-label="${t('common.search')}"></label>
      <ul class="pal-list" role="listbox"></ul>
      <footer class="pal-foot"><span><kbd>↑</kbd><kbd>↓</kbd> ${t('palette.nav')}</span><span><kbd>${t('palette.enter')}</kbd> ${t('palette.open')}</span><span><kbd>${t('settings.sc_esc')}</kbd> ${t('palette.close')}</span></footer>
    </div>`;
  const input = pal.querySelector('input');
  const list = pal.querySelector('ul');
  let sel = 0, items = [];
  const draw = () => {
    const q = norm(input.value.trim());
    items = cmds.filter((c) => !q || norm(`${c.label} ${c.group || ''}`).includes(q)).slice(0, 14);
    sel = Math.max(0, Math.min(sel, items.length - 1));
    list.innerHTML = items.map((c, i) => `
      <li class="${i === sel ? 'sel' : ''}" data-i="${i}" role="option" aria-selected="${i === sel}">
        <span class="pal-ic">${icon(c.ic)}</span><span class="pal-label">${esc(c.label)}</span>
        ${c.group ? `<small>${c.group}</small>` : ''}${c.hint ? `<kbd>${c.hint}</kbd>` : ''}
      </li>`).join('') || `<li class="pal-empty">${t('palette.empty')}</li>`;
    list.querySelector('.sel')?.scrollIntoView({ block: 'nearest' });
  };
  const run = (i) => {
    const c = items[i];
    if (!c) return;
    pal.close();
    c.run();
  };
  input.addEventListener('input', () => { sel = 0; draw(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { sel = (sel + 1) % Math.max(1, items.length); draw(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = (sel - 1 + items.length) % Math.max(1, items.length); draw(); e.preventDefault(); }
    else if (e.key === 'Enter') { e.preventDefault(); run(sel); }
  });
  list.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-i]');
    if (li) run(Number(li.dataset.i));
  });
  pal.onclick = (e) => { if (e.target === pal) pal.close(); };
  draw();
  pal.showModal();
  input.focus();
}

// ---------- Raccourcis clavier ----------

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    openPalette();
    return;
  }
  const typing = e.target.closest('input, textarea, select, [contenteditable]');
  const dialogOpen = document.querySelector('dialog[open]');
  if (typing || dialogOpen || e.ctrlKey || e.metaKey || e.altKey) return;
  const key = e.key.toLowerCase();
  if (key === 'n') { e.preventDefault(); F.openHabitModal(); }
  else if (key === 't') { e.preventDefault(); F.openTaskModal(); }
  else if (key === '/') { e.preventDefault(); openPalette(); }
  else if (/^[1-5]$/.test(key)) go(NAV[Number(key) - 1].id);
});

// Clic sur le fond sombre d'une fenêtre = fermer
document.getElementById('modal').addEventListener('click', (e) => {
  if (e.target.id === 'modal') e.target.close();
});

// ---------- Démarrage ----------

applyTheme();
checkRewards(true);
render();
startScene();
initPWA();
startReminders();
B.dailySnapshot();
B.autoSync('start');
if (st().settings.notify && permission() !== 'granted') { st().settings.notify = false; S.save(); }

// Mise à jour à minuit (ou à l'heure de début de journée) si la page reste ouverte
let dayKey = dateKey(today());
setInterval(() => {
  if (dateKey(today()) !== dayKey) {
    dayKey = dateKey(today());
    B.dailySnapshot();
    render();
  }
}, 60_000);
