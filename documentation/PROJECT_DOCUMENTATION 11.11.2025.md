# 📚 תיעוד מערכת יומן טיפוס - Climbing Log System

## 🎯 סקירה כללית

מערכת מקיפה לניהול אימוני טיפוס עם תמיכה ב:
- **Boulder** - טיפוס בולדר
- **Board** - טיפוס על קיר אימונים (Kilter, Tension, etc.)
- **Lead** - טיפוס הובלה

---

## 📊 מבנה Database

### טבלאות עיקריות:

#### 1. **ClimbingLog**
```sql
ClimbingLogID (PK)
Email
WorkoutID (FK)
CalendarID (FK)
LocationID (FK)
ClimbType ('Boulder' | 'Board' | 'Lead')
BoardTypeID (FK, nullable - רק ל-Board)
GradeID (FK)
RouteName (text, nullable)
Attempts (integer)
Successful (boolean)
DurationSeconds (integer, nullable)
Notes (text, nullable)
LogDateTime (timestamp) -- זמן האימון/מסלול
CreatedAt (timestamp)   -- זמן יצירת הרשומה
UpdatedAt (timestamp)   -- זמן עדכון אחרון
VolumeScore (decimal)   -- ניקוד לפי דרגה
```

#### 2. **BoulderGrades**
```sql
BoulderGradeID (PK)
VGrade (text) -- "V0", "V1", "V2"...
Score (decimal)
```

#### 3. **LeadGrades**
```sql
LeadGradeID (PK)
FrenchGrade (text) -- "5a", "5b", "5c"...
Score (decimal)
```

#### 4. **BoardTypes**
```sql
BoardTypeID (PK)
BoardName (text) -- "Kilter", "Tension", "MoonBoard"...
```

#### 5. **ClimbingLocations**
```sql
LocationID (PK)
LocationName (text) -- "הדר יוסף", "סיטי טו", "Boulderz"...
```

#### 6. **Calendar**
```sql
CalendarID (PK)
Email
WorkoutID (FK)
StartTime (timestamp)
EndTime (timestamp)
Completed (boolean)
ClimberNotes (text)
Deloading (boolean)
DeloadingPercentage (integer)
Color (text)
```

---

## 🏗️ ארכיטקטורה

### Frontend Structure:
```
app/
├── climbing-log/
│   └── page.tsx                    # דף יומן הטיפוס הראשי
├── workout/[id]/
│   ├── page.tsx                    # wrapper
│   └── WorkoutDetailClient.tsx     # ביצוע אימון + logging
├── calendar-edit/[calendarId]/
│   ├── page.tsx                    # wrapper
│   └── CalendarEditClient.tsx      # עריכת אימון שבוצע
└── calendar/
    └── page.tsx                    # לוח שנה + ניהול אימונים

components/
├── climbing/
│   ├── ClimbingLogChart.tsx        # היסטוגרמות
│   ├── ClimbingLogFilters.tsx      # סינון לפי תאריך/דרגה
│   ├── ClimbingLogList.tsx         # רשימת מסלולים
│   ├── AddClimbingLogModal.tsx     # הוספת מסלול חדש
│   ├── ClimbingSummary.tsx         # סיכום אימון (בזמן ביצוע)
│   └── RouteTypeBlock.tsx          # רשימת מסלולים לפי סוג
├── EditEventModal.tsx              # עריכת תאריך אימון
├── EventComponent.tsx              # תצוגת אימון בלוח השנה
└── EventContextMenu.tsx            # תפריט הקשר לאימון

lib/
├── climbing-log-api.ts             # API functions ל-CRUD
├── climbing-helpers.ts             # פונקציות עזר
└── calendarUtils.ts                # עזרים ללוח השנה

types/
└── climbing.ts                     # TypeScript interfaces
```

---

## 🔄 תהליכי עבודה (Workflows)

### 1️⃣ **ביצוע אימון טיפוס מתוכנן**

```mermaid
User → Calendar → Click Event → WorkoutDetailClient
→ Fill climbing routes → Save
→ Updates: Calendar.Completed = true
→ Creates: ClimbingLog entries
→ LogDateTime = Calendar.StartTime ✅
```

**קבצים מעורבים:**
- `app/calendar/page.tsx`
- `app/workout/[id]/WorkoutDetailClient.tsx`
- `lib/climbing-log-api.ts`

---

### 2️⃣ **ביצוע אימון ספונטני (לא מתוכנן)**

```mermaid
User → Workouts List → Start Workout → WorkoutDetailClient
→ Fill climbing routes → Save
→ Creates: New Calendar entry (Completed=true)
→ Creates: ClimbingLog entries
→ LogDateTime = now() ✅
```

**קבצים מעורבים:**
- `app/workout/[id]/WorkoutDetailClient.tsx`

---

### 3️⃣ **עריכת אימון שבוצע**

```mermaid
User → Calendar → Click Completed Event → CalendarEditClient
→ Edit routes/notes → Save
→ Updates: ClimbingLog entries (UPDATE or INSERT)
→ Updates: Calendar.ClimberNotes
```

**קבצים מעורבים:**
- `app/calendar-edit/[calendarId]/CalendarEditClient.tsx`

