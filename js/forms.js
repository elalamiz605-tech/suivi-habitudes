// Fenêtres de création / modification (habitudes, tâches, note du jour, minuteur).
import { icon } from './icons.js';
import { store, commit, COLORS, newHabit, newTask, newRoutine, setTaskStatus, removeWithUndo, setJournal, setLog } from './store.js';
import { PRIORITIES, STATUSES, valueOn, isDone, routineHabits } from './logic.js';
import { esc, uid, weekdays, dateKey, today, fmtFull, parseKey, fmtClock } from './utils.js';
import { toast } from './ui.js';
import { t } from './i18n.js';
import { notify } from './reminders.js';

const modal = () => document.getElementById('modal');

function open(html, onReady, cls = '') {
  const m = modal();
  m.innerHTML = `<form class="modal-card ${cls}" novalidate>${html}</form>`;
  const form = m.querySelector('form');
  m.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => m.close()));
  onReady(form);
  m.showModal();
  form.querySelector('[autofocus]')?.focus();
}

const head = (title) => `
  <header class="modal-head"><h2>${title}</h2><button type="button" class="icon-btn" data-close aria-label="${t('common.close')}">${icon('x')}</button></header>`;

const foot = (canDelete) => `
  <footer class="modal-foot">
    ${canDelete ? `<button type="button" class="btn danger ghost" data-delete>${icon('trash')}${t('common.delete')}</button>` : ''}
    <span class="spacer"></span>
    <button type="button" class="btn ghost" data-close>${t('common.cancel')}</button>
    <button type="submit" class="btn primary">${icon('check')}${t('common.save')}</button>
  </footer>`;

const radio = (name, value, label, checked) =>
  `<label><input type="radio" name="${name}" value="${value}" ${checked ? 'checked' : ''}><span>${label}</span></label>`;

// ---------- Modèles d'habitudes ----------

