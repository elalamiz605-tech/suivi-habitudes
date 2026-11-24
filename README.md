# Momentum · Habitudes & tâches

**Momentum** est une application web pour suivre ses habitudes, organiser ses tâches et visualiser ses progrès, dans une interface sombre et minimaliste avec un **fond animé**.

👉 **Page vitrine :** https://elalamiz605-tech.github.io/suivi-habitudes/
👉 **Application :** https://elalamiz605-tech.github.io/suivi-habitudes/app.html

![Page Aujourd'hui](assets/apercu.jpg)

## Fonctionnalités

### Page vitrine
- **Une année d'habitudes en 3D** (Three.js) : 371 blocs, un par jour ; hauteur et couleur = habitudes tenues ce jour-là.
- Au défilement, l'année se transforme : calendrier, puis spirale (la série), puis trois anneaux (un par habitude).
- **Démo interactive** : validez trois habitudes, le bloc d'aujourd'hui monte et une vague traverse l'année.
- Captures de l'application réelle avec onglets. Respecte « réduire les animations ».

### Interface de l'application
- Design sombre et minimaliste : surfaces graphite, filets fins, un seul accent vermillon pour ce qui est validé.
- **Fond animé** (Three.js) : un champ de points en perspective qui ondule lentement ; la part de points allumés suit votre progression du jour.
- Valider une habitude « tamponne » la case du jour avec un anneau qui se referme.
- Chiffres en police mono (Martian Mono), texte en Host Grotesk, polices hébergées dans le projet.
- Adapté au mobile (barre de navigation en bas). Le fond animé se met en pause quand l'onglet est caché et peut être désactivé.

### 🔁 Habitudes
- **Deux types de suivi** : fait / pas fait, ou **objectif chiffré** (ex. 8 verres d'eau, avec compteur + / −).
- **Fréquences** : tous les jours, certains jours de la semaine, ou **X fois par semaine**.
- Catégories, couleur, heure prévue, notes, archivage.
- **Séries** (en cours et record) qui tiennent compte des jours non prévus.
- Historique sur 14 jours, modifiable d'un clic.

### ✅ Tâches
- **Tableau Kanban** (À faire / En cours / Terminé) avec **glisser-déposer**.
- 4 niveaux de **priorité**, **échéances** (en retard, aujourd'hui, demain…), **projets**, **sous-tâches** avec barre de progression.
- Recherche instantanée, filtres par priorité et projet, trois modes de tri.

### 📊 Statistiques et motivation
- Taux de réussite sur 30 jours (graphique en barres), **carte de régularité** sur 20 semaines, classement des habitudes, répartition des tâches.
- **XP et niveaux** : chaque validation et chaque tâche terminée rapporte des points.
- **10 badges** à débloquer (séries de 7 et 30 jours, journée parfaite, 100 validations…).

### ⚡ Confort
- **Palette de commandes** `Ctrl + K` : navigation, création, recherche d'habitudes et de tâches.
- Raccourcis : `N` nouvelle habitude, `T` nouvelle tâche, `1` à `5` pour changer de page.
- Annulation après suppression ou archivage.
- **Export / import** des données en JSON. Les données restent dans le navigateur : aucun compte, aucun serveur.
- Respecte le réglage « réduire les animations » du système. Le fond animé se met en pause quand l'onglet est caché et peut être désactivé.

| Tâches | Statistiques |
| --- | --- |
| ![Tableau des tâches](assets/apercu-taches.jpg) | ![Statistiques](assets/apercu-stats.jpg) |

## Lancer le projet

Le projet utilise des modules JavaScript : il faut l'ouvrir via un petit serveur local (un double-clic sur `index.html` ou `app.html` ne suffit pas).

```bash
python3 -m http.server 8000
```

Puis ouvrez http://localhost:8000. Vous pouvez aussi utiliser l'extension **Live Server** de VS Code.

## Mise en ligne

Le workflow `.github/workflows/pages.yml` publie le site sur **GitHub Pages** à chaque `push` sur `main`.
Pour l'activer une fois : **Settings → Pages → Source : « GitHub Actions »**.

## Technologies

- HTML, CSS et JavaScript natifs (modules ES), **sans framework ni étape de build**
- [Three.js](https://threejs.org/) r170 (fourni dans `vendor/`) et shaders GLSL écrits à la main
- Graphiques en SVG faits maison
- `localStorage` pour la sauvegarde

## Structure

```
index.html            → page vitrine (scène 3D de l'année + démo)
app.html              → l'application
js/year.js            → scène 3D de la vitrine (Three.js, 371 blocs)
css/styles.css        → design (verre dépoli, animations, responsive)
js/main.js            → navigation, actions, récompenses, palette de commandes
js/views.js           → rendu de chaque page
js/forms.js           → fenêtres de création / modification
js/logic.js           → règles : séries, taux de réussite, XP, badges
js/store.js           → données, sauvegarde, démo
js/scene.js           → fond animé (champ de points Three.js + shaders)
js/ui.js              → notifications
vendor/               → Three.js
```

## Idées pour la suite

- [ ] Rappels par notification
- [ ] Application installable (PWA, mode hors ligne)
- [ ] Synchronisation entre appareils
- [ ] Thème clair
