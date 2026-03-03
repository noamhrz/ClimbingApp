# Database Documentation

**Last updated:** 2026-03-03
**Database version:** Production

---

## Overview

The database contains **34 tables**, **4 views**, and several **enum/reference tables**, organized into these domains:

- Users & authentication (Users, Profiles)
- Workouts & training (Calendar, Workouts, WorkoutsExercises, ExerciseLogs)
- Climbing log (ClimbingLog, BoulderGrades, LeadGrades, BoardTypes, ClimbingLocations)
- Goals (BoardGoals, BoulderGoals, LeadGoals, GeneralGoals)
- Coach & groups (CoachTrainees, Groups, GroupMembers, GroupCalendar)
- Wellness (WellnessLog)
- Analytics views (v_weekly_volumes, v_weekly_wellness)
- Backup tables (pre-RLS snapshots)

**Email is the primary identifier across all user-scoped tables** — not UserID.

---

## Users & Authentication

### Users

The central user table. Email acts as the foreign key reference throughout the system.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | | PK — matches `auth.users.id` (Supabase Auth) |
| UserID | integer | NO | auto increment | Secondary integer identifier |
| Name | text | YES | | |
| Email | text | NO | | Used as FK across all user-scoped tables |
| Role | USER-DEFINED | YES | | `admin` / `coach` / `user` |
| Status | USER-DEFINED | YES | | |
| IsActive | boolean | YES | true | |

The table has two unique identifiers: `id` (UUID, linked to Supabase Auth) and `UserID` (integer). **`Email` is used as the FK reference** in all related tables — not `id` or `UserID`.

### Profiles

Supplementary profile data per user. Email is the primary key (not UUID).

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| Email | text | NO | |
| BodyWeightKG | numeric | NO | 70.0 |
| Phone | text | YES | |
| WhatsAppActive | boolean | YES | false |
| CreatedAt | timestamptz | YES | now() |
| UpdatedAt | timestamptz | YES | now() |

---

## Workouts & Training

### Workouts

Workout templates that can be assigned to users.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| WorkoutID | integer | NO | auto increment |
| Name | text | NO | |
| Category | text | YES | |
| Description | text | YES | |
| WhenToPractice | text | YES | |
| WorkoutNotes | text | YES | |
| VideoURL | text | YES | |
| containClimbing | boolean | YES | false |
| containExercise | boolean | YES | false |
| CalculatedExercisesTime | numeric | YES | |
| EstimatedClimbingTime | numeric | YES | |
| EstimatedTotalTime | numeric | YES | |
| IsActive | boolean | YES | true |
| CreatedBy | text | YES | |
| UpdatedAt | timestamp | YES | now() |

### WorkoutsExercises

Junction table linking workouts to exercises, with execution parameters.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| WorkoutExerciseID | integer | NO | PK |
| WorkoutID | integer | YES | → Workouts |
| ExerciseID | integer | YES | → Exercises |
| Sets | integer | NO | |
| Reps | integer | YES | null for duration-based |
| Rest | integer | YES | seconds |
| Order | integer | YES | display order |
| Block | integer | YES | superset/circuit grouping |
| Duration | integer | YES | seconds, for duration-based exercises |

### Exercises

Exercise library.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| ExerciseID | integer | NO | |
| Name | text | NO | |
| Description | text | YES | |
| Category | text | YES | |
| VideoURL | text | YES | |
| ImageURL | text | YES | |
| Status | USER-DEFINED | YES | 'Active' |
| IsSingleHand | boolean | YES | false |
| isDuration | boolean | YES | false |
| CreatedBy | text | YES | |
| CreatedAt | timestamptz | YES | now() |
| UpdatedAt | timestamp | YES | now() |

- `IsSingleHand` — exercise targets one hand at a time (logs include `HandSide`)
- `isDuration` — exercise is time-based, not rep-based

### Calendar