export const TEMPLATES = [
  // Santé
  { k: 'water', identity: 'body', icon: '💧', cat: 'cat.health', kind: 'count', target: 8, unit: 'tpl.u_glasses', color: '#6fc3c9' },
  { k: 'walk', identity: 'body', icon: '🚶', cat: 'cat.health', kind: 'count', target: 30, unit: 'tpl.u_minutes', color: '#8fbf8a' },
  { k: 'sport', identity: 'athlete', icon: '🏋️', cat: 'cat.health', freq: 'weekly', perWeek: 3, color: '#8fbf8a' },
  { k: 'stretch', identity: 'body', icon: '🤸', cat: 'cat.health', kind: 'count', target: 5, unit: 'tpl.u_minutes', color: '#d9b36c' },
  { k: 'sleep', identity: 'rested', icon: '🌙', cat: 'cat.health', time: '23:00', color: '#7ea6e0' },
  { k: 'fruits', identity: 'body', icon: '🥦', cat: 'cat.health', kind: 'count', target: 5, unit: 'tpl.u_portions', color: '#8fbf8a' },
  { k: 'meds', identity: 'body', icon: '💊', cat: 'cat.health', time: '08:00', color: '#e08a9a' },
  { k: 'nosugar', identity: 'body', icon: '🚫', cat: 'cat.health', kind: 'quit', color: '#ff5b3a' },
  { k: 'nosmoke', identity: 'free', icon: '🚭', cat: 'cat.health', kind: 'quit', color: '#ff5b3a' },
  { k: 'noalcohol', identity: 'free', icon: '🍷', cat: 'cat.health', kind: 'quit', color: '#ff5b3a' },
  // Esprit
  { k: 'meditate', identity: 'calm', icon: '🧘', cat: 'cat.mind', time: '07:00', color: '#e08a9a' },
  { k: 'journal', identity: 'writer', icon: '📝', cat: 'cat.mind', time: '22:00', color: '#e6e8eb' },
  { k: 'gratitude', identity: 'calm', icon: '🙏', cat: 'cat.mind', kind: 'count', target: 3, unit: 'tpl.u_things', time: '22:00', color: '#d9b36c' },
  { k: 'noscreen', identity: 'rested', icon: '📵', cat: 'cat.mind', kind: 'quit', color: '#ff5b3a' },
  { k: 'nature', identity: 'calm', icon: '🌳', cat: 'cat.mind', freq: 'weekly', perWeek: 2, color: '#8fbf8a' },
  // Apprendre
  { k: 'read', identity: 'reader', icon: '📚', cat: 'cat.learning', kind: 'count', target: 20, unit: 'tpl.u_pages', time: '21:30', color: '#b39ddb' },
  { k: 'language', identity: 'learner', icon: '🗣️', cat: 'cat.learning', kind: 'count', target: 15, unit: 'tpl.u_minutes', color: '#7ea6e0' },
  { k: 'course', identity: 'learner', icon: '🎓', cat: 'cat.learning', kind: 'count', target: 30, unit: 'tpl.u_minutes', freq: 'weekly', perWeek: 3, color: '#7ea6e0' },
  { k: 'instrument', identity: 'musician', icon: '🎸', cat: 'cat.learning', kind: 'count', target: 20, unit: 'tpl.u_minutes', color: '#b39ddb' },
  // Carrière
  { k: 'deepwork', identity: 'focused', icon: '🎯', cat: 'cat.career', kind: 'count', target: 90, unit: 'tpl.u_minutes', freq: 'days', days: [0, 1, 2, 3, 4], color: '#d9b36c' },
  { k: 'plan', identity: 'focused', icon: '🗓️', cat: 'cat.career', time: '18:00', freq: 'days', days: [0, 1, 2, 3, 4], color: '#e6e8eb' },
  { k: 'inbox', identity: 'focused', icon: '📬', cat: 'cat.career', freq: 'days', days: [0, 1, 2, 3, 4], color: '#7ea6e0' },
  { k: 'network', identity: 'builder', icon: '🤝', cat: 'cat.career', freq: 'weekly', perWeek: 1, color: '#6fc3c9' },
  // Finances
  { k: 'budget', identity: 'money', icon: '💶', cat: 'cat.money', freq: 'weekly', perWeek: 1, color: '#d9b36c' },
  { k: 'save', identity: 'money', icon: '🐷', cat: 'cat.money', freq: 'weekly', perWeek: 1, color: '#8fbf8a' },
  { k: 'noimpulse', identity: 'money', icon: '🛍️', cat: 'cat.money', kind: 'quit', color: '#ff5b3a' },
  // Social
  { k: 'call', identity: 'present', icon: '📞', cat: 'cat.social', freq: 'weekly', perWeek: 2, color: '#e08a9a' },
  { k: 'message', identity: 'present', icon: '💬', cat: 'cat.social', color: '#e08a9a' },
  { k: 'date', identity: 'present', icon: '❤️', cat: 'cat.social', freq: 'weekly', perWeek: 1, color: '#ff5b3a' },
  { k: 'family', identity: 'present', icon: '🍽️', cat: 'cat.social', freq: 'weekly', perWeek: 3, color: '#d9b36c' },
  // Maison
  { k: 'bed', identity: 'tidy', icon: '🛏️', cat: 'cat.home', time: '08:00', color: '#e6e8eb' },
  { k: 'tidy', identity: 'tidy', icon: '🧹', cat: 'cat.home', kind: 'count', target: 10, unit: 'tpl.u_minutes', color: '#6fc3c9' },
  { k: 'cook', identity: 'cook', icon: '🍳', cat: 'cat.home', freq: 'weekly', perWeek: 5, color: '#d9b36c' },
  { k: 'plants', identity: 'tidy', icon: '🪴', cat: 'cat.home', freq: 'interval', every: 3, color: '#8fbf8a' },
  { k: 'clean', identity: 'tidy', icon: '🧽', cat: 'cat.home', freq: 'weekly', perWeek: 1, color: '#7ea6e0' },
  // Créativité
  { k: 'write', identity: 'writer', icon: '✍️', cat: 'cat.creative', kind: 'count', target: 300, unit: 'tpl.u_words', color: '#b39ddb' },
  { k: 'draw', identity: 'creative', icon: '🎨', cat: 'cat.creative', kind: 'count', target: 15, unit: 'tpl.u_minutes', color: '#e08a9a' },
  { k: 'photo', identity: 'creative', icon: '📷', cat: 'cat.creative', color: '#6fc3c9' },
  { k: 'project', identity: 'builder', icon: '🛠️', cat: 'cat.creative', kind: 'count', target: 30, unit: 'tpl.u_minutes', freq: 'weekly', perWeek: 3, color: '#d9b36c' },
];
export const TEMPLATE_CATS = ['cat.health', 'cat.mind', 'cat.learning', 'cat.career', 'cat.money', 'cat.social', 'cat.home', 'cat.creative'];

// ---------- Habitude ----------

