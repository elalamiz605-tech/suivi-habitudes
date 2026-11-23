// Point d'entrée : navigation, actions, récompenses, palette de commandes.
import { icon } from './icons.js';
import * as S from './store.js';
import * as L from './logic.js';
import * as V from './views.js';
import * as F from './forms.js';
import { toast, confetti, initTilt, countUp } from './ui.js';
import { dateKey, today, norm, esc, prefersReducedMotion } from './utils.js';

const NAV = [
  { id: 'today', label: "Aujourd'hui", ic: 'sun' },
  { id: 'habits', label: 'Habitudes', ic: 'repeat' },
  { id: 'tasks', label: 'Tâches', ic: 'list' },
  { id: 'stats', label: 'Statistiques', ic: 'chart' },
  { id: 'settings', label: 'Réglages', ic: 'sliders' },
];
const VIEWS = { today: V.viewToday, habits: V.viewHabits, tasks: V.viewTasks, stats: V.viewStats, settings: V.viewSettings };

const viewEl = document.getElementById('view');
const ui = { habitCat: '', taskQ: '', taskPrio: '', taskProj: '', taskSort: 'prio' };
let route = currentRoute();
let entering = true;
let scene = null;
let lastLevel = 0;
const st = () => S.store.state;

// ---------- 3D ----------

function startScene() {
  if (scene) return;
  import('./scene.js')
    .then(({ createScene }) => {
      scene = createScene(document.getElementById('bg3d'), { motion: st().settings.motion && !prefersReducedMotion() });
      scene.setRoute(route);
      scene.setProgress(L.todayProgress(st().habits.filter((h) => !h.archived)).ratio);
      document.body.classList.add('has-3d');
    })
    .catch((err) => {
      console.warn('3D indisponible :', err);
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
      ${icon(n.ic)}<span>${n.label}</span><kbd>${i + 1}</kbd>
    </a>`).join('');
  document.getElementById('level').innerHTML = V.levelCard(st());
}

function render() {
  const s = st();
  viewEl.classList.toggle('enter', entering);
  viewEl.innerHTML = VIEWS[route](s, ui);
  renderNav();

  // Anneau de progression animé
  viewEl.querySelectorAll('[data-ring]').forEach((c) => {
    const end = c.dataset.ring;
    const from = entering ? c.style.strokeDasharray : render.lastRing ?? end;
    c.style.strokeDashoffset = from;
    requestAnimationFrame(() => requestAnimationFrame(() => (c.style.strokeDashoffset = end)));
    render.lastRing = end;
  });
  if (entering) countUp(viewEl);
  entering = false;

  scene?.setProgress(L.todayProgress(s.habits.filter((h) => !h.archived)).ratio);
  document.title = `${NAV.find((n) => n.id === route).label} · Momentum`;
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
      toast('Journée parfaite ! +25 XP', { icon: '🌟' });
      confetti();
      scene?.burst();
    }
  }

  // Badges
  for (const b of L.BADGES) {
    if (!s.profile.badges.includes(b.id) && b.test(s)) {
      s.profile.badges.push(b.id);
      changed = true;
      if (!silent) setTimeout(() => toast(`Badge débloqué : ${b.name}`, { icon: b.icon }), 600);
    }
  }

  // Niveau
  const lv = L.levelFor(L.computeXP(s)).level;
  if (!silent && lastLevel && lv > lastLevel) {
    setTimeout(() => toast(`Niveau ${lv} atteint !`, { icon: '🚀' }), 300);
    scene?.burst();
  }
  lastLevel = lv;
  if (changed) S.save();
}

S.subscribe(() => {
  checkRewards();
  render();
});

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
    el.classList.add('pop');
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
    setDay(h, k, L.isDone(h, k) ? 0 : h.target);
  },
  'edit-habit': (el) => F.openHabitModal(S.findHabit(el.dataset.id)),
  'delete-habit': (el) => F.deleteHabit(S.findHabit(el.dataset.id)),
  'archive-habit'(el) {
    const h = S.findHabit(el.dataset.id);
    h.archived = true;
    S.commit();
    toast(`« ${h.name} » archivée`, { icon: '📦', action: { label: 'Annuler', fn: () => { h.archived = false; S.commit(); } } });
  },
  'unarchive-habit'(el) {
    S.findHabit(el.dataset.id).archived = false;
    S.commit();
  },
  'filter-cat'(el) {
    ui.habitCat = el.dataset.cat;
    render();
  },
  'edit-task': (el) => F.openTaskModal(S.findTask(el.dataset.id)),
  'task-done'(el) {
    const t = S.findTask(el.dataset.id);
    const finishing = t.status !== 'done';
    S.setTaskStatus(t, finishing ? 'done' : 'todo');
    S.commit();
    if (finishing) toast(`Tâche terminée : ${t.title}`, { icon: '🎯', action: { label: 'Annuler', fn: () => { S.setTaskStatus(t, 'todo'); S.commit(); } } });
  },
  'task-move'(el) {
    const t = S.findTask(el.dataset.id);
    const i = L.STATUSES.findIndex((x) => x.id === t.status) + Number(el.dataset.dir);
    if (i < 0 || i >= L.STATUSES.length) return;
    S.setTaskStatus(t, L.STATUSES[i].id);
    S.commit();
  },
  export: () => exportData(),
  'load-demo'() {
    if (confirm('Remplacer vos données actuelles par la démo ?')) {
      S.replaceState(S.demoState());
      toast('Démo rechargée', { icon: '✨' });
    }
  },
  reset() {
    if (confirm('Effacer définitivement toutes vos habitudes et tâches ? Pensez à exporter une sauvegarde avant.')) {
      S.replaceState(S.emptyState());
      toast('Données effacées. Nouveau départ !', { icon: '🧹' });
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

viewEl.addEventListener('change', (e) => {
  const t = e.target;
  const map = { 'task-prio': 'taskPrio', 'task-proj': 'taskProj', 'task-sort': 'taskSort' };
  if (map[t.id]) {
    ui[map[t.id]] = t.value;
    document.getElementById('board').innerHTML = V.boardHTML(st(), ui);
  } else if (t.dataset.setting === 'name') {
    st().settings.name = t.value.trim();
    S.commit();
  } else if (t.dataset.setting === 'motion') {
    st().settings.motion = t.checked;
    S.save();
    if (scene) scene.setMotion(t.checked);
    else startScene();
    renderNav();
  } else if (t.id === 'import-file') {
    importData(t.files[0]);
    t.value = '';
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
  const t = S.findTask(e.dataTransfer.getData('text/plain'));
  if (t && t.status !== col.dataset.col) {
    const finishing = col.dataset.col === 'done';
    S.setTaskStatus(t, col.dataset.col);
    S.commit();
    if (finishing) toast(`Tâche terminée : ${t.title}`, { icon: '🎯' });
  } else render();
});

// ---------- Import / export ----------

function exportData() {
  const blob = new Blob([JSON.stringify(st(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `momentum-${dateKey(today())}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Sauvegarde exportée', { icon: '💾' });
}

async function importData(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data || !Array.isArray(data.habits) || !Array.isArray(data.tasks)) throw new Error('format');
    S.replaceState(data);
    toast('Données importées', { icon: '📥' });
  } catch (_) {
    toast('Fichier invalide : choisissez un export de Momentum.', { icon: '⚠️' });
  }
}

