// Traductions : français (défaut), español, English.
// t('clé', { n: 3 }) remplace {n}. tn(n, 'clé') choisit clé_one / clé_other.

export const LANGS = [
  { id: 'en', label: 'English', locale: 'en-GB' },
  { id: 'fr', label: 'Français', locale: 'fr-FR' },
  { id: 'es', label: 'Español', locale: 'es-ES' },
];

const DICT = { fr: {}, es: {}, en: {} };
let current = 'en';
const listeners = new Set();

/** Langue par défaut : anglais. Changeable à tout moment dans les réglages (le choix est conservé). */
export function detectLang() {
  return 'en';
}

export const lang = () => current;
export const locale = () => LANGS.find((l) => l.id === current)?.locale || 'en-GB';

export function setLang(id) {
  if (!DICT[id]) id = 'en';
  if (id === current) return;
  current = id;
  document.documentElement.lang = id;
  listeners.forEach((fn) => fn(id));
}

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function t(key, vars) {
  let s = DICT[current][key] ?? DICT.en[key] ?? DICT.fr[key];
  if (s === undefined) {
    console.warn('Traduction manquante :', key);
    s = key;
  }
  if (vars) for (const k in vars) s = s.replaceAll(`{${k}}`, vars[k]);
  return s;
}

/** Pluriel simple : "1 habitude" / "3 habitudes". */
export const tn = (n, key) => t(n > 1 || (n === 0 && current !== 'fr') ? `${key}_other` : `${key}_one`, { n });

export function addTranslations(id, entries) {
  Object.assign(DICT[id], entries);
}

// ---------- Français ----------
addTranslations('fr', {
  'app.name': 'Momentum',
  'nav.today': "Aujourd'hui", 'nav.habits': 'Habitudes', 'nav.tasks': 'Tâches', 'nav.stats': 'Statistiques', 'nav.settings': 'Réglages',
  'common.cancel': 'Annuler', 'common.save': 'Enregistrer', 'common.delete': 'Supprimer', 'common.close': 'Fermer', 'common.undo': 'Annuler',
  'common.edit': 'Modifier', 'common.archive': 'Archiver', 'common.restore': 'Restaurer', 'common.all': 'Toutes', 'common.none': 'Aucun',
  'common.today': "Aujourd'hui", 'common.tomorrow': 'Demain', 'common.yesterday': 'Hier', 'common.optional': '(optionnel)',
  'common.search': 'Rechercher', 'common.copy': 'Copier', 'common.copied': 'Copié dans le presse-papiers', 'common.start': 'Démarrer', 'common.pause': 'Pause',
  'common.resume': 'Reprendre', 'common.stop': 'Arrêter', 'common.done': 'Terminé', 'common.days': 'jours', 'common.weeks': 'sem.', 'common.months': 'mois',
  'common.minutes': 'min', 'common.yes': 'Oui', 'common.no': 'Non', 'common.loading': 'Chargement…', 'common.more': 'Plus', 'common.less': 'Moins',

  'weekday.0': 'Lun', 'weekday.1': 'Mar', 'weekday.2': 'Mer', 'weekday.3': 'Jeu', 'weekday.4': 'Ven', 'weekday.5': 'Sam', 'weekday.6': 'Dim',
  'weekdayS.0': 'L', 'weekdayS.1': 'M', 'weekdayS.2': 'M', 'weekdayS.3': 'J', 'weekdayS.4': 'V', 'weekdayS.5': 'S', 'weekdayS.6': 'D',
  'weekdayL.0': 'lundi', 'weekdayL.1': 'mardi', 'weekdayL.2': 'mercredi', 'weekdayL.3': 'jeudi', 'weekdayL.4': 'vendredi', 'weekdayL.5': 'samedi', 'weekdayL.6': 'dimanche',

  'due.late': 'En retard de {n} j',

  // Aujourd'hui
  'today.title': "Aujourd'hui", 'today.nothing': "Rien de prévu aujourd'hui", 'today.complete': 'Journée complète',
  'today.left_one': '{n} habitude restante', 'today.left_other': '{n} habitudes restantes',
  'today.overdue_one': '{n} tâche en retard', 'today.overdue_other': '{n} tâches en retard',
  'today.task': 'Tâche', 'today.habit': 'Habitude', 'today.summary': 'Résumé du jour', 'today.progress': 'Progression du jour',
  'today.rate7': 'Réussite 7 jours', 'today.best_streak': 'Meilleure série', 'today.tasks_todo': 'Tâches à traiter', 'today.of_overdue': 'dont {n} en retard',
  'today.habits_of_day': 'Habitudes du jour', 'today.manage': 'Tout gérer', 'today.empty_text': 'Créez une habitude ou profitez de votre journée de repos.',
  'today.create_habit': 'Créer une habitude', 'today.not_planned': "Pas prévues aujourd'hui", 'today.paused': 'En pause',
  'today.priority_tasks': 'Tâches prioritaires', 'today.open_board': 'Ouvrir le tableau', 'today.no_urgent': 'Aucune tâche urgente',
  'today.no_urgent_text': 'Les tâches urgentes, en cours ou à échéance apparaissent ici.', 'today.new_task': 'Nouvelle tâche',
  'today.vacation': 'Mode vacances actif jusqu’au {date} : vos séries sont protégées.', 'today.vacation_end': 'Terminer les vacances',
  'today.morning': 'Matin', 'today.afternoon': 'Après-midi', 'today.evening': 'Soir', 'today.anytime': 'À tout moment',
  'today.install_banner': 'Installez Momentum sur votre écran d’accueil pour l’ouvrir en un geste, même hors ligne.', 'today.install': 'Installer',
  'today.later': 'Plus tard', 'today.skip': 'Passer aujourd’hui', 'today.unskip': 'Annuler le passage', 'today.skipped': 'Passée',
  'today.journal': 'Note du jour', 'today.timer': 'Minuteur',
  'today.segbar': '{done} sur {total} habitudes validées',

  // Habitudes (liste)
  'habits.active_one': '{n} habitude active', 'habits.active_other': '{n} habitudes actives',
  'habits.avg30': 'réussite moyenne sur 30 jours :', 'habits.new': 'Nouvelle habitude', 'habits.none': 'Aucune habitude',
  'habits.none_text': 'Créez votre première habitude : boire de l’eau, lire, faire du sport…',
  'habits.hint': 'Astuce : cliquez sur un jour pour le valider ou l’annuler. Les jours barrés ne sont pas prévus, les jours « ↷ » ont été passés.',
  'habits.archived': 'Archivées ({n})', 'habits.per_day': '/jour', 'habits.30d': '30 jours', 'habits.streak': 'série', 'habits.record': 'record',
  'habits.pause': 'Mettre en pause', 'habits.resume': 'Reprendre', 'habits.paused_since': 'En pause depuis le {date}',
  'habits.paused_toast': '« {name} » en pause. Ses séries sont protégées.', 'habits.resumed_toast': '« {name} » reprise',
  'habits.archived_toast': '« {name} » archivée', 'habits.deleted_toast': '« {name} » supprimée',
  'habits.days_without': 'jours sans', 'habits.quit_label': 'Tenu',
  'habits.check': 'Valider {name}', 'habits.add1': 'Ajouter 1', 'habits.remove1': 'Retirer 1', 'habits.streak_title': 'Série en cours',

  // Fréquences
  'sched.daily': 'Tous les jours', 'sched.weekdays': 'En semaine', 'sched.weekend': 'Le week-end', 'sched.weekly': '{n}× par semaine',
  'sched.monthly': '{n}× par mois', 'sched.interval': 'Tous les {n} jours', 'sched.interval1': 'Tous les jours',
  'streak.day_one': '{n} jour', 'streak.day_other': '{n} jours', 'streak.week_one': '{n} semaine', 'streak.week_other': '{n} semaines',
  'streak.month_one': '{n} mois', 'streak.month_other': '{n} mois',

  // Formulaire habitude
  'form.habit_edit': 'Modifier l’habitude', 'form.habit_new': 'Nouvelle habitude', 'form.templates': 'Modèles', 'form.templates_hint': 'Partez d’un modèle, puis ajustez.',
  'form.name': 'Nom', 'form.name_ph': 'Ex. Lire 20 pages', 'form.color': 'Couleur', 'form.category': 'Catégorie', 'form.category_ph': 'Santé, Esprit…',
  'form.kind': 'Type de suivi', 'form.kind_check': 'Fait / pas fait', 'form.kind_count': 'Objectif chiffré', 'form.kind_quit': 'Mauvaise habitude à arrêter',
  'form.kind_quit_hint': 'Chaque jour tenu compte. La série devient vos « jours sans ».',
  'form.target': 'Objectif par jour', 'form.unit': 'Unité', 'form.unit_ph': 'verres, pages, minutes…',
  'form.freq': 'Fréquence', 'form.freq_daily': 'Tous les jours', 'form.freq_days': 'Certains jours', 'form.freq_weekly': 'X fois / semaine',
  'form.freq_interval': 'Tous les X jours', 'form.freq_monthly': 'X fois / mois',
  'form.per_week': 'Nombre de fois par semaine', 'form.every': 'Tous les … jours', 'form.per_month': 'Nombre de fois par mois',
  'form.time': 'Heure prévue', 'form.reminders': 'Rappels', 'form.reminders_hint': 'Jusqu’à 3 heures de rappel. Activez les notifications dans les réglages.',
  'form.add_reminder': 'Ajouter un rappel', 'form.notes': 'Notes', 'form.notes_hint': '(pourquoi c’est important pour vous)',
  'form.err_name': 'Donnez un nom à votre habitude.', 'form.err_days': 'Choisissez au moins un jour.',
  'form.habit_updated': 'Habitude mise à jour', 'form.habit_created': 'Habitude créée',
  'form.cat_health': 'Santé', 'form.cat_mind': 'Esprit', 'form.cat_career': 'Carrière', 'form.cat_money': 'Finances', 'form.cat_social': 'Social',

  // Formulaire tâche
  'form.task_edit': 'Modifier la tâche', 'form.task_new': 'Nouvelle tâche', 'form.title': 'Titre', 'form.title_ph': 'Ex. Envoyer le devis au client',
  'form.desc': 'Description', 'form.desc_ph': 'Détails, liens, contexte…', 'form.priority': 'Priorité', 'form.due': 'Échéance', 'form.project': 'Projet',
  'form.project_ph': 'Freelance, Perso…', 'form.status': 'Statut', 'form.subtasks': 'Sous-tâches', 'form.sub_ph': 'Ajouter une étape puis Entrée',
  'form.add': 'Ajouter', 'form.sub_new': 'Nouvelle sous-tâche', 'form.sub_delete': 'Supprimer l’étape', 'form.err_title': 'Donnez un titre à la tâche.',
  'form.task_done': 'Tâche terminée, bravo !', 'form.task_updated': 'Tâche mise à jour', 'form.task_created': 'Tâche créée',
  'tasks.deleted_toast': '« {title} » supprimée',

  // Tâches
  'prio.0': 'Basse', 'prio.1': 'Moyenne', 'prio.2': 'Haute', 'prio.3': 'Urgente',
  'status.todo': 'À faire', 'status.doing': 'En cours', 'status.done': 'Terminé',
  'tasks.open_one': '{n} tâche ouverte', 'tasks.open_other': '{n} tâches ouvertes', 'tasks.overdue': '{n} en retard',
  'tasks.drag_hint': 'déplacez les cartes d’une colonne à l’autre', 'tasks.new': 'Nouvelle tâche', 'tasks.search_ph': 'Rechercher une tâche…',
  'tasks.all_prio': 'Toutes priorités', 'tasks.all_proj': 'Tous projets', 'tasks.sort_prio': 'Tri : priorité', 'tasks.sort_due': 'Tri : échéance',
  'tasks.sort_recent': 'Tri : plus récentes', 'tasks.drop_here': 'Glissez une tâche ici', 'tasks.add_in': 'Ajouter dans {col}',
  'tasks.prev_col': 'Colonne précédente', 'tasks.next_col': 'Colonne suivante', 'tasks.mark_done': 'Marquer comme terminée',
  'tasks.subtasks': '{done}/{total} sous-tâches', 'tasks.done_toast': 'Tâche terminée : {title}', 'tasks.filter_prio': 'Filtrer par priorité',
  'tasks.filter_proj': 'Filtrer par projet', 'tasks.sort': 'Trier',

  // Statistiques
  'stats.title': 'Statistiques', 'stats.lead': 'Vos tendances, vos records et votre progression.', 'stats.key': 'Chiffres clés',
  'stats.rate30': 'Réussite 30 jours', 'stats.all_habits': 'Toutes habitudes confondues', 'stats.checks': 'Validations', 'stats.xp_earned': '{n} XP gagnés',
  'stats.record': 'Record de série', 'stats.longest': 'Votre plus longue série', 'stats.tasks_done': 'Tâches terminées', 'stats.last7_level': '7 derniers jours · niveau {n}',
  'stats.last30': '30 derniers jours', 'stats.avg': 'moyenne {v}', 'stats.no_data': 'Pas encore de données.', 'stats.regularity': 'Régularité',
  'stats.weeks20': '20 dernières semaines', 'stats.year': '12 derniers mois', 'stats.show_year': 'Voir l’année', 'stats.show_20w': 'Voir 20 semaines',
  'stats.ranking': 'Classement des habitudes', 'stats.rank_sub': 'réussite sur 30 jours', 'stats.no_habit': 'Aucune habitude.', 'stats.tasks': 'Tâches',
  'stats.open': '{n} ouvertes', 'stats.badges': 'Badges', 'stats.unlocked': '{n} / {total} débloqués', 'stats.got': 'Obtenu', 'stats.locked': 'Verrouillé',
  'stats.chart_label': 'Taux de réussite des 30 derniers jours', 'stats.nothing_planned': 'rien de prévu', 'stats.less': 'Moins', 'stats.more': 'Plus',
  'stats.avg_title': 'Moyenne : {n} %', 'stats.export_csv': 'Exporter l’historique (.csv)',
  'stats.insights': 'Analyse de la semaine', 'stats.insights_sub': 'ce que vos données racontent',
  'stats.mood': 'Humeur moyenne', 'stats.mood_sub': '30 derniers jours', 'stats.journal_entries': '{n} notes',

  // Analyse
  'insight.none': 'Validez quelques habitudes pendant une semaine et l’analyse apparaîtra ici.',
  'insight.week_up': 'Cette semaine : {cur} % de réussite, en hausse de {d} points par rapport à la semaine dernière.',
  'insight.week_down': 'Cette semaine : {cur} % de réussite, en baisse de {d} points par rapport à la semaine dernière.',
  'insight.week_flat': 'Cette semaine : {cur} % de réussite, comme la semaine dernière.',
  'insight.weak_day': 'Votre point faible : le {day} ({rate} % de réussite sur 8 semaines). Prévoyez moins ce jour-là, ou un rappel.',
  'insight.strong_day': 'Votre meilleur jour : le {day} ({rate} %).',
  'insight.at_risk_one': '{names} : série de {n} en jeu, pas encore validée aujourd’hui.',
  'insight.at_risk_other': 'Séries en jeu aujourd’hui : {names}.',
  'insight.struggling': '« {name} » n’est tenue qu’à {rate} % sur 30 jours. Objectif trop ambitieux ? Réduisez-le ou passez à « X fois par semaine ».',
  'insight.improving': '« {name} » progresse : {prev} % → {cur} % sur les deux dernières semaines.',
  'insight.perfect': '{n} journées parfaites sur les 30 derniers jours.',
  'insight.mood': 'Les jours où tout est validé, votre humeur moyenne est de {good}/5 contre {bad}/5 sinon.',
  'insight.best_streak_now': 'Votre plus longue série en cours : « {name} », {n}.',

  // Badges
  'badge.first-habit': 'Premier pas', 'badge.first-habit.d': 'Créer une habitude',
  'badge.first-check': "C'est parti", 'badge.first-check.d': 'Première validation',
  'badge.streak-7': 'Semaine en feu', 'badge.streak-7.d': 'Série de 7 jours',
  'badge.streak-30': 'Inarrêtable', 'badge.streak-30.d': 'Série de 30 jours',
  'badge.checks-100': 'Centurion', 'badge.checks-100.d': '100 validations',
  'badge.perfect-day': 'Journée parfaite', 'badge.perfect-day.d': 'Tout valider en une journée',
  'badge.perfect-7': 'Perfectionniste', 'badge.perfect-7.d': '7 journées parfaites',
  'badge.tasks-10': 'Exécutant', 'badge.tasks-10.d': '10 tâches terminées',
  'badge.urgent': 'Pompier', 'badge.urgent.d': 'Terminer une tâche urgente',
  'badge.level-5': 'Niveau 5', 'badge.level-5.d': 'Atteindre le niveau 5',
  'badge.streak-100': 'Centenaire', 'badge.streak-100.d': 'Série de 100 jours',
  'badge.journal-7': 'Introspectif', 'badge.journal-7.d': '7 notes du jour',

  // Récompenses
  'reward.perfect': 'Journée complète. +25 XP', 'reward.badge': 'Badge débloqué : {name}', 'reward.level': 'Niveau {n} atteint',
  'level.title': 'Niveau {n}', 'level.xp': '{into} / {need} XP',

  // Réglages
  'settings.title': 'Réglages', 'settings.lead': 'Personnalisez Momentum et gérez vos données.',
  'settings.profile': 'Profil', 'settings.name': 'Votre prénom (pour l’accueil)', 'settings.name_ph': 'Ex. Ziad',
  'settings.level_line': 'Niveau {level} · {xp} XP au total · {n} journée(s) parfaite(s)',
  'settings.appearance': 'Apparence', 'settings.theme': 'Thème', 'settings.theme_auto': 'Automatique', 'settings.theme_dark': 'Sombre', 'settings.theme_light': 'Clair',
  'settings.lang': 'Langue', 'settings.motion': 'Fond animé', 'settings.motion_label': 'Champ de points animé en arrière-plan',
  'settings.motion_hint': 'Désactivez-le pour économiser la batterie. Il se met aussi en pause quand l’onglet est caché.',
  'settings.day': 'Journée', 'settings.day_start': 'Début de la journée', 'settings.day_start_hint': 'Les validations faites avant cette heure comptent pour la veille. Pratique pour les couche-tard.',
  'settings.midnight': 'Minuit', 'settings.hour': '{h} h',
  'settings.vacation': 'Mode vacances', 'settings.vacation_label': 'Suspendre toutes les habitudes', 'settings.vacation_until': 'Jusqu’au',
  'settings.vacation_hint': 'Les jours de vacances ne comptent ni comme réussis ni comme manqués : vos séries reprennent où elles étaient.',
  'settings.vacation_on': 'Mode vacances activé. Bon repos !', 'settings.vacation_off': 'Retour des vacances : les habitudes reprennent.',
  'settings.reminders': 'Rappels', 'settings.notify_label': 'Notifications de rappel', 'settings.notify_hint': 'Momentum vous prévient à l’heure de chaque rappel et, le soir, s’il reste des habitudes à valider. Fonctionne quand l’application (ou l’onglet) est ouverte ou installée.',
  'settings.notify_denied': 'Les notifications sont bloquées par le navigateur. Autorisez-les dans les paramètres du site.',
  'settings.notify_unsupported': 'Ce navigateur ne prend pas en charge les notifications.',
  'settings.recap': 'Rappel du soir', 'settings.recap_hint': 'Un seul rappel s’il reste des habitudes à valider.', 'settings.recap_off': 'Désactivé',
  'settings.test_notify': 'Tester', 'settings.notify_test_title': 'Momentum', 'settings.notify_test_body': 'Les rappels fonctionnent 👋',
  'settings.notify_on': 'Rappels activés', 'settings.notify_off': 'Rappels désactivés',
  'settings.install': 'Application', 'settings.install_btn': 'Installer sur cet appareil', 'settings.installed': 'Momentum est installé sur cet appareil. Il fonctionne hors ligne.',
  'settings.install_hint': 'Installez Momentum comme une application : icône sur l’écran d’accueil, plein écran, hors ligne.',
  'settings.install_ios': 'Sur iPhone / iPad : bouton Partager, puis « Sur l’écran d’accueil ».',
  'settings.install_unsupported': 'Ouvrez cette page dans Chrome, Edge ou Safari pour l’installer. Elle fonctionne déjà hors ligne.',
  'settings.data': 'Données', 'settings.data_hint': 'Tout est enregistré dans ce navigateur, sans compte ni serveur. Exportez régulièrement une sauvegarde.',
  'settings.export': 'Exporter (.json)', 'settings.import': 'Importer', 'settings.share': 'Partager la sauvegarde', 'settings.csv': 'Historique (.csv)',
  'settings.demo': 'Recharger la démo', 'settings.reset': 'Tout effacer',
  'settings.transfer': 'Transférer vers un autre appareil', 'settings.transfer_hint': 'Copiez ce code, envoyez-le-vous (message, e-mail) et collez-le dans Momentum sur l’autre appareil.',
  'settings.transfer_make': 'Générer un code', 'settings.transfer_paste': 'Coller un code reçu', 'settings.transfer_ph': 'Collez le code ici…', 'settings.transfer_apply': 'Importer ce code',
  'settings.transfer_bad': 'Code invalide ou incomplet.', 'settings.transfer_ok': 'Données importées depuis le code',
  'settings.snapshots': 'Sauvegardes automatiques', 'settings.snapshots_hint': 'Momentum garde une copie par jour (7 derniers jours) dans ce navigateur.',
  'settings.snapshot_restore': 'Restaurer', 'settings.snapshot_none': 'Aucune sauvegarde automatique pour le moment.',
  'settings.snapshot_confirm': 'Remplacer vos données actuelles par la sauvegarde du {date} ?', 'settings.snapshot_restored': 'Sauvegarde du {date} restaurée',
  'settings.snapshot_line': '{date} · {habits} habitudes · {tasks} tâches',
  'settings.sync': 'Synchronisation (GitHub Gist)', 'settings.sync_hint': 'Optionnel : synchronisez vos appareils via un gist privé sur votre compte GitHub. Créez un jeton avec la seule permission « gist » et collez-le ici. Il reste dans ce navigateur.',
  'settings.sync_token': 'Jeton GitHub', 'settings.sync_token_ph': 'ghp_…', 'settings.sync_auto': 'Synchroniser automatiquement', 'settings.sync_push': 'Envoyer', 'settings.sync_pull': 'Récupérer',
  'settings.sync_last': 'Dernière synchro : {date}', 'settings.sync_never': 'Jamais synchronisé', 'settings.sync_pushed': 'Données envoyées', 'settings.sync_pulled': 'Données récupérées',
  'settings.sync_same': 'Déjà à jour', 'settings.sync_error': 'Synchro impossible : {msg}', 'settings.sync_need_token': 'Ajoutez d’abord un jeton GitHub.',
  'settings.sync_conflict': 'Des données plus récentes existent en ligne. Récupérer les écrasera localement : continuer ?',
  'settings.shortcuts': 'Raccourcis clavier', 'settings.sc_palette': 'Palette de commandes', 'settings.sc_habit': 'Nouvelle habitude', 'settings.sc_task': 'Nouvelle tâche',
  'settings.sc_pages': 'Changer de page', 'settings.sc_close': 'Fermer une fenêtre', 'settings.sc_esc': 'Échap',
  'settings.about': 'À propos', 'settings.version': 'Version {v}', 'settings.about_text': 'Momentum est un projet open source de Ziad El Alami. Aucune donnée ne quitte votre appareil sans votre action.',
  'settings.demo_confirm': 'Remplacer vos données actuelles par la démo ?', 'settings.demo_loaded': 'Démo rechargée',
  'settings.reset_confirm': 'Effacer définitivement toutes vos habitudes et tâches ? Pensez à exporter une sauvegarde avant.',
  'settings.reset_done': 'Données effacées. Nouveau départ !', 'settings.exported': 'Sauvegarde exportée', 'settings.imported': 'Données importées',
  'settings.import_bad': 'Fichier invalide : choisissez un export de Momentum.', 'settings.csv_exported': 'Historique exporté',
  'settings.share_unsupported': 'Le partage n’est pas disponible ici : utilisez l’export.',

  // Palette
  'palette.ph': 'Tapez une commande, une habitude ou une tâche…', 'palette.goto': 'Aller à : {page}', 'palette.new_habit': 'Nouvelle habitude', 'palette.new_task': 'Nouvelle tâche',
  'palette.export': 'Exporter mes données', 'palette.motion_on': 'Activer le fond animé', 'palette.motion_off': 'Désactiver le fond animé',
  'palette.theme': 'Changer de thème', 'palette.timer': 'Minuteur de concentration (25 min)', 'palette.vacation_on': 'Activer le mode vacances', 'palette.vacation_off': 'Terminer le mode vacances',
  'palette.habit': 'Habitude', 'palette.task': 'Tâche', 'palette.task_done': 'Tâche terminée', 'palette.empty': 'Aucun résultat',
  'palette.nav': 'naviguer', 'palette.open': 'ouvrir', 'palette.close': 'fermer', 'palette.enter': 'Entrée',

  // Journal
  'journal.title': 'Note du jour', 'journal.mood': 'Humeur', 'journal.note': 'Note', 'journal.note_ph': 'Comment ça s’est passé ?',
  'journal.saved': 'Note enregistrée', 'journal.mood.1': 'Difficile', 'journal.mood.2': 'Bof', 'journal.mood.3': 'Correct', 'journal.mood.4': 'Bien', 'journal.mood.5': 'Excellent',

  // Minuteur
  'timer.title': 'Minuteur', 'timer.for': 'pour « {name} »', 'timer.duration': 'Durée (minutes)', 'timer.finished': 'Temps écoulé !',
  'timer.added': '{n} min ajoutées à « {name} »', 'timer.focus': 'Concentration', 'timer.running': 'Minuteur en cours : {t}', 'timer.add_done': 'Ajouter le temps écoulé',
  'timer.notify_body': 'Session terminée : {name}',

  // Rappels
  'remind.title': '{name}', 'remind.body': 'C’est l’heure ! Prévu à {time}.', 'remind.recap_title': 'Il reste {n} habitude(s) aujourd’hui',
  'remind.recap_body': '{names}', 'remind.recap_one': 'Il reste une habitude aujourd’hui',

  // PWA
  'pwa.installed': 'Momentum est installé. Retrouvez-le sur votre écran d’accueil.', 'pwa.update': 'Une nouvelle version de Momentum est prête.',
  'pwa.reload': 'Recharger', 'pwa.offline': 'Vous êtes hors ligne : tout continue de fonctionner, les données restent sur l’appareil.', 'pwa.online': 'De retour en ligne',

  // Modèles d'habitudes

  // Catégories de la démo / modèles
  'cat.health': 'Santé', 'cat.mind': 'Esprit', 'cat.career': 'Carrière', 'cat.money': 'Finances', 'cat.social': 'Social',
});

