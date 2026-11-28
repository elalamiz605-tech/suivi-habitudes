// Point d'entrée : navigation, actions, récompenses, palette de commandes, réglages.
import { icon } from './icons.js';
import * as S from './store.js';
import * as L from './logic.js';
import * as V from './views.js';
import * as F from './forms.js';
import * as B from './backup.js';
import { toast } from './ui.js';
import { t, tn, onLangChange } from './i18n.js';
import { initPWA, promptInstall, onInstallChange } from './pwa.js';
import { startReminders, requestPermission, permission, notify } from './reminders.js';
import { applySuggestion, reviewWeek } from './insights.js';
import { writeReview } from './coach.js';
import * as C from './cloud.js';
import { dateKey, today, norm, esc, prefersReducedMotion, fmtClock, fmtFull } from './utils.js';

const NAV = [
  { id: 'today', key: 'nav.today', ic: 'sun' },
  { id: 'habits', key: 'nav.habits', ic: 'repeat' },
  { id: 'tasks', key: 'nav.tasks', ic: 'list' },
  { id: 'stats', key: 'nav.stats', ic: 'chart' },
  { id: 'year', key: 'nav.year', ic: 'cube' },
  { id: 'settings', key: 'nav.settings', ic: 'sliders' },
];
// Pages hors menu : le bilan de la semaine (bannière du dimanche, page Statistiques, palette).
const VIEWS = { today: V.viewToday, habits: V.viewHabits, tasks: V.viewTasks, stats: V.viewStats, year: V.viewYear, review: V.viewReview, settings: V.viewSettings };
const TITLE_KEY = { review: 'review.title' };

const viewEl = document.getElementById('view');
const ui = { pushOn: false, buddies: [], inviteCode: '', habitCat: '', taskQ: '', taskPrio: '', taskProj: '', taskSort: 'prio', stamp: '', yearStage: 0, aiBusy: false, aiError: '', obPicks: new Set([0, 1, 10]), obName: '' };
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
  const onboarding = V.needsOnboarding(s);
  document.body.classList.toggle('onboarding', onboarding);
  viewEl.innerHTML = onboarding ? V.viewWelcome(s, ui) : VIEWS[route](s, ui);
  renderNav();
  if (onboarding) { document.title = 'Momentum'; unmountYear(); return; }

  ui.stamp = '';
  entering = false;

  scene?.setProgress(L.todayProgress(s.habits.filter((h) => !h.archived)).ratio);
  document.title = `${t(TITLE_KEY[route] || NAV.find((n) => n.id === route)?.key || 'nav.today')} · Momentum`;
  if (route === 'year') mountYear();
  else unmountYear();
  if ((route === 'today' || route === 'settings') && C.isSignedIn()) refreshBuddies();
  if (route === 'review' && s.settings.lastReviewWeek !== reviewWeek().key) { s.settings.lastReviewWeek = reviewWeek().key; S.save(); }
}

// ---------- Mon année en 3D (vraies données) ----------

let year = null;
function mountYear() {
  const canvas = document.getElementById('year3d');
  if (!canvas) return;
  if (year) year.dispose();
  year = null;
  import('./year.js').then(({ createYear }) => {
    if (route !== 'year' || !document.getElementById('year3d')) return;
    year = createYear(canvas, { motion: st().settings.motion && !prefersReducedMotion(), data: V.yearData(st()), embedded: true });
    year.setStage(ui.yearStage);
    year.setToday(V.yearData(st()).at(-1));
  }).catch((err) => console.warn('Scène 3D indisponible :', err));
}
function unmountYear() {
  if (year) { year.dispose(); year = null; }
}