// ---------- Palette de commandes (Ctrl+K) ----------

function openPalette() {
  const pal = document.getElementById('palette');
  if (pal.open) return;
  const s = st();
  const cmds = [
    ...NAV.map((n, i) => ({ label: `Aller à : ${n.label}`, ic: n.ic, hint: String(i + 1), run: () => go(n.id) })),
    { label: 'Nouvelle habitude', ic: 'plus', hint: 'N', run: () => F.openHabitModal() },
    { label: 'Nouvelle tâche', ic: 'plus', hint: 'T', run: () => F.openTaskModal() },
    { label: 'Exporter mes données', ic: 'download', run: exportData },
    { label: `${s.settings.motion ? 'Désactiver' : 'Activer'} l’animation 3D`, ic: 'cube', run: () => { s.settings.motion = !s.settings.motion; S.commit(); scene ? scene.setMotion(s.settings.motion) : startScene(); } },
    ...s.habits.filter((h) => !h.archived).map((h) => ({ label: h.name, group: 'Habitude', emoji: h.icon, run: () => F.openHabitModal(h) })),
    ...s.tasks.map((t) => ({ label: t.title, group: t.status === 'done' ? 'Tâche terminée' : 'Tâche', ic: 'list', run: () => F.openTaskModal(t) })),
  ];
  pal.innerHTML = `
    <div class="palette-card">
      <label class="pal-input">${icon('search')}<input placeholder="Tapez une commande, une habitude ou une tâche…" aria-label="Rechercher"></label>
      <ul class="pal-list" role="listbox"></ul>
      <footer class="pal-foot"><span><kbd>↑</kbd><kbd>↓</kbd> naviguer</span><span><kbd>Entrée</kbd> ouvrir</span><span><kbd>Échap</kbd> fermer</span></footer>
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
        <span class="pal-ic">${c.emoji ? esc(c.emoji) : icon(c.ic)}</span><span class="pal-label">${esc(c.label)}</span>
        ${c.group ? `<small>${c.group}</small>` : ''}${c.hint ? `<kbd>${c.hint}</kbd>` : ''}
      </li>`).join('') || '<li class="pal-empty">Aucun résultat</li>';
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

checkRewards(true);
render();
initTilt(document.body);
startScene();

// Mise à jour à minuit si la page reste ouverte
let dayKey = dateKey(today());
setInterval(() => {
  if (dateKey(today()) !== dayKey) {
    dayKey = dateKey(today());
    render();
  }
}, 60_000);