addTranslations('fr', {
  'demo.water': "Boire de l'eau", 'demo.meditate': 'Méditation 10 min', 'demo.sport': 'Séance de sport', 'demo.read': 'Lecture 20 pages', 'demo.nosugar': 'Pas de sucre ajouté',
  'demo.journal_note': 'Chapitre 4 terminé, super moment.',
  'demo.t1': 'Mettre en ligne le portfolio GitHub', 'demo.t1_notes': 'Mettre en avant 3 projets avec captures et démos en ligne.',
  'demo.t1_s1': 'Choisir les 3 meilleurs projets', 'demo.t1_s2': 'Écrire des README clairs', 'demo.t1_s3': 'Activer GitHub Pages', 'demo.t1_s4': 'Partager sur LinkedIn',
  'demo.t2': 'Relancer le client du salon', 'demo.t2_notes': 'Envoyer le devis mis à jour et la nouvelle maquette.',
  'demo.t3': 'Préparer la réunion client', 'demo.t3_s1': 'Ordre du jour', 'demo.t3_s2': 'Chiffres du mois', 'demo.t3_s3': 'Démo de la maquette',
  'demo.t4': 'Suivre le tutoriel Three.js', 'demo.t5': 'Optimiser les images du site', 'demo.t6': 'Mettre à jour le CV', 'demo.t7': 'Facturer le projet restaurant', 'demo.t8': 'Faire les courses',
  'demo.proj_freelance': 'Freelance', 'demo.proj_learning': 'Apprentissage', 'demo.proj_perso': 'Perso',
});