Scheduled workouts per user (individual calendar entries).

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| CalendarID | integer | NO | auto increment |
| Email | varchar | NO | → Users |
| WorkoutID | integer | NO | → Workouts |
| StartTime | timestamp | NO | |
| EndTime | timestamptz | YES | |
| TimeOfDay | varchar | YES | |
| Deloading | boolean | YES | false |
| DeloadingPercentage | integer | YES | 100 |
| Completed | boolean | YES | false |
| CoachNotes | text | YES | |
| ClimberNotes | text | YES | |
| RPE | integer | YES | 1–10 |
| Color | varchar | YES | |
| CreatedAt | timestamp | YES | now() |

- `DeloadingPercentage` — when deloading, what % of full load to apply (1–100)
- Both `ClimbingLog` and `ExerciseLogs` reference `CalendarID`

### WorkoutsForUser

Which workout templates are assigned to which users.

Composite PK on `(Email, WorkoutID)`. `AssignmentID` is an additional auto-increment unique column.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| Email | varchar | NO | → Users (PK) |
| WorkoutID | integer | NO | → Workouts (PK) |
| AssignmentID | integer | NO | auto increment |
| WorkoutID | integer | NO | → Workouts |
| AssignedBy | text | YES | |
| AssignedAt | timestamp | YES | now() |
| StartDate | date | YES | |
| EndDate | date | YES | |
| Frequency | text | YES | |
| IsActive | boolean | YES | true |
| Notes | text | YES | |
| Block | text | YES | |
| IsKeyWorkout | boolean | YES | false |
| CoachNote | text | YES | |

### ExerciseLogs

Actual exercise performance logs per session.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| ExerciseLogID | integer | NO | auto increment |
| Email | varchar | YES | → Users |
| WorkoutID | integer | YES | → Workouts |
| CalendarID | integer | YES | → Calendar |
| ExerciseID | integer | YES | → Exercises |
| SetNumber | integer | YES | |
| RepsPlanned | integer | YES | |
| RepsDone | integer | YES | |
| WeightKG | numeric | YES | |
| DurationSec | integer | YES | |
| RPE | integer | YES | 1–10 |
| Completed | boolean | YES | |
| HandSide | varchar | NO | 'Both' |
| VolumeScore | numeric | YES | 0 |
| Notes | text | YES | |
| CreatedAt | timestamp | YES | |
| UpdatedAt | timestamp | YES | |

---

## Climbing

### ClimbingLog

Individual route/problem attempts. Can be linked to a workout session or standalone (`WorkoutID=NULL`, `CalendarID=NULL`).

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| ClimbingLogID | integer | NO | |
| Email | varchar | YES | → Users |
| WorkoutID | integer | YES | → Workouts |
| CalendarID | integer | YES | → Calendar |
| LocationID | integer | YES | → ClimbingLocations |
| ClimbType | varchar | YES | 'Boulder' / 'Board' / 'Lead' |
| BoardTypeID | integer | YES | → BoardTypes |
| GradeID | integer | YES | → BoulderGrades or LeadGrades |
| RouteName | text | YES | |
| Attempts | integer | YES | 0 |
| Successful | boolean | YES | false |
| DurationSeconds | integer | YES | |
| VolumeScore | numeric | YES | 0 |
| Notes | text | YES | |
| LogDateTime | timestamp | YES | actual date of climb |
| CreatedAt | timestamp | YES | now() |
| UpdatedAt | timestamp | YES | now() |

- `LogDateTime` is the climb date/time, not the record creation time
- `GradeID` has a FK constraint to `LeadGrades.LeadGradeID` only — for Boulder/Board entries the grade is also stored via this FK, with the actual V-grade label resolved in app code via `BoulderGrades`

### BoulderGrades

| Column | Type |
|--------|------|
| BoulderGradeID | integer PK |
| VGrade | varchar (V0–V17) |
| FontGrade | varchar (6a, 6a+, 6b…) |

### LeadGrades

