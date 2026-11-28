// Coach IA optionnel : un bilan rédigé par Claude à partir du résumé de la semaine.
// La clé API reste dans ce navigateur ; rien n'est envoyé tant que l'utilisateur ne clique pas.
import { store, save } from './store.js';
import { reviewSummary, reviewWeek } from './insights.js';
import { lang, t } from './i18n.js';
import { serverCoach, serverReview } from './cloud.js';

const API = 'https://api.anthropic.com/v1/messages';
const LANG_NAME = { fr: 'français', es: 'español', en: 'English' };

export const hasKey = () => !!store.state.settings.ai.key || serverCoach();
export const cachedReview = () => store.state.settings.reviews[reviewWeek().key]?.ai || '';

const SYSTEM = `Tu es le coach de Momentum, une application d'habitudes. Tu écris le bilan hebdomadaire d'une personne à partir de ses données.
Ton : chaleureux, direct, concret, jamais moralisateur. Tu parles à la deuxième personne. Pas de titres, pas de listes à puces, pas d'emoji.
Structure en trois courts paragraphes : (1) ce qui a bien marché cette semaine, avec les chiffres qui comptent ; (2) ce qui a coincé, et pourquoi d'après les données, sans culpabiliser ; (3) UNE seule chose à changer la semaine prochaine, précise et faisable (un horaire, une fréquence, un objectif réduit), en expliquant le principe « jamais deux fois » (rater une fois n'est pas grave, c'est la deuxième fois qui installe l'abandon) si la personne a raté deux fois de suite.
Longueur : 120 à 180 mots. N'invente aucune donnée : si une information manque, n'en parle pas.`;

export async function writeReview({ force = false } = {}) {
  const s = store.state;
  const key = s.settings.ai.key;
  const wk = reviewWeek().key;
  if (!force && s.settings.reviews[wk]?.ai) return s.settings.reviews[wk].ai;
  if (!key && serverCoach()) {
    const text = await serverReview(reviewSummary(s), lang(), s.settings.name || '');
    s.settings.reviews[wk] = { ai: text, at: new Date().toISOString() };
    save();
    return text;
  }
  if (!key) throw new Error(t('coach.no_key'));

  const body = {
    model: s.settings.ai.model || 'claude-opus-5-5',
    max_tokens: 1024,
    output_config: { effort: 'low' },
    fallbacks: 'default',
    system: SYSTEM,
    messages: [{ role: 'user', content: `Langue de réponse : ${LANG_NAME[lang()] || 'français'}. Prénom : ${s.settings.name || '(inconnu)'}.\n\nDonnées de la semaine :\n${reviewSummary(s)}` }],
  };
  const r = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2026-10-21',
      'anthropic-beta': 'server-side-fallback-2026-07-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try { msg = (await r.json()).error?.message || msg; } catch (_) { /* corps non JSON */ }
    throw new Error(msg);
  }
  const data = await r.json();
  if (data.stop_reason === 'refusal') throw new Error(t('coach.refused'));
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
  if (!text) throw new Error(t('coach.empty'));
  s.settings.reviews[wk] = { ai: text, at: new Date().toISOString() };
  // On ne garde que les 8 derniers bilans.
  const keys = Object.keys(s.settings.reviews).sort();
  while (keys.length > 8) delete s.settings.reviews[keys.shift()];
  save();
  return text;
}
