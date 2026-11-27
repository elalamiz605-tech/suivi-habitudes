# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user: the author (Ziad El Alami), who uses Momentum daily to track habits and tasks. Secondary audience: clients and recruiters who open the live demo from his portfolio to judge his craft as a developer. Phone and desktop matter equally.

## Product Purpose

Momentum lets one person track recurring habits, organise one-off tasks and see their progress, without an account or a server. It installs as a PWA and works offline. Success: checking off today's habits takes seconds, and the app reads as the work of a professional developer.

## Positioning

Habits and tasks in one place, with habit streaks that respect non-scheduled days, skipped days, pauses and vacations; numeric goals (8 glasses of water), quit habits ("days without"), "X times a week / month" and "every X days" frequencies; reminders; a weekly insight engine; and a Kanban for tasks. All data stays in the browser, with optional no-account sync (transfer code, GitHub gist).

## Operating Context

Used in short sessions: morning or evening check-ins on the phone, weekly planning and stats review on a computer. Also opened cold by portfolio visitors, who see the seeded demo data.

## Capabilities and Constraints

- Habits: check, numeric target or quit habit; daily / specific weekdays / X per week / every X days / X per month; templates library; category, colour, time, up to 3 reminders, notes, archive; skip a day, pause, global vacation mode, custom day-start hour; daily note + mood; timer for minute-based habits; current and best streak, 14-day editable history.
- Tasks: Kanban (to do / doing / done) with drag and drop, 4 priorities, due dates, projects, subtasks, search, filters, sort.
- Stats: weekly insights (trend, weak/strong weekday, streaks at risk, struggling/improving habits, mood vs success), 30-day success rate, 20-week or 12-month regularity map, habit ranking, task breakdown, average mood, XP, levels, 12 badges, CSV export.
- Data: JSON export/import, Web Share, compressed transfer code, daily automatic snapshots (7 days), optional GitHub gist sync (manual or automatic).
- Signature features: 3D year of real data with shareable image; weekly review page with one-click applicable suggestions and optional AI coach (Claude API key stored locally); "never twice" comeback mode with mini version, identities and votes, rebound stats.
- Platform: PWA (manifest, service worker, offline, install prompt, update toast), notifications via service worker, dark / light / auto theme.
- Comfort: command palette (Ctrl+K), keyboard shortcuts, undo after delete/archive/pause/skip, reduced-motion support.
- Stack: vanilla HTML/CSS/JS ES modules, no build step, Three.js vendored, localStorage, deployed on GitHub Pages via Actions.
- Interface languages: French (default), Spanish, English (auto-detected, switchable in settings).
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