| Column | Type |
|--------|------|
| LeadGradeID | integer PK |
| AussieGrade | integer |
| FrenchGrade | varchar (5c, 6a, 6a+…) |
| YosemiteGrade | varchar |
| DifficultyLevel | varchar |

### BoardTypes

Training boards (Kilter, Tension, MoonBoard, etc.).

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| BoardID | integer | NO | auto increment |
| BoardName | varchar | NO | |
| Description | text | YES | |
| Manufacturer | varchar | YES | |
| AppSupported | boolean | YES | false |
| AngleRange | varchar | YES | |
| LEDSystem | boolean | YES | false |
| CreatedAt | timestamp | YES | now() |

### ClimbingLocations

| Column | Type | Nullable |
|--------|------|----------|
| LocationID | integer | NO |
| LocationName | varchar | NO |
| LocationType | varchar | NO | — 'Gym' / 'Outdoor' / 'Board' |
| City | varchar | YES |
| Country | varchar | YES |
| BoardTypeID | integer | YES | → BoardTypes |
| Notes | text | YES |
| CreatedAt | timestamp | YES |

---

## Goals

All goal tables share the same structure: keyed by `(Email, Year, Quarter)` with one integer column per grade representing the target count for that quarter.

### BoulderGoals

Quarterly boulder climbing targets per V-grade.

| Column | Type | Notes |
|--------|------|-------|
| BoulderGoalID | integer PK | |
| Email | text | → Users |
| Year | integer | |
| Quarter | integer | 1–4 |
| V0 … V17 | integer | target count per grade, default 0 |
| CreatedAt / UpdatedAt | timestamp | |

### BoardGoals

Quarterly board climbing targets per V-grade (same structure as BoulderGoals).

| Column | Type |
|--------|------|
| BoardGoalID | integer PK |
| Email | text |
| Year / Quarter | integer |
| V0 … V17 | integer |
| CreatedAt / UpdatedAt | timestamp |

### LeadGoals

Quarterly lead climbing targets per French grade.

| Column | Type |
|--------|------|
| LeadGoalID | integer PK |
| Email | text |
| Year / Quarter | integer |
| 5c, 6a, 6a+, 6b, 6b+, 6c, 6c+, 7a … 9b+ | integer |
| CreatedAt / UpdatedAt | timestamp |

### GeneralGoals

Quarterly free-text training goals.

| Column | Type | Nullable |
|--------|------|----------|
| GoalID | integer PK | NO |
| Email | text | NO |
| Year | integer | NO |
| Quarter | integer | NO |
| OverarchingGoal | text | YES |
| Goal1 … Goal5 | text | YES |
| CreatedAt / UpdatedAt | timestamp | YES |

---

## Coach & Groups

### CoachTrainees

Coach–trainee relationship management.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| ID | integer | NO | auto increment |
| CoachEmail | varchar | NO | → Users |
| TraineeEmail | varchar | NO | → Users |
| AssignedAt | timestamp | YES | now() |
| AssignedBy | varchar | YES | |
| StartDate / EndDate | date | YES | |
| Active | boolean | YES | true |
| Status | USER-DEFINED | YES | 'active' (trainee_status_enum) |
| CoachNotes | text | YES | |
| TrainingPlan | text | YES | |
| Goals | text | YES | |
| Frequency | varchar | YES | |
| PreferredContactMethod | varchar | YES | |
| ContactFrequency | varchar | YES | |
| CreatedAt / UpdatedAt | timestamp | YES | |

### Groups

| Column | Type |
|--------|------|
| GroupID | integer PK |
| GroupName | varchar NOT NULL |
| GroupType | varchar |
| CoachEmail | varchar → Users |
| Description | text |
| Status | varchar ('Active') |
| CreatedAt | timestamp |

### GroupMembers

| Column | Type | Default |
|--------|------|---------|
| GroupMemberID | integer PK | |
| GroupID | integer → Groups | |
| Email | varchar → Users | |
| Role | varchar | 'Member' |
| JoinedAt | timestamp | now() |
| Status | varchar | 'Active' |

