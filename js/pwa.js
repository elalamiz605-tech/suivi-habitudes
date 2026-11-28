// Application installable : service worker, invitation à installer, mises à jour.
import { toast } from './ui.js';
import { t } from './i18n.js';

let deferredPrompt = null;
let registration = null;
const listeners = new Set();

export const isStandalone = () =>
  matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

/** 'installed' | 'ready' (le navigateur propose l'installation) | 'ios' (manuel) | 'unsupported' */
export function installState() {
  if (isStandalone()) return 'installed';
  if (deferredPrompt) return 'ready';
  if (isIOS()) return 'ios';
  return 'unsupported';
}

export function onInstallChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function promptInstall() {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  listeners.forEach((fn) => fn());
  if (outcome === 'accepted') toast(t('pwa.installed'));
  return outcome === 'accepted';
}

export const swRegistration = () => registration;

export function initPWA() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    listeners.forEach((fn) => fn());
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    listeners.forEach((fn) => fn());
  });

  let reloadWanted = false;
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    registration = reg;
    // Une nouvelle version est prête : on propose de recharger.
    const watch = (worker) => {
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          toast(t('pwa.update'), { timeout: 12000, action: { label: t('pwa.reload'), fn: () => { reloadWanted = true; worker.postMessage({ type: 'skip-waiting' }); } } });
        }
      });
    };
    watch(reg.installing);
    reg.addEventListener('updatefound', () => watch(reg.installing));
  }).catch((err) => console.warn('Service worker indisponible :', err));

  // On ne recharge que si l'utilisateur l'a demandé : au premier lancement ou
  // lors d'une activation en arrière-plan, la page continue sans interruption.
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloadWanted || reloading) return;
    reloading = true;
    location.reload();
  });

  // Hors ligne / de retour en ligne
  window.addEventListener('offline', () => toast(t('pwa.offline')));
  window.addEventListener('online', () => toast(t('pwa.online')));
}