// ---------- Español ----------
addTranslations('es', {
  'app.name': 'Momentum',
  'nav.today': 'Hoy', 'nav.habits': 'Hábitos', 'nav.tasks': 'Tareas', 'nav.stats': 'Estadísticas', 'nav.settings': 'Ajustes',
  'common.cancel': 'Cancelar', 'common.save': 'Guardar', 'common.delete': 'Eliminar', 'common.close': 'Cerrar', 'common.undo': 'Deshacer',
  'common.edit': 'Editar', 'common.archive': 'Archivar', 'common.restore': 'Restaurar', 'common.all': 'Todas', 'common.none': 'Ninguno',
  'common.today': 'Hoy', 'common.tomorrow': 'Mañana', 'common.yesterday': 'Ayer', 'common.optional': '(opcional)',
  'common.search': 'Buscar', 'common.copy': 'Copiar', 'common.copied': 'Copiado al portapapeles', 'common.start': 'Iniciar', 'common.pause': 'Pausa',
  'common.resume': 'Reanudar', 'common.stop': 'Detener', 'common.done': 'Hecho', 'common.days': 'días', 'common.weeks': 'sem.', 'common.months': 'meses',
  'common.minutes': 'min', 'common.yes': 'Sí', 'common.no': 'No', 'common.loading': 'Cargando…', 'common.more': 'Más', 'common.less': 'Menos',

  'weekday.0': 'Lun', 'weekday.1': 'Mar', 'weekday.2': 'Mié', 'weekday.3': 'Jue', 'weekday.4': 'Vie', 'weekday.5': 'Sáb', 'weekday.6': 'Dom',
  'weekdayS.0': 'L', 'weekdayS.1': 'M', 'weekdayS.2': 'X', 'weekdayS.3': 'J', 'weekdayS.4': 'V', 'weekdayS.5': 'S', 'weekdayS.6': 'D',
  'weekdayL.0': 'lunes', 'weekdayL.1': 'martes', 'weekdayL.2': 'miércoles', 'weekdayL.3': 'jueves', 'weekdayL.4': 'viernes', 'weekdayL.5': 'sábado', 'weekdayL.6': 'domingo',

  'due.late': '{n} d de retraso',

  'today.title': 'Hoy', 'today.nothing': 'Nada previsto para hoy', 'today.complete': 'Día completo',
  'today.left_one': 'Queda {n} hábito', 'today.left_other': 'Quedan {n} hábitos',
  'today.overdue_one': '{n} tarea atrasada', 'today.overdue_other': '{n} tareas atrasadas',
  'today.task': 'Tarea', 'today.habit': 'Hábito', 'today.summary': 'Resumen del día', 'today.progress': 'Progreso del día',
  'today.rate7': 'Éxito 7 días', 'today.best_streak': 'Mejor racha', 'today.tasks_todo': 'Tareas pendientes', 'today.of_overdue': '{n} atrasadas',
  'today.habits_of_day': 'Hábitos de hoy', 'today.manage': 'Gestionar', 'today.empty_text': 'Crea un hábito o disfruta de tu día de descanso.',
  'today.create_habit': 'Crear un hábito', 'today.not_planned': 'No previstos hoy', 'today.paused': 'En pausa',
  'today.priority_tasks': 'Tareas prioritarias', 'today.open_board': 'Abrir el tablero', 'today.no_urgent': 'Ninguna tarea urgente',
  'today.no_urgent_text': 'Las tareas urgentes, en curso o con fecha aparecen aquí.', 'today.new_task': 'Nueva tarea',
  'today.vacation': 'Modo vacaciones activo hasta el {date}: tus rachas están protegidas.', 'today.vacation_end': 'Terminar vacaciones',
  'today.morning': 'Mañana', 'today.afternoon': 'Tarde', 'today.evening': 'Noche', 'today.anytime': 'En cualquier momento',
  'today.install_banner': 'Instala Momentum en tu pantalla de inicio para abrirlo con un gesto, incluso sin conexión.', 'today.install': 'Instalar',
  'today.later': 'Más tarde', 'today.skip': 'Saltar hoy', 'today.unskip': 'Anular el salto', 'today.skipped': 'Saltado',
  'today.journal': 'Nota del día', 'today.timer': 'Temporizador',
  'today.segbar': '{done} de {total} hábitos completados',

  'habits.active_one': '{n} hábito activo', 'habits.active_other': '{n} hábitos activos',
  'habits.avg30': 'éxito medio en 30 días:', 'habits.new': 'Nuevo hábito', 'habits.none': 'Ningún hábito',
  'habits.none_text': 'Crea tu primer hábito: beber agua, leer, hacer deporte…',
  'habits.hint': 'Consejo: haz clic en un día para marcarlo o desmarcarlo. Los días tachados no están previstos; los días «↷» se saltaron.',
  'habits.archived': 'Archivados ({n})', 'habits.per_day': '/día', 'habits.30d': '30 días', 'habits.streak': 'racha', 'habits.record': 'récord',
  'habits.pause': 'Poner en pausa', 'habits.resume': 'Reanudar', 'habits.paused_since': 'En pausa desde el {date}',
  'habits.paused_toast': '«{name}» en pausa. Sus rachas están protegidas.', 'habits.resumed_toast': '«{name}» reanudado',
  'habits.archived_toast': '«{name}» archivado', 'habits.deleted_toast': '«{name}» eliminado',
  'habits.days_without': 'días sin', 'habits.quit_label': 'Cumplido',
  'habits.check': 'Marcar {name}', 'habits.add1': 'Añadir 1', 'habits.remove1': 'Quitar 1', 'habits.streak_title': 'Racha actual',

  'sched.daily': 'Todos los días', 'sched.weekdays': 'Entre semana', 'sched.weekend': 'Fin de semana', 'sched.weekly': '{n}× por semana',
  'sched.monthly': '{n}× al mes', 'sched.interval': 'Cada {n} días', 'sched.interval1': 'Todos los días',
  'streak.day_one': '{n} día', 'streak.day_other': '{n} días', 'streak.week_one': '{n} semana', 'streak.week_other': '{n} semanas',
  'streak.month_one': '{n} mes', 'streak.month_other': '{n} meses',

  'form.habit_edit': 'Editar el hábito', 'form.habit_new': 'Nuevo hábito', 'form.templates': 'Plantillas', 'form.templates_hint': 'Parte de una plantilla y ajústala.',
  'form.name': 'Nombre', 'form.name_ph': 'Ej. Leer 20 páginas', 'form.color': 'Color', 'form.category': 'Categoría', 'form.category_ph': 'Salud, Mente…',
  'form.kind': 'Tipo de seguimiento', 'form.kind_check': 'Hecho / no hecho', 'form.kind_count': 'Objetivo numérico', 'form.kind_quit': 'Mal hábito que dejar',
  'form.kind_quit_hint': 'Cada día cumplido cuenta. La racha se convierte en tus «días sin».',
  'form.target': 'Objetivo por día', 'form.unit': 'Unidad', 'form.unit_ph': 'vasos, páginas, minutos…',
  'form.freq': 'Frecuencia', 'form.freq_daily': 'Todos los días', 'form.freq_days': 'Ciertos días', 'form.freq_weekly': 'X veces / semana',
  'form.freq_interval': 'Cada X días', 'form.freq_monthly': 'X veces / mes',
  'form.per_week': 'Veces por semana', 'form.every': 'Cada … días', 'form.per_month': 'Veces al mes',
  'form.time': 'Hora prevista', 'form.reminders': 'Recordatorios', 'form.reminders_hint': 'Hasta 3 horas de recordatorio. Activa las notificaciones en los ajustes.',
  'form.add_reminder': 'Añadir recordatorio', 'form.notes': 'Notas', 'form.notes_hint': '(por qué es importante para ti)',
  'form.err_name': 'Ponle un nombre a tu hábito.', 'form.err_days': 'Elige al menos un día.',
  'form.habit_updated': 'Hábito actualizado', 'form.habit_created': 'Hábito creado',
  'form.cat_health': 'Salud', 'form.cat_mind': 'Mente', 'form.cat_career': 'Carrera', 'form.cat_money': 'Finanzas', 'form.cat_social': 'Social',

  'form.task_edit': 'Editar la tarea', 'form.task_new': 'Nueva tarea', 'form.title': 'Título', 'form.title_ph': 'Ej. Enviar el presupuesto al cliente',
  'form.desc': 'Descripción', 'form.desc_ph': 'Detalles, enlaces, contexto…', 'form.priority': 'Prioridad', 'form.due': 'Fecha límite', 'form.project': 'Proyecto',
  'form.project_ph': 'Freelance, Personal…', 'form.status': 'Estado', 'form.subtasks': 'Subtareas', 'form.sub_ph': 'Añade un paso y pulsa Intro',
  'form.add': 'Añadir', 'form.sub_new': 'Nueva subtarea', 'form.sub_delete': 'Eliminar el paso', 'form.err_title': 'Ponle un título a la tarea.',
  'form.task_done': 'Tarea terminada, ¡bravo!', 'form.task_updated': 'Tarea actualizada', 'form.task_created': 'Tarea creada',
  'tasks.deleted_toast': '«{title}» eliminada',

  'prio.0': 'Baja', 'prio.1': 'Media', 'prio.2': 'Alta', 'prio.3': 'Urgente',
  'status.todo': 'Por hacer', 'status.doing': 'En curso', 'status.done': 'Hecho',
  'tasks.open_one': '{n} tarea abierta', 'tasks.open_other': '{n} tareas abiertas', 'tasks.overdue': '{n} atrasadas',
  'tasks.drag_hint': 'arrastra las tarjetas de una columna a otra', 'tasks.new': 'Nueva tarea', 'tasks.search_ph': 'Buscar una tarea…',
  'tasks.all_prio': 'Todas las prioridades', 'tasks.all_proj': 'Todos los proyectos', 'tasks.sort_prio': 'Orden: prioridad', 'tasks.sort_due': 'Orden: fecha',
  'tasks.sort_recent': 'Orden: más recientes', 'tasks.drop_here': 'Suelta una tarea aquí', 'tasks.add_in': 'Añadir en {col}',
  'tasks.prev_col': 'Columna anterior', 'tasks.next_col': 'Columna siguiente', 'tasks.mark_done': 'Marcar como hecha',
  'tasks.subtasks': '{done}/{total} subtareas', 'tasks.done_toast': 'Tarea terminada: {title}', 'tasks.filter_prio': 'Filtrar por prioridad',
  'tasks.filter_proj': 'Filtrar por proyecto', 'tasks.sort': 'Ordenar',

  'stats.title': 'Estadísticas', 'stats.lead': 'Tus tendencias, tus récords y tu progreso.', 'stats.key': 'Cifras clave',
  'stats.rate30': 'Éxito 30 días', 'stats.all_habits': 'Todos los hábitos', 'stats.checks': 'Marcas', 'stats.xp_earned': '{n} XP ganados',
  'stats.record': 'Récord de racha', 'stats.longest': 'Tu racha más larga', 'stats.tasks_done': 'Tareas terminadas', 'stats.last7_level': 'últimos 7 días · nivel {n}',
  'stats.last30': 'Últimos 30 días', 'stats.avg': 'media {v}', 'stats.no_data': 'Todavía no hay datos.', 'stats.regularity': 'Regularidad',
  'stats.weeks20': 'últimas 20 semanas', 'stats.year': 'últimos 12 meses', 'stats.show_year': 'Ver el año', 'stats.show_20w': 'Ver 20 semanas',
  'stats.ranking': 'Ranking de hábitos', 'stats.rank_sub': 'éxito en 30 días', 'stats.no_habit': 'Ningún hábito.', 'stats.tasks': 'Tareas',
  'stats.open': '{n} abiertas', 'stats.badges': 'Insignias', 'stats.unlocked': '{n} / {total} desbloqueadas', 'stats.got': 'Conseguida', 'stats.locked': 'Bloqueada',
  'stats.chart_label': 'Tasa de éxito de los últimos 30 días', 'stats.nothing_planned': 'nada previsto', 'stats.less': 'Menos', 'stats.more': 'Más',
  'stats.avg_title': 'Media: {n} %', 'stats.export_csv': 'Exportar historial (.csv)',
  'stats.insights': 'Análisis de la semana', 'stats.insights_sub': 'lo que cuentan tus datos',
  'stats.mood': 'Ánimo medio', 'stats.mood_sub': 'últimos 30 días', 'stats.journal_entries': '{n} notas',

  'insight.none': 'Completa algunos hábitos durante una semana y el análisis aparecerá aquí.',
  'insight.week_up': 'Esta semana: {cur} % de éxito, {d} puntos más que la semana pasada.',
  'insight.week_down': 'Esta semana: {cur} % de éxito, {d} puntos menos que la semana pasada.',
  'insight.week_flat': 'Esta semana: {cur} % de éxito, igual que la semana pasada.',
  'insight.weak_day': 'Tu punto débil: el {day} ({rate} % de éxito en 8 semanas). Planifica menos ese día o pon un recordatorio.',
  'insight.strong_day': 'Tu mejor día: el {day} ({rate} %).',
  'insight.at_risk_one': '{names}: racha de {n} en juego, todavía sin marcar hoy.',
  'insight.at_risk_other': 'Rachas en juego hoy: {names}.',
  'insight.struggling': '«{name}» solo se cumple al {rate} % en 30 días. ¿Objetivo demasiado ambicioso? Redúcelo o pásalo a «X veces por semana».',
  'insight.improving': '«{name}» mejora: {prev} % → {cur} % en las dos últimas semanas.',
  'insight.perfect': '{n} días perfectos en los últimos 30 días.',
  'insight.mood': 'Los días en que completas todo, tu ánimo medio es {good}/5 frente a {bad}/5 el resto.',
  'insight.best_streak_now': 'Tu racha actual más larga: «{name}», {n}.',

  'badge.first-habit': 'Primer paso', 'badge.first-habit.d': 'Crear un hábito',
  'badge.first-check': 'Allá vamos', 'badge.first-check.d': 'Primera marca',
  'badge.streak-7': 'Semana en llamas', 'badge.streak-7.d': 'Racha de 7 días',
  'badge.streak-30': 'Imparable', 'badge.streak-30.d': 'Racha de 30 días',
  'badge.checks-100': 'Centurión', 'badge.checks-100.d': '100 marcas',
  'badge.perfect-day': 'Día perfecto', 'badge.perfect-day.d': 'Completar todo en un día',
  'badge.perfect-7': 'Perfeccionista', 'badge.perfect-7.d': '7 días perfectos',
  'badge.tasks-10': 'Ejecutor', 'badge.tasks-10.d': '10 tareas terminadas',
  'badge.urgent': 'Bombero', 'badge.urgent.d': 'Terminar una tarea urgente',
  'badge.level-5': 'Nivel 5', 'badge.level-5.d': 'Alcanzar el nivel 5',
  'badge.streak-100': 'Centenario', 'badge.streak-100.d': 'Racha de 100 días',
  'badge.journal-7': 'Introspectivo', 'badge.journal-7.d': '7 notas del día',

  'reward.perfect': 'Día completo. +25 XP', 'reward.badge': 'Insignia desbloqueada: {name}', 'reward.level': 'Nivel {n} alcanzado',
  'level.title': 'Nivel {n}', 'level.xp': '{into} / {need} XP',

  'settings.title': 'Ajustes', 'settings.lead': 'Personaliza Momentum y gestiona tus datos.',
  'settings.profile': 'Perfil', 'settings.name': 'Tu nombre (para el saludo)', 'settings.name_ph': 'Ej. Ziad',
  'settings.level_line': 'Nivel {level} · {xp} XP en total · {n} día(s) perfecto(s)',
  'settings.appearance': 'Apariencia', 'settings.theme': 'Tema', 'settings.theme_auto': 'Automático', 'settings.theme_dark': 'Oscuro', 'settings.theme_light': 'Claro',
  'settings.lang': 'Idioma', 'settings.motion': 'Fondo animado', 'settings.motion_label': 'Campo de puntos animado de fondo',
  'settings.motion_hint': 'Desactívalo para ahorrar batería. También se pausa cuando la pestaña está oculta.',
  'settings.day': 'Jornada', 'settings.day_start': 'Inicio del día', 'settings.day_start_hint': 'Las marcas hechas antes de esta hora cuentan para el día anterior. Práctico para los noctámbulos.',
  'settings.midnight': 'Medianoche', 'settings.hour': '{h} h',
  'settings.vacation': 'Modo vacaciones', 'settings.vacation_label': 'Suspender todos los hábitos', 'settings.vacation_until': 'Hasta el',
  'settings.vacation_hint': 'Los días de vacaciones no cuentan ni como cumplidos ni como fallados: tus rachas continúan donde estaban.',
  'settings.vacation_on': 'Modo vacaciones activado. ¡Buen descanso!', 'settings.vacation_off': 'Vuelta de vacaciones: los hábitos se reanudan.',
  'settings.reminders': 'Recordatorios', 'settings.notify_label': 'Notificaciones de recordatorio', 'settings.notify_hint': 'Momentum te avisa a la hora de cada recordatorio y, por la noche, si quedan hábitos por completar. Funciona cuando la aplicación (o la pestaña) está abierta o instalada.',
  'settings.notify_denied': 'El navegador bloquea las notificaciones. Permítelas en los ajustes del sitio.',
  'settings.notify_unsupported': 'Este navegador no admite notificaciones.',
  'settings.recap': 'Recordatorio nocturno', 'settings.recap_hint': 'Un único aviso si quedan hábitos por completar.', 'settings.recap_off': 'Desactivado',
  'settings.test_notify': 'Probar', 'settings.notify_test_title': 'Momentum', 'settings.notify_test_body': 'Los recordatorios funcionan 👋',
  'settings.notify_on': 'Recordatorios activados', 'settings.notify_off': 'Recordatorios desactivados',
  'settings.install': 'Aplicación', 'settings.install_btn': 'Instalar en este dispositivo', 'settings.installed': 'Momentum está instalado en este dispositivo. Funciona sin conexión.',
  'settings.install_hint': 'Instala Momentum como una aplicación: icono en la pantalla de inicio, pantalla completa, sin conexión.',
  'settings.install_ios': 'En iPhone / iPad: botón Compartir y luego «Añadir a pantalla de inicio».',
  'settings.install_unsupported': 'Abre esta página en Chrome, Edge o Safari para instalarla. Ya funciona sin conexión.',
  'settings.data': 'Datos', 'settings.data_hint': 'Todo se guarda en este navegador, sin cuenta ni servidor. Exporta una copia con regularidad.',
  'settings.export': 'Exportar (.json)', 'settings.import': 'Importar', 'settings.share': 'Compartir la copia', 'settings.csv': 'Historial (.csv)',
  'settings.demo': 'Recargar la demo', 'settings.reset': 'Borrar todo',
  'settings.transfer': 'Transferir a otro dispositivo', 'settings.transfer_hint': 'Copia este código, envíatelo (mensaje, correo) y pégalo en Momentum en el otro dispositivo.',
  'settings.transfer_make': 'Generar un código', 'settings.transfer_paste': 'Pegar un código recibido', 'settings.transfer_ph': 'Pega el código aquí…', 'settings.transfer_apply': 'Importar este código',
  'settings.transfer_bad': 'Código no válido o incompleto.', 'settings.transfer_ok': 'Datos importados desde el código',
  'settings.snapshots': 'Copias automáticas', 'settings.snapshots_hint': 'Momentum guarda una copia por día (últimos 7 días) en este navegador.',
  'settings.snapshot_restore': 'Restaurar', 'settings.snapshot_none': 'Todavía no hay copias automáticas.',
  'settings.snapshot_confirm': '¿Sustituir tus datos actuales por la copia del {date}?', 'settings.snapshot_restored': 'Copia del {date} restaurada',
  'settings.snapshot_line': '{date} · {habits} hábitos · {tasks} tareas',
  'settings.sync': 'Sincronización (GitHub Gist)', 'settings.sync_hint': 'Opcional: sincroniza tus dispositivos mediante un gist privado en tu cuenta de GitHub. Crea un token con el único permiso «gist» y pégalo aquí. Se queda en este navegador.',
  'settings.sync_token': 'Token de GitHub', 'settings.sync_token_ph': 'ghp_…', 'settings.sync_auto': 'Sincronizar automáticamente', 'settings.sync_push': 'Enviar', 'settings.sync_pull': 'Recuperar',
  'settings.sync_last': 'Última sincronización: {date}', 'settings.sync_never': 'Nunca sincronizado', 'settings.sync_pushed': 'Datos enviados', 'settings.sync_pulled': 'Datos recuperados',
  'settings.sync_same': 'Ya está al día', 'settings.sync_error': 'No se pudo sincronizar: {msg}', 'settings.sync_need_token': 'Añade primero un token de GitHub.',
  'settings.sync_conflict': 'Hay datos más recientes en línea. Recuperarlos sobrescribirá los locales: ¿continuar?',
  'settings.shortcuts': 'Atajos de teclado', 'settings.sc_palette': 'Paleta de comandos', 'settings.sc_habit': 'Nuevo hábito', 'settings.sc_task': 'Nueva tarea',
  'settings.sc_pages': 'Cambiar de página', 'settings.sc_close': 'Cerrar una ventana', 'settings.sc_esc': 'Esc',
  'settings.about': 'Acerca de', 'settings.version': 'Versión {v}', 'settings.about_text': 'Momentum es un proyecto de código abierto de Ziad El Alami. Ningún dato sale de tu dispositivo sin tu acción.',
  'settings.demo_confirm': '¿Sustituir tus datos actuales por la demo?', 'settings.demo_loaded': 'Demo recargada',
  'settings.reset_confirm': '¿Borrar definitivamente todos tus hábitos y tareas? Exporta una copia antes.',
  'settings.reset_done': 'Datos borrados. ¡Nuevo comienzo!', 'settings.exported': 'Copia exportada', 'settings.imported': 'Datos importados',
  'settings.import_bad': 'Archivo no válido: elige una exportación de Momentum.', 'settings.csv_exported': 'Historial exportado',
  'settings.share_unsupported': 'Compartir no está disponible aquí: usa la exportación.',

  'palette.ph': 'Escribe un comando, un hábito o una tarea…', 'palette.goto': 'Ir a: {page}', 'palette.new_habit': 'Nuevo hábito', 'palette.new_task': 'Nueva tarea',
  'palette.export': 'Exportar mis datos', 'palette.motion_on': 'Activar el fondo animado', 'palette.motion_off': 'Desactivar el fondo animado',
  'palette.theme': 'Cambiar de tema', 'palette.timer': 'Temporizador de concentración (25 min)', 'palette.vacation_on': 'Activar el modo vacaciones', 'palette.vacation_off': 'Terminar el modo vacaciones',
  'palette.habit': 'Hábito', 'palette.task': 'Tarea', 'palette.task_done': 'Tarea terminada', 'palette.empty': 'Sin resultados',
  'palette.nav': 'navegar', 'palette.open': 'abrir', 'palette.close': 'cerrar', 'palette.enter': 'Intro',

  'journal.title': 'Nota del día', 'journal.mood': 'Ánimo', 'journal.note': 'Nota', 'journal.note_ph': '¿Cómo ha ido?',
  'journal.saved': 'Nota guardada', 'journal.mood.1': 'Difícil', 'journal.mood.2': 'Regular', 'journal.mood.3': 'Normal', 'journal.mood.4': 'Bien', 'journal.mood.5': 'Excelente',

  'timer.title': 'Temporizador', 'timer.for': 'para «{name}»', 'timer.duration': 'Duración (minutos)', 'timer.finished': '¡Tiempo terminado!',
  'timer.added': '{n} min añadidos a «{name}»', 'timer.focus': 'Concentración', 'timer.running': 'Temporizador en marcha: {t}', 'timer.add_done': 'Añadir el tiempo transcurrido',
  'timer.notify_body': 'Sesión terminada: {name}',

  'remind.title': '{name}', 'remind.body': '¡Es la hora! Previsto a las {time}.', 'remind.recap_title': 'Quedan {n} hábitos hoy',
  'remind.recap_body': '{names}', 'remind.recap_one': 'Queda un hábito hoy',

  'pwa.installed': 'Momentum está instalado. Lo encontrarás en tu pantalla de inicio.', 'pwa.update': 'Hay una nueva versión de Momentum lista.',
  'pwa.reload': 'Recargar', 'pwa.offline': 'Sin conexión: todo sigue funcionando y los datos se quedan en el dispositivo.', 'pwa.online': 'De nuevo en línea',

  'cat.health': 'Salud', 'cat.mind': 'Mente', 'cat.career': 'Carrera', 'cat.money': 'Finanzas', 'cat.social': 'Social',

  'demo.water': 'Beber agua', 'demo.meditate': 'Meditación 10 min', 'demo.sport': 'Sesión de deporte', 'demo.read': 'Lectura 20 páginas', 'demo.nosugar': 'Sin azúcar añadido',
  'demo.journal_note': 'Capítulo 4 terminado, gran momento.',
  'demo.t1': 'Publicar el portfolio en GitHub', 'demo.t1_notes': 'Destacar 3 proyectos con capturas y demos en línea.',
  'demo.t1_s1': 'Elegir los 3 mejores proyectos', 'demo.t1_s2': 'Escribir README claros', 'demo.t1_s3': 'Activar GitHub Pages', 'demo.t1_s4': 'Compartir en LinkedIn',
  'demo.t2': 'Volver a contactar al cliente del salón', 'demo.t2_notes': 'Enviar el presupuesto actualizado y la nueva maqueta.',
  'demo.t3': 'Preparar la reunión con el cliente', 'demo.t3_s1': 'Orden del día', 'demo.t3_s2': 'Cifras del mes', 'demo.t3_s3': 'Demo de la maqueta',
  'demo.t4': 'Seguir el tutorial de Three.js', 'demo.t5': 'Optimizar las imágenes del sitio', 'demo.t6': 'Actualizar el CV', 'demo.t7': 'Facturar el proyecto del restaurante', 'demo.t8': 'Hacer la compra',
  'demo.proj_freelance': 'Freelance', 'demo.proj_learning': 'Aprendizaje', 'demo.proj_perso': 'Personal',
});

