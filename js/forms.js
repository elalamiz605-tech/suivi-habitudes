// Fenêtres de création / modification (habitudes et tâches).
import { icon } from './icons.js';
import { store, commit, COLORS, newHabit, newTask, setTaskStatus, removeWithUndo } from './store.js';
import { PRIORITIES, STATUSES } from './logic.js';
import { esc, uid, WEEKDAYS } from './utils.js';
import { toast } from './ui.js';

const EMOJIS = ['💧', '🏃', '🏋️', '🧘', '📚', '💻', '🥗', '😴', '🎸', '✍️', '🧠', '💊', '🚭', '💰', '🌱', '🙏'];
const modal = () => document.getElementById('modal');

function open(html, onReady) {
  const m = modal();
  m.innerHTML = `<form class="modal-card" novalidate>${html}</form>`;
  const form = m.querySelector('form');
  m.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => m.close()));
  onReady(form);
  m.showModal();
  form.querySelector('[autofocus]')?.focus();
}

const head = (title) => `
  <header class="modal-head"><h2>${title}</h2><button type="button" class="icon-btn" data-close aria-label="Fermer">${icon('x')}</button></header>`;

const foot = (canDelete) => `
  <footer class="modal-foot">
    ${canDelete ? `<button type="button" class="btn danger ghost" data-delete>${icon('trash')}Supprimer</button>` : ''}
    <span class="spacer"></span>
    <button type="button" class="btn ghost" data-close>Annuler</button>
    <button type="submit" class="btn primary">${icon('check')}Enregistrer</button>
  </footer>`;

const radio = (name, value, label, checked) =>
  `<label><input type="radio" name="${name}" value="${value}" ${checked ? 'checked' : ''}><span>${label}</span></label>`;

// ---------- Habitude ----------

