// Suivi d'habitudes — tout est stocké dans le navigateur (localStorage).

const STORAGE_KEY = "suivi-habitudes:v1";
const DAYS_SHOWN = 7;

// ---------- Données ----------

/** @typedef {{ id: string, name: string, emoji: string, done: string[], createdAt: string }} Habit */

/** @returns {Habit[]} */
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : null;
    if (Array.isArray(data)) return data;
  } catch (_) { /* stockage indisponible ou corrompu */ }
  return [
    { id: uid(), name: "Boire 2 L d'eau", emoji: "💧", done: [], createdAt: dateKey(new Date()) },
    { id: uid(), name: "Lire 20 minutes", emoji: "📚", done: [], createdAt: dateKey(new Date()) },
  ];
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(habits)); } catch (_) {}
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** Date locale au format AAAA-MM-JJ (évite les décalages de fuseau horaire). */
function dateKey(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function addDays(d, n) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

/** Les N derniers jours, du plus ancien à aujourd'hui. */
function lastDays(n) {
  const today = new Date();
  return Array.from({ length: n }, (_, i) => addDays(today, i - (n - 1)));
}

/** Série en cours : jours consécutifs réussis jusqu'à aujourd'hui (ou hier si aujourd'hui n'est pas encore coché). */
function currentStreak(habit) {
  const done = new Set(habit.done);
  let day = new Date();
  if (!done.has(dateKey(day))) day = addDays(day, -1);
  let streak = 0;
  while (done.has(dateKey(day))) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

function bestStreak(habit) {
  const sorted = [...habit.done].sort();
  let best = 0, run = 0, prev = null;
  for (const key of sorted) {
    const d = new Date(key + "T00:00:00");
    run = prev && dateKey(addDays(prev, 1)) === key ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

function toggle(habit, key) {
  const i = habit.done.indexOf(key);
  if (i === -1) habit.done.push(key);
  else habit.done.splice(i, 1);
  save();
  render();
}

// ---------- Affichage ----------

let habits = load();

const $ = (sel) => document.querySelector(sel);
const fmtWeekday = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
const fmtFull = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

function render() {
  const days = lastDays(DAYS_SHOWN);
  const todayKey = dateKey(new Date());

  const full = fmtFull.format(new Date());
  $("#today").textContent = full.charAt(0).toUpperCase() + full.slice(1);

  // En-tête des jours
  const head = $("#days-head");
  head.replaceChildren(...days.map((d) => {
    const span = document.createElement("span");
    span.className = "days-label" + (dateKey(d) === todayKey ? " is-today" : "");
    span.textContent = fmtWeekday.format(d).replace(".", "");
    return span;
  }));

  // Liste des habitudes
  const list = $("#habits");
  const tpl = $("#habit-tpl");
  list.replaceChildren(...habits.map((habit) => {
    const li = tpl.content.firstElementChild.cloneNode(true);
    li.querySelector(".h-emoji").textContent = habit.emoji || "✅";
    li.querySelector(".h-name").textContent = habit.name;

    const streak = currentStreak(habit);
    const best = bestStreak(habit);
    li.querySelector(".h-streak").textContent =
      (streak > 0 ? `🔥 ${streak} jour${streak > 1 ? "s" : ""} d'affilée` : "Pas de série en cours") +
      (best > 0 ? ` · record ${best}` : "");

    const daysEl = li.querySelector(".days");
    daysEl.replaceChildren(...days.map((d) => {
      const key = dateKey(d);
      const isDone = habit.done.includes(key);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "day" + (isDone ? " done" : "") + (key === todayKey ? " is-today" : "");
      btn.textContent = "✓";
      btn.dataset.label = fmtWeekday.format(d).replace(".", "");
      btn.setAttribute("aria-pressed", String(isDone));
      btn.setAttribute("aria-label", `${habit.name} — ${fmtFull.format(d)}`);
      btn.addEventListener("click", () => toggle(habit, key));
      return btn;
    }));

    li.querySelector(".delete").addEventListener("click", () => {
      if (confirm(`Supprimer « ${habit.name} » et tout son historique ?`)) {
        habits = habits.filter((h) => h.id !== habit.id);
        save();
        render();
      }
    });
    return li;
  }));

  $("#empty").hidden = habits.length > 0;

  // Résumé du jour
  const doneToday = habits.filter((h) => h.done.includes(todayKey)).length;
  $("#summary").innerHTML = habits.length
    ? `${doneToday} / ${habits.length} aujourd'hui<small>${doneToday === habits.length ? "Bravo, journée parfaite 🎉" : "Continuez comme ça 💪"}</small>`
    : "";
}

// ---------- Événements ----------

$("#add-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("#name").value.trim();
  if (!name) return;
  habits.push({
    id: uid(),
    name,
    emoji: $("#emoji").value.trim() || "✅",
    done: [],
    createdAt: dateKey(new Date()),
  });
  save();
  $("#name").value = "";
  $("#name").focus();
  render();
});

$("#export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(habits, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `habitudes-${dateKey(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

$("#import").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data)) throw new Error("format");
    habits = data.filter((h) => h && typeof h.name === "string" && Array.isArray(h.done));
    save();
    render();
  } catch (_) {
    alert("Fichier invalide : choisissez un export de cette application.");
  }
  e.target.value = "";
});

// Rafraîchit l'affichage à minuit si la page reste ouverte
setInterval(() => {
  const full = fmtFull.format(new Date());
  if ($("#today").textContent.toLowerCase() !== full.toLowerCase()) render();
}, 60_000);

render();