// ---------- English ----------
addTranslations('en', {
  'app.name': 'Momentum',
  'nav.today': 'Today', 'nav.habits': 'Habits', 'nav.tasks': 'Tasks', 'nav.stats': 'Statistics', 'nav.settings': 'Settings',
  'common.cancel': 'Cancel', 'common.save': 'Save', 'common.delete': 'Delete', 'common.close': 'Close', 'common.undo': 'Undo',
  'common.edit': 'Edit', 'common.archive': 'Archive', 'common.restore': 'Restore', 'common.all': 'All', 'common.none': 'None',
  'common.today': 'Today', 'common.tomorrow': 'Tomorrow', 'common.yesterday': 'Yesterday', 'common.optional': '(optional)',
  'common.search': 'Search', 'common.copy': 'Copy', 'common.copied': 'Copied to clipboard', 'common.start': 'Start', 'common.pause': 'Pause',
  'common.resume': 'Resume', 'common.stop': 'Stop', 'common.done': 'Done', 'common.days': 'days', 'common.weeks': 'wk', 'common.months': 'mo',
  'common.minutes': 'min', 'common.yes': 'Yes', 'common.no': 'No', 'common.loading': 'Loading…', 'common.more': 'More', 'common.less': 'Less',

  'weekday.0': 'Mon', 'weekday.1': 'Tue', 'weekday.2': 'Wed', 'weekday.3': 'Thu', 'weekday.4': 'Fri', 'weekday.5': 'Sat', 'weekday.6': 'Sun',
  'weekdayS.0': 'M', 'weekdayS.1': 'T', 'weekdayS.2': 'W', 'weekdayS.3': 'T', 'weekdayS.4': 'F', 'weekdayS.5': 'S', 'weekdayS.6': 'S',
  'weekdayL.0': 'Monday', 'weekdayL.1': 'Tuesday', 'weekdayL.2': 'Wednesday', 'weekdayL.3': 'Thursday', 'weekdayL.4': 'Friday', 'weekdayL.5': 'Saturday', 'weekdayL.6': 'Sunday',

  'due.late': '{n} d overdue',

  'today.title': 'Today', 'today.nothing': 'Nothing planned today', 'today.complete': 'Day complete',
  'today.left_one': '{n} habit left', 'today.left_other': '{n} habits left',
  'today.overdue_one': '{n} overdue task', 'today.overdue_other': '{n} overdue tasks',
  'today.task': 'Task', 'today.habit': 'Habit', 'today.summary': 'Daily summary', 'today.progress': "Today's progress",
  'today.rate7': '7-day success', 'today.best_streak': 'Best streak', 'today.tasks_todo': 'Tasks to handle', 'today.of_overdue': '{n} overdue',
  'today.habits_of_day': "Today's habits", 'today.manage': 'Manage all', 'today.empty_text': 'Create a habit or enjoy your day off.',
  'today.create_habit': 'Create a habit', 'today.not_planned': 'Not planned today', 'today.paused': 'Paused',
  'today.priority_tasks': 'Priority tasks', 'today.open_board': 'Open the board', 'today.no_urgent': 'No urgent task',
  'today.no_urgent_text': 'Urgent, in-progress and due tasks show up here.', 'today.new_task': 'New task',
  'today.vacation': 'Vacation mode on until {date}: your streaks are protected.', 'today.vacation_end': 'End vacation',
  'today.morning': 'Morning', 'today.afternoon': 'Afternoon', 'today.evening': 'Evening', 'today.anytime': 'Anytime',
  'today.install_banner': 'Install Momentum on your home screen to open it in one tap, even offline.', 'today.install': 'Install',
  'today.later': 'Later', 'today.skip': 'Skip today', 'today.unskip': 'Undo skip', 'today.skipped': 'Skipped',
  'today.journal': 'Daily note', 'today.timer': 'Timer',
  'today.segbar': '{done} of {total} habits done',

  'habits.active_one': '{n} active habit', 'habits.active_other': '{n} active habits',
  'habits.avg30': 'average 30-day success:', 'habits.new': 'New habit', 'habits.none': 'No habits',
  'habits.none_text': 'Create your first habit: drink water, read, work out…',
  'habits.hint': 'Tip: click a day to check or uncheck it. Crossed-out days are not scheduled, “↷” days were skipped.',
  'habits.archived': 'Archived ({n})', 'habits.per_day': '/day', 'habits.30d': '30 days', 'habits.streak': 'streak', 'habits.record': 'best',
  'habits.pause': 'Pause', 'habits.resume': 'Resume', 'habits.paused_since': 'Paused since {date}',
  'habits.paused_toast': '“{name}” paused. Its streaks are protected.', 'habits.resumed_toast': '“{name}” resumed',
  'habits.archived_toast': '“{name}” archived', 'habits.deleted_toast': '“{name}” deleted',
  'habits.days_without': 'days without', 'habits.quit_label': 'Held',
  'habits.check': 'Check {name}', 'habits.add1': 'Add 1', 'habits.remove1': 'Remove 1', 'habits.streak_title': 'Current streak',

  'sched.daily': 'Every day', 'sched.weekdays': 'Weekdays', 'sched.weekend': 'Weekends', 'sched.weekly': '{n}× a week',
  'sched.monthly': '{n}× a month', 'sched.interval': 'Every {n} days', 'sched.interval1': 'Every day',
  'streak.day_one': '{n} day', 'streak.day_other': '{n} days', 'streak.week_one': '{n} week', 'streak.week_other': '{n} weeks',
  'streak.month_one': '{n} month', 'streak.month_other': '{n} months',

  'form.habit_edit': 'Edit habit', 'form.habit_new': 'New habit', 'form.templates': 'Templates', 'form.templates_hint': 'Start from a template, then adjust.',
  'form.name': 'Name', 'form.name_ph': 'E.g. Read 20 pages', 'form.color': 'Colour', 'form.category': 'Category', 'form.category_ph': 'Health, Mind…',
  'form.kind': 'Tracking type', 'form.kind_check': 'Done / not done', 'form.kind_count': 'Numeric goal', 'form.kind_quit': 'Bad habit to quit',
  'form.kind_quit_hint': 'Every day you hold on counts. The streak becomes your “days without”.',
  'form.target': 'Goal per day', 'form.unit': 'Unit', 'form.unit_ph': 'glasses, pages, minutes…',
  'form.freq': 'Frequency', 'form.freq_daily': 'Every day', 'form.freq_days': 'Specific days', 'form.freq_weekly': 'X times / week',
  'form.freq_interval': 'Every X days', 'form.freq_monthly': 'X times / month',
  'form.per_week': 'Times per week', 'form.every': 'Every … days', 'form.per_month': 'Times per month',
  'form.time': 'Planned time', 'form.reminders': 'Reminders', 'form.reminders_hint': 'Up to 3 reminder times. Enable notifications in settings.',
  'form.add_reminder': 'Add a reminder', 'form.notes': 'Notes', 'form.notes_hint': '(why it matters to you)',
  'form.err_name': 'Give your habit a name.', 'form.err_days': 'Pick at least one day.',
  'form.habit_updated': 'Habit updated', 'form.habit_created': 'Habit created',
  'form.cat_health': 'Health', 'form.cat_mind': 'Mind', 'form.cat_career': 'Career', 'form.cat_money': 'Finance', 'form.cat_social': 'Social',

  'form.task_edit': 'Edit task', 'form.task_new': 'New task', 'form.title': 'Title', 'form.title_ph': 'E.g. Send the quote to the client',
  'form.desc': 'Description', 'form.desc_ph': 'Details, links, context…', 'form.priority': 'Priority', 'form.due': 'Due date', 'form.project': 'Project',
  'form.project_ph': 'Freelance, Personal…', 'form.status': 'Status', 'form.subtasks': 'Subtasks', 'form.sub_ph': 'Add a step, then Enter',
  'form.add': 'Add', 'form.sub_new': 'New subtask', 'form.sub_delete': 'Delete step', 'form.err_title': 'Give the task a title.',
  'form.task_done': 'Task done, well done!', 'form.task_updated': 'Task updated', 'form.task_created': 'Task created',
  'tasks.deleted_toast': '“{title}” deleted',

  'prio.0': 'Low', 'prio.1': 'Medium', 'prio.2': 'High', 'prio.3': 'Urgent',
  'status.todo': 'To do', 'status.doing': 'In progress', 'status.done': 'Done',
  'tasks.open_one': '{n} open task', 'tasks.open_other': '{n} open tasks', 'tasks.overdue': '{n} overdue',
  'tasks.drag_hint': 'drag cards from one column to another', 'tasks.new': 'New task', 'tasks.search_ph': 'Search a task…',
  'tasks.all_prio': 'All priorities', 'tasks.all_proj': 'All projects', 'tasks.sort_prio': 'Sort: priority', 'tasks.sort_due': 'Sort: due date',
  'tasks.sort_recent': 'Sort: newest', 'tasks.drop_here': 'Drop a task here', 'tasks.add_in': 'Add to {col}',
  'tasks.prev_col': 'Previous column', 'tasks.next_col': 'Next column', 'tasks.mark_done': 'Mark as done',
  'tasks.subtasks': '{done}/{total} subtasks', 'tasks.done_toast': 'Task done: {title}', 'tasks.filter_prio': 'Filter by priority',
  'tasks.filter_proj': 'Filter by project', 'tasks.sort': 'Sort',

  'stats.title': 'Statistics', 'stats.lead': 'Your trends, your records and your progress.', 'stats.key': 'Key figures',
  'stats.rate30': '30-day success', 'stats.all_habits': 'All habits combined', 'stats.checks': 'Check-ins', 'stats.xp_earned': '{n} XP earned',
  'stats.record': 'Streak record', 'stats.longest': 'Your longest streak', 'stats.tasks_done': 'Tasks done', 'stats.last7_level': 'last 7 days · level {n}',
  'stats.last30': 'Last 30 days', 'stats.avg': 'average {v}', 'stats.no_data': 'No data yet.', 'stats.regularity': 'Consistency',
  'stats.weeks20': 'last 20 weeks', 'stats.year': 'last 12 months', 'stats.show_year': 'Show the year', 'stats.show_20w': 'Show 20 weeks',
  'stats.ranking': 'Habit ranking', 'stats.rank_sub': '30-day success', 'stats.no_habit': 'No habit.', 'stats.tasks': 'Tasks',
  'stats.open': '{n} open', 'stats.badges': 'Badges', 'stats.unlocked': '{n} / {total} unlocked', 'stats.got': 'Earned', 'stats.locked': 'Locked',
  'stats.chart_label': 'Success rate over the last 30 days', 'stats.nothing_planned': 'nothing planned', 'stats.less': 'Less', 'stats.more': 'More',
  'stats.avg_title': 'Average: {n}%', 'stats.export_csv': 'Export history (.csv)',
  'stats.insights': 'Weekly insights', 'stats.insights_sub': 'what your data says',
  'stats.mood': 'Average mood', 'stats.mood_sub': 'last 30 days', 'stats.journal_entries': '{n} notes',

  'insight.none': 'Check off a few habits for a week and insights will show up here.',
  'insight.week_up': 'This week: {cur}% success, up {d} points on last week.',
  'insight.week_down': 'This week: {cur}% success, down {d} points on last week.',
  'insight.week_flat': 'This week: {cur}% success, same as last week.',
  'insight.weak_day': 'Your weak spot: {day} ({rate}% success over 8 weeks). Plan less that day, or set a reminder.',
  'insight.strong_day': 'Your best day: {day} ({rate}%).',
  'insight.at_risk_one': '{names}: {n} streak on the line, not checked yet today.',
  'insight.at_risk_other': 'Streaks on the line today: {names}.',
  'insight.struggling': '“{name}” is only kept {rate}% of the time over 30 days. Goal too ambitious? Lower it or switch to “X times a week”.',
  'insight.improving': '“{name}” is improving: {prev}% → {cur}% over the last two weeks.',
  'insight.perfect': '{n} perfect days in the last 30 days.',
  'insight.mood': 'On days when everything is done, your average mood is {good}/5 versus {bad}/5 otherwise.',
  'insight.best_streak_now': 'Your longest current streak: “{name}”, {n}.',

  'badge.first-habit': 'First step', 'badge.first-habit.d': 'Create a habit',
  'badge.first-check': 'Here we go', 'badge.first-check.d': 'First check-in',
  'badge.streak-7': 'Week on fire', 'badge.streak-7.d': '7-day streak',
  'badge.streak-30': 'Unstoppable', 'badge.streak-30.d': '30-day streak',
  'badge.checks-100': 'Centurion', 'badge.checks-100.d': '100 check-ins',
  'badge.perfect-day': 'Perfect day', 'badge.perfect-day.d': 'Complete everything in one day',
  'badge.perfect-7': 'Perfectionist', 'badge.perfect-7.d': '7 perfect days',
  'badge.tasks-10': 'Finisher', 'badge.tasks-10.d': '10 tasks done',
  'badge.urgent': 'Firefighter', 'badge.urgent.d': 'Finish an urgent task',
  'badge.level-5': 'Level 5', 'badge.level-5.d': 'Reach level 5',
  'badge.streak-100': 'Centenarian', 'badge.streak-100.d': '100-day streak',
  'badge.journal-7': 'Introspective', 'badge.journal-7.d': '7 daily notes',

  'reward.perfect': 'Day complete. +25 XP', 'reward.badge': 'Badge unlocked: {name}', 'reward.level': 'Level {n} reached',
  'level.title': 'Level {n}', 'level.xp': '{into} / {need} XP',

  'settings.title': 'Settings', 'settings.lead': 'Customise Momentum and manage your data.',
  'settings.profile': 'Profile', 'settings.name': 'Your first name (for the greeting)', 'settings.name_ph': 'E.g. Ziad',
  'settings.level_line': 'Level {level} · {xp} XP in total · {n} perfect day(s)',
  'settings.appearance': 'Appearance', 'settings.theme': 'Theme', 'settings.theme_auto': 'Automatic', 'settings.theme_dark': 'Dark', 'settings.theme_light': 'Light',
  'settings.lang': 'Language', 'settings.motion': 'Animated background', 'settings.motion_label': 'Animated point field in the background',
  'settings.motion_hint': 'Turn it off to save battery. It also pauses when the tab is hidden.',
  'settings.day': 'Day', 'settings.day_start': 'Day starts at', 'settings.day_start_hint': 'Check-ins made before this time count for the previous day. Handy for night owls.',
  'settings.midnight': 'Midnight', 'settings.hour': '{h}:00',
  'settings.vacation': 'Vacation mode', 'settings.vacation_label': 'Pause all habits', 'settings.vacation_until': 'Until',
  'settings.vacation_hint': 'Vacation days count neither as done nor as missed: your streaks pick up where they were.',
  'settings.vacation_on': 'Vacation mode on. Enjoy the rest!', 'settings.vacation_off': 'Back from vacation: habits resume.',
  'settings.reminders': 'Reminders', 'settings.notify_label': 'Reminder notifications', 'settings.notify_hint': 'Momentum notifies you at each reminder time and, in the evening, if habits are still left. Works while the app (or tab) is open or installed.',
  'settings.notify_denied': 'Notifications are blocked by the browser. Allow them in the site settings.',
  'settings.notify_unsupported': 'This browser does not support notifications.',
  'settings.recap': 'Evening reminder', 'settings.recap_hint': 'A single reminder if habits are still left to check.', 'settings.recap_off': 'Off',
  'settings.test_notify': 'Test', 'settings.notify_test_title': 'Momentum', 'settings.notify_test_body': 'Reminders are working 👋',
  'settings.notify_on': 'Reminders on', 'settings.notify_off': 'Reminders off',
  'settings.install': 'App', 'settings.install_btn': 'Install on this device', 'settings.installed': 'Momentum is installed on this device. It works offline.',
  'settings.install_hint': 'Install Momentum as an app: home-screen icon, full screen, offline.',
  'settings.install_ios': 'On iPhone / iPad: Share button, then “Add to Home Screen”.',
  'settings.install_unsupported': 'Open this page in Chrome, Edge or Safari to install it. It already works offline.',
  'settings.data': 'Data', 'settings.data_hint': 'Everything is stored in this browser, with no account or server. Export a backup regularly.',
  'settings.export': 'Export (.json)', 'settings.import': 'Import', 'settings.share': 'Share backup', 'settings.csv': 'History (.csv)',
  'settings.demo': 'Reload the demo', 'settings.reset': 'Erase everything',
  'settings.transfer': 'Transfer to another device', 'settings.transfer_hint': 'Copy this code, send it to yourself (message, e-mail) and paste it into Momentum on the other device.',
  'settings.transfer_make': 'Generate a code', 'settings.transfer_paste': 'Paste a received code', 'settings.transfer_ph': 'Paste the code here…', 'settings.transfer_apply': 'Import this code',
  'settings.transfer_bad': 'Invalid or incomplete code.', 'settings.transfer_ok': 'Data imported from the code',
  'settings.snapshots': 'Automatic backups', 'settings.snapshots_hint': 'Momentum keeps one copy per day (last 7 days) in this browser.',
  'settings.snapshot_restore': 'Restore', 'settings.snapshot_none': 'No automatic backup yet.',
  'settings.snapshot_confirm': 'Replace your current data with the backup from {date}?', 'settings.snapshot_restored': 'Backup from {date} restored',
  'settings.snapshot_line': '{date} · {habits} habits · {tasks} tasks',
  'settings.sync': 'Sync (GitHub Gist)', 'settings.sync_hint': 'Optional: sync your devices through a private gist on your GitHub account. Create a token with only the “gist” permission and paste it here. It stays in this browser.',
  'settings.sync_token': 'GitHub token', 'settings.sync_token_ph': 'ghp_…', 'settings.sync_auto': 'Sync automatically', 'settings.sync_push': 'Push', 'settings.sync_pull': 'Pull',
  'settings.sync_last': 'Last sync: {date}', 'settings.sync_never': 'Never synced', 'settings.sync_pushed': 'Data pushed', 'settings.sync_pulled': 'Data pulled',
  'settings.sync_same': 'Already up to date', 'settings.sync_error': 'Sync failed: {msg}', 'settings.sync_need_token': 'Add a GitHub token first.',
  'settings.sync_conflict': 'Newer data exists online. Pulling will overwrite local data: continue?',
  'settings.shortcuts': 'Keyboard shortcuts', 'settings.sc_palette': 'Command palette', 'settings.sc_habit': 'New habit', 'settings.sc_task': 'New task',
  'settings.sc_pages': 'Switch page', 'settings.sc_close': 'Close a window', 'settings.sc_esc': 'Esc',
  'settings.about': 'About', 'settings.version': 'Version {v}', 'settings.about_text': 'Momentum is an open-source project by Ziad El Alami. No data leaves your device without your action.',
  'settings.demo_confirm': 'Replace your current data with the demo?', 'settings.demo_loaded': 'Demo reloaded',
  'settings.reset_confirm': 'Permanently erase all your habits and tasks? Export a backup first.',
  'settings.reset_done': 'Data erased. Fresh start!', 'settings.exported': 'Backup exported', 'settings.imported': 'Data imported',
  'settings.import_bad': 'Invalid file: choose a Momentum export.', 'settings.csv_exported': 'History exported',
  'settings.share_unsupported': 'Sharing is not available here: use export instead.',

  'palette.ph': 'Type a command, a habit or a task…', 'palette.goto': 'Go to: {page}', 'palette.new_habit': 'New habit', 'palette.new_task': 'New task',
  'palette.export': 'Export my data', 'palette.motion_on': 'Enable animated background', 'palette.motion_off': 'Disable animated background',
  'palette.theme': 'Switch theme', 'palette.timer': 'Focus timer (25 min)', 'palette.vacation_on': 'Turn vacation mode on', 'palette.vacation_off': 'End vacation mode',
  'palette.habit': 'Habit', 'palette.task': 'Task', 'palette.task_done': 'Done task', 'palette.empty': 'No results',
  'palette.nav': 'navigate', 'palette.open': 'open', 'palette.close': 'close', 'palette.enter': 'Enter',

  'journal.title': 'Daily note', 'journal.mood': 'Mood', 'journal.note': 'Note', 'journal.note_ph': 'How did it go?',
  'journal.saved': 'Note saved', 'journal.mood.1': 'Rough', 'journal.mood.2': 'Meh', 'journal.mood.3': 'Okay', 'journal.mood.4': 'Good', 'journal.mood.5': 'Great',

  'timer.title': 'Timer', 'timer.for': 'for “{name}”', 'timer.duration': 'Duration (minutes)', 'timer.finished': "Time's up!",
  'timer.added': '{n} min added to “{name}”', 'timer.focus': 'Focus', 'timer.running': 'Timer running: {t}', 'timer.add_done': 'Add elapsed time',
  'timer.notify_body': 'Session finished: {name}',

  'remind.title': '{name}', 'remind.body': "It's time! Planned at {time}.", 'remind.recap_title': '{n} habits left today',
  'remind.recap_body': '{names}', 'remind.recap_one': 'One habit left today',

  'pwa.installed': 'Momentum is installed. Find it on your home screen.', 'pwa.update': 'A new version of Momentum is ready.',
  'pwa.reload': 'Reload', 'pwa.offline': "You're offline: everything keeps working, data stays on the device.", 'pwa.online': 'Back online',

  'cat.health': 'Health', 'cat.mind': 'Mind', 'cat.career': 'Career', 'cat.money': 'Finance', 'cat.social': 'Social',

  'demo.water': 'Drink water', 'demo.meditate': '10-min meditation', 'demo.sport': 'Workout', 'demo.read': 'Read 20 pages', 'demo.nosugar': 'No added sugar',
  'demo.journal_note': 'Finished chapter 4, great moment.',
  'demo.t1': 'Publish the GitHub portfolio', 'demo.t1_notes': 'Showcase 3 projects with screenshots and live demos.',
  'demo.t1_s1': 'Pick the 3 best projects', 'demo.t1_s2': 'Write clear READMEs', 'demo.t1_s3': 'Enable GitHub Pages', 'demo.t1_s4': 'Share on LinkedIn',
  'demo.t2': 'Follow up with the salon client', 'demo.t2_notes': 'Send the updated quote and the new mock-up.',
  'demo.t3': 'Prepare the client meeting', 'demo.t3_s1': 'Agenda', 'demo.t3_s2': 'Monthly figures', 'demo.t3_s3': 'Mock-up demo',
  'demo.t4': 'Follow the Three.js tutorial', 'demo.t5': 'Optimise the site images', 'demo.t6': 'Update my CV', 'demo.t7': 'Invoice the restaurant project', 'demo.t8': 'Do the groceries',
  'demo.proj_freelance': 'Freelance', 'demo.proj_learning': 'Learning', 'demo.proj_perso': 'Personal',
});

