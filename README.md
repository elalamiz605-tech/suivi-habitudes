# Momentum · Habitudes & tâches

**Momentum** est une application web pour suivre ses habitudes, organiser ses tâches et visualiser ses progrès, dans une interface sombre avec un **décor 3D animé en temps réel**.

👉 **Démo en ligne :** https://elalamiz605-tech.github.io/suivi-habitudes/

![Page Aujourd'hui](assets/apercu.jpg)

## Fonctionnalités

### 🎨 Interface 3D
- Scène **Three.js** en arrière-plan : sphère organique déformée par un shader GLSL (bruit de Perlin), anneaux en orbite avec satellites, champ de 1 800 particules et formes flottantes.
- La scène **réagit** à la souris (parallaxe), **se déplace** selon la page et **change de couleur** avec votre progression du jour (violet → vert).
- Cartes qui **s'inclinent en 3D** sous la souris, entrées animées, confettis 3D lors d'une journée parfaite.
- Interface en verre dépoli, adaptée au mobile (barre de navigation en bas).

### 🔁 Habitudes
- **Deux types de suivi** : fait / pas fait, ou **objectif chiffré** (ex. 8 verres d'eau, avec compteur + / −).
- **Fréquences** : tous les jours, certains jours de la semaine, ou **X fois par semaine**.
- Catégories, couleur, icône, heure prévue, notes, archivage.
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
- Respecte le réglage « réduire les animations » du système. La 3D se met en pause quand l'onglet est caché et peut être désactivée.

| Tâches | Statistiques |
| --- | --- |
| ![Tableau des tâches](assets/apercu-taches.jpg) | ![Statistiques](assets/apercu-stats.jpg) |

## Lancer le projet

Le projet utilise des modules JavaScript : il faut l'ouvrir via un petit serveur local (un double-clic sur `index.html` ne suffit pas).

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
index.html            → structure de la page
css/styles.css        → design (verre dépoli, animations, responsive)
js/main.js            → navigation, actions, récompenses, palette de commandes
js/views.js           → rendu de chaque page
js/forms.js           → fenêtres de création / modification
js/logic.js           → règles : séries, taux de réussite, XP, badges
js/store.js           → données, sauvegarde, démo
js/scene.js           → scène 3D (Three.js + shaders)
js/ui.js              → notifications, confettis, effet 3D des cartes
vendor/               → Three.js
```

## Idées pour la suite

- [ ] Rappels par notification
- [ ] Application installable (PWA, mode hors ligne)
- [ ] Synchronisation entre appareils
- [ ] Thème clair
