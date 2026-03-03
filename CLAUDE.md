# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Turbopack)
npm run dev:webpack  # Start dev server with webpack (fallback)
npm run build        # Production build
npm run lint         # Run ESLint
```

No test framework is configured. There is no `npm test` command.

Required environment variables (create `.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Architecture

**Next.js 16 App Router** with React 19, TypeScript, Tailwind CSS v4, and Supabase as the backend.

The app is a climbing training management system written in Hebrew with RTL layout (`lang="he" dir="rtl"` in root layout).

### Auth & User System

Two distinct "user" concepts exist simultaneously:
- **`currentUser`** — the logged-in user (from Supabase Auth + `Users` table)
- **`activeUser`** — the user whose data is being viewed (may differ for coaches/admins)

This impersonation pattern is central to the app. Coaches can switch to view their trainees' data; admins can view any user. Always use `activeUser` (via `useActiveUserEmail()`) when fetching data to display, and `currentUser` for permission checks.

**`AuthContext`** (`context/AuthContext.tsx`) is the primary auth system. It:
- Authenticates via Supabase Auth
- Loads user profile from the `Users` table (Email, Name, Role)
- Loads accessible users from `CoachTraineesActiveView` (for coaches) or all Users (for admin)
- Persists the active user selection to `localStorage`

**`UserContext`** (`context/UserContext.tsx`) is a secondary/legacy context used in some components for a simpler `selectedUser` state.

### Role & Permission System (`lib/permissions.ts`)

Three roles: `admin`, `coach`, `user`. Permissions and features are defined as TypeScript types and mapped per role in `ROLE_PERMISSIONS` and `ROLE_FEATURES`.

Key hooks from `AuthContext`:
- `useAuth()` — full auth context
- `useActiveUserEmail()` — email of the user being viewed
- `usePermission(permission)` — boolean permission check
- `useFeature(feature)` — boolean feature check
- `useRole()` — current user's role

The `Footer` component (fixed bottom bar) is only shown to coaches/admins and provides the user-switching UI.

### Directory Structure

```
app/                    # Next.js App Router pages
  api/
    admin/              # Admin API routes
    test-whatsapp/      # WhatsApp integration (Twilio)
  calendar/             # Calendar view (react-big-calendar + FullCalendar)
  dashboard/            # Stats dashboard
  workout/[id]/         # Workout execution page
  workouts/             # Workout list
  workouts-editor/      # Workout template editor
  climbing-log/         # Climbing log (bouldering/lead routes)
  exercise-analytics/   # Exercise progress analytics
  athlete-stats/        # Athlete statistics
  goals/                # Goal tracking
  profile/              # User profile
  admin/                # Admin panel (exercises, workouts, users, assign-workouts)
  coach/                # Coach-specific views
  page.tsx              # Login page (route: /)

components/             # Shared UI components, organized by domain
  calendar/             # CalendarToolbar, DayListView
  climbing/             # ClimbingLog chart, filters, list, modal
  dashboard/            # Stats cards, charts, wellness
  exercises/            # Exercise form, sidebar, workout cards
  goals/                # Goals pyramid, forms
  workouts/             # Workout cards, forms, lists
  admin/                # Admin-specific components

lib/                    # Business logic and API calls
  supabaseClient.ts     # Supabase client singleton
  permissions.ts        # Role/permission/feature system
  workout-api.ts        # Workout CRUD
  climbing-log-api.ts   # Climbing log CRUD + histogram calculations
  climbing-helpers.ts   # Climbing grade utilities
  goals-api.ts          # Goals CRUD
  workout-calculations.ts # Volume/time calculations
  *-metrics.ts          # Stats aggregation per domain
  *-stats-metrics.ts    # Metrics for athlete stats
  urgency-*.ts          # Urgency/deload algorithm

types/                  # TypeScript types per domain
  workouts.ts
  climbing.ts
  exercises.ts
  analytics.ts

context/
  AuthContext.tsx       # Primary auth + user switching context
  UserContext.tsx       # Legacy secondary user selection context

documentation/          # Internal project docs (Hebrew)
```

### Data Flow Pattern

All data access goes through Supabase directly from client components using the singleton in `lib/supabaseClient.ts`. There is no server-side data fetching layer — all pages are client components (`'use client'`). API routes under `app/api/` are used only for server-side operations (Twilio/WhatsApp, admin tasks).

Domain-specific API functions live in `lib/*-api.ts` files and use `activeUser.Email` as the filter key for user-scoped data.

### Key Database Tables

- `Users` — Email (primary key across system), Name, Role
- `Calendar` — scheduled workouts per user
- `Workouts` / `WorkoutsExercises` — workout templates
- `ClimbingLog` — boulder/lead route logs
- `CoachTrainees` / `CoachTraineesActiveView` — coach-trainee relationships
- `ExerciseLogs` — per-exercise performance history
- `WellnessLog` — wellness tracking

### UI Conventions

- Tailwind CSS v4 for all styling
- RTL layout throughout (Hebrew UI)
- `framer-motion` for animations
- `recharts` and `chart.js`/`react-chartjs-2` for data visualization
- `react-big-calendar` and `@fullcalendar/*` for calendar views
- `react-dnd` for drag-and-drop in workout editor
- `react-icons` for icons
