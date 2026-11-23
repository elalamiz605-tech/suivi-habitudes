---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: []
---

# Momentum app shell (all routes)

Scope: the whole app (Aujourd'hui, Habitudes, Tâches, Statistiques, Réglages, dialogs). Mode: Operate.
Audience and job: the owner checks in daily on phone and desktop; portfolio visitors judge the craft from the seeded demo. Constraint: vanilla JS, no build, Three.js vendored, French UI.
Owner pin (verbatim): "je veux un fond anime , un designe futiriste minimaliste pro". Previous look rejected as childish.

## Direction contract

THESIS: A quiet instrument for daily discipline: the app is a dark, precise surface where the only thing that moves is your progress. Refuses the category default of cheerful cards, emoji, gradients and confetti.

OWN-WORLD: Graphite ground (#090A0C), hairline panels, one vermilion signal (#FF5B3A) used only for done, primary action and selection; amber only for overdue. Geist for UI, Geist Mono tabular numerals for every count, date and percentage. Square-ish 8px radii, 1px lines, no glass, no glow, no emoji: drawn monoline icons and a colour tick per habit.

STORY: The visitor sees today's habits and how many remain, validates them in one tap each, sees the day close, then moves to tasks, history and stats with the same vocabulary.

FIRST VIEWPORT: Left rail (brand, 5 nav links, level meter). Main column: page title "Aujourd'hui" with the date and remaining count in mono on one line, actions right-aligned; a single horizontal progress band (done / total, 7-day rate, best streak, open tasks) as one ruled row, not cards; then the habit list as rows with the check on the right. Background: a slow animated dot-matrix field behind everything.

FORM: Animated dot-matrix field (WebGL): a perspective grid of points drifting in slow waves; the share of points lit in vermilion equals today's progress. Signature move: checking a habit draws a closing ring around the check and stamps the day cell; the field brightens with it. Seed: assigned candidate 7 (stamp card, translated to the owner's futuristic pin); seed:0fdef5331759521e; roll ran degraded (no challengers).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