export function openHabitModal(existing) {
  const h = existing || newHabit({ color: COLORS[store.state.habits.length % COLORS.length] });
  const cats = [...new Set(store.state.habits.map((x) => x.category).filter(Boolean))];
  const W = weekdays();
  const reminders = [...(h.reminders || [])];
  const timeOpts = (sel) => `<input type="time" value="${esc(sel)}">`;
  open(`
    ${head(existing ? t('form.habit_edit') : t('form.habit_new'))}
    <div class="modal-body">
      ${existing ? '' : `
      <div class="templates">
        <p class="label">${icon('sparkle')}${t('form.templates')} <small>${t('form.templates_hint')}</small></p>
        <div class="tpl-row">${TEMPLATES.map((x, i) => `<button type="button" class="chip" data-tpl="${i}" title="${esc(t(x.cat))}">${x.icon} ${esc(t(`tpl.${x.k}`))}</button>`).join('')}</div>
      </div>`}

      <label class="field"><span>${t('form.name')}</span><input name="name" value="${esc(h.name)}" maxlength="50" placeholder="${t('form.name_ph')}" required autofocus></label>

      <div class="field-row">
        <fieldset class="field grow"><legend>${t('form.color')}</legend>
          <div class="swatches">${COLORS.map((c) => `<label class="swatch" style="--c:${c}"><input type="radio" name="color" value="${c}" ${c === h.color ? 'checked' : ''} aria-label="${c}"><span></span></label>`).join('')}</div>
        </fieldset>
        <label class="field grow"><span>${t('form.category')}</span><input name="category" value="${esc(h.category)}" list="cat-list" maxlength="24" placeholder="${t('form.category_ph')}">
          <datalist id="cat-list">${[...new Set([...cats, ...TEMPLATE_CATS.map((c) => t(c))])].map((c) => `<option value="${esc(c)}">`).join('')}</datalist></label>
      </div>

      <fieldset class="field"><legend>${t('form.kind')}</legend>
        <div class="seg">${radio('kind', 'check', t('form.kind_check'), h.kind === 'check')}${radio('kind', 'count', t('form.kind_count'), h.kind === 'count')}${radio('kind', 'quit', t('form.kind_quit'), h.kind === 'quit')}</div>
        <div class="field-row" data-show="count">
          <label class="field"><span>${t('form.target')}</span><input type="number" name="target" min="2" max="999" value="${h.kind === 'count' ? h.target : 8}"></label>
          <label class="field grow"><span>${t('form.unit')}</span><input name="unit" value="${esc(h.unit)}" maxlength="16" placeholder="${t('form.unit_ph')}"></label>
        </div>
        <p class="hint" data-show="quit">${t('form.kind_quit_hint')}</p>
      </fieldset>

      <fieldset class="field"><legend>${t('form.freq')}</legend>
        <div class="seg wrap">${radio('freq', 'daily', t('form.freq_daily'), h.schedule.type === 'daily')}${radio('freq', 'days', t('form.freq_days'), h.schedule.type === 'days')}${radio('freq', 'weekly', t('form.freq_weekly'), h.schedule.type === 'weekly')}${radio('freq', 'interval', t('form.freq_interval'), h.schedule.type === 'interval')}${radio('freq', 'monthly', t('form.freq_monthly'), h.schedule.type === 'monthly')}</div>
        <div class="days-pick" data-show="days">${W.map((d, i) => `<label><input type="checkbox" name="days" value="${i}" ${h.schedule.days.includes(i) ? 'checked' : ''}><span>${d}</span></label>`).join('')}</div>
        <div class="field-row" data-show="weekly"><label class="field"><span>${t('form.per_week')}</span><input type="number" name="perWeek" min="1" max="7" value="${h.schedule.perWeek}"></label></div>
        <div class="field-row" data-show="interval"><label class="field"><span>${t('form.every')}</span><input type="number" name="every" min="2" max="90" value="${h.schedule.every || 2}"></label></div>
        <div class="field-row" data-show="monthly"><label class="field"><span>${t('form.per_month')}</span><input type="number" name="perMonth" min="1" max="31" value="${h.schedule.perMonth || 10}"></label></div>
      </fieldset>

      <div class="field-row">
        <label class="field"><span>${t('form.time')} <small>${t('common.optional')}</small></span><input type="time" name="time" value="${esc(h.time)}"></label>
        <div class="field grow"><span class="label">${icon('bell')}${t('form.reminders')} <small>${t('form.reminders_hint')}</small></span>
          <div class="reminders"></div>
          <button type="button" class="btn sm" data-add-rem>${icon('plus')}${t('form.add_reminder')}</button>
        </div>
      </div>
      <label class="field"><span>${icon('user')}${t('form.identity')} <small>${t('form.identity_hint')}</small></span><input name="identity" value="${esc(h.identity || '')}" maxlength="60" placeholder="${t('form.identity_ph')}"></label>
      <label class="field"><span>${t('form.notes')} <small>${t('form.notes_hint')}</small></span><textarea name="notes" rows="2" maxlength="300">${esc(h.notes)}</textarea></label>
      <p class="form-error" hidden></p>
    </div>
    ${foot(!!existing)}`,
  (form) => {
    const sync = () => {
      form.querySelectorAll('[data-show]').forEach((el) => {
        el.hidden = ![form.kind.value, form.freq.value].includes(el.dataset.show);
      });
    };
    form.addEventListener('change', sync);
    sync();

    // Rappels (jusqu'à 3)
    const remBox = form.querySelector('.reminders');
    const addBtn = form.querySelector('[data-add-rem]');
    const drawRem = () => {
      remBox.innerHTML = reminders.map((r, i) => `<div class="rem-row">${timeOpts(r).replace('<input', `<input data-rem="${i}"`)}<button type="button" class="icon-btn sm" data-del-rem="${i}" aria-label="${t('common.delete')}">${icon('x')}</button></div>`).join('');
      addBtn.hidden = reminders.length >= 3;
    };
    drawRem();
    addBtn.addEventListener('click', () => { reminders.push(form.time.value || '09:00'); drawRem(); remBox.querySelector(`[data-rem="${reminders.length - 1}"]`)?.focus(); });
    remBox.addEventListener('change', (e) => { if (e.target.dataset.rem !== undefined) reminders[e.target.dataset.rem] = e.target.value; });
    remBox.addEventListener('click', (e) => { const b = e.target.closest('[data-del-rem]'); if (b) { reminders.splice(Number(b.dataset.delRem), 1); drawRem(); } });

    // Modèles
    form.querySelectorAll('[data-tpl]').forEach((b) => b.addEventListener('click', () => {
      const x = TEMPLATES[Number(b.dataset.tpl)];
      form.name.value = t(`tpl.${x.k}`);
      form.category.value = t(x.cat);
      form.querySelector(`[name=color][value="${x.color}"]`)?.click();
      form.querySelector(`[name=kind][value="${x.kind || 'check'}"]`).checked = true;
      if (x.kind === 'count') { form.target.value = x.target; form.unit.value = t(x.unit); }
      form.querySelector(`[name=freq][value="${x.freq || 'daily'}"]`).checked = true;
      if (x.perWeek) form.perWeek.value = x.perWeek;
      if (x.every) form.every.value = x.every;
      if (x.days) form.querySelectorAll('[name=days]').forEach((c) => (c.checked = x.days.includes(Number(c.value))));
      form.time.value = x.time || '';
      form.identity.value = x.identity ? t(`tpl.id_${x.identity}`) : '';
      sync();
      form.name.focus();
    }));

    form.querySelector('[data-delete]')?.addEventListener('click', () => {
      modal().close();
      deleteHabit(h);
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const err = form.querySelector('.form-error');
      const name = form.name.value.trim();
      const days = [...form.querySelectorAll('[name=days]:checked')].map((x) => Number(x.value));
      if (!name) { err.textContent = t('form.err_name'); err.hidden = false; form.name.focus(); return; }
      if (form.freq.value === 'days' && !days.length) { err.textContent = t('form.err_days'); err.hidden = false; return; }
      const kind = form.kind.value;
      Object.assign(h, {
        name,
        color: form.color.value || COLORS[0],
        category: form.category.value.trim(),
        kind,
        target: kind === 'count' ? Math.min(999, Math.max(2, Number(form.target.value) || 2)) : 1,
        unit: kind === 'count' ? form.unit.value.trim() : '',
        schedule: {
          type: form.freq.value,
          days: days.length ? days : [0, 1, 2, 3, 4],
          perWeek: Math.min(7, Math.max(1, Number(form.perWeek.value) || 3)),
          every: Math.min(90, Math.max(2, Number(form.every.value) || 2)),
          perMonth: Math.min(31, Math.max(1, Number(form.perMonth.value) || 10)),
        },
        time: form.time.value,
        reminders: [...new Set(reminders.filter(Boolean))].sort(),
        identity: form.identity.value.trim(),
        notes: form.notes.value.trim(),
      });
      if (!existing) store.state.habits.push(h);
      modal().close();
      commit();
      toast(existing ? t('form.habit_updated') : t('form.habit_created'));
    });
  }, 'wide');
}