/** Image à partager : la scène 3D + le titre et les chiffres, au format carré. */
async function shareYear() {
  if (!year) return;
  const s = st();
  const stats = V.yearStats(s);
  const img = new Image();
  img.src = year.snapshot();
  await img.decode();
  const W = 1080, H = 1080;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#07080c'; g.fillRect(0, 0, W, H);
  // scène centrée, recadrée
  const ratio = img.width / img.height;
  const sw = ratio > 1 ? img.height * 1.15 : img.width, sh = ratio > 1 ? img.height : img.width / 1.15;
  g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 180, W, W / 1.15);
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(7,8,12,0.1)'); grad.addColorStop(0.2, 'rgba(7,8,12,0)'); grad.addColorStop(0.78, 'rgba(7,8,12,0)'); grad.addColorStop(1, 'rgba(7,8,12,0.92)');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  g.fillStyle = '#f4f4f8';
  g.font = '600 56px "Host Grotesk", system-ui, sans-serif';
  g.fillText(t('year.share_title', { name: s.settings.name || '' }).trim(), 64, 110);
  g.font = '400 30px "Host Grotesk", system-ui, sans-serif';
  g.fillStyle = '#9a9cab';
  g.fillText(t('year.share_sub', { kept: stats.kept, full: stats.full, best: stats.best }), 64, 160);
  g.font = '500 30px "Martian Mono", ui-monospace, monospace';
  g.fillStyle = '#ff7a59';
  g.fillText('momentum · ' + new Date().toLocaleDateString(), 64, H - 64);
  g.fillStyle = '#7b6cff';
  g.textAlign = 'right';
  g.font = '500 26px "Host Grotesk", system-ui, sans-serif';
  g.fillText('elalamiz605-tech.github.io/suivi-habitudes', W - 64, H - 64);
  const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
  const file = new File([blob], `momentum-annee-${dateKey(today())}.png`, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Momentum' }); return; } catch (_) { /* annulé */ }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(t('year.shared'));
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
  C.autoCloud('change');
  if (year) year.setData(V.yearData(st()));
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
  mini(el) {
    const h = S.findHabit(el.dataset.id);
    const k = dateKey(today());
    S.setMini(h, k);
    ui.stamp = h.id;
    S.commit();
    toast(t('recover.mini_done', { name: h.name }), { action: { label: t('common.undo'), fn: () => { delete h.mini[k]; delete h.log[k]; S.commit(); } } });
  },
  'apply-suggestion': (el) => applySuggestion(el.dataset.id),
  'ob-toggle'(el) {
    const i = Number(el.dataset.i);
    if (ui.obPicks.has(i)) ui.obPicks.delete(i); else ui.obPicks.add(i);
    ui.obName = document.getElementById('ob-name')?.value || ui.obName;
    el.classList.toggle('on', ui.obPicks.has(i));
    el.setAttribute('aria-pressed', ui.obPicks.has(i));
    const btn = viewEl.querySelector('[data-action=ob-start]');
    if (btn) btn.innerHTML = `${icon('check')}${ui.obPicks.size ? tn(ui.obPicks.size, 'ob.start') : t('ob.start_empty')}`;
  },
  'ob-start'() {
    const s = st();
    const name = document.getElementById('ob-name')?.value.trim() || '';
    [...ui.obPicks].sort((a, b) => a - b).forEach((i, idx) => {
      const x = F.TEMPLATES[i];
      if (!x) return;
      s.habits.push(S.newHabit({
        name: t(`tpl.${x.k}`), category: t(x.cat), color: x.color || S.COLORS[idx % S.COLORS.length],
        kind: x.kind || 'check', target: x.kind === 'count' ? x.target : 1, unit: x.kind === 'count' ? t(x.unit) : '',
        schedule: { ...S.newHabit().schedule, type: x.freq || 'daily', perWeek: x.perWeek || 3, every: x.every || 2, days: x.days || [0, 1, 2, 3, 4] },
        time: x.time || '', identity: x.identity ? t(`tpl.id_${x.identity}`) : '',
      }));
    });
    s.settings.name = name;
    s.settings.onboarded = true;
    delete s.fresh;
    S.commit();
    go('today');
    toast(t('ob.welcome', { name: name ? `, ${name}` : '' }));
  },
  'ob-demo'() {
    const d = S.demoState();
    d.settings.onboarded = true;
    S.replaceState(d);
    go('today');
    toast(t('ob.demo_loaded'));
  },
  async 'ai-review'() {
    ui.aiBusy = true; ui.aiError = '';
    render();
    try { await writeReview({ force: true }); } catch (e) { ui.aiError = e.message; }
    ui.aiBusy = false;
    render();
  },
  'share-year': () => shareYear(),
  'year-stage'(el) {
    ui.yearStage = Number(el.dataset.stage);
    year?.setStage(ui.yearStage);
    viewEl.querySelectorAll('[data-action=year-stage]').forEach((b) => b.classList.toggle('on', b === el));
  },
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
  async 'push-test'() { try { const r = await C.testPush(); toast(t('push.test_sent', { n: r.sent })); } catch (e) { toast(e.message); } },
  async 'buddy-invite'() { try { ui.inviteCode = (await C.buddyInvite()).code; render(); } catch (e) { toast(e.message); } },
  async 'buddy-copy'() { try { await navigator.clipboard.writeText(ui.inviteCode); toast(t('common.copied')); } catch (_) { document.getElementById('invite-code')?.focus(); } },
  async 'buddy-remove'(el) { try { await C.buddyRemove(el.dataset.id); await refreshBuddies(true); render(); } catch (e) { toast(e.message); } },
  async 'cloud-login'(el, e) { await cloudSubmit(C.login); },
  async 'cloud-register'() { await cloudSubmit(C.register); },
  'cloud-push': () => C.push(),
  'cloud-pull': () => C.pull(),
  async 'cloud-logout'() { await C.logout(); ui.buddies = []; ui.inviteCode = ''; render(); },
  async 'cloud-logout-all'() { await C.logout({ everywhere: true }); render(); },
  async 'cloud-delete'() {
    const pw = prompt(t('cloud.delete_confirm'));
    if (!pw) return;
    try { await C.deleteAccount(pw); render(); } catch (err) { toast(err.message); }
  },
  'sync-pull': () => B.pullSync(),
  'test-notify': () => notify(t('settings.notify_test_title'), t('settings.notify_test_body'), { tag: 'test' }),
  install: () => promptInstall(),
  'install-dismiss'() {
    sessionStorage.setItem('ios-banner', '1');
    S.updateSettings({ installDismissed: true });
  },
  'load-demo'() {
    if (confirm(t('settings.demo_confirm'))) {
      const d = S.demoState();
      d.settings.onboarded = true;
      S.replaceState(d);
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
  if (el && el.dataset.action === 'cloud-login') return; // géré par l'événement submit du formulaire
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
    if (route === 'year') mountYear();
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
  neverTwice: (el) => S.updateSettings({ neverTwice: el.checked }),
  aiKey(el) {
    st().settings.ai.key = el.value.trim();
    S.save();
  },
  async push(el) {
    try {
      if (el.checked) await C.enablePush(); else await C.disablePush();
      ui.pushOn = !!(await C.pushSubscription());
    } catch (e) { toast(e.message); ui.pushOn = false; }
    render();
  },
  cloudUrl(el) {
    st().settings.cloud.url = el.value.trim();
    S.save();
  },
  cloudAuto(el) {
    st().settings.cloud.auto = el.checked;
    S.save();
    if (el.checked) C.autoCloud('change');
  },
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
  if (el.id === 'ob-lang') { ui.obName = document.getElementById('ob-name')?.value || ''; S.updateSettings({ lang: el.value }); return; }
  if (el.id === 'ob-name') { ui.obName = el.value; return; }
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

// Compte Momentum Cloud : connexion / inscription depuis le formulaire des réglages
async function cloudSubmit(fn) {
  const form = document.getElementById('cloud-form');
  if (!form) return;
  const email = form.querySelector('#cloud-email').value.trim();
  const password = form.querySelector('#cloud-password').value;
  const err = form.querySelector('#cloud-error');
  if (!email || password.length < 8) { err.textContent = t('cloud.err_validation'); err.hidden = false; return; }
  form.querySelectorAll('button').forEach((b) => (b.disabled = true));
  err.hidden = true;
  try { await fn(email, password); ui.pushOn = !!(await C.pushSubscription()); await refreshBuddies(true); render(); } catch (e) { err.textContent = e.message; err.hidden = false; form.querySelectorAll('button').forEach((b) => (b.disabled = false)); }
}
viewEl.addEventListener('submit', (e) => { if (e.target.id === 'cloud-form') { e.preventDefault(); cloudSubmit(C.login); } });
viewEl.addEventListener('submit', async (e) => {
  if (e.target.id !== 'buddy-form') return;
  e.preventDefault();
  const input = document.getElementById('buddy-code'), err = document.getElementById('buddy-error');
  const code = input.value.trim().toUpperCase();
  if (code.length !== 6) { err.textContent = t('buddy.bad_code'); err.hidden = false; return; }
  try { const r = await C.buddyJoin(code); toast(t('buddy.joined', { name: r.buddy.name })); ui.inviteCode = ''; await refreshBuddies(true); render(); }
  catch (ex) { err.textContent = ex.status === 404 ? t('buddy.bad_code') : ex.status === 400 ? t('buddy.own_code') : ex.message; err.hidden = false; }
});

/** Défi à deux : liste rafraîchie au plus toutes les 20 secondes, sans bloquer le rendu. */
async function refreshBuddies(fresh = false) {
  if (!C.isSignedIn()) { ui.buddies = []; return; }
  try {
    const before = JSON.stringify(ui.buddies);
    ui.buddies = await C.buddies({ fresh });
    if (JSON.stringify(ui.buddies) !== before && (route === 'today' || route === 'settings')) render();
  } catch (_) { /* hors ligne : on garde la dernière liste */ }
}

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
    { label: t('review.title'), ic: 'sparkle', run: () => go('review') },
    { label: t('year.share'), ic: 'share', run: () => { go('year'); setTimeout(() => year && shareYear(), 900); } },
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
    if (!document.body.classList.contains('onboarding')) openPalette();
    return;
  }
  const typing = e.target.closest('input, textarea, select, [contenteditable]');
  const dialogOpen = document.querySelector('dialog[open]');
  if (typing || dialogOpen || e.ctrlKey || e.metaKey || e.altKey || document.body.classList.contains('onboarding')) return;
  const key = e.key.toLowerCase();
  if (key === 'n') { e.preventDefault(); F.openHabitModal(); }
  else if (key === 't') { e.preventDefault(); F.openTaskModal(); }
  else if (key === '/') { e.preventDefault(); openPalette(); }
  else if (/^[1-6]$/.test(key)) go(NAV[Number(key) - 1].id);
});