---

### 4️⃣ **הזזת אימון בלוח השנה**

```mermaid
User → Drag event to new date
→ Updates: Calendar.StartTime
→ Updates: ClimbingLog.LogDateTime (כל המסלולים)
→ Preserves original time (שעה מקורית)
```

**קבצים מעורבים:**
- `app/calendar/page.tsx` → `handleEventDrop()`

---

### 5️⃣ **שינוי תאריך דרך Edit Modal**

```mermaid
User → Right-click event → "הזז תאריך"
→ EditEventModal → Choose new date/time
→ Updates: Calendar.StartTime
→ Updates: ClimbingLog.LogDateTime
→ Logic: preserves time if time-of-day not changed
```

**קבצים מעורבים:**
- `app/calendar/page.tsx` → `handleSaveEditedEvent()`
- `components/EditEventModal.tsx`

---

### 6️⃣ **צפייה ביומן טיפוס**

```mermaid
User → Climbing Log Page
→ Filters: Date range, Climb type, Grade range
→ Displays: Histogram + List of all routes
→ Groups by: Boulder/Board/Lead
```

**קבצים מעורבים:**
- `app/climbing-log/page.tsx`
- `components/climbing/*`

---

## 🔧 תיקונים קריטיים שבוצעו

### ✅ 1. תיקון Timezone - LogDateTime
**בעיה:** כשמבצעים אימון, `LogDateTime` נשמר כזמן נוכחי במקום זמן האימון המתוכנן.

**פתרון:**
```typescript
// ✅ WorkoutDetailClient.tsx
const logDateTime = calendarRow?.StartTime 
  ? moment(calendarRow.StartTime).format('YYYY-MM-DD HH:mm:ss')
  : moment().format('YYYY-MM-DD HH:mm:ss')

// שימוש ב-format במקום toISOString למניעת המרת UTC
```

**קבצים שתוקנו:**
- `app/workout/[id]/WorkoutDetailClient.tsx`
- `app/calendar-edit/[calendarId]/CalendarEditClient.tsx`

---

### ✅ 2. עדכון ClimbingLog בהזזת אימון
**בעיה:** כשמזיזים אימון בלוח השנה, `Calendar.StartTime` מתעדכן אבל `ClimbingLog.LogDateTime` נשאר עם התאריך הישן.

**פתרון:**
```typescript
// app/calendar/page.tsx - handleEventDrop
await supabase.from('ClimbingLog')
  .update({ 
    LogDateTime: moment(newStart).format('YYYY-MM-DD HH:mm:ss'),
    UpdatedAt: moment().format('YYYY-MM-DD HH:mm:ss')
  })
  .eq('CalendarID', event.id)
```

**קבצים שתוקנו:**
- `app/calendar/page.tsx` → `handleEventDrop()`
- `app/calendar/page.tsx` → `handleSaveEditedEvent()`

---

### ✅ 3. שמירת שעה מקורית בהזזה
**בעיה:** כשגוררים אימון לתאריך אחר, השעה משתנה לשעה רנדומלית.

**פתרון:**
```typescript
// שמירת שעה מקורית
const originalStart = moment(event.start)
const newDate = moment(start)
const newStart = newDate
  .hour(originalStart.hour())
  .minute(originalStart.minute())
  .second(0)
  .toDate()
```

**קבצים שתוקנו:**
- `app/calendar/page.tsx` → `handleEventDrop()`
- `components/EditEventModal.tsx` → `handleSave()`

---

### ✅ 4. מניעת בעיות Timezone באימוני לילה
**בעיה:** אימון ב-01:00 AM נשמר כ-23:00 של יום קודם בגלל המרת UTC.

**פתרון:**
```typescript
// ❌ לפני:
const now = new Date().toISOString()  // "2025-11-10T23:00:00.000Z"

// ✅ אחרי:
const now = moment().format('YYYY-MM-DD HH:mm:ss')  // "2025-11-11 01:00:00"
```

**הסבר:** שימוש ב-`format()` במקום `toISOString()` שומר זמן מקומי ללא המרת UTC.

**קבצים שתוקנו:**
- כל מקום שיוצר/מעדכן timestamps

---

## 📐 כללי Timezone והנחיות

### ⚠️ חוקים קריטיים:

1. **תמיד השתמש ב-`moment().format('YYYY-MM-DD HH:mm:ss')`** לשמירת timestamps
2. **לעולם אל תשתמש ב-`toISOString()`** - זה ממיר ל-UTC ויוצר בעיות
3. **LogDateTime = זמן האימון** (מה-Calendar או now)
4. **CreatedAt = זמן יצירת הרשומה**
5. **UpdatedAt = זמן עדכון אחרון**

### ✅ דוגמאות נכונות:

```typescript
// יצירת timestamp נוכחי
const now = moment().format('YYYY-MM-DD HH:mm:ss')

// המרת timestamp קיים
const logDateTime = moment(calendarRow.StartTime).format('YYYY-MM-DD HH:mm:ss')

// תצוגה למשתמש
moment(date).format('DD/MM/YYYY HH:mm')
```

---