### GroupCalendar

Group-level scheduled workouts (parallel to individual Calendar).

| Column | Type | Nullable |
|--------|------|----------|
| GroupCalendarID | integer PK | NO |
| GroupID | integer | YES → Groups |
| WorkoutID | integer | YES → Workouts |
| StartTime | timestamp | NO |
| TimeOfDay | varchar | YES |
| Deloading | boolean | YES |
| Completed | boolean | YES |
| CoachNotes / GroupNotes | text | YES |
| RPE | integer | YES |
| Color | varchar | YES |
| CreatedBy | varchar | YES → Users |
| CreatedAt | timestamp | YES |

---

## Wellness

### WellnessLog

Daily wellness tracking per user.

| Column | Type | Nullable |
|--------|------|----------|
| WellnessID | uuid PK | NO (gen_random_uuid()) |
| Email | text | NO → Users |
| Date | date | NO |
| VitalityLevel | integer | YES (1–10) |
| SleepHours | numeric | YES |
| PainArea | text | YES |
| PainLevel | integer | YES (1–10) |
| Comments | text | YES |
| CreatedAt / UpdatedAt | timestamp | YES |

Unique constraint on `(Email, Date)` — one entry per user per day.

---

## Views

### CoachTraineesActiveView

Active coach–trainee relationships with resolved names.

| Column | Type |
|--------|------|
| ID | integer |
| CoachEmail / CoachName | varchar / text |
| TraineeEmail / TraineeName | varchar / text |
| AssignedAt | timestamp |
| StartDate / EndDate | date |
| Status | USER-DEFINED |
| Active | boolean |

Used by `AuthContext` to load a coach's trainees on login.

### CoachTraineesFullView

Same as above but includes inactive relationships. Additional columns: `CoachUserID`, `TraineeUserID`, `Frequency`, `Goals`, `TrainingPlan`, `UpdatedAt`.

### v_weekly_volumes

Weekly training volume aggregated by type.

| Column | Type |
|--------|------|
| Email | varchar |
| WeekStart | timestamp |
| BoulderVolume | numeric |
| BoardVolume | numeric |
| LeadVolume | numeric |
| ExerciseVolume | numeric |
| CompletedSessions | bigint |

### v_weekly_wellness

Weekly wellness averages.

| Column | Type |
|--------|------|
| Email | text |
| WeekStart | timestamp |
| AvgSleep | numeric |
| AvgVitality | numeric |
| AvgPain | numeric |

---

## Reference / Enum Tables

These tables store allowed values for various fields:

| Table | Column | Purpose |
|-------|--------|---------|
| RolesEnum | Role | User roles |
| ColorEnum | Color | Calendar event colors |
| ExerciseCategoryEnum | Category | Exercise categories |
| TimeOfDayEnum | TimeOfDay | Morning / Afternoon / Evening |
| WhenToPracticeEnum | WhenToPractice | Workout scheduling hints |
| WorkoutCategoryEnum | Category | Workout categories |
| QuotesFromClimbers | Quote_EN, Quote_HE, Author, Category | Motivational quotes (bilingual) |

---

## Backup Tables

Snapshots taken before RLS was applied. Not used in application code.

- `backup_calendar_pre_rls`
- `backup_climbinglog_pre_rls`
- `backup_coachtrainees_pre_rls`
- `backup_exerciselogs_pre_rls`
- `backup_users_pre_rls`

---

## Relationships Summary

All relationships below are enforced foreign key constraints.

