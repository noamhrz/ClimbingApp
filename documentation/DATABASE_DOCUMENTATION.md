# 🗄️ Climbing App - Database Documentation

**תאריך עדכון אחרון:** 11/11/2025  
**גרסת מסד נתונים:** Production v1.0

---

## 📋 תוכן עניינים

1. [סקירה כללית](#סקירה-כללית)
2. [טבלאות מרכזיות](#טבלאות-מרכזיות)
3. [מערכת משתמשים ואימות](#מערכת-משתמשים-ואימות)
4. [מערכת אימונים](#מערכת-אימונים)
5. [מערכת טיפוס](#מערכת-טיפוס)
6. [מערכת קבוצות ומאמנים](#מערכת-קבוצות-ומאמנים)
7. [מערכת Wellness](#מערכת-wellness)
8. [קשרים בין טבלאות](#קשרים-בין-טבלאות)
9. [Views ו-Analytics](#views-ו-analytics)
10. [Row Level Security (RLS)](#row-level-security-rls)

---

## 🎯 סקירה כללית

מסד הנתונים מכיל **29 טבלאות** ו**2 views** המארגנות:
- ניהול משתמשים ואימות (Users, Profiles)
- תכנון ומעקב אימונים (Calendar, Workouts, WorkoutsExercises)
- תיעוד טיפוס (ClimbingLog, BoulderGrades, LeadGrades)
- ניהול קבוצות ומאמנים (CoachTrainees, Groups, GroupMembers)
- מעקב בריאות ורווחה (WellnessLog)
- אנליטיקה (v_weekly_volumes, v_weekly_wellness)

---

## 👥 מערכת משתמשים ואימות

### 1. **Users** (טבלה מרכזית)

**תיאור:** טבלת המשתמשים הראשית של המערכת

```sql
CREATE TABLE Users (
  UserID INTEGER PRIMARY KEY,
  Name TEXT,
  Email TEXT UNIQUE NOT NULL,
  Role role_enum,  -- 'admin', 'coach', 'athlete'
  Status status_enum
);
```

**שדות:**
| שדה | סוג | תיאור | אילוצים |
|-----|-----|--------|----------|
| `UserID` | INTEGER | מזהה ייחודי | PRIMARY KEY, AUTO INCREMENT |
| `Name` | TEXT | שם מלא | NULL מותר |
| `Email` | TEXT | כתובת מייל | UNIQUE, NOT NULL, מפתח עיקרי לזיהוי |
| `Role` | ENUM | תפקיד משתמש | 'admin' / 'coach' / 'athlete' |
| `Status` | ENUM | סטטוס משתמש | 'active' / 'inactive' / etc. |

**Foreign Keys:**
- `Email` משמש כ-FK בטבלאות רבות: Calendar, ClimbingLog, ExerciseLogs, CoachTrainees, Groups, WorkoutsForUser

**הערות חשובות:**
- ⚠️ **אין שדה סיסמה!** המערכת כרגע לא תומכת באימות מלא
- 🔐 **צריך להוסיף:** `PasswordHash`, `Salt`, `LastLogin`, `CreatedAt`, `UpdatedAt`
- 📧 Email משמש כמזהה ראשי בכל המערכת
- 🎭 Role קובע הרשאות (admin/coach/athlete)

**RLS Policies:**
- אין policies ספציפיות ל-Users (צריך להוסיף!)

---

### 2. **Profiles** (טבלה משלימה)

**תיאור:** טבלה המחוברת ל-Supabase Auth, מכילה מידע נוסף על משתמשים

```sql
CREATE TABLE Profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  role TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
```

**שדות:**
| שדה | סוג | תיאור |
|-----|-----|--------|
| `id` | UUID | מזהה Supabase Auth |
| `email` | TEXT | כתובת מייל (מסונכרן מ-auth.users) |
| `full_name` | TEXT | שם מלא |
| `role` | TEXT | תפקיד (טקסט חופשי) |
| `created_at` | TIMESTAMPTZ | תאריך יצירה |
| `updated_at` | TIMESTAMPTZ | תאריך עדכון |

**הערות:**
- 🔗 מחוברת ל-Supabase Authentication System
- 🔄 כנראה מיותרת אם Users מתוחזקת - צריך להחליט על אסטרטגיה אחידה
- ⚠️ יש כפילות בין Users ו-Profiles - צריך לאחד!

---

### 3. **RolesEnum** (טבלת Enum)

```sql
CREATE TABLE RolesEnum (
  Role VARCHAR PRIMARY KEY
);
```

**ערכים אפשריים:**
- `admin` - מנהל מערכת
- `coach` - מאמן
- `athlete` - מתאמן

---

## 🏋️ מערכת אימונים

### 1. **Workouts** (תבנית אימון)

**תיאור:** הגדרת אימונים (תבניות) שניתן להקצות למשתמשים

```sql
CREATE TABLE Workouts (
  WorkoutID INTEGER PRIMARY KEY,
  Name TEXT NOT NULL,
  Category TEXT,
  Description TEXT,
  WhenToPractice TEXT,
  WorkoutNotes TEXT,
  VideoURL TEXT,
  containClimbing BOOLEAN,
  containExercise BOOLEAN,
  CalculatedExercisesTime NUMERIC,
  EstimatedClimbingTime NUMERIC,
  EstimatedTotalTime NUMERIC,
  UpdatedAt TIMESTAMP,
  IsActive BOOLEAN,
  CreatedBy TEXT
);
```

**שדות מרכזיים:**
- `containClimbing` - האם כולל טיפוס
- `containExercise` - האם כולל תרגילי כוח
- `EstimatedTotalTime` - זמן משוער לאימון (דקות)
- `IsActive` - האם האימון זמין להקצאה

---

### 2. **WorkoutsExercises** (תרגילים באימון)

**תיאור:** קשר רב-לרבים בין אימונים לתרגילים, עם פרטי ביצוע

```sql
CREATE TABLE WorkoutsExercises (
  WorkoutExerciseID INTEGER PRIMARY KEY,
  WorkoutID INTEGER REFERENCES Workouts(WorkoutID),
  ExerciseID INTEGER REFERENCES Exercises(ExerciseID),
  Sets INTEGER NOT NULL,
  Reps INTEGER,
  Rest INTEGER,
  Order INTEGER,
  Block INTEGER,
  Duration INTEGER
);
```

**שדות:**
- `Sets` - מספר סטים
- `Reps` - חזרות לסט
- `Rest` - מנוחה בשניות
- `Order` - סדר ביצוע התרגיל
- `Block` - קבוצת תרגילים (Superset/Circuit)
- `Duration` - משך זמן (לתרגילי זמן)

---

### 3. **Exercises** (תרגילים)

**תיאור:** מאגר תרגילים זמינים

```sql
CREATE TABLE Exercises (
  ExerciseID INTEGER PRIMARY KEY,
  Name TEXT NOT NULL,
  Description TEXT,
  Category TEXT,
  VideoURL TEXT,
  ImageURL TEXT,
  Status status_enum,
  IsSingleHand BOOLEAN,
  CreatedBy TEXT,
  UpdatedAt TIMESTAMP,
  CreatedAt TIMESTAMPTZ,
  isDuration BOOLEAN
);
```

**שדות מיוחדים:**
- `IsSingleHand` - תרגיל חד-צדדי (שמאל/ימין)
- `isDuration` - תרגיל מבוסס זמן (לא חזרות)
- `Status` - 'Active' / 'Inactive'

**RLS Policies:**
- ✅ מאמנים יכולים לנהל תרגילים שיצרו
- ✅ Admins יכולים לנהל הכל
- ✅ כולם יכולים לקרוא תרגילים אקטיביים

---

### 4. **Calendar** (לוח אימונים אישי)

**תיאור:** אימונים מתוכננים/מבוצעים של משתמשים ספציפיים

```sql
CREATE TABLE Calendar (
  CalendarID INTEGER PRIMARY KEY,
  Email VARCHAR NOT NULL REFERENCES Users(Email),
  WorkoutID INTEGER NOT NULL REFERENCES Workouts(WorkoutID),
  StartTime TIMESTAMP NOT NULL,
  EndTime TIMESTAMPTZ,
  TimeOfDay VARCHAR,
  Deloading BOOLEAN,
  DeloadingPercentage INTEGER,
  Completed BOOLEAN,
  CoachNotes TEXT,
  ClimberNotes TEXT,
  RPE INTEGER,
  Color VARCHAR,
  CreatedAt TIMESTAMP
);
```

**שדות מרכזיים:**
- `StartTime` / `EndTime` - זמן תחילה/סיום
- `Deloading` - האם שבוע deload
- `DeloadingPercentage` - אחוז מהאימון המקורי (1-100)
- `Completed` - האם בוצע
- `RPE` - Rate of Perceived Exertion (1-10)
- `Color` - צבע בלוח השנה

**חיבורים:**
- → Users (Email)
- → Workouts (WorkoutID)
- ← ClimbingLog (CalendarID)
- ← ExerciseLogs (CalendarID)

---

### 5. **WorkoutsForUser** (הקצאת אימונים)

**תיאור:** אילו אימונים מוקצים לאילו משתמשים

```sql
CREATE TABLE WorkoutsForUser (
  AssignmentID INTEGER NOT NULL,
  Email VARCHAR NOT NULL REFERENCES Users(Email),
  WorkoutID INTEGER NOT NULL REFERENCES Workouts(WorkoutID),
  AssignedBy TEXT,
  AssignedAt TIMESTAMP,
  StartDate DATE,
  EndDate DATE,
  Frequency TEXT,
  IsActive BOOLEAN,
  Notes TEXT,
  Block TEXT,
  IsKeyWorkout BOOLEAN,
  CoachNote TEXT,
  PRIMARY KEY (Email, WorkoutID)
);
```

**שימוש:**
- מאמן מקצה אימון למתאמן
- קובע תקופה ותדירות
- `IsKeyWorkout` - אימון מפתח בתכנית

---

## 🧗 מערכת טיפוס

### 1. **ClimbingLog** (יומן טיפוס)

**תיאור:** תיעוד מסלולי טיפוס שבוצעו

```sql
CREATE TABLE ClimbingLog (
  ClimbingLogID INTEGER PRIMARY KEY,
  Email VARCHAR REFERENCES Users(Email),
  WorkoutID INTEGER REFERENCES Workouts(WorkoutID),
  CalendarID INTEGER REFERENCES Calendar(CalendarID),
  LocationID INTEGER REFERENCES ClimbingLocations(LocationID),
  ClimbType VARCHAR,  -- 'Boulder' / 'Board' / 'Lead'
  BoardTypeID INTEGER REFERENCES BoardTypes(BoardID),
  GradeID INTEGER REFERENCES LeadGrades(LeadGradeID),
  RouteName TEXT UNIQUE,
  Attempts INTEGER,
  Successful BOOLEAN,
  DurationSeconds INTEGER,
  Notes TEXT,
  LogDateTime TIMESTAMP,
  CreatedAt TIMESTAMP,
  UpdatedAt TIMESTAMP,
  VolumeScore NUMERIC
);
```

**סוגי טיפוס:**
- `Boulder` - בולדר
- `Board` - קיר אימונים (Kilter, Tension, etc.)
- `Lead` - הובלה

**שדות חשובים:**
- `LogDateTime` - ⚠️ זמן האימון (לא זמן השמירה!)
- `VolumeScore` - ניקוד לפי דרגה (לאנליטיקה)
- `Attempts` - מספר ניסיונות
- `Successful` - האם הושלם בהצלחה

---

### 2. **BoulderGrades** (דרגות בולדר)

```sql
CREATE TABLE BoulderGrades (
  BoulderGradeID INTEGER PRIMARY KEY,
  VGrade VARCHAR,      -- "V0", "V1", "V2"...
  FontGrade VARCHAR    -- "6a", "6a+", "6b"...
);
```

---

### 3. **LeadGrades** (דרגות הובלה)

```sql
CREATE TABLE LeadGrades (
  LeadGradeID INTEGER PRIMARY KEY,
  AussieGrade INTEGER,
  FrenchGrade VARCHAR,      -- "5a", "5b", "5c"...
  YosemiteGrade VARCHAR,    -- "5.10a", "5.10b"...
  DifficultyLevel VARCHAR
);
```

---

### 4. **BoardTypes** (סוגי קירות אימונים)

```sql
CREATE TABLE BoardTypes (
  BoardID INTEGER PRIMARY KEY,
  BoardName VARCHAR NOT NULL,  -- "Kilter", "Tension", "MoonBoard"...
  Description TEXT,
  Manufacturer VARCHAR,
  AppSupported BOOLEAN,
  AngleRange VARCHAR,
  LEDSystem BOOLEAN,
  CreatedAt TIMESTAMP
);
```

---

### 5. **ClimbingLocations** (מיקומי טיפוס)

```sql
CREATE TABLE ClimbingLocations (
  LocationID INTEGER PRIMARY KEY,
  LocationName VARCHAR NOT NULL,  -- "הדר יוסף", "Boulderz"...
  LocationType VARCHAR NOT NULL,  -- 'Gym' / 'Outdoor' / 'Board'
  City VARCHAR,
  Country VARCHAR,
  BoardTypeID INTEGER REFERENCES BoardTypes(BoardID),
  Notes TEXT,
  CreatedAt TIMESTAMP
);
```

---

## 📝 מערכת Logs (תיעוד ביצועים)

### **ExerciseLogs** (תיעוד תרגילים)

**תיאור:** תיעוד ביצוע תרגילי כוח בפועל

```sql
CREATE TABLE ExerciseLogs (
  ExerciseLogID INTEGER PRIMARY KEY,
  Email VARCHAR REFERENCES Users(Email),
  WorkoutID INTEGER REFERENCES Workouts(WorkoutID),
  CalendarID INTEGER REFERENCES Calendar(CalendarID),
  ExerciseID INTEGER REFERENCES Exercises(ExerciseID),
  SetNumber INTEGER,
  RepsPlanned INTEGER,
  RepsDone INTEGER,
  WeightKG NUMERIC,
  DurationSec INTEGER,
  RPE INTEGER,
  Completed BOOLEAN,
  Notes TEXT,
  CreatedAt TIMESTAMP,
  UpdatedAt TIMESTAMP,
  HandSide VARCHAR,
  VolumeScore NUMERIC
);
```

**שדות:**
- `RepsPlanned` vs `RepsDone` - תכנון מול ביצוע
- `WeightKG` - משקל בקילו
- `HandSide` - לתרגילים חד-צדדיים
- `VolumeScore` - ניקוד לאנליטיקה

---

## 👥 מערכת קבוצות ומאמנים

### 1. **CoachTrainees** (קשר מאמן-מתאמן)

**תיאור:** ניהול יחסי מאמן-מתאמן

```sql
CREATE TABLE CoachTrainees (
  ID INTEGER PRIMARY KEY,
  CoachEmail VARCHAR NOT NULL REFERENCES Users(Email),
  TraineeEmail VARCHAR NOT NULL REFERENCES Users(Email),
  AssignedAt TIMESTAMP,
  AssignedBy VARCHAR,
  StartDate DATE,
  EndDate DATE,
  Active BOOLEAN,
  Status status_enum,
  CoachNotes TEXT,
  TrainingPlan TEXT,
  Goals TEXT,
  Frequency VARCHAR,
  PreferredContactMethod VARCHAR,
  ContactFrequency VARCHAR,
  CreatedAt TIMESTAMP,
  UpdatedAt TIMESTAMP,
  UNIQUE(CoachEmail, TraineeEmail)
);
```

---

### 2. **Groups** (קבוצות)

```sql
CREATE TABLE Groups (
  GroupID INTEGER PRIMARY KEY,
  GroupName VARCHAR NOT NULL,
  GroupType VARCHAR,
  CoachEmail VARCHAR REFERENCES Users(Email),
  Description TEXT,
  CreatedAt TIMESTAMP,
  Status VARCHAR
);
```

---

### 3. **GroupMembers** (חברי קבוצה)

```sql
CREATE TABLE GroupMembers (
  GroupMemberID INTEGER PRIMARY KEY,
  GroupID INTEGER REFERENCES Groups(GroupID),
  Email VARCHAR REFERENCES Users(Email),
  Role VARCHAR,
  JoinedAt TIMESTAMP,
  Status VARCHAR
);
```

---

### 4. **GroupCalendar** (לוח אימונים קבוצתי)

```sql
CREATE TABLE GroupCalendar (
  GroupCalendarID INTEGER PRIMARY KEY,
  GroupID INTEGER REFERENCES Groups(GroupID),
  WorkoutID INTEGER REFERENCES Workouts(WorkoutID),
  StartTime TIMESTAMP NOT NULL,
  TimeOfDay VARCHAR,
  Deloading BOOLEAN,
  Completed BOOLEAN,
  CoachNotes TEXT,
  GroupNotes TEXT,
  RPE INTEGER,
  Color VARCHAR,
  CreatedBy VARCHAR REFERENCES Users(Email),
  CreatedAt TIMESTAMP
);
```

---

## 💚 מערכת Wellness

### **WellnessLog** (יומן רווחה)

**תיאור:** מעקב יומי אחר בריאות ורווחה

```sql
CREATE TABLE WellnessLog (
  WellnessID UUID NOT NULL,
  Email TEXT NOT NULL,
  Date DATE NOT NULL,
  VitalityLevel INTEGER,      -- 1-10
  SleepHours NUMERIC,
  PainArea TEXT,
  PainLevel INTEGER,           -- 1-10
  Comments TEXT,
  CreatedAt TIMESTAMP,
  UpdatedAt TIMESTAMP,
  UNIQUE(Email, Date)
);
```

**RLS Policies:**
- ✅ משתמשים רואים רק את הנתונים שלהם
- ✅ משתמשים יכולים לנהל רק את הרשומות שלהם
- ✅ Service role יכול הכל

---

## 📊 Views ו-Analytics

### 1. **v_weekly_volumes** (סיכום נפחים שבועיים)

```sql
CREATE VIEW v_weekly_volumes AS
SELECT 
  Email,
  WeekStart TIMESTAMP,
  BoulderVolume NUMERIC,
  BoardVolume NUMERIC,
  LeadVolume NUMERIC,
  ExerciseVolume NUMERIC,
  CompletedSessions BIGINT
FROM ...
```

**שימוש:** סיכום נפח אימונים שבועי לפי סוג

---

### 2. **v_weekly_wellness** (סיכום wellness שבועי)

```sql
CREATE VIEW v_weekly_wellness AS
SELECT 
  Email,
  WeekStart TIMESTAMP,
  AvgSleep NUMERIC,
  AvgVitality NUMERIC,
  AvgPain NUMERIC
FROM ...
```

**שימוש:** מעקב אחר מגמות בריאות

---

### 3. **CoachTraineesActiveView** (מתאמנים פעילים)

מציג רק מתאמנים פעילים עם פרטי המאמן

---

### 4. **CoachTraineesFullView** (כל המתאמנים)

מציג את כל המתאמנים כולל לא פעילים

---

## 🔐 Row Level Security (RLS)

### Policies קיימות:

#### **Exercises:**
```sql
-- מאמנים יכולים לנהל תרגילים שיצרו
CREATE POLICY "Coach can manage own exercises"
ON Exercises FOR ALL
USING (
  CreatedBy = auth.jwt()->>'email' AND
  EXISTS (
    SELECT 1 FROM Users 
    WHERE Email = auth.jwt()->>'email' 
    AND Role = 'coach'
  )
);

-- Admins יכולים הכל
CREATE POLICY "Admin full access"
ON Exercises FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM Users 
    WHERE Email = auth.jwt()->>'email' 
    AND Role = 'admin'
  )
);

-- כולם יכולים לקרוא תרגילים אקטיביים
CREATE POLICY "Anyone can read active exercises"
ON Exercises FOR SELECT
USING (Status = 'Active');
```

#### **WellnessLog:**
```sql
-- משתמשים רואים רק את שלהם
CREATE POLICY "Users can view their own wellness logs"
ON WellnessLog FOR SELECT
USING (Email = auth.email());

-- משתמשים מנהלים רק את שלהם
CREATE POLICY "Users can manage their own wellness logs"
ON WellnessLog FOR ALL
USING (Email = (current_setting('request.jwt.claims', true)::json->>'email'));
```

#### **BoardTypes:**
```sql
-- כולם יכולים לקרוא
CREATE POLICY "Enable read access for all users"
ON BoardTypes FOR SELECT
USING (true);
```

---

## 🔗 קשרים בין טבלאות (ERD Summary)

### מערכת משתמשים:
```
Users (Email) 
  ├─→ Calendar
  ├─→ ClimbingLog
  ├─→ ExerciseLogs
  ├─→ CoachTrainees (Coach + Trainee)
  ├─→ Groups
  ├─→ GroupMembers
  ├─→ GroupCalendar (CreatedBy)
  └─→ WorkoutsForUser
```

### מערכת אימונים:
```
Workouts
  ├─→ WorkoutsExercises → Exercises
  ├─→ Calendar
  ├─→ GroupCalendar
  ├─→ WorkoutsForUser
  ├─→ ClimbingLog
  └─→ ExerciseLogs
```

### מערכת טיפוס:
```
ClimbingLog
  ├─→ Users (Email)
  ├─→ Workouts
  ├─→ Calendar
  ├─→ ClimbingLocations
  ├─→ BoardTypes
  └─→ LeadGrades / BoulderGrades
```

---

## ⚠️ בעיות ופערים שזוהו

### 1. **Authentication:**
- ❌ אין שדה `PasswordHash` ב-Users
- ❌ אין שדה `Salt`
- ❌ אין `LastLogin`, `CreatedAt`, `UpdatedAt` ב-Users
- ❌ אין מנגנון reset password
- ⚠️ כפילות בין `Users` ו-`Profiles` - צריך להחליט על אסטרטגיה

### 2. **RLS:**
- ❌ אין RLS על Users
- ❌ אין RLS על Calendar
- ❌ אין RLS על ClimbingLog
- ❌ אין RLS על ExerciseLogs
- ⚠️ רוב הטבלאות ללא הגנה

### 3. **Timestamps:**
- ⚠️ חלק מהטבלאות עם `TIMESTAMP` וחלק עם `TIMESTAMPTZ`
- ⚠️ חסרים `CreatedAt` / `UpdatedAt` בחלק מהטבלאות

### 4. **Foreign Keys:**
- ⚠️ חלק מה-FKs לא מוגדרים עם `ON DELETE CASCADE`
- ⚠️ יכול לגרום לבעיות במחיקת משתמשים

---

## 🚀 המלצות לשיפור

### Priority 1 (קריטי):
1. ✅ הוספת `PasswordHash`, `Salt` ל-Users
2. ✅ הוספת `CreatedAt`, `UpdatedAt`, `LastLogin` ל-Users
3. ✅ יצירת טבלת `PasswordResetTokens`
4. ✅ הוספת RLS policies לכל הטבלאות הרגישות
5. ✅ החלטה על Users vs Profiles (לאחד!)

### Priority 2 (חשוב):
1. ⚙️ אחידות ב-timestamps (כולם `TIMESTAMPTZ`)
2. ⚙️ הוספת `CreatedAt` / `UpdatedAt` לכל הטבלאות
3. ⚙️ הגדרת `ON DELETE CASCADE` נכונה
4. ⚙️ הוספת indexes לשיפור ביצועים

### Priority 3 (Nice to have):
1. 📊 טבלת audit log
2. 📧 טבלת email notifications
3. 🔔 טבלת push notifications
4. 📸 טבלת user avatars/media

---

## 📝 סיכום טבלאות לפי קטגוריה

### 🔐 Authentication & Users:
- Users ⭐
- Profiles
- RolesEnum

### 🏋️ Workouts & Training:
- Workouts ⭐
- WorkoutsExercises ⭐
- Exercises ⭐
- Calendar ⭐
- WorkoutsForUser
- ExerciseLogs ⭐

### 🧗 Climbing:
- ClimbingLog ⭐
- BoulderGrades
- LeadGrades
- BoardTypes
- ClimbingLocations

### 👥 Coach & Groups:
- CoachTrainees ⭐
- Groups
- GroupMembers
- GroupCalendar
- CoachTraineesActiveView
- CoachTraineesFullView

### 💚 Wellness:
- WellnessLog ⭐

### 📊 Analytics:
- v_weekly_volumes
- v_weekly_wellness

### 📚 Reference Tables (Enums):
- ColorEnum
- ExerciseCategoryEnum
- TimeOfDayEnum
- WhenToPracticeEnum
- WorkoutCategoryEnum
- QuotesFromClimbers

---

**סה"כ טבלאות:** 29  
**סה"כ Views:** 4  
**טבלאות מרכזיות (⭐):** 11

---

## 📞 נקודות מגע למפתחים

### שאילתות נפוצות:

```sql
-- קבלת כל האימונים של משתמש
SELECT * FROM Calendar 
WHERE Email = 'user@example.com' 
ORDER BY StartTime DESC;

-- קבלת כל המסלולים של משתמש
SELECT * FROM ClimbingLog 
WHERE Email = 'user@example.com' 
ORDER BY LogDateTime DESC;

-- קבלת המתאמנים של מאמן
SELECT * FROM CoachTraineesActiveView 
WHERE CoachEmail = 'coach@example.com';

-- נפח שבועי
SELECT * FROM v_weekly_volumes 
WHERE Email = 'user@example.com' 
ORDER BY WeekStart DESC;
```

---

**תיעוד זה עודכן לאחרונה: 11/11/2025**  
**מחבר: Claude + Developer**