// Clic sur le fond sombre d'une fenêtre = fermer
document.getElementById('modal').addEventListener('click', (e) => {
  if (e.target.id === 'modal') e.target.close();
});

// ---------- Introduction animée (à chaque ouverture) ----------

function splash() {
  const el = document.getElementById('splash');
  if (!el) return;
  const s = st();
  if (V.needsOnboarding(s)) { el.remove(); return; }
  const stage = document.getElementById('splash-stage');
  const dots = document.getElementById('splash-dots');
  const skip = document.getElementById('splash-skip');
  const prog = L.todayProgress(s.habits.filter((h) => !h.archived));
  const best = s.habits.filter((h) => !h.archived).map((h) => L.currentStreak(h)).sort((a, b) => b - a)[0] || 0;
  // Une année de blocs : 14 colonnes, hauteurs plausibles, les derniers = vos vrais jours.
  let data = V.yearData(s).slice(-14);
  // Pas encore d'historique : une courbe d'exemple, pour que l'animation parle quand même.
  if (!data.some((v) => v > 0)) data = [0.3, 0.5, 0.4, 0.7, 0.6, 0.8, 0.5, 0.9, 0.7, 1, 0.8, 0.9, 1, 0.6];
  const blocks = data.map((v, i) => `<i style="--i:${i};--h:${Math.max(8, Math.round(v * 70))}px;--o:${v > 0 ? 1 : 0.25}"></i>`).join('');
  const STEPS = [
    `<div class="step"><svg class="step-ring" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="22" class="track"/><circle cx="32" cy="32" r="22" class="arc"/></svg><h2>Momentum</h2><p>${t('intro.s1')}</p></div>`,
    `<div class="step"><div class="blocks" aria-hidden="true">${blocks}</div><h2>${t('intro.s2_title')}</h2><p>${t('intro.s2')}</p></div>`,
    `<div class="step"><h2>${t('intro.s3_title')}</h2><div class="feat">${[['repeat', t('nav.habits')], ['list', t('nav.tasks')], ['cube', t('nav.year')], ['restore', t('intro.never_twice')], ['sparkle', t('review.title')], ['user', t('buddy.title')]].map(([ic, l], i) => `<span style="--i:${i}">${icon(ic)}${esc(l)}</span>`).join('')}</div></div>`,
    `<div class="step"><span class="avatar big">Z</span><div class="signature"><small>${t('intro.by')}</small><b>Ziad El Alami</b><small>${t('intro.by_sub')}</small></div><p class="mono-line">${fmtFull(today())} · ${prog.total ? t('splash.today', { done: prog.done, total: prog.total }) : t('today.nothing')}${best >= 2 ? ` · ${t('splash.streak', { n: best })}` : ''}</p></div>`,
  ];
  const STEP_MS = prefersReducedMotion() ? 900 : 2000;
  el.style.setProperty('--step', `${STEP_MS}ms`);
  skip.textContent = t('intro.skip');
  let i = -1, timer = 0, closed = false;
  const close = () => { if (closed) return; closed = true; clearTimeout(timer); el.classList.add('out'); setTimeout(() => el.remove(), 550); };
  const show = (n) => {
    if (n >= STEPS.length) return close();
    i = n;
    stage.innerHTML = STEPS[n];
    dots.innerHTML = STEPS.map((_, k) => `<i class="${k < n ? 'done' : k === n ? 'on' : ''}"></i>`).join('');
    clearTimeout(timer);
    timer = setTimeout(() => show(n + 1), STEP_MS);
  };
  stage.addEventListener('click', () => show(i + 1));
  skip.addEventListener('click', close);
  show(0);
}

// ---------- Démarrage ----------

// Première visite (rien d'enregistré, pas installée, pas venue de la vitrine) : la présentation d'abord.
if (V.needsOnboarding(st()) && !st().settings.onboarded && !sessionStorage.getItem('momentum:intro')
    && !matchMedia('(display-mode: standalone)').matches && navigator.standalone !== true) {
  sessionStorage.setItem('momentum:intro', '1');
  location.replace('./index.html');
}

applyTheme();
checkRewards(true);
render();
splash();
startScene();
initPWA();
startReminders();
B.dailySnapshot();
B.autoSync('start');
C.autoCloud('start');
C.pushSubscription().then((s) => { ui.pushOn = !!s; }).catch(() => {});
if (C.isSignedIn()) C.checkServerCoach().then(() => { if (route === 'review') render(); });
refreshBuddies();
setInterval(() => { if (!document.hidden && C.isSignedIn()) refreshBuddies(); }, 150000);
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