```
Users (Email)
  ├── Calendar.Email → Workouts.WorkoutID
  │     ├── ClimbingLog.CalendarID
  │     └── ExerciseLogs.CalendarID
  ├── ExerciseLogs.Email → Exercises.ExerciseID
  │                      → Workouts.WorkoutID
  ├── WorkoutsForUser.Email → Workouts.WorkoutID
  ├── CoachTrainees.CoachEmail  ─┐
  ├── CoachTrainees.TraineeEmail ┘ (both → Users.Email)
  ├── Groups.CoachEmail
  │     ├── GroupMembers.GroupID → Users.Email
  │     └── GroupCalendar.GroupID → Workouts.WorkoutID
  │                       .CreatedBy → Users.Email
  ├── WellnessLog.Email
  ├── BoardGoals.Email
  ├── BoulderGoals.Email
  ├── LeadGoals.Email
  ├── GeneralGoals.Email
  └── ClimbingLog.Email → Workouts.WorkoutID
                        → Calendar.CalendarID
                        → LeadGrades.LeadGradeID  ⚠️ (FK only to LeadGrades, not BoulderGrades)
                        → ClimbingLocations.LocationID → BoardTypes.BoardID
                        → BoardTypes.BoardID

WorkoutsExercises.WorkoutID → Workouts.WorkoutID
              .ExerciseID → Exercises.ExerciseID

ClimbingLocations.BoardTypeID → BoardTypes.BoardID
```

> ⚠️ **`ClimbingLog.GradeID` has a FK constraint only to `LeadGrades`**, even for Boulder and Board entries.
> Boulder grade lookups (`BoulderGrades`) are resolved in application code, not enforced at DB level.

> **`Profiles` has no FK constraint to `Users`**, even though it uses Email as its primary key.

---

## Row Level Security (RLS)

### Pattern used across most tables

Three access levels are applied consistently on Calendar, ClimbingLog, and ExerciseLogs:

| Who | SELECT | INSERT | UPDATE | DELETE |
|-----|--------|--------|--------|--------|
| Row owner (`Email = auth.jwt()->>'email'`) | ✅ | ✅ | ✅ | ✅ |
| Active coach of that user (via `CoachTrainees`) | ✅ | ✅ | ✅ | ✅ |
| Admin role | ✅ | ✅ | ✅ | ✅ |
| `service_role` | ✅ | ✅ | ✅ | ✅ |

---

### Users

| Policy | Role | Command | Rule |
|--------|------|---------|------|
| allow_login_read_users / temp_login_fix | public | SELECT | `true` (all rows visible) |
| anon_users_can_read | anon | SELECT | `true` |
| authenticated_users_can_read | authenticated | SELECT | `true` |
| users_view_own_profile | authenticated | SELECT | own email |
| users_update_own_profile | authenticated | UPDATE | own email |
| admin_can_update_all_users | authenticated | UPDATE | requester is admin |
| admin_insert_users | authenticated | INSERT | requester is admin |
| admin_can_delete_users | authenticated | DELETE | requester is admin |
| service_role_full_access_users | service_role | ALL | `true` |

> ⚠️ The `Users` table is fully readable by **anyone** (anon, public, authenticated) due to multiple overlapping SELECT policies. Every user's name, email, and role is visible without authentication.

---

### Calendar

| Policy | Command | Rule |
|--------|---------|------|
| users_view_own_calendar | SELECT | own email |
| coaches_view_trainees_calendar | SELECT | active coach of row owner |
| admin_full_access_calendar | ALL | admin role **or** `noam.hrz@gmail.com` |
| calendar_insert_policy | INSERT | own OR active coach OR admin |
| calendar_update_policy | UPDATE | own OR active coach OR admin |
| calendar_delete_policy | DELETE | own OR active coach OR admin |
| service_role_full_access_calendar | ALL | `true` |
| temp_public_read_calendar | SELECT | `true` (public — likely temporary) |

---

### ClimbingLog

Same structure as Calendar:

| Policy | Command | Rule |
|--------|---------|------|
| users_view_own_climbing | SELECT | own email |
| coaches_view_trainees_climbing | SELECT | active coach of row owner |
| admin_full_access_climbing | ALL | admin role **or** `noam.hrz@gmail.com` |
| climbinglog_insert_policy | INSERT | own OR active coach OR admin |
| climbinglog_update_policy | UPDATE | own OR active coach OR admin |
| climbinglog_delete_policy | DELETE | own OR active coach OR admin |
| service_role_full_access_climbing | ALL | `true` |
| temp_public_read_climbing | SELECT | `true` (public — likely temporary) |

---

### ExerciseLogs

Same structure as Calendar:

| Policy | Command | Rule |
|--------|---------|------|
| users_view_own_exercise_logs | SELECT | own email |
| coaches_view_trainees_exercise_logs | SELECT | active coach of row owner |
| admin_full_access_exercise_logs | ALL | admin role **or** `noam.hrz@gmail.com` |
| exerciselogs_insert_policy | INSERT | own OR active coach OR admin |
| exerciselogs_update_policy | UPDATE | own OR active coach OR admin |
| exerciselogs_delete_policy | DELETE | own OR active coach OR admin |
| service_role_full_access_exercise_logs | ALL | `true` |
| temp_public_read_exercise_logs | SELECT | `true` (public — likely temporary) |

---

### CoachTrainees

| Policy | Command | Rule |
|--------|---------|------|
| coaches_view_own_trainees | SELECT | `CoachEmail = auth email` |
| trainees_view_coaches | SELECT | `TraineeEmail = auth email` |
| coaches_insert_own_trainees | INSERT | `CoachEmail = auth email` |
| coaches_update_own_trainees | UPDATE | `CoachEmail = auth email` |
| coaches_delete_own_trainees | DELETE | `CoachEmail = auth email` |
| admin_full_access_coach_trainees | ALL | admin role **or** `noam.hrz@gmail.com` |
| service_role_full_access_coach_trainees | ALL | `true` |
| temp_public_read_coach_trainees | SELECT | `true` (public — likely temporary) |

---

### Exercises

| Policy | Role | Command | Rule |
|--------|------|---------|------|
| Anyone can read active exercises | public | SELECT | `Status = 'Active'` |
| Coach can manage own exercises | public | ALL | `CreatedBy = auth email` AND role is coach |
| Admin full access | public | ALL | role is admin |

> ⚠️ These policies use `{public}` role instead of `{authenticated}` — may be unintentional.

---

### Profiles

| Policy | Command | Rule |
|--------|---------|------|
| Enable read for authenticated users | SELECT | `true` (all profiles readable by any authenticated user) |
| Enable update for own profile | UPDATE | own email |

---

### WellnessLog

| Policy | Role | Command | Rule |
|--------|------|---------|------|
| Users can view their own wellness logs | authenticated | SELECT | own email |
| Users can insert their own wellness logs | authenticated | INSERT | own email |
| Users can update their own wellness logs | authenticated | UPDATE | own email |
| Users can delete their own wellness logs | authenticated | DELETE | own email |
| Users can manage their own wellness logs | public | ALL | own email (via `current_setting` JWT) |
| coaches_view_trainees_wellness | public | SELECT | active coach of row owner |
| admins_view_all_wellness | public | SELECT | admin role and IsActive=true |
| Service role can do everything | service_role | ALL | `true` |

> ⚠️ The coach and admin SELECT policies use `{public}` role instead of `{authenticated}`.

---

### BoardTypes

| Policy | Command | Rule |
|--------|---------|------|
| Enable read access for all users | SELECT | `true` |

---

### Tables with no RLS

The following tables have **no RLS policies** defined — access is unrestricted at the DB level (application logic is the only guard):

- `Workouts`, `WorkoutsExercises`, `WorkoutsForUser`
- `BoulderGrades`, `LeadGrades`, `ClimbingLocations`
- `BoardGoals`, `BoulderGoals`, `LeadGoals`, `GeneralGoals`
- `Groups`, `GroupMembers`, `GroupCalendar`
- All enum tables, `QuotesFromClimbers`

---