// ---------- Version 3.1 : Mon année, bilan de la semaine, jamais deux fois, identités ----------
addTranslations('fr', {
  'nav.year': 'Mon année',
  'year.title': 'Mon année', 'year.lead': 'Chaque bloc est une journée : plus il monte, plus vous avez tenu. Les 371 derniers jours, en vrai.',
  'year.share': 'Partager mon année', 'year.shared': 'Image enregistrée', 'year.aria': 'Votre année d’habitudes en 3D',
  'year.calendar': 'Calendrier', 'year.spiral': 'Spirale', 'year.rings': 'Anneaux', 'year.stats': 'Chiffres de l’année',
  'year.kept': 'Jours tenus', 'year.kept_sub': 'au moins une habitude validée', 'year.full': 'Journées complètes', 'year.full_sub': 'tout validé ce jour-là',
  'year.checks_sub': 'depuis le début', 'year.hint': 'Faites glisser la souris pour incliner la scène. « Partager » crée une image carrée, prête pour les réseaux.',
  'year.share_title': 'Mon année avec Momentum {name}', 'year.share_sub': '{kept} jours tenus · {full} journées complètes · meilleure série : {best} jours',
  'review.title': 'Bilan de la semaine', 'review.range': 'Du {from} au {to}', 'review.partial': 'semaine en cours',
  'review.banner': 'Votre bilan de la semaine est prêt : ce qui a marché, ce qui a coincé, et une seule chose à changer.', 'review.open': 'Lire le bilan',
  'review.rate': 'Réussite', 'review.no_prev': 'pas encore de comparaison', 'review.vs_prev': '{d} pts vs semaine précédente', 'review.perfect': 'Journées parfaites',
  'review.rebounds': 'Rebonds après un raté', 'review.coach': 'Le coach', 'review.ai_write': 'Rédiger avec l’IA', 'review.ai_redo': 'Réécrire avec l’IA',
  'review.ai_busy': 'Le coach rédige votre bilan…', 'review.ai_hint': 'Envie d’un bilan rédigé pour vous ? Ajoutez une clé API Claude dans les réglages : vos données ne partent que quand vous cliquez.',
  'review.next': 'La semaine prochaine', 'review.next_sub': 'une chose à changer, applicable en un clic', 'review.apply': 'Appliquer', 'review.applied': 'Réglage appliqué',
  'review.no_sug': 'Rien à changer : continuez comme ça. Les suggestions apparaissent quand les données montrent un blocage.',
  'review.by_habit': 'Habitude par habitude', 'review.by_habit_sub': 'cette semaine vs la précédente', 'review.col_done': 'Fait', 'review.col_rate': 'Réussite', 'review.col_trend': 'Tendance',
  'review.sug_weekly': '« {name} » n’est tenue qu’à {rate} % : passez à 3 fois par semaine, une fréquence que vous tiendrez.',
  'review.sug_reminder': 'Ajoutez un rappel à {time} pour « {name} » : prévue mais souvent oubliée.',
  'review.sug_raise': '« {name} » est tenue presque tous les jours : passez l’objectif de {from} à {to} {unit}.',
  'review.sug_drop_day': 'Le {day}, « {name} » n’est tenue qu’à {rate} % : retirez ce jour plutôt que de le rater.',
  'review.sug_identity': 'Donnez une identité à « {name} » (« je suis quelqu’un qui… ») : chaque validation devient un vote.',
  'recover.line': 'La dernière fois a été ratée. Pas deux fois :', 'recover.mini_check': 'version mini, juste cocher', 'recover.mini_count': 'version mini : {n} {unit}',
  'recover.mini_done': 'Reprise validée pour « {name} ». Jamais deux fois.',
  'recover.banner_one': '{n} habitude en reprise aujourd’hui : l’important est de ne pas rater deux fois de suite.',
  'recover.banner_other': '{n} habitudes en reprise aujourd’hui : l’important est de ne pas rater deux fois de suite.',
  'identity.vote': '+1 vote : {identity}', 'identity.votes': '{n} votes', 'identity.votes_long': '{n} votes',
  'identity.title': 'Qui vous devenez', 'identity.sub': 'chaque validation est un vote pour cette identité',
  'form.identity': 'Identité', 'form.identity_hint': '(« je suis quelqu’un qui… »)', 'form.identity_ph': 'quelqu’un qui lit tous les jours',
  'stats.rebounds': 'Rebonds après un raté', 'stats.rebounds_sub': '{n} double(s) raté(s) sur 30 jours', 'stats.done_week': '{n} terminées cette semaine',
  'settings.never_twice': 'Mode « jamais deux fois »', 'settings.never_twice_hint': 'Après un raté, l’habitude passe en reprise : message bienveillant et version mini (la moitié de l’objectif) pour ne pas rater deux fois de suite.',
  'settings.coach': 'Coach IA (optionnel)', 'settings.coach_hint': 'Un bilan hebdomadaire rédigé par Claude à partir de vos chiffres. Créez une clé sur console.anthropic.com et collez-la ici.',
  'settings.coach_key': 'Clé API Claude', 'settings.coach_privacy': 'La clé reste dans ce navigateur. Vos données ne sont envoyées que lorsque vous cliquez sur « Rédiger avec l’IA ».',
  'coach.no_key': 'Ajoutez une clé API dans les réglages.', 'coach.refused': 'Le modèle a refusé de répondre.', 'coach.empty': 'Réponse vide.',
  'badge.rebound-5': 'Rebond', 'badge.rebound-5.d': '5 reprises après un raté', 'badge.identity': 'Identité', 'badge.identity.d': '10 votes pour une identité',
  'tpl.id_body': 'quelqu’un qui prend soin de son corps', 'tpl.id_calm': 'quelqu’un de calme et présent', 'tpl.id_reader': 'quelqu’un qui lit tous les jours',
  'tpl.id_athlete': 'un sportif', 'tpl.id_rested': 'quelqu’un qui dort bien', 'tpl.id_writer': 'quelqu’un qui écrit', 'tpl.id_learner': 'quelqu’un qui apprend',
  'tpl.id_builder': 'quelqu’un qui construit', 'tpl.id_money': 'quelqu’un qui maîtrise son argent', 'tpl.id_present': 'quelqu’un de présent pour les siens', 'tpl.id_free': 'quelqu’un de libre',
  'demo.id_reader': 'quelqu’un qui lit tous les jours', 'demo.id_athlete': 'un sportif',
});

