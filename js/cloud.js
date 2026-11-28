// Momentum Cloud (optionnel) : compte, synchronisation entre appareils.
// Le serveur : https://github.com/elalamiz605-tech/momentum-cloud
import { store, save, replaceState, normalize } from './store.js';
import { t } from './i18n.js';
import { toast } from './ui.js';

export const DEFAULT_URL = 'https://momentum-cloud.onrender.com';
const cloud = () => store.state.settings.cloud;
export const isSignedIn = () => !!cloud().token;

let wakingToast = 0;

/** Appel HTTP vers le serveur. Le plan gratuit s'endort : on prévient si ça prend du temps. */
async function api(path, { method = 'GET', body, auth = true } = {}) {
  const c = cloud();
  const base = (c.url || DEFAULT_URL).replace(/\/+$/, '');
  const headers = { 'Content-Type': 'application/json' };
  if (auth && c.token) headers.Authorization = `Bearer ${c.token}`;
  const slow = setTimeout(() => { wakingToast = Date.now(); toast(t('cloud.waking'), { timeout: 40000 }); }, 2500);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 70000);
  try {
    const r = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: ctrl.signal });
    let data = null;
    try { data = r.status === 204 ? null : await r.json(); } catch (_) { /* pas de JSON */ }
    if (r.status === 401 && auth && c.token && !path.startsWith('/auth/login')) {
      c.token = ''; save(); // session expirée ou révoquée
      throw new Error(t('cloud.signed_out'));
    }
    if (!r.ok) {
      const err = new Error(messageFor(data?.error, r.status));
      err.status = r.status; err.data = data;
      throw err;
    }
    return data;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(t('cloud.timeout'));
    if (e instanceof TypeError) throw new Error(t('cloud.unreachable'));
    throw e;
  } finally { clearTimeout(slow); clearTimeout(timer); }
}

function messageFor(code, status) {
  const known = { email_taken: 'cloud.err_taken', invalid_credentials: 'cloud.err_credentials', validation_error: 'cloud.err_validation', version_conflict: 'cloud.err_conflict', payload_too_large: 'cloud.err_large' };
  return known[code] ? t(known[code]) : `${t('cloud.err_server')} (${status})`;
}

// ---------- Compte ----------

export async function register(email, password) {
  const s = store.state.settings;
  const res = await api('/auth/register', { method: 'POST', body: { email, password, name: s.name, lang: s.lang }, auth: false });
  Object.assign(cloud(), { token: res.token, email: res.user.email, version: 0, lastAt: '' });
  save();
  await afterSignIn();
}

export async function login(email, password) {
  const res = await api('/auth/login', { method: 'POST', body: { email, password }, auth: false });
  Object.assign(cloud(), { token: res.token, email: res.user.email, version: 0, lastAt: '' });
  save();
  await afterSignIn();
}

/** Première synchro après connexion : on prend la version la plus récente des deux côtés. */
async function afterSignIn() {
  let remote = null;
  try { remote = await api('/data'); } catch (e) { if (e.status !== 404) throw e; }
  const local = store.state;
  // Des données locales « qui comptent » : au moins une validation ou une tâche.
  const localHasWork = local.habits.some((h) => Object.keys(h.log || {}).length) || local.tasks.length > 0;
  if (remote && (!localHasWork || confirm(t('cloud.use_remote_confirm')))) applyRemote(remote);
  else await push({ quiet: true });
  toast(t('cloud.signed_in', { email: cloud().email }));
}

export async function logout({ everywhere = false } = {}) {
  try { await api(everywhere ? '/auth/logout-all' : '/auth/logout', { method: 'POST' }); } catch (_) { /* déjà déconnecté */ }
  Object.assign(cloud(), { token: '', email: '', version: 0, lastAt: '' });
  save();
  toast(t('cloud.signed_out'));
}

export async function deleteAccount(password) {
  await api('/me', { method: 'DELETE', body: { password } });
  Object.assign(cloud(), { token: '', email: '', version: 0, lastAt: '' });
  save();
  toast(t('cloud.deleted'));
}

// ---------- Synchronisation ----------

let skipNextPush = false;
function applyRemote(remote) {
  skipNextPush = true; // le commit qui suit vient du serveur : inutile de le renvoyer
  const keep = { ...cloud(), version: remote.version, lastAt: new Date().toISOString() };
  const data = normalize(remote.data);
  data.settings.cloud = keep;
  // Les clés locales (gist, coach) ne sont jamais sur le serveur : on garde les nôtres.
  data.settings.sync = store.state.settings.sync;
  data.settings.ai = store.state.settings.ai;
  replaceState(data);
}

export async function push({ quiet = false } = {}) {
  if (!isSignedIn()) return false;
  const c = cloud();
  try {
    const res = await api('/data', { method: 'PUT', body: { data: store.state, baseVersion: c.version || undefined } });
    c.version = res.version; c.lastAt = new Date().toISOString();
    save();
    if (!quiet) toast(t('cloud.pushed'));
    return true;
  } catch (e) {
    if (e.status === 409) {
      // Un autre appareil a écrit entre-temps : le plus récent gagne, puis on renvoie.
      const remote = await api('/data');
      if (remote.data.updatedAt > store.state.updatedAt) { applyRemote(remote); if (!quiet) toast(t('cloud.pulled')); return true; }
      c.version = remote.version; save();
      return push({ quiet });
    }
    if (!quiet) toast(e.message);
    return false;
  }
}

export async function pull({ quiet = false } = {}) {
  if (!isSignedIn()) return false;
  try {
    const remote = await api('/data');
    if (remote.version === cloud().version && !quiet) { toast(t('settings.sync_same')); return false; }
    if (!quiet && remote.data.updatedAt < store.state.updatedAt && !confirm(t('settings.sync_conflict'))) return false;
    applyRemote(remote);
    if (!quiet) toast(t('cloud.pulled'));
    return true;
  } catch (e) {
    if (e.status === 404) { if (!quiet) toast(t('cloud.nothing_yet')); return false; }
    if (!quiet) toast(e.message);
    return false;
  }
}

let pushTimer = 0;
/** Automatique : récupère au lancement si le serveur a plus récent, envoie 4 s après chaque changement. */
export function autoCloud(event) {
  const c = cloud();
  if (!c.token || c.auto === false || !navigator.onLine) return;
  if (event === 'start') {
    api('/data').then((remote) => {
      if (remote.version !== c.version && remote.data.updatedAt > store.state.updatedAt) { applyRemote(remote); toast(t('cloud.pulled')); }
    }).catch(() => {});
  } else {
    if (skipNextPush) { skipNextPush = false; return; }
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => push({ quiet: true }), 4000);
  }
}