## 🎨 UI/UX Features

### 📊 היסטוגרמות

#### Boulder + Board (Stacked Bar):
```
V0  ████░░░░  Boulder: 4, Board: 3
V1  ██████░░  Boulder: 5, Board: 2
V2  ███░░░░░  Boulder: 2, Board: 1
```

#### Lead (Simple Bar):
```
5a  ████████  8 climbs
5b  ██████    6 climbs
5c  ████      4 climbs
```

### 🎯 סינונים (Filters)

1. **טווח תאריכים** - startDate, endDate
2. **סוג טיפוס** - BoulderBoard / Lead
3. **טווח דרגות** - minGradeId, maxGradeId

**לוגיקה:**
- סינון תאריכים/דרגות → בצד השרת (API)
- סינון סוג טיפוס → בצד הלקוח (client-side)

---

## 🐛 בעיות ידועות שתוקנו

### ❌ Bug: value prop ב-ExerciseAccordion
```typescript
// ❌ לפני:
<ExerciseAccordion
  exercise={ex}
  value={ex}  // מיותר!
  onChange={...}
/>

// ✅ אחרי:
<ExerciseAccordion
  exercise={ex}
  onChange={...}
/>
```

---

## 📝 Console Logs Cleanup

הוסרו כל ה-debug logs מהקבצים הבאים:
- ✅ `app/climbing-log/page.tsx`
- ✅ `components/climbing/ClimbingLogList.tsx`
- ✅ `components/climbing/ClimbingLogFilters.tsx`
- ✅ `app/workout/[id]/WorkoutDetailClient.tsx`
- ✅ `app/calendar-edit/[calendarId]/CalendarEditClient.tsx`

---

## 🚀 תכונות עתידיות לשיקול

### 🔐 אוטנטיקציה וניהול משתמשים
- [ ] רישום משתמשים חדשים
- [ ] התחברות / יציאה
- [ ] שינוי סיסמה
- [ ] איפוס סיסמה (forgot password)
- [ ] פרופיל משתמש (שם, תמונה, פרטים)
- [ ] הרשאות (מאמן / מתאמן)
- [ ] משתמש אקטיבי / לא אקטיבי

### 📊 אנליטיקה וסטטיסטיקות
- [ ] גרף התקדמות לאורך זמן
- [ ] ממוצע דרגות
- [ ] אחוזי הצלחה
- [ ] Volume tracking (סיכום שבועי/חודשי)
- [ ] השוואה בין תקופות

### 🎯 תכנון אימונים
- [ ] תבניות אימונים (Workout Templates)
- [ ] מחזורי אימונים (Training Cycles)
- [ ] יעדים ו-milestones
- [ ] תזכורות

### 🏆 Social Features
- [ ] שיתוף הישגים
- [ ] לוח מובילים (Leaderboard)
- [ ] חברים/עוקבים
- [ ] תגובות והערות

### 📱 Mobile Experience
- [ ] PWA support
- [ ] Offline mode
- [ ] Push notifications
- [ ] קיצורי דרך (Quick actions)

---

## 🛠️ טכנולוגיות בשימוש

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)
- **Styling:** Tailwind CSS
- **Date/Time:** Moment.js, Day.js
- **Charts:** Recharts
- **Calendar:** react-big-calendar
- **State:** React Hooks (useState, useEffect, useContext)

---

## 📦 Dependencies חשובים

```json
{
  "dependencies": {
    "next": "^14.x",
    "react": "^18.x",
    "@supabase/supabase-js": "^2.x",
    "moment": "^2.x",
    "moment-timezone": "^0.5.x",
    "dayjs": "^1.x",
    "recharts": "^2.x",
    "react-big-calendar": "^1.x",
    "framer-motion": "^10.x",
    "tailwindcss": "^3.x"
  }
}
```

---

## 📞 נקודות מגע למפתחים

### API Functions:
- `lib/climbing-log-api.ts`
  - `fetchClimbingLogs()` - שליפת מסלולים עם סינונים
  - `addClimbingLog()` - הוספת מסלול
  - `deleteClimbingLog()` - מחיקת מסלול
  - `calculateHistogramSplit()` - היסטוגרמה Boulder+Board
  - `calculateHistogramLead()` - היסטוגרמה Lead

### Context:
- `context/AuthContext.tsx` - ניהול authentication ו-active user

### Utils:
- `lib/climbing-helpers.ts` - פונקציות עזר
- `lib/calendarUtils.ts` - צבעים ועזרים ללוח שנה

---

## ✅ Checklist לפני Production

- [ ] בדיקת כל תרחישי Timezone
- [ ] בדיקת הזזת אימונים בכל השעות (00:00 - 23:59)
- [ ] בדיקת עריכת אימונים
- [ ] בדיקת סינונים ביומן
- [ ] בדיקת תצוגה ב-Mobile
- [ ] בדיקת performance עם 1000+ logs
- [ ] הוספת Error Boundaries
- [ ] הוספת Loading States
- [ ] SEO optimization
- [ ] Analytics setup

---

**תיעוד זה עודכן לאחרונה: 11/11/2025**
**גרסה: 1.0.0**