export function deleteHabit(h) {
  const undo = removeWithUndo(store.state.habits, h);
  commit();
  toast(t('habits.deleted_toast', { name: h.name }), { action: { label: t('common.undo'), fn: undo } });
}

// ---------- Note du jour (humeur + note) ----------

const MOODS = ['😣', '😕', '😐', '🙂', '😄'];

export function openJournalModal(h, key = dateKey(today())) {
  const j = h.journal[key] || { mood: 0, note: '' };
  open(`
    ${head(t('journal.title'))}
    <div class="modal-body">
      <p class="muted">${esc(h.name)} · ${fmtFull(parseKey(key))}</p>
      <fieldset class="field"><legend>${t('journal.mood')}</legend>
        <div class="moods">${MOODS.map((m, i) => `<label class="mood" title="${t(`journal.mood.${i + 1}`)}"><input type="radio" name="mood" value="${i + 1}" ${j.mood === i + 1 ? 'checked' : ''}><span>${m}</span><small>${t(`journal.mood.${i + 1}`)}</small></label>`).join('')}</div>
      </fieldset>
      <label class="field"><span>${t('journal.note')}</span><textarea name="note" rows="3" maxlength="400" placeholder="${t('journal.note_ph')}" autofocus>${esc(j.note)}</textarea></label>
    </div>
    ${foot(false)}`,
  (form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      setJournal(h, key, { mood: form.mood.value, note: form.note.value });
      modal().close();
      commit();
      toast(t('journal.saved'));
    });
  });
}