export function openHabitModal(existing) {
  const h = existing || newHabit({ color: COLORS[store.state.habits.length % COLORS.length] });
  const cats = [...new Set(store.state.habits.map((x) => x.category).filter(Boolean))];
  open(`
    ${head(existing ? 'Modifier l’habitude' : 'Nouvelle habitude')}
    <div class="modal-body">
      <div class="field-row">
        <label class="field emoji-field"><span>Icône</span><input name="icon" value="${esc(h.icon)}" maxlength="4" aria-label="Icône"></label>
        <label class="field grow"><span>Nom</span><input name="name" value="${esc(h.name)}" maxlength="50" placeholder="Ex. Lire 20 pages" required autofocus></label>
      </div>
      <div class="emoji-pick">${EMOJIS.map((e) => `<button type="button" data-emoji="${e}" aria-label="Choisir ${e}">${e}</button>`).join('')}</div>

      <div class="field-row">
        <fieldset class="field grow"><legend>Couleur</legend>
          <div class="swatches">${COLORS.map((c) => `<label class="swatch" style="--c:${c}"><input type="radio" name="color" value="${c}" ${c === h.color ? 'checked' : ''} aria-label="${c}"><span></span></label>`).join('')}</div>
        </fieldset>
        <label class="field grow"><span>Catégorie</span><input name="category" value="${esc(h.category)}" list="cat-list" maxlength="24" placeholder="Santé, Esprit…">
          <datalist id="cat-list">${[...new Set([...cats, 'Santé', 'Esprit', 'Carrière', 'Finances', 'Social'])].map((c) => `<option value="${esc(c)}">`).join('')}</datalist></label>
      </div>

      <fieldset class="field"><legend>Type de suivi</legend>
        <div class="seg">${radio('kind', 'check', 'Fait / pas fait', h.kind === 'check')}${radio('kind', 'count', 'Objectif chiffré', h.kind === 'count')}</div>
        <div class="field-row" data-show="count">
          <label class="field"><span>Objectif par jour</span><input type="number" name="target" min="2" max="99" value="${h.kind === 'count' ? h.target : 8}"></label>
          <label class="field grow"><span>Unité</span><input name="unit" value="${esc(h.unit)}" maxlength="16" placeholder="verres, pages, minutes…"></label>
        </div>
      </fieldset>

      <fieldset class="field"><legend>Fréquence</legend>
        <div class="seg">${radio('freq', 'daily', 'Tous les jours', h.schedule.type === 'daily')}${radio('freq', 'days', 'Certains jours', h.schedule.type === 'days')}${radio('freq', 'weekly', 'X fois / semaine', h.schedule.type === 'weekly')}</div>
        <div class="days-pick" data-show="days">${WEEKDAYS.map((d, i) => `<label><input type="checkbox" name="days" value="${i}" ${h.schedule.days.includes(i) ? 'checked' : ''}><span>${d}</span></label>`).join('')}</div>
        <div class="field-row" data-show="weekly"><label class="field"><span>Nombre de fois par semaine</span><input type="number" name="perWeek" min="1" max="7" value="${h.schedule.perWeek}"></label></div>
      </fieldset>

      <div class="field-row">
        <label class="field"><span>Heure prévue <small>(optionnel)</small></span><input type="time" name="time" value="${esc(h.time)}"></label>
      </div>
      <label class="field"><span>Notes <small>(pourquoi c’est important pour vous)</small></span><textarea name="notes" rows="2" maxlength="300">${esc(h.notes)}</textarea></label>
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
    form.querySelector('.emoji-pick').addEventListener('click', (e) => {
      const b = e.target.closest('[data-emoji]');
      if (b) form.icon.value = b.dataset.emoji;
    });
    form.querySelector('[data-delete]')?.addEventListener('click', () => {
      modal().close();
      deleteHabit(h);
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const err = form.querySelector('.form-error');
      const name = form.name.value.trim();
      const days = [...form.querySelectorAll('[name=days]:checked')].map((x) => Number(x.value));
      if (!name) { err.textContent = 'Donnez un nom à votre habitude.'; err.hidden = false; form.name.focus(); return; }
      if (form.freq.value === 'days' && !days.length) { err.textContent = 'Choisissez au moins un jour.'; err.hidden = false; return; }
      const kind = form.kind.value;
      Object.assign(h, {
        name,
        icon: form.icon.value.trim() || '✅',
        color: form.color.value || COLORS[0],
        category: form.category.value.trim(),
        kind,
        target: kind === 'count' ? Math.min(99, Math.max(2, Number(form.target.value) || 2)) : 1,
        unit: kind === 'count' ? form.unit.value.trim() : '',
        schedule: { type: form.freq.value, days: days.length ? days : [0, 1, 2, 3, 4], perWeek: Math.min(7, Math.max(1, Number(form.perWeek.value) || 3)) },
        time: form.time.value,
        notes: form.notes.value.trim(),
      });
      if (!existing) store.state.habits.push(h);
      modal().close();
      commit();
      toast(existing ? 'Habitude mise à jour' : 'Habitude créée', { icon: h.icon });
    });
  });
}

export function deleteHabit(h) {
  const undo = removeWithUndo(store.state.habits, h);
  commit();
  toast(`« ${h.name} » supprimée`, { icon: '🗑️', action: { label: 'Annuler', fn: undo } });
}

// ---------- Tâche ----------

export function openTaskModal(existing, defaults = {}) {
  const t = existing || newTask(defaults);
  const subs = t.subtasks.map((x) => ({ ...x }));
  const projects = [...new Set(store.state.tasks.map((x) => x.project).filter(Boolean))];
  open(`
    ${head(existing ? 'Modifier la tâche' : 'Nouvelle tâche')}
    <div class="modal-body">
      <label class="field"><span>Titre</span><input name="title" value="${esc(t.title)}" maxlength="90" placeholder="Ex. Envoyer le devis au client" required autofocus></label>
      <label class="field"><span>Description</span><textarea name="notes" rows="3" maxlength="600" placeholder="Détails, liens, contexte…">${esc(t.notes)}</textarea></label>
      <fieldset class="field"><legend>Priorité</legend>
        <div class="seg prio-seg">${PRIORITIES.map((p, i) => radio('priority', i, `<i class="pdot ${p.cls}"></i>${p.label}`, t.priority === i)).join('')}</div>
      </fieldset>
      <div class="field-row">
        <label class="field grow"><span>Échéance</span><input type="date" name="due" value="${esc(t.due)}"></label>
        <label class="field grow"><span>Projet</span><input name="project" value="${esc(t.project)}" list="proj-list" maxlength="24" placeholder="Freelance, Perso…">
          <datalist id="proj-list">${projects.map((p) => `<option value="${esc(p)}">`).join('')}</datalist></label>
      </div>
      <fieldset class="field"><legend>Statut</legend>
        <div class="seg">${STATUSES.map((st) => radio('status', st.id, st.label, t.status === st.id)).join('')}</div>
      </fieldset>
      <div class="field"><span class="label">Sous-tâches <small class="sub-count"></small></span>
        <ul class="subtasks"></ul>
        <div class="sub-add"><input class="sub-input" placeholder="Ajouter une étape puis Entrée" maxlength="80" aria-label="Nouvelle sous-tâche"><button type="button" class="btn sm" data-add-sub>${icon('plus')}Ajouter</button></div>
      </div>
      <p class="form-error" hidden></p>
    </div>
    ${foot(!!existing)}`,
  (form) => {
    const list = form.querySelector('.subtasks');
    const input = form.querySelector('.sub-input');
    const drawSubs = () => {
      list.innerHTML = subs.map((x, i) => `
        <li class="${x.done ? 'done' : ''}">
          <label><input type="checkbox" data-sub="${i}" ${x.done ? 'checked' : ''}><span>${esc(x.title)}</span></label>
          <button type="button" class="icon-btn sm" data-del-sub="${i}" aria-label="Supprimer l’étape">${icon('x')}</button>
        </li>`).join('');
      form.querySelector('.sub-count').textContent = subs.length ? `${subs.filter((x) => x.done).length}/${subs.length}` : '';
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
      deleteTask(t);
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = form.title.value.trim();
      if (!title) {
        const err = form.querySelector('.form-error');
        err.textContent = 'Donnez un titre à la tâche.';
        err.hidden = false;
        form.title.focus();
        return;
      }
      const wasDone = t.status === 'done';
      Object.assign(t, {
        title,
        notes: form.notes.value.trim(),
        priority: Number(form.priority.value),
        due: form.due.value,
        project: form.project.value.trim().replace(/^#/, ''),
        subtasks: subs,
      });
      if (form.status.value !== t.status || !existing) setTaskStatus(t, form.status.value);
      if (!existing) store.state.tasks.push(t);
      modal().close();
      commit();
      if (!wasDone && t.status === 'done') toast('Tâche terminée, bravo !', { icon: '🎯' });
      else toast(existing ? 'Tâche mise à jour' : 'Tâche créée', { icon: '📝' });
    });
  });
}

export function deleteTask(t) {
  const undo = removeWithUndo(store.state.tasks, t);
  commit();
  toast(`« ${t.title} » supprimée`, { icon: '🗑️', action: { label: 'Annuler', fn: undo } });
}