addTranslations('es', {
  'nav.year': 'Mi año',
  'year.title': 'Mi año', 'year.lead': 'Cada bloque es un día: cuanto más sube, más has cumplido. Los últimos 371 días, de verdad.',
  'year.share': 'Compartir mi año', 'year.shared': 'Imagen guardada', 'year.aria': 'Tu año de hábitos en 3D',
  'year.calendar': 'Calendario', 'year.spiral': 'Espiral', 'year.rings': 'Anillos', 'year.stats': 'Cifras del año',
  'year.kept': 'Días cumplidos', 'year.kept_sub': 'al menos un hábito completado', 'year.full': 'Días completos', 'year.full_sub': 'todo completado ese día',
  'year.checks_sub': 'desde el principio', 'year.hint': 'Mueve el ratón para inclinar la escena. «Compartir» crea una imagen cuadrada, lista para las redes.',
  'year.share_title': 'Mi año con Momentum {name}', 'year.share_sub': '{kept} días cumplidos · {full} días completos · mejor racha: {best} días',
  'review.title': 'Balance de la semana', 'review.range': 'Del {from} al {to}', 'review.partial': 'semana en curso',
  'review.banner': 'Tu balance de la semana está listo: lo que funcionó, lo que falló y una sola cosa que cambiar.', 'review.open': 'Leer el balance',
  'review.rate': 'Éxito', 'review.no_prev': 'todavía sin comparación', 'review.vs_prev': '{d} pts vs semana anterior', 'review.perfect': 'Días perfectos',
  'review.rebounds': 'Rebotes tras un fallo', 'review.coach': 'El coach', 'review.ai_write': 'Redactar con IA', 'review.ai_redo': 'Reescribir con IA',
  'review.ai_busy': 'El coach está redactando tu balance…', 'review.ai_hint': '¿Quieres un balance redactado para ti? Añade una clave API de Claude en los ajustes: tus datos solo se envían cuando haces clic.',
  'review.next': 'La semana que viene', 'review.next_sub': 'una cosa que cambiar, aplicable con un clic', 'review.apply': 'Aplicar', 'review.applied': 'Ajuste aplicado',
  'review.no_sug': 'Nada que cambiar: sigue así. Las sugerencias aparecen cuando los datos muestran un bloqueo.',
  'review.by_habit': 'Hábito por hábito', 'review.by_habit_sub': 'esta semana vs la anterior', 'review.col_done': 'Hecho', 'review.col_rate': 'Éxito', 'review.col_trend': 'Tendencia',
  'review.sug_weekly': '«{name}» solo se cumple al {rate} %: pásalo a 3 veces por semana, una frecuencia que mantendrás.',
  'review.sug_reminder': 'Añade un recordatorio a las {time} para «{name}»: previsto pero a menudo olvidado.',
  'review.sug_raise': '«{name}» se cumple casi todos los días: sube el objetivo de {from} a {to} {unit}.',
  'review.sug_drop_day': 'El {day}, «{name}» solo se cumple al {rate} %: quita ese día en vez de fallarlo.',
  'review.sug_identity': 'Dale una identidad a «{name}» («soy alguien que…»): cada marca se convierte en un voto.',
  'recover.line': 'La última vez falló. No dos veces:', 'recover.mini_check': 'versión mini, solo marcar', 'recover.mini_count': 'versión mini: {n} {unit}',
  'recover.mini_done': 'Recuperación completada para «{name}». Nunca dos veces.',
  'recover.banner_one': '{n} hábito en recuperación hoy: lo importante es no fallar dos veces seguidas.',
  'recover.banner_other': '{n} hábitos en recuperación hoy: lo importante es no fallar dos veces seguidas.',
  'identity.vote': '+1 voto: {identity}', 'identity.votes': '{n} votos', 'identity.votes_long': '{n} votos',
  'identity.title': 'En quién te conviertes', 'identity.sub': 'cada marca es un voto por esta identidad',
  'form.identity': 'Identidad', 'form.identity_hint': '(«soy alguien que…»)', 'form.identity_ph': 'alguien que lee todos los días',
  'stats.rebounds': 'Rebotes tras un fallo', 'stats.rebounds_sub': '{n} doble(s) fallo(s) en 30 días', 'stats.done_week': '{n} terminadas esta semana',
  'settings.never_twice': 'Modo «nunca dos veces»', 'settings.never_twice_hint': 'Tras un fallo, el hábito pasa a recuperación: mensaje amable y versión mini (la mitad del objetivo) para no fallar dos veces seguidas.',
  'settings.coach': 'Coach IA (opcional)', 'settings.coach_hint': 'Un balance semanal redactado por Claude a partir de tus cifras. Crea una clave en console.anthropic.com y pégala aquí.',
  'settings.coach_key': 'Clave API de Claude', 'settings.coach_privacy': 'La clave se queda en este navegador. Tus datos solo se envían cuando pulsas «Redactar con IA».',
  'coach.no_key': 'Añade una clave API en los ajustes.', 'coach.refused': 'El modelo rechazó responder.', 'coach.empty': 'Respuesta vacía.',
  'badge.rebound-5': 'Rebote', 'badge.rebound-5.d': '5 recuperaciones tras un fallo', 'badge.identity': 'Identidad', 'badge.identity.d': '10 votos por una identidad',
  'tpl.id_body': 'alguien que cuida su cuerpo', 'tpl.id_calm': 'alguien tranquilo y presente', 'tpl.id_reader': 'alguien que lee todos los días',
  'tpl.id_athlete': 'un deportista', 'tpl.id_rested': 'alguien que duerme bien', 'tpl.id_writer': 'alguien que escribe', 'tpl.id_learner': 'alguien que aprende',
  'tpl.id_builder': 'alguien que construye', 'tpl.id_money': 'alguien que controla su dinero', 'tpl.id_present': 'alguien presente para los suyos', 'tpl.id_free': 'alguien libre',
  'demo.id_reader': 'alguien que lee todos los días', 'demo.id_athlete': 'un deportista',
});