// ---------- Minuteur ----------

export const timer = { running: false, left: 0, total: 0, habit: null, id: 0, label: '' };
let timerTick = 0;

export function openTimerModal(h = null, minutes = h?.kind === 'count' && /min/i.test(h.unit) ? Math.max(1, h.target - valueOn(h, dateKey(today()))) : 25) {
  if (timer.running && timer.habit?.id !== h?.id) { stopTimer(); }
  const total = timer.running ? timer.total : Math.min(180, minutes) * 60;
  if (!timer.running) Object.assign(timer, { left: total, total, habit: h, label: h ? h.name : t('timer.focus') });
  open(`
    ${head(`${icon('timer')}${t('timer.title')}`)}
    <div class="modal-body timer-body">
      <p class="muted">${h ? t('timer.for', { name: esc(h.name) }) : t('timer.focus')}</p>
      <div class="timer-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" class="track"/><circle cx="60" cy="60" r="54" class="prog"/></svg><b class="timer-clock">${fmtClock(timer.left)}</b></div>
      <label class="field timer-dur" ${timer.running ? 'hidden' : ''}><span>${t('timer.duration')}</span><input type="number" name="minutes" min="1" max="180" value="${Math.round(total / 60)}"></label>
      <div class="btn-row center">
        <button type="button" class="btn primary" data-start ${timer.running ? 'hidden' : ''}>${icon('play')}${t('common.start')}</button>
        <button type="button" class="btn" data-pause ${timer.running ? '' : 'hidden'}>${icon('pause')}${t('common.pause')}</button>
        <button type="button" class="btn ghost" data-stop ${timer.running || timer.left < timer.total ? '' : 'hidden'}>${icon('x')}${t('common.stop')}</button>
      </div>
    </div>`,
  (form) => {
    const clock = form.querySelector('.timer-clock');
    const prog = form.querySelector('.prog');
    const C = 2 * Math.PI * 54;
    const paint = () => {
      clock.textContent = fmtClock(timer.left);
      prog.style.strokeDasharray = `${C * (1 - timer.left / timer.total)} ${C}`;
    };
    paint();
    const startBtn = form.querySelector('[data-start]'), pauseBtn = form.querySelector('[data-pause]'), stopBtn = form.querySelector('[data-stop]');
    const dur = form.querySelector('.timer-dur');
    const refresh = () => { startBtn.hidden = timer.running; pauseBtn.hidden = !timer.running; dur.hidden = timer.running || timer.left < timer.total; stopBtn.hidden = !timer.running && timer.left === timer.total; paint(); };
    form.querySelector('[name=minutes]').addEventListener('change', (e) => {
      const m = Math.min(180, Math.max(1, Number(e.target.value) || 1));
      timer.total = timer.left = m * 60;
      paint();
    });
    startBtn.addEventListener('click', () => { runTimer(() => { if (modal().open) refresh(); }); refresh(); });
    pauseBtn.addEventListener('click', () => { pauseTimer(); refresh(); });
    stopBtn.addEventListener('click', () => { finishTimer(true); modal().close(); });
    form.addEventListener('submit', (e) => e.preventDefault());
  }, 'narrow');
}