### Notable issues

| Issue | Details |
|-------|---------|
| Hardcoded email in admin policies | `noam.hrz@gmail.com` is hardcoded as a bypass in Calendar, ClimbingLog, ExerciseLogs, and CoachTrainees admin policies |
| `temp_public_read_*` policies | Calendar, ClimbingLog, CoachTrainees, ExerciseLogs all have a `SELECT true` for public — likely meant to be temporary |
| `Users` fully public | Multiple SELECT policies make the entire Users table readable by anyone, including unauthenticated requests |
| Wrong role on some policies | Several WellnessLog and Exercises policies use `{public}` instead of `{authenticated}` |

---

## Indexes & Unique Constraints

Only non-PK indexes are listed here. PKs are documented per table above.

### Unique constraints (business rules enforced at DB level)

| Table | Columns | Meaning |
|-------|---------|---------|
| BoardGoals | `(Email, Year, Quarter)` | One record per user per quarter |
| BoulderGoals | `(Email, Year, Quarter)` | One record per user per quarter |
| LeadGoals | `(Email, Year, Quarter)` | One record per user per quarter |
| GeneralGoals | `(Email, Year, Quarter)` | One record per user per quarter |
| CoachTrainees | `(CoachEmail, TraineeEmail)` | A coach–trainee pair can only exist once |
| ExerciseLogs | `(CalendarID, ExerciseID, HandSide)` | One log entry per exercise per hand per calendar session |
| WellnessLog | `(Email, Date)` | One wellness entry per user per day |
| Users | `lower(Email)` | Email uniqueness is **case-insensitive** |
| Users | `Email` | Regular case-sensitive unique (redundant with above) |
| WorkoutsForUser | `(Email, WorkoutID)` | Composite PK — a workout can only be assigned once per user |

### Performance indexes

| Table | Index | Columns | Notes |
|-------|-------|---------|-------|
| BoardGoals | idx_board_goals_user_quarter | `(Email, Year, Quarter)` | Covers the unique constraint |
| BoulderGoals | idx_boulder_goals_user_quarter | `(Email, Year, Quarter)` | Covers the unique constraint |
| LeadGoals | idx_lead_goals_user_quarter | `(Email, Year, Quarter)` | Covers the unique constraint |
| GeneralGoals | idx_general_goals_user_quarter | `(Email, Year, Quarter)` | Covers the unique constraint |
| CoachTrainees | idx_coach_trainees_coach | `CoachEmail` | Fast lookup of a coach's trainees |
| CoachTrainees | idx_coach_trainees_trainee | `TraineeEmail` | Fast lookup of a trainee's coaches |
| CoachTrainees | idx_coach_trainees_active | `Active` | Filters active relationships |
| CoachTrainees | idx_coach_trainees_status | `Status` | Filters by status enum |
| Exercises | idx_exercises_is_duration | `isDuration` | Filters duration-based exercises |
| WellnessLog | idx_wellness_email_date | `(Email, Date DESC)` | Optimises recent-first queries |
| WorkoutsForUser | idx_workouts_for_user_key | `(Email, IsKeyWorkout)` WHERE `IsKeyWorkout = true` | Partial index — only indexes key workouts |

---

## Common Queries

```sql
-- User's calendar
SELECT * FROM Calendar WHERE Email = 'user@example.com' ORDER BY StartTime DESC;

-- User's climbing log
SELECT * FROM ClimbingLog WHERE Email = 'user@example.com' ORDER BY LogDateTime DESC;

-- Coach's active trainees
SELECT * FROM CoachTraineesActiveView WHERE CoachEmail = 'coach@example.com';

-- Weekly volumes
SELECT * FROM v_weekly_volumes WHERE Email = 'user@example.com' ORDER BY WeekStart DESC;

-- Quarterly boulder goals
SELECT * FROM BoulderGoals WHERE Email = 'user@example.com' AND Year = 2026 AND Quarter = 1;
```