addTranslations('en', {
  'nav.year': 'My year',
  'year.title': 'My year', 'year.lead': 'Each block is a day: the higher it rises, the more you kept up. Your last 371 days, for real.',
  'year.share': 'Share my year', 'year.shared': 'Image saved', 'year.aria': 'Your year of habits in 3D',
  'year.calendar': 'Calendar', 'year.spiral': 'Spiral', 'year.rings': 'Rings', 'year.stats': 'Year figures',
  'year.kept': 'Days kept', 'year.kept_sub': 'at least one habit done', 'year.full': 'Complete days', 'year.full_sub': 'everything done that day',
  'year.checks_sub': 'since the start', 'year.hint': 'Move the mouse to tilt the scene. “Share” creates a square image, ready for social media.',
  'year.share_title': 'My year with Momentum {name}', 'year.share_sub': '{kept} days kept · {full} complete days · best streak: {best} days',
  'review.title': 'Weekly review', 'review.range': '{from} to {to}', 'review.partial': 'week in progress',
  'review.banner': 'Your weekly review is ready: what worked, what got stuck, and one thing to change.', 'review.open': 'Read the review',
  'review.rate': 'Success', 'review.no_prev': 'no comparison yet', 'review.vs_prev': '{d} pts vs previous week', 'review.perfect': 'Perfect days',
  'review.rebounds': 'Rebounds after a miss', 'review.coach': 'The coach', 'review.ai_write': 'Write with AI', 'review.ai_redo': 'Rewrite with AI',
  'review.ai_busy': 'The coach is writing your review…', 'review.ai_hint': 'Want a review written for you? Add a Claude API key in settings: your data is only sent when you click.',
  'review.next': 'Next week', 'review.next_sub': 'one thing to change, applied in one click', 'review.apply': 'Apply', 'review.applied': 'Setting applied',
  'review.no_sug': 'Nothing to change: keep going. Suggestions show up when the data reveals a blocker.',
  'review.by_habit': 'Habit by habit', 'review.by_habit_sub': 'this week vs last week', 'review.col_done': 'Done', 'review.col_rate': 'Success', 'review.col_trend': 'Trend',
  'review.sug_weekly': '“{name}” is only kept {rate}% of the time: switch to 3 times a week, a frequency you will keep.',
  'review.sug_reminder': 'Add a reminder at {time} for “{name}”: planned but often forgotten.',
  'review.sug_raise': '“{name}” is kept almost every day: raise the goal from {from} to {to} {unit}.',
  'review.sug_drop_day': 'On {day}, “{name}” is only kept {rate}% of the time: drop that day rather than miss it.',
  'review.sug_identity': 'Give “{name}” an identity (“I am someone who…”): every check-in becomes a vote.',
  'recover.line': 'Last time was a miss. Not twice:', 'recover.mini_check': 'mini version, just check it', 'recover.mini_count': 'mini version: {n} {unit}',
  'recover.mini_done': 'Comeback logged for “{name}”. Never twice.',
  'recover.banner_one': '{n} habit in comeback mode today: what matters is not missing twice in a row.',
  'recover.banner_other': '{n} habits in comeback mode today: what matters is not missing twice in a row.',
  'identity.vote': '+1 vote: {identity}', 'identity.votes': '{n} votes', 'identity.votes_long': '{n} votes',
  'identity.title': 'Who you are becoming', 'identity.sub': 'every check-in is a vote for this identity',
  'form.identity': 'Identity', 'form.identity_hint': '(“I am someone who…”)', 'form.identity_ph': 'someone who reads every day',
  'stats.rebounds': 'Rebounds after a miss', 'stats.rebounds_sub': '{n} double miss(es) in 30 days', 'stats.done_week': '{n} done this week',
  'settings.never_twice': '“Never twice” mode', 'settings.never_twice_hint': 'After a miss, the habit goes into comeback mode: a kind message and a mini version (half the goal) so you never miss twice in a row.',
  'settings.coach': 'AI coach (optional)', 'settings.coach_hint': 'A weekly review written by Claude from your numbers. Create a key on console.anthropic.com and paste it here.',
  'settings.coach_key': 'Claude API key', 'settings.coach_privacy': 'The key stays in this browser. Your data is only sent when you click “Write with AI”.',
  'coach.no_key': 'Add an API key in settings.', 'coach.refused': 'The model declined to answer.', 'coach.empty': 'Empty answer.',
  'badge.rebound-5': 'Rebound', 'badge.rebound-5.d': '5 comebacks after a miss', 'badge.identity': 'Identity', 'badge.identity.d': '10 votes for an identity',
  'tpl.id_body': 'someone who takes care of their body', 'tpl.id_calm': 'someone calm and present', 'tpl.id_reader': 'someone who reads every day',
  'tpl.id_athlete': 'an athlete', 'tpl.id_rested': 'someone who sleeps well', 'tpl.id_writer': 'someone who writes', 'tpl.id_learner': 'someone who learns',
  'tpl.id_builder': 'someone who builds', 'tpl.id_money': 'someone in control of their money', 'tpl.id_present': 'someone present for their people', 'tpl.id_free': 'someone free',
  'demo.id_reader': 'someone who reads every day', 'demo.id_athlete': 'an athlete',
});

addTranslations('fr', {
  'ob.title': 'Bienvenue dans Momentum', 'ob.lead': 'Une année se construit un jour à la fois. Choisissez vos premières habitudes, vous pourrez tout modifier ensuite.',
  'ob.name': 'Votre prénom', 'ob.pick': 'Vos premières habitudes', 'ob.pick_hint': '(touchez pour choisir)',
  'ob.start_one': 'Commencer avec {n} habitude', 'ob.start_other': 'Commencer avec {n} habitudes', 'ob.start_empty': 'Commencer sans habitude', 'ob.privacy': 'Sans compte. Vos données restent sur cet appareil.',
  'ob.demo': 'Découvrir avec des données d’exemple', 'ob.welcome': 'Bienvenue{name} ! Validez votre première habitude.', 'ob.demo_loaded': 'Données d’exemple chargées. Effacez-les dans Réglages → Données quand vous voulez.',
});
addTranslations('es', {
  'ob.title': 'Bienvenido a Momentum', 'ob.lead': 'Un año se construye un día a la vez. Elige tus primeros hábitos; podrás cambiarlo todo después.',
  'ob.name': 'Tu nombre', 'ob.pick': 'Tus primeros hábitos', 'ob.pick_hint': '(toca para elegir)',
  'ob.start_one': 'Empezar con {n} hábito', 'ob.start_other': 'Empezar con {n} hábitos', 'ob.start_empty': 'Empezar sin hábitos', 'ob.privacy': 'Sin cuenta. Tus datos se quedan en este dispositivo.',
  'ob.demo': 'Explorar con datos de ejemplo', 'ob.welcome': '¡Bienvenido{name}! Marca tu primer hábito.', 'ob.demo_loaded': 'Datos de ejemplo cargados. Bórralos en Ajustes → Datos cuando quieras.',
});
addTranslations('en', {
  'ob.title': 'Welcome to Momentum', 'ob.lead': 'A year is built one day at a time. Pick your first habits; you can change everything later.',
  'ob.name': 'Your first name', 'ob.pick': 'Your first habits', 'ob.pick_hint': '(tap to choose)',
  'ob.start_one': 'Start with {n} habit', 'ob.start_other': 'Start with {n} habits', 'ob.start_empty': 'Start without habits', 'ob.privacy': 'No account. Your data stays on this device.',
  'ob.demo': 'Explore with sample data', 'ob.welcome': 'Welcome{name}! Check off your first habit.', 'ob.demo_loaded': 'Sample data loaded. Erase it in Settings → Data whenever you like.',
});

addTranslations('fr', {
  'cloud.title': 'Compte Momentum Cloud', 'cloud.hint': 'Optionnel. Un compte synchronise vos habitudes entre vos appareils et les met à l’abri si vous perdez votre téléphone. Sans compte, tout reste sur cet appareil.',
  'cloud.email': 'E-mail', 'cloud.password': 'Mot de passe', 'cloud.password_ph': '8 caractères minimum', 'cloud.sign_in': 'Se connecter', 'cloud.create': 'Créer un compte',
  'cloud.advanced': 'Avancé : adresse du serveur', 'cloud.url': 'Adresse du serveur', 'cloud.url_hint': 'Laissez vide pour le serveur par défaut. Utile si vous hébergez votre propre Momentum Cloud.',
  'cloud.signed_in_hint': 'Vos données sont synchronisées avec votre compte. Le serveur gratuit s’endort après 15 minutes d’inactivité : la première synchro peut prendre 30 à 50 secondes.',
  'cloud.auto': 'Synchroniser automatiquement', 'cloud.sign_out': 'Se déconnecter', 'cloud.danger': 'Autres appareils et suppression', 'cloud.sign_out_all': 'Déconnecter tous les appareils', 'cloud.delete': 'Supprimer le compte',
  'cloud.delete_confirm': 'Supprimer définitivement votre compte et vos données en ligne ? Entrez votre mot de passe pour confirmer :',
  'cloud.signed_in': 'Connecté : {email}', 'cloud.signed_out': 'Déconnecté de Momentum Cloud', 'cloud.deleted': 'Compte supprimé. Vos données restent sur cet appareil.',
  'cloud.pushed': 'Données envoyées', 'cloud.pulled': 'Données récupérées depuis votre compte', 'cloud.nothing_yet': 'Rien encore en ligne : envoyez d’abord vos données.',
  'cloud.waking': 'Le serveur se réveille, encore quelques secondes…', 'cloud.timeout': 'Le serveur ne répond pas. Réessayez dans une minute.', 'cloud.unreachable': 'Serveur injoignable. Vérifiez votre connexion ou l’adresse du serveur.',
  'cloud.err_taken': 'Cet e-mail a déjà un compte : connectez-vous.', 'cloud.err_credentials': 'E-mail ou mot de passe incorrect.', 'cloud.err_validation': 'Vérifiez l’e-mail et le mot de passe (8 caractères minimum).',
  'cloud.err_conflict': 'Conflit de version.', 'cloud.err_large': 'Données trop volumineuses.', 'cloud.err_server': 'Erreur du serveur',
  'cloud.use_remote_confirm': 'Votre compte contient déjà des données. OK : les utiliser sur cet appareil (recommandé). Annuler : les remplacer par les données de cet appareil.',
});
addTranslations('es', {
  'cloud.title': 'Cuenta Momentum Cloud', 'cloud.hint': 'Opcional. Una cuenta sincroniza tus hábitos entre dispositivos y los protege si pierdes el teléfono. Sin cuenta, todo se queda en este dispositivo.',
  'cloud.email': 'Correo', 'cloud.password': 'Contraseña', 'cloud.password_ph': 'mínimo 8 caracteres', 'cloud.sign_in': 'Iniciar sesión', 'cloud.create': 'Crear una cuenta',
  'cloud.advanced': 'Avanzado: dirección del servidor', 'cloud.url': 'Dirección del servidor', 'cloud.url_hint': 'Déjalo vacío para el servidor por defecto. Útil si alojas tu propio Momentum Cloud.',
  'cloud.signed_in_hint': 'Tus datos se sincronizan con tu cuenta. El servidor gratuito se duerme tras 15 minutos sin uso: la primera sincronización puede tardar 30-50 segundos.',
  'cloud.auto': 'Sincronizar automáticamente', 'cloud.sign_out': 'Cerrar sesión', 'cloud.danger': 'Otros dispositivos y eliminación', 'cloud.sign_out_all': 'Cerrar sesión en todos los dispositivos', 'cloud.delete': 'Eliminar la cuenta',
  'cloud.delete_confirm': '¿Eliminar definitivamente tu cuenta y tus datos en línea? Escribe tu contraseña para confirmar:',
  'cloud.signed_in': 'Conectado: {email}', 'cloud.signed_out': 'Sesión cerrada en Momentum Cloud', 'cloud.deleted': 'Cuenta eliminada. Tus datos siguen en este dispositivo.',
  'cloud.pushed': 'Datos enviados', 'cloud.pulled': 'Datos recuperados de tu cuenta', 'cloud.nothing_yet': 'Todavía no hay nada en línea: envía primero tus datos.',
  'cloud.waking': 'El servidor se está despertando, unos segundos más…', 'cloud.timeout': 'El servidor no responde. Inténtalo en un minuto.', 'cloud.unreachable': 'Servidor inaccesible. Comprueba tu conexión o la dirección del servidor.',
  'cloud.err_taken': 'Este correo ya tiene una cuenta: inicia sesión.', 'cloud.err_credentials': 'Correo o contraseña incorrectos.', 'cloud.err_validation': 'Comprueba el correo y la contraseña (mínimo 8 caracteres).',
  'cloud.err_conflict': 'Conflicto de versión.', 'cloud.err_large': 'Datos demasiado grandes.', 'cloud.err_server': 'Error del servidor',
  'cloud.use_remote_confirm': 'Tu cuenta ya contiene datos. Aceptar: usarlos en este dispositivo (recomendado). Cancelar: sustituirlos por los datos de este dispositivo.',
});
addTranslations('en', {
  'cloud.title': 'Momentum Cloud account', 'cloud.hint': 'Optional. An account syncs your habits across devices and keeps them safe if you lose your phone. Without one, everything stays on this device.',
  'cloud.email': 'E-mail', 'cloud.password': 'Password', 'cloud.password_ph': 'at least 8 characters', 'cloud.sign_in': 'Sign in', 'cloud.create': 'Create an account',
  'cloud.advanced': 'Advanced: server address', 'cloud.url': 'Server address', 'cloud.url_hint': 'Leave empty for the default server. Useful if you host your own Momentum Cloud.',
  'cloud.signed_in_hint': 'Your data is synced with your account. The free server sleeps after 15 idle minutes: the first sync can take 30 to 50 seconds.',
  'cloud.auto': 'Sync automatically', 'cloud.sign_out': 'Sign out', 'cloud.danger': 'Other devices and deletion', 'cloud.sign_out_all': 'Sign out of all devices', 'cloud.delete': 'Delete account',
  'cloud.delete_confirm': 'Permanently delete your account and your online data? Enter your password to confirm:',
  'cloud.signed_in': 'Signed in: {email}', 'cloud.signed_out': 'Signed out of Momentum Cloud', 'cloud.deleted': 'Account deleted. Your data stays on this device.',
  'cloud.pushed': 'Data pushed', 'cloud.pulled': 'Data pulled from your account', 'cloud.nothing_yet': 'Nothing online yet: push your data first.',
  'cloud.waking': 'The server is waking up, a few more seconds…', 'cloud.timeout': 'The server is not responding. Try again in a minute.', 'cloud.unreachable': 'Server unreachable. Check your connection or the server address.',
  'cloud.err_taken': 'This e-mail already has an account: sign in.', 'cloud.err_credentials': 'Wrong e-mail or password.', 'cloud.err_validation': 'Check the e-mail and the password (at least 8 characters).',
  'cloud.err_conflict': 'Version conflict.', 'cloud.err_large': 'Data too large.', 'cloud.err_server': 'Server error',
  'cloud.use_remote_confirm': 'Your account already has data. OK: use it on this device (recommended). Cancel: replace it with this device’s data.',
});