function runTimer(onTick) {
  if (timer.running) return;
  timer.running = true;
  timer.id++;
  const endAt = Date.now() + timer.left * 1000;
  clearInterval(timerTick);
  timerTick = setInterval(() => {
    timer.left = Math.max(0, Math.round((endAt - Date.now()) / 1000));
    onTick?.();
    document.dispatchEvent(new CustomEvent('timer-tick'));
    if (timer.left <= 0) finishTimer(false);
  }, 250);
}

function pauseTimer() {
  timer.running = false;
  clearInterval(timerTick);
}

export function stopTimer() {
  pauseTimer();
  Object.assign(timer, { left: 0, total: 0, habit: null, label: '' });
  document.dispatchEvent(new CustomEvent('timer-tick'));
}

/** Fin (ou arrêt anticipé) : le temps écoulé est ajouté aux habitudes « minutes ». */
function finishTimer(early) {
  pauseTimer();
  const elapsed = Math.round((timer.total - timer.left) / 60);
  const h = timer.habit;
  if (h && h.kind === 'count' && /min/i.test(h.unit) && elapsed > 0) {
    const k = dateKey(today());
    setLog(h, k, valueOn(h, k) + elapsed);
    commit();
    toast(t('timer.added', { n: elapsed, name: h.name }));
  } else if (!early) {
    toast(t('timer.finished'));
  }
  if (!early) {
    notify(t('timer.finished'), t('timer.notify_body', { name: timer.label }), { tag: 'timer' });
    if (modal().open && modal().querySelector('.timer-body')) modal().close();
  }
  Object.assign(timer, { left: 0, total: 0, habit: null, label: '' });
  document.dispatchEvent(new CustomEvent('timer-tick'));
}

// ---------- Routines ----------

export function openRoutineModal(existing) {
  const r = existing || newRoutine();
  const habits = store.state.habits.filter((h) => !h.archived);
  let order = r.habitIds.filter((id) => habits.some((h) => h.id === id));
  open(`
    ${head(existing ? t('routine.edit') : t('routine.new'))}
    <div class="modal-body">
      <label class="field"><span>${t('routine.name')}</span><input name="name" required maxlength="40" value="${esc(r.name)}" placeholder="${t('routine.name_ph')}" autofocus></label>
      <fieldset class="field"><legend>${t('routine.when')}</legend>
        <div class="seg wrap">${['morning', 'afternoon', 'evening', 'any'].map((w) => radio('when', w, t(`routine.when_${w}`), r.when === w)).join('')}</div>
      </fieldset>
      <fieldset class="field"><legend>${t('routine.pick')}</legend>
        ${habits.length
    ? `<div class="pick-list">${habits.map((h) => `<label class="pick ${order.includes(h.id) ? 'on' : ''}"><input type="checkbox" name="habit" value="${h.id}" ${order.includes(h.id) ? 'checked' : ''}><b class="pick-n"></b><i class="tick" style="--c:${h.color}"></i><span>${esc(h.name)}</span><small>${h.kind === 'count' ? `${h.target} ${esc(h.unit)}` : ''}</small></label>`).join('')}</div>
        <p class="muted">${t('routine.order_hint')}</p>`
    : `<p class="muted">${t('routine.no_habits')}</p>`}
      </fieldset>
    </div>
    ${foot(!!existing)}`,
  (form) => {
    const numbers = () => form.querySelectorAll('.pick').forEach((el) => {
      const i = order.indexOf(el.querySelector('input').value);
      el.classList.toggle('on', i >= 0);
      el.querySelector('.pick-n').textContent = i >= 0 ? String(i + 1) : '';
    });
    numbers();
    form.addEventListener('change', (e) => {
      if (e.target.name !== 'habit') return;
      order = order.filter((id) => id !== e.target.value);
      if (e.target.checked) order.push(e.target.value);
      numbers();
    });
    form.querySelector('[data-delete]')?.addEventListener('click', () => { modal().close(); deleteRoutine(r); });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.name.value.trim();
      if (!name) { form.name.focus(); return; }
      Object.assign(r, { name, when: form.when.value, habitIds: [...order] });
      if (!existing) store.state.routines.push(r);
      modal().close();
      commit();
      toast(t('routine.saved'));
    });
  });
}

export function deleteRoutine(r) {
  const undo = removeWithUndo(store.state.routines, r);
  commit();
  toast(t('routine.deleted', { name: r.name }), { action: { label: t('common.undo'), fn: undo } });
}

