# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user: the author (Ziad El Alami), who uses Momentum daily to track habits and tasks. Secondary audience: clients and recruiters who open the live demo from his portfolio to judge his craft as a developer. Phone and desktop matter equally.

## Product Purpose

Momentum lets one person track recurring habits, organise one-off tasks and see their progress, without an account or a server. Success: checking off today's habits takes seconds, and the app reads as the work of a professional developer.

## Positioning

Habits and tasks in one place, with habit streaks that respect non-scheduled days, numeric goals (8 glasses of water), "X times a week" frequencies, and a Kanban for tasks. All data stays in the browser.

## Operating Context

Used in short sessions: morning or evening check-ins on the phone, weekly planning and stats review on a computer. Also opened cold by portfolio visitors, who see the seeded demo data.

## Capabilities and Constraints

- Habits: check or numeric target, daily / specific weekdays / X per week, category, colour, icon, time, notes, archive, current and best streak, 14-day editable history.
- Tasks: Kanban (to do / doing / done) with drag and drop, 4 priorities, due dates, projects, subtasks, search, filters, sort.
- Stats: 30-day success rate, 20-week regularity map, habit ranking, task breakdown, XP, levels, 10 badges.
- Comfort: command palette (Ctrl+K), keyboard shortcuts, undo after delete/archive, JSON export/import, reduced-motion support.
- Stack: vanilla HTML/CSS/JS ES modules, no build step, Three.js vendored, localStorage, deployed on GitHub Pages via Actions.
- Interface language: French.
- Routes: `index.html` is the landing page (3D year of habits, live demo, app screenshots); `app.html` is the application.

## Brand Commitments

Name: Momentum. The owner asked for a professional, minimalist look and called the previous one childish (inferred: bright 3D blob, confetti, emoji icons, glass cards).

## Evidence on Hand

Deterministic demo data in `js/store.js`. No real users, testimonials or metrics; none may be invented.

## Product Principles

- Today's check-in comes first and takes seconds.
- Information over decoration: every visual element reports state.
- Works the same on phone and desktop.
- The user's data never leaves the browser.