addTranslations('fr', {
  'push.title': 'Rappels appli fermée (push)', 'push.label': 'Recevoir les rappels sur cet appareil, même appli fermée',
  'push.hint': 'Envoyés par le serveur à l’heure de chaque rappel et pour le récap du soir. Sur iPhone, installez d’abord l’appli sur l’écran d’accueil.',
  'push.unsupported': 'Ce navigateur ne prend pas en charge les notifications push.', 'push.need_account': 'Connectez-vous à un compte Momentum Cloud (ci-dessous) pour recevoir les rappels même appli fermée.',
  'push.enabled': 'Rappels push activés sur cet appareil', 'push.disabled': 'Rappels push désactivés sur cet appareil', 'push.test_sent': 'Notification de test envoyée à {n} appareil(s)',
  'buddy.title': 'Défi à deux', 'buddy.sub': 'tenir à deux, c’est tenir plus longtemps', 'buddy.hint': 'Générez un code et envoyez-le à un ami qui a Momentum : chacun verra la progression du jour de l’autre, rien de plus.',
  'buddy.none': 'Aucun binôme pour l’instant.', 'buddy.invite': 'Générer un code d’invitation', 'buddy.invite_hint': 'Valable 48 h, à usage unique. Votre ami le colle dans Réglages → Défi à deux.',
  'buddy.code': 'Code reçu', 'buddy.join': 'Rejoindre', 'buddy.joined': 'Vous êtes maintenant en binôme avec {name}', 'buddy.bad_code': 'Code invalide ou expiré.', 'buddy.own_code': 'C’est votre propre code.',
  'buddy.best': 'meilleure série : {n}', 'buddy.today_title': 'Votre binôme aujourd’hui', 'buddy.manage': 'Gérer', 'buddy.progress': '{done}/{total} habitudes', 'buddy.nothing': 'rien de prévu', 'buddy.perfect': 'journée complète',
});
addTranslations('es', {
  'push.title': 'Recordatorios con la app cerrada (push)', 'push.label': 'Recibir recordatorios en este dispositivo, incluso con la app cerrada',
  'push.hint': 'Enviados por el servidor a la hora de cada recordatorio y para el resumen nocturno. En iPhone, instala primero la app en la pantalla de inicio.',
  'push.unsupported': 'Este navegador no admite notificaciones push.', 'push.need_account': 'Inicia sesión en una cuenta Momentum Cloud (abajo) para recibir recordatorios con la app cerrada.',
  'push.enabled': 'Recordatorios push activados en este dispositivo', 'push.disabled': 'Recordatorios push desactivados en este dispositivo', 'push.test_sent': 'Notificación de prueba enviada a {n} dispositivo(s)',
  'buddy.title': 'Reto a dos', 'buddy.sub': 'a dos se aguanta más', 'buddy.hint': 'Genera un código y envíaselo a un amigo que tenga Momentum: cada uno verá el progreso del día del otro, nada más.',
  'buddy.none': 'Todavía sin compañero.', 'buddy.invite': 'Generar un código de invitación', 'buddy.invite_hint': 'Válido 48 h, de un solo uso. Tu amigo lo pega en Ajustes → Reto a dos.',
  'buddy.code': 'Código recibido', 'buddy.join': 'Unirse', 'buddy.joined': 'Ahora haces equipo con {name}', 'buddy.bad_code': 'Código no válido o caducado.', 'buddy.own_code': 'Es tu propio código.',
  'buddy.best': 'mejor racha: {n}', 'buddy.today_title': 'Tu compañero hoy', 'buddy.manage': 'Gestionar', 'buddy.progress': '{done}/{total} hábitos', 'buddy.nothing': 'nada previsto', 'buddy.perfect': 'día completo',
});
addTranslations('en', {
  'push.title': 'Reminders with the app closed (push)', 'push.label': 'Get reminders on this device, even with the app closed',
  'push.hint': 'Sent by the server at each reminder time and for the evening recap. On iPhone, install the app on the home screen first.',
  'push.unsupported': 'This browser does not support push notifications.', 'push.need_account': 'Sign in to a Momentum Cloud account (below) to get reminders even when the app is closed.',
  'push.enabled': 'Push reminders enabled on this device', 'push.disabled': 'Push reminders disabled on this device', 'push.test_sent': 'Test notification sent to {n} device(s)',
  'buddy.title': 'Buddy challenge', 'buddy.sub': 'two keep going longer than one', 'buddy.hint': 'Generate a code and send it to a friend who uses Momentum: each of you sees the other’s progress for the day, nothing more.',
  'buddy.none': 'No buddy yet.', 'buddy.invite': 'Generate an invite code', 'buddy.invite_hint': 'Valid 48 h, single use. Your friend pastes it in Settings → Buddy challenge.',
  'buddy.code': 'Received code', 'buddy.join': 'Join', 'buddy.joined': 'You are now buddies with {name}', 'buddy.bad_code': 'Invalid or expired code.', 'buddy.own_code': 'That is your own code.',
  'buddy.best': 'best streak: {n}', 'buddy.today_title': 'Your buddy today', 'buddy.manage': 'Manage', 'buddy.progress': '{done}/{total} habits', 'buddy.nothing': 'nothing planned', 'buddy.perfect': 'perfect day',
});

addTranslations('fr', {
  'cat.learning': 'Apprendre', 'cat.home': 'Maison', 'cat.creative': 'Créativité',
  'tpl.u_glasses': 'verres', 'tpl.u_minutes': 'minutes', 'tpl.u_pages': 'pages', 'tpl.u_portions': 'portions', 'tpl.u_things': 'choses', 'tpl.u_words': 'mots',
  'tpl.water': 'Boire 8 verres d’eau', 'tpl.walk': 'Marcher 30 minutes', 'tpl.sport': 'Faire du sport', 'tpl.stretch': 'S’étirer 5 minutes', 'tpl.sleep': 'Coucher avant 23 h',
  'tpl.fruits': '5 fruits et légumes', 'tpl.meds': 'Prendre mes médicaments / vitamines', 'tpl.nosugar': 'Pas de sucre ajouté', 'tpl.nosmoke': 'Ne pas fumer', 'tpl.noalcohol': 'Pas d’alcool',
  'tpl.meditate': 'Méditer 10 minutes', 'tpl.journal': 'Écrire 3 lignes de journal', 'tpl.gratitude': '3 gratitudes du jour', 'tpl.noscreen': 'Pas d’écran après 22 h', 'tpl.nature': 'Sortir dans la nature',
  'tpl.read': 'Lire 20 pages', 'tpl.language': 'Apprendre une langue 15 min', 'tpl.course': 'Suivre un cours en ligne', 'tpl.instrument': 'Pratiquer un instrument',
  'tpl.deepwork': 'Travail concentré 90 min', 'tpl.plan': 'Préparer la journée de demain', 'tpl.inbox': 'Vider ma boîte mail', 'tpl.network': 'Contacter quelqu’un de mon réseau',
  'tpl.budget': 'Noter mes dépenses', 'tpl.save': 'Mettre de l’argent de côté', 'tpl.noimpulse': 'Pas d’achat impulsif',
  'tpl.call': 'Appeler un proche', 'tpl.message': 'Prendre des nouvelles d’un ami', 'tpl.date': 'Soirée en couple', 'tpl.family': 'Repas en famille',
  'tpl.bed': 'Faire mon lit', 'tpl.tidy': 'Ranger 10 minutes', 'tpl.cook': 'Cuisiner maison', 'tpl.plants': 'Arroser les plantes', 'tpl.clean': 'Ménage de la semaine',
  'tpl.write': 'Écrire 300 mots', 'tpl.draw': 'Dessiner 15 minutes', 'tpl.photo': 'Une photo par jour', 'tpl.project': 'Avancer mon projet perso',
  'tpl.id_musician': 'un musicien', 'tpl.id_focused': 'quelqu’un de concentré', 'tpl.id_tidy': 'quelqu’un d’organisé', 'tpl.id_cook': 'quelqu’un qui cuisine', 'tpl.id_creative': 'quelqu’un de créatif',
  'demo.walk': 'Marcher 30 min',
});
addTranslations('es', {
  'cat.learning': 'Aprender', 'cat.home': 'Casa', 'cat.creative': 'Creatividad',
  'tpl.u_glasses': 'vasos', 'tpl.u_minutes': 'minutos', 'tpl.u_pages': 'páginas', 'tpl.u_portions': 'raciones', 'tpl.u_things': 'cosas', 'tpl.u_words': 'palabras',
  'tpl.water': 'Beber 8 vasos de agua', 'tpl.walk': 'Caminar 30 minutos', 'tpl.sport': 'Hacer deporte', 'tpl.stretch': 'Estirar 5 minutos', 'tpl.sleep': 'Acostarme antes de las 23 h',
  'tpl.fruits': '5 frutas y verduras', 'tpl.meds': 'Tomar mis medicinas / vitaminas', 'tpl.nosugar': 'Sin azúcar añadido', 'tpl.nosmoke': 'No fumar', 'tpl.noalcohol': 'Sin alcohol',
  'tpl.meditate': 'Meditar 10 minutos', 'tpl.journal': 'Escribir 3 líneas de diario', 'tpl.gratitude': '3 gratitudes del día', 'tpl.noscreen': 'Sin pantallas después de las 22 h', 'tpl.nature': 'Salir a la naturaleza',
  'tpl.read': 'Leer 20 páginas', 'tpl.language': 'Aprender un idioma 15 min', 'tpl.course': 'Seguir un curso en línea', 'tpl.instrument': 'Practicar un instrumento',
  'tpl.deepwork': 'Trabajo concentrado 90 min', 'tpl.plan': 'Preparar el día de mañana', 'tpl.inbox': 'Vaciar el correo', 'tpl.network': 'Contactar a alguien de mi red',
  'tpl.budget': 'Anotar mis gastos', 'tpl.save': 'Ahorrar dinero', 'tpl.noimpulse': 'Sin compras impulsivas',
  'tpl.call': 'Llamar a un ser querido', 'tpl.message': 'Escribir a un amigo', 'tpl.date': 'Noche en pareja', 'tpl.family': 'Comida en familia',
  'tpl.bed': 'Hacer la cama', 'tpl.tidy': 'Ordenar 10 minutos', 'tpl.cook': 'Cocinar en casa', 'tpl.plants': 'Regar las plantas', 'tpl.clean': 'Limpieza semanal',
  'tpl.write': 'Escribir 300 palabras', 'tpl.draw': 'Dibujar 15 minutos', 'tpl.photo': 'Una foto al día', 'tpl.project': 'Avanzar mi proyecto personal',
  'tpl.id_musician': 'un músico', 'tpl.id_focused': 'alguien concentrado', 'tpl.id_tidy': 'alguien organizado', 'tpl.id_cook': 'alguien que cocina', 'tpl.id_creative': 'alguien creativo',
  'demo.walk': 'Caminar 30 min',
});
addTranslations('en', {
  'cat.learning': 'Learning', 'cat.home': 'Home', 'cat.creative': 'Creativity',
  'tpl.u_glasses': 'glasses', 'tpl.u_minutes': 'minutes', 'tpl.u_pages': 'pages', 'tpl.u_portions': 'portions', 'tpl.u_things': 'things', 'tpl.u_words': 'words',
  'tpl.water': 'Drink 8 glasses of water', 'tpl.walk': 'Walk 30 minutes', 'tpl.sport': 'Work out', 'tpl.stretch': 'Stretch 5 minutes', 'tpl.sleep': 'In bed before 11 pm',
  'tpl.fruits': '5 fruits and vegetables', 'tpl.meds': 'Take my meds / vitamins', 'tpl.nosugar': 'No added sugar', 'tpl.nosmoke': 'No smoking', 'tpl.noalcohol': 'No alcohol',
  'tpl.meditate': 'Meditate 10 minutes', 'tpl.journal': 'Write 3 lines of journal', 'tpl.gratitude': '3 things I am grateful for', 'tpl.noscreen': 'No screens after 10 pm', 'tpl.nature': 'Get out in nature',
  'tpl.read': 'Read 20 pages', 'tpl.language': 'Learn a language 15 min', 'tpl.course': 'Follow an online course', 'tpl.instrument': 'Practice an instrument',
  'tpl.deepwork': 'Deep work 90 min', 'tpl.plan': 'Plan tomorrow', 'tpl.inbox': 'Clear my inbox', 'tpl.network': 'Reach out to someone in my network',
  'tpl.budget': 'Log my expenses', 'tpl.save': 'Put money aside', 'tpl.noimpulse': 'No impulse purchases',
  'tpl.call': 'Call a loved one', 'tpl.message': 'Check in on a friend', 'tpl.date': 'Date night', 'tpl.family': 'Family meal',
  'tpl.bed': 'Make my bed', 'tpl.tidy': 'Tidy up 10 minutes', 'tpl.cook': 'Cook at home', 'tpl.plants': 'Water the plants', 'tpl.clean': 'Weekly cleaning',
  'tpl.write': 'Write 300 words', 'tpl.draw': 'Draw 15 minutes', 'tpl.photo': 'One photo a day', 'tpl.project': 'Move my side project forward',
  'tpl.id_musician': 'a musician', 'tpl.id_focused': 'someone focused', 'tpl.id_tidy': 'someone organised', 'tpl.id_cook': 'someone who cooks', 'tpl.id_creative': 'someone creative',
  'demo.walk': 'Walk 30 min',
});

addTranslations('fr', {
  'splash.tagline': 'Une année se construit un jour à la fois.', 'splash.hello': 'Bonjour {name}. Une année se construit un jour à la fois.', 'splash.today': '{done}/{total} habitudes aujourd’hui', 'splash.streak': 'série de {n}',
});
addTranslations('es', {
  'splash.tagline': 'Un año se construye un día a la vez.', 'splash.hello': 'Hola {name}. Un año se construye un día a la vez.', 'splash.today': '{done}/{total} hábitos hoy', 'splash.streak': 'racha de {n}',
});
addTranslations('en', {
  'splash.tagline': 'A year is built one day at a time.', 'splash.hello': 'Hi {name}. A year is built one day at a time.', 'splash.today': '{done}/{total} habits today', 'splash.streak': 'streak of {n}',
});

addTranslations('fr', {
  'intro.s1': 'Une année se construit un jour à la fois.', 'intro.s2_title': 'Chaque jour est un bloc.', 'intro.s2': 'Plus il monte, plus vous avez tenu. Vos 14 derniers jours sont là, en vrai.',
  'intro.s3_title': 'Tout ce qu’il faut pour tenir.', 'intro.never_twice': 'Jamais deux fois', 'intro.by': 'Développé par', 'intro.by_sub': 'développeur full-stack, Madrid · sans framework, sans serveur imposé',
  'intro.skip': 'Passer',
});
addTranslations('es', {
  'intro.s1': 'Un año se construye un día a la vez.', 'intro.s2_title': 'Cada día es un bloque.', 'intro.s2': 'Cuanto más sube, más has cumplido. Tus últimos 14 días están aquí, de verdad.',
  'intro.s3_title': 'Todo lo necesario para mantenerte.', 'intro.never_twice': 'Nunca dos veces', 'intro.by': 'Desarrollado por', 'intro.by_sub': 'desarrollador full-stack, Madrid · sin framework, sin servidor obligatorio',
  'intro.skip': 'Saltar',
});
addTranslations('en', {
  'intro.s1': 'A year is built one day at a time.', 'intro.s2_title': 'Every day is a block.', 'intro.s2': 'The higher it rises, the more you kept up. Your last 14 days are right here, for real.',
  'intro.s3_title': 'Everything you need to keep going.', 'intro.never_twice': 'Never twice', 'intro.by': 'Developed by', 'intro.by_sub': 'full-stack developer, Madrid · no framework, no server required',
  'intro.skip': 'Skip',
});