/** Lecteur de routine : une étape à la fois, minuteur intégré pour les habitudes en minutes. */
export function openRoutinePlayer(r) {
  const k = dateKey(today());
  const steps = routineHabits(r);
  if (!steps.length) { toast(t('routine.no_habits')); return; }
  let i = Math.max(0, steps.findIndex((h) => !isDone(h, k)));
  let tick = 0, left = 0, total = 0, running = false;
  const stopClock = () => { clearInterval(tick); running = false; };
  const markDone = (h) => setLog(h, k, Math.max(valueOn(h, k), h.target || 1));
  open(`${head(`${icon('play')}${esc(r.name)}`)}<div class="modal-body rp-body"></div>`, (form) => {
    const body = form.querySelector('.rp-body');
    form.addEventListener('submit', (e) => e.preventDefault());
    modal().addEventListener('close', stopClock, { once: true });
    const finish = () => {
      stopClock();
      const done = steps.filter((h) => isDone(h, k)).length;
      body.innerHTML = `<div class="rp-end">${icon('award')}<h3>${t('routine.finished')}</h3><p class="muted">${t('routine.finished_text', { done, total: steps.length })}</p><div class="segbar">${steps.map((h) => `<i class="${isDone(h, k) ? 'on' : ''}"></i>`).join('')}</div><button type="button" class="btn primary">${t('common.close')}</button></div>`;
      body.querySelector('button').addEventListener('click', () => modal().close());
    };
    const next = () => { i++; if (i >= steps.length) finish(); else paint(); };
    const paint = () => {
      stopClock();
      const h = steps[i];
      const done = isDone(h, k);
      const minutes = h.kind === 'count' && /min/i.test(h.unit) && !done ? Math.max(1, h.target - valueOn(h, k)) : 0;
      total = left = minutes * 60;
      body.innerHTML = `
        <p class="muted">${t('routine.step', { i: i + 1, n: steps.length })}</p>
        <div class="segbar">${steps.map((x, j) => `<i class="${isDone(x, k) ? 'on' : ''} ${j === i ? 'cur' : ''}"></i>`).join('')}</div>
        <div class="rp-step"><i class="tick" style="--c:${h.color}"></i><h3>${esc(h.name)}</h3>
          ${h.kind === 'count' ? `<p class="muted">${valueOn(h, k)}/${h.target} ${esc(h.unit)}</p>` : ''}
          ${h.identity ? `<p class="muted">${icon('user')} ${esc(h.identity)}</p>` : ''}
        </div>
        ${minutes ? `<div class="timer-ring sm"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" class="track"/><circle cx="60" cy="60" r="54" class="prog"/></svg><b class="timer-clock">${fmtClock(left)}</b></div>
        <div class="btn-row center"><button type="button" class="btn" data-clock>${icon('play')}${t('common.start')}</button></div>` : ''}
        <div class="btn-row center rp-actions">
          <button type="button" class="btn primary" data-done>${icon('check')}${done ? t('routine.next') : t('routine.mark_done')}</button>
          <button type="button" class="btn ghost" data-skip>${t('routine.skip_step')}</button>
        </div>`;
      body.querySelector('[data-done]').addEventListener('click', () => { if (!done) { markDone(h); commit(); } next(); });
      body.querySelector('[data-skip]').addEventListener('click', next);
      const clockBtn = body.querySelector('[data-clock]');
      if (!clockBtn) return;
      const clock = body.querySelector('.timer-clock'), prog = body.querySelector('.prog'), C = 2 * Math.PI * 54;
      const paintClock = () => { clock.textContent = fmtClock(left); prog.style.strokeDasharray = `${C * (1 - left / total)} ${C}`; };
      clockBtn.addEventListener('click', () => {
        if (running) { stopClock(); clockBtn.innerHTML = `${icon('play')}${t('common.start')}`; return; }
        running = true;
        const endAt = Date.now() + left * 1000;
        clockBtn.innerHTML = `${icon('pause')}${t('common.pause')}`;
        tick = setInterval(() => {
          left = Math.max(0, Math.round((endAt - Date.now()) / 1000));
          paintClock();
          if (left <= 0) {
            stopClock();
            markDone(h);
            commit();
            notify(t('timer.finished'), t('timer.notify_body', { name: h.name }), { tag: 'timer' });
            next();
          }
        }, 250);
      });
    };
    paint();
  }, 'narrow');
}

// ---------- Tâche ----------

