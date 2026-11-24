# Design

Momentum is a dark, precise instrument for daily discipline. Graphite surfaces, hairline rules, one vermilion signal, and an animated dot field behind everything whose lit share equals today's progress.

## Colour

Restrained: tinted neutrals plus one signal.

| Token | Value | Role |
| --- | --- | --- |
| `--bg` | `#090a0c` | Page ground behind the field |
| `--surface` | `rgba(14,16,19,.9)` | Lists, band, panels, board columns |
| `--surface-2` | `#121418` | Task cards, dialogs, buttons |
| `--raised` | `#171a1f` | Active nav, selected segment, toasts |
| `--field` | `#0c0e11` | Inputs, selects, search |
| `--line` / `--line-2` | `#1e2228` / `#2b3037` | Dividers / control borders |
| `--text` / `--text-2` / `--text-3` | `#eceef1` / `#a4aab4` / `#7f8590` | Primary / secondary / meta |
| `--signal` | `#ff5b3a` | Done states, primary action, selection, focus, urgent priority |
| `--signal-ink` | `#1a0803` | Text and icons on signal |
| `--warn` | `#f2b84b` | Overdue and high priority only |
| `--danger` | `#ff7b6e` | Destructive actions only |

Habit colours (`COLORS` in `js/store.js`) appear only as the 8 px `.tick` square. Done is always the signal, never the habit colour.

## Type

- UI: Host Grotesk (self-hosted, `assets/fonts`), 14 px base; h1 28 px / 600 / -0.025em; h2 15 px; metadata 12–12.5 px.
- Numbers: Martian Mono (self-hosted, size-adjust 88%) for every count, date, percentage, streak, XP, axis and weekday letter. Tabular numerals. Never for prose.

## Shape and space

Radii: 10 px containers, 7 px controls, 5 px day cells, 2 px ticks and bars. 1 px borders everywhere; no glass, no glow, no gradients, no one-sided accent bars. Dialog and toast shadows are soft and offset. Page padding 40/48 px desktop, 24/16 px mobile; sections 36 px apart.

## Components

- **Band**: one ruled row of metrics (label, mono value, sub-line); the first cell carries a segmented bar, one segment per habit due today.
- **List**: one bordered container, rows divided by hairlines. Habit rows: tick, title + meta, 7 day cells, streak, optional counter, round check on the right.
- **Check (signature)**: 34 px ring; validating fills it with the signal and draws a closing seal ring around it (`.stamp`, 0.6 s). The background field lights more points at the same time.
- **Day cells**: done = signal fill; partial = signal tint; missed = dashed border; not scheduled = faded; today = outline ring.
- **Buttons**: primary = signal fill with signal-ink text; default = surface-2 with line-2 border; ghost; danger outlined.
- **Badges**: icon tile + name + state label in a single ruled grid; unlocked icons and state in signal.

## Motion

150–250 ms state transitions with `cubic-bezier(.22,1,.36,1)`; 220 ms page enter fade. The only authored moment is the stamp. The background field (`js/scene.js`) drifts in slow waves, lit share follows progress, and a radial wave runs through it on a complete day or level-up. It pauses when the tab is hidden and can be switched off in Réglages; reduced motion disables animation.

## Landing page (`index.html`)

A separate Persuade surface with its own night palette: ink `#07080c`, indigo `#7b6cff`, coral `#ff7a59`, gradient `linear-gradient(120deg, #7b6cff, #ff7a59)` for the primary button and the emphasised half of each headline. Inter Tight for text, JetBrains Mono for figures (Google Fonts). The picture is `js/year.js`: 371 instanced blocks (53 weeks × 7 days) whose height and colour encode habits kept that day; scroll morphs calendar → rising spiral → three rings, and the live demo raises today's block and sends a wave through the year on a complete day. Copy sits in a left column over a veil; the shape sits to the right on wide screens.
