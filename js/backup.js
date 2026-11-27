// Sauvegardes : export / import JSON et CSV, partage, code de transfert,
// copies automatiques quotidiennes et synchronisation optionnelle par gist GitHub.
import { store, replaceState, save, normalize } from './store.js';
import * as L from './logic.js';
import { dateKey, today, download, fmtShort, parseKey } from './utils.js';
import { t } from './i18n.js';
import { toast } from './ui.js';

const st = () => store.state;

// ---------- JSON ----------

export function exportJSON() {
  download(`momentum-${dateKey(today())}.json`, JSON.stringify(st(), null, 2));
  toast(t('settings.exported'));
}

export function validData(data) {
  return data && Array.isArray(data.habits) && Array.isArray(data.tasks);
}

export async function importFile(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!validData(data)) throw new Error('format');
    replaceState(data);
    toast(t('settings.imported'));
  } catch (_) {
    toast(t('settings.import_bad'));
  }
}

export async function shareBackup() {
  const file = new File([JSON.stringify(st())], `momentum-${dateKey(today())}.json`, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Momentum' }); } catch (_) { /* annulé */ }
  } else {
    toast(t('settings.share_unsupported'));
    exportJSON();
  }
}

// ---------- CSV ----------

const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function exportCSV() {
  const rows = [['date', 'habit', 'category', 'kind', 'value', 'target', 'done', 'skipped', 'mood', 'note']];
  for (const h of st().habits) {
    const keys = new Set([...Object.keys(h.log), ...Object.keys(h.skips), ...Object.keys(h.journal)]);
    for (const k of [...keys].sort()) {
      const j = h.journal[k] || {};
      rows.push([k, h.name, h.category, h.kind, L.valueOn(h, k), h.target, L.isDone(h, k) ? 1 : 0, h.skips[k] ? 1 : 0, j.mood || '', j.note || '']);
    }
  }
  download(`momentum-historique-${dateKey(today())}.csv`, '﻿' + rows.map((r) => r.map(csvCell).join(';')).join('\n'), 'text/csv;charset=utf-8');
  toast(t('settings.csv_exported'));
}

// ---------- Code de transfert ----------

const b64 = (bytes) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function pipe(bytes, Ctor, fmt) {
  const stream = new Blob([bytes]).stream().pipeThrough(new Ctor(fmt));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function makeTransferCode() {
  const json = new TextEncoder().encode(JSON.stringify(st()));
  if ('CompressionStream' in window) return 'MMT1.' + b64(await pipe(json, CompressionStream, 'deflate-raw'));
  return 'MMT0.' + b64(json);
}

export async function applyTransferCode(code) {
  try {
    const m = String(code || '').trim().replace(/\s+/g, '').match(/^MMT([01])\.([A-Za-z0-9+/=]+)$/);
    if (!m) throw new Error('format');
    let bytes = unb64(m[2]);
    if (m[1] === '1') bytes = await pipe(bytes, DecompressionStream, 'deflate-raw');
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (!validData(data)) throw new Error('format');
    replaceState(data);
    toast(t('settings.transfer_ok'));
    return true;
  } catch (_) {
    toast(t('settings.transfer_bad'));
    return false;
  }
}

// ---------- Copies automatiques (une par jour, 7 jours) ----------

const SNAP_KEY = 'momentum:snapshots';
const readSnaps = () => { try { return JSON.parse(localStorage.getItem(SNAP_KEY) || '[]'); } catch (_) { return []; } };

/** Au lancement : garde l'état tel qu'il est au début de la journée. */
export function dailySnapshot() {
  const s = st();
  if (s.fresh) return;
  const k = dateKey(today());
  const snaps = readSnaps();
  if (snaps.some((x) => x.date === k)) return;
  snaps.push({ date: k, habits: s.habits.length, tasks: s.tasks.length, data: JSON.stringify(s) });
  while (snaps.length > 7) snaps.shift();
  try { localStorage.setItem(SNAP_KEY, JSON.stringify(snaps)); } catch (_) { /* quota */ }
}

export const listSnapshots = () => readSnaps().map(({ date, habits, tasks }) => ({ date, habits, tasks })).reverse();

export function restoreSnapshot(date) {
  const snap = readSnaps().find((x) => x.date === date);
  if (!snap) return;
  const label = fmtShort(parseKey(date));
  if (!confirm(t('settings.snapshot_confirm', { date: label }))) return;
  replaceState(JSON.parse(snap.data));
  toast(t('settings.snapshot_restored', { date: label }));
}

// ---------- Synchronisation par gist GitHub (optionnelle) ----------

const API = 'https://api.github.com';
const FILE = 'momentum.json';

function headers() {
  return { Authorization: `Bearer ${st().settings.sync.token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' };
}

async function fetchGist() {
  const { gistId } = st().settings.sync;
  if (!gistId) return null;
  const r = await fetch(`${API}/gists/${gistId}`, { headers: headers() });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const g = await r.json();
  const f = g.files?.[FILE];
  if (!f) return null;
  const content = f.truncated ? await (await fetch(f.raw_url)).text() : f.content;
  return JSON.parse(content);
}

export async function pushSync({ quiet = false } = {}) {
  const sync = st().settings.sync;
  if (!sync.token) { if (!quiet) toast(t('settings.sync_need_token')); return false; }
  try {
    const body = JSON.stringify({ description: 'Momentum · sauvegarde', public: false, files: { [FILE]: { content: JSON.stringify(st()) } } });
    const r = sync.gistId
      ? await fetch(`${API}/gists/${sync.gistId}`, { method: 'PATCH', headers: headers(), body })
      : await fetch(`${API}/gists`, { method: 'POST', headers: headers(), body });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const g = await r.json();
    sync.gistId = g.id;
    sync.lastAt = new Date().toISOString();
    save();
    if (!quiet) toast(t('settings.sync_pushed'));
    return true;
  } catch (e) {
    if (!quiet) toast(t('settings.sync_error', { msg: e.message }));
    return false;
  }
}

export async function pullSync({ quiet = false, force = false } = {}) {
  const sync = st().settings.sync;
  if (!sync.token) { if (!quiet) toast(t('settings.sync_need_token')); return false; }
  try {
    const remote = await fetchGist();
    if (!remote || !validData(remote)) { if (!quiet) toast(t('settings.sync_same')); return false; }
    if (remote.updatedAt === st().updatedAt) { if (!quiet) toast(t('settings.sync_same')); return false; }
    if (!force && !quiet && remote.updatedAt < st().updatedAt && !confirm(t('settings.sync_conflict'))) return false;
    const keep = { ...st().settings.sync, lastAt: new Date().toISOString() };
    const data = normalize(remote);
    data.settings.sync = keep;
    replaceState(data);
    if (!quiet) toast(t('settings.sync_pulled'));
    return true;
  } catch (e) {
    if (!quiet) toast(t('settings.sync_error', { msg: e.message }));
    return false;
  }
}

let pushTimer = 0;
/** Synchro automatique : récupère au lancement si le gist est plus récent, envoie après chaque changement. */
export function autoSync(event) {
  const sync = st().settings.sync;
  if (!sync.auto || !sync.token || !navigator.onLine) return;
  if (event === 'start') {
    fetchGist().then((remote) => {
      if (remote && validData(remote) && remote.updatedAt > st().updatedAt) {
        const keep = { ...sync, lastAt: new Date().toISOString() };
        const data = normalize(remote);
        data.settings.sync = keep;
        replaceState(data);
        toast(t('settings.sync_pulled'));
      }
    }).catch(() => {});
  } else {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => pushSync({ quiet: true }), 4000);
  }
}