export function openTaskModal(existing, defaults = {}) {
  const x = existing || newTask(defaults);
  const subs = x.subtasks.map((s) => ({ ...s }));
  const projects = [...new Set(store.state.tasks.map((y) => y.project).filter(Boolean))];
  open(`
    ${head(existing ? t('form.task_edit') : t('form.task_new'))}
    <div class="modal-body">
      <label class="field"><span>${t('form.title')}</span><input name="title" value="${esc(x.title)}" maxlength="90" placeholder="${t('form.title_ph')}" required autofocus></label>
      <label class="field"><span>${t('form.desc')}</span><textarea name="notes" rows="3" maxlength="600" placeholder="${t('form.desc_ph')}">${esc(x.notes)}</textarea></label>
      <fieldset class="field"><legend>${t('form.priority')}</legend>
        <div class="seg prio-seg">${PRIORITIES.map((p, i) => radio('priority', i, `<i class="pdot ${p.cls}"></i>${p.label}`, x.priority === i)).join('')}</div>
      </fieldset>
      <div class="field-row">
        <label class="field grow"><span>${t('form.due')}</span><input type="date" name="due" value="${esc(x.due)}"></label>
        <label class="field grow"><span>${t('form.project')}</span><input name="project" value="${esc(x.project)}" list="proj-list" maxlength="24" placeholder="${t('form.project_ph')}">
          <datalist id="proj-list">${projects.map((p) => `<option value="${esc(p)}">`).join('')}</datalist></label>
      </div>
      <fieldset class="field"><legend>${t('form.status')}</legend>
        <div class="seg">${STATUSES.map((s) => radio('status', s.id, s.label, x.status === s.id)).join('')}</div>
      </fieldset>
      <div class="field"><span class="label">${t('form.subtasks')} <small class="sub-count"></small></span>
        <ul class="subtasks"></ul>
        <div class="sub-add"><input class="sub-input" placeholder="${t('form.sub_ph')}" maxlength="80" aria-label="${t('form.sub_new')}"><button type="button" class="btn sm" data-add-sub>${icon('plus')}${t('form.add')}</button></div>
      </div>
      <p class="form-error" hidden></p>
    </div>
    ${foot(!!existing)}`,
  (form) => {
    const list = form.querySelector('.subtasks');
    const input = form.querySelector('.sub-input');
    const drawSubs = () => {
      list.innerHTML = subs.map((s, i) => `
        <li class="${s.done ? 'done' : ''}">
          <label><input type="checkbox" data-sub="${i}" ${s.done ? 'checked' : ''}><span>${esc(s.title)}</span></label>
          <button type="button" class="icon-btn sm" data-del-sub="${i}" aria-label="${t('form.sub_delete')}">${icon('x')}</button>
        </li>`).join('');
      form.querySelector('.sub-count').textContent = subs.length ? `${subs.filter((s) => s.done).length}/${subs.length}` : '';
    };
    const addSub = () => {
      const v = input.value.trim();
      if (!v) return;
      subs.push({ id: uid(), title: v, done: false });
      input.value = '';
      drawSubs();
      input.focus();
    };
    drawSubs();
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addSub(); } });
    form.querySelector('[data-add-sub]').addEventListener('click', addSub);
    list.addEventListener('change', (e) => {
      const i = e.target.dataset.sub;
      if (i !== undefined) { subs[i].done = e.target.checked; drawSubs(); }
    });
    list.addEventListener('click', (e) => {
      const b = e.target.closest('[data-del-sub]');
      if (b) { subs.splice(Number(b.dataset.delSub), 1); drawSubs(); }
    });
    form.querySelector('[data-delete]')?.addEventListener('click', () => {
      modal().close();
      deleteTask(x);
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = form.title.value.trim();
      if (!title) {
        const err = form.querySelector('.form-error');
        err.textContent = t('form.err_title');
        err.hidden = false;
        form.title.focus();
        return;
      }
      const wasDone = x.status === 'done';
      Object.assign(x, {
        title,
        notes: form.notes.value.trim(),
        priority: Number(form.priority.value),
        due: form.due.value,
        project: form.project.value.trim().replace(/^#/, ''),
        subtasks: subs,
      });
      if (form.status.value !== x.status || !existing) setTaskStatus(x, form.status.value);
      if (!existing) store.state.tasks.push(x);
      modal().close();
      commit();
      if (!wasDone && x.status === 'done') toast(t('form.task_done'));
      else toast(existing ? t('form.task_updated') : t('form.task_created'));
    });
  });
}

export function deleteTask(x) {
  const undo = removeWithUndo(store.state.tasks, x);
  commit();
  toast(t('tasks.deleted_toast', { title: x.title }), { action: { label: t('common.undo'), fn: undo } });
}
