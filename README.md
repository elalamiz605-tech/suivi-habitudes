# Momentum · Habitudes & tâches

**Momentum** est une application web installable (PWA) pour suivre ses habitudes, organiser ses tâches et visualiser ses progrès, dans une interface minimaliste (sombre ou claire) avec un **fond animé**. Sans compte, sans serveur : vos données restent sur votre appareil.

👉 **Page vitrine :** https://elalamiz605-tech.github.io/suivi-habitudes/
👉 **Application :** https://elalamiz605-tech.github.io/suivi-habitudes/app.html

![Page Aujourd'hui](assets/apercu.jpg)

## Fonctionnalités

### 📱 Application installable, hors ligne
- **PWA** : installation sur l'écran d'accueil (Android, iOS, ordinateur), plein écran, raccourcis vers chaque page.
- **Mode hors ligne** complet grâce à un service worker (réseau d'abord, cache en secours) ; mise à jour proposée quand une nouvelle version est publiée.
- **Thème sombre, clair ou automatique**, et interface en **français, español ou English**.

### 🔁 Habitudes
- **Trois types de suivi** : fait / pas fait, **objectif chiffré** (8 verres d'eau, 20 pages…) ou **mauvaise habitude à arrêter** (compteur de « jours sans »).
- **Cinq fréquences** : tous les jours, certains jours, **X fois par semaine**, **tous les X jours**, **X fois par mois**.
- **Bibliothèque de modèles** pour créer une habitude en un clic (eau, méditation, lecture, sport, langue, sans sucre, sans écran…).
- **Passer un jour** sans casser la série, **mettre une habitude en pause**, **mode vacances** global : les jours neutralisés ne comptent ni comme réussis ni comme manqués.
- **Début de journée personnalisable** (minuit → 6 h) pour les couche-tard.
- **Rappels** : jusqu'à 3 heures de rappel par habitude + récapitulatif du soir, par notification (via le service worker).
- **Note et humeur du jour** sur chaque validation ; **minuteur** intégré pour les habitudes en minutes (le temps écoulé est ajouté automatiquement) et minuteur de concentration (25 min).
- Page Aujourd'hui **regroupée par moment de la journée** (matin, après-midi, soir).
- Séries (en cours et record) qui tiennent compte des jours non prévus ; historique sur 14 jours modifiable d'un clic ; catégories, couleur, notes, archivage.

### ✅ Tâches
- **Tableau Kanban** (À faire / En cours / Terminé) avec **glisser-déposer**.
- 4 niveaux de **priorité**, **échéances** (en retard, aujourd'hui, demain…), **projets**, **sous-tâches** avec barre de progression.
- Recherche instantanée, filtres par priorité et projet, trois modes de tri.

### 📊 Statistiques et motivation
- **Analyse de la semaine** : tendance par rapport à la semaine précédente, jour le plus faible / le plus fort, séries en jeu aujourd'hui, habitude en difficulté ou en progrès, lien entre humeur et réussite.
- Taux de réussite sur 30 jours (graphique en barres), **carte de régularité sur 20 semaines ou 12 mois**, classement des habitudes, répartition des tâches, humeur moyenne.
- **XP et niveaux**, **12 badges** à débloquer (séries de 7, 30 et 100 jours, journée parfaite, 100 validations, 7 notes…).
- **Export CSV** de tout l'historique (date, habitude, valeur, humeur, note).

### 💾 Sauvegarde et synchronisation (sans compte)
- **Export / import JSON**, **partage** de la sauvegarde (Web Share sur mobile).
- **Code de transfert** compressé à coller dans Momentum sur un autre appareil.
- **Copies automatiques** quotidiennes (7 derniers jours) restaurables en un clic.
- **Synchronisation optionnelle par gist GitHub** (jeton personnel à permission « gist ») : envoi, récupération, ou synchro automatique entre appareils.

### ⚡ Confort
- **Palette de commandes** `Ctrl + K` : navigation, création, minuteur, thème, mode vacances, recherche d'habitudes et de tâches.
- Raccourcis : `N` nouvelle habitude, `T` nouvelle tâche, `1` à `5` pour changer de page.
- Annulation après suppression, archivage, pause ou jour passé.
- Respecte le réglage « réduire les animations » du système. Le fond animé se met en pause quand l'onglet est caché et peut être désactivé.

| Tâches | Statistiques |
| --- | --- |
| ![Tableau des tâches](assets/apercu-taches.jpg) | ![Statistiques](assets/apercu-stats.jpg) |

## Lancer le projet

Le projet utilise des modules JavaScript et un service worker : il faut l'ouvrir via un petit serveur local (un double-clic sur `index.html` ou `app.html` ne suffit pas).

```bash
python3 -m http.server 8000
```

Puis ouvrez http://localhost:8000. Vous pouvez aussi utiliser l'extension **Live Server** de VS Code.

## Mise en ligne

Le workflow `.github/workflows/pages.yml` publie le site sur **GitHub Pages** à chaque `push` sur `main`.
Pour l'activer une fois : **Settings → Pages → Source : « GitHub Actions »**.

À chaque publication, pensez à incrémenter `VERSION` dans `sw.js` pour que les utilisateurs reçoivent la nouvelle version (une notification « Recharger » leur est proposée).

## Limites connues

- Les **rappels** sont envoyés par la page ou l'application installée : sans serveur de notifications push, un navigateur ne peut pas réveiller Momentum tout seul. Sur ordinateur et Android, l'application installée en arrière-plan suffit ; sur iOS, il faut l'ouvrir.
- La **synchronisation** repose sur un gist privé GitHub : le jeton reste dans le navigateur, à n'utiliser que sur vos propres appareils.

## Technologies

- HTML, CSS et JavaScript natifs (modules ES), **sans framework ni étape de build**
- [Three.js](https://threejs.org/) r170 (fourni dans `vendor/`) et shaders GLSL écrits à la main
- Graphiques en SVG faits maison, service worker, Web App Manifest, Notifications API, CompressionStream, Web Share
- `localStorage` pour la sauvegarde

## Structure

```
index.html            → page vitrine (scène 3D de l'année + démo)
app.html              → l'application
manifest.webmanifest  → manifeste PWA (icônes, raccourcis)
sw.js                 → service worker (hors ligne, notifications)
css/styles.css        → design (thème sombre et clair, responsive)
js/main.js            → navigation, actions, récompenses, palette de commandes, réglages
js/views.js           → rendu de chaque page
js/forms.js           → fenêtres : habitude (modèles, rappels), tâche, note du jour, minuteur
js/logic.js           → règles : fréquences, jours passés / pauses / vacances, séries, taux, XP, badges
js/insights.js        → analyse de la semaine
js/reminders.js       → rappels et notifications
js/backup.js          → export / import, CSV, code de transfert, copies automatiques, synchro gist
js/pwa.js             → installation et mises à jour
js/i18n.js            → traductions fr / es / en
js/store.js           → données, sauvegarde, démo
js/scene.js           → fond animé (champ de points Three.js + shaders)
js/year.js            → scène 3D de la vitrine (371 blocs)
js/ui.js              → notifications à l'écran
vendor/               → Three.js
```

## Idées pour la suite

- [ ] Notifications push avec un petit serveur (rappels même application fermée, iOS compris)
- [ ] Widgets d'écran d'accueil (nécessite une application native)
- [ ] Coach IA : suggestions personnalisées à partir de l'analyse hebdomadaire
