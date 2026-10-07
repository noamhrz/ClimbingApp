# DESIGN.md: החלפת Theme לאפליקציית MY WAY

המטרה: להחליף את המראה של האפליקציה לשפה העיצובית של האתר (noam-herz-climbing.com): כהה, חם, עם כתום אחד להדגשה, ולשפר את התצוגה בטלפון.
**זו החלפת Theme בלבד. שום דבר בלוגיקה, בנתונים או בהתנהגות לא משתנה.**

---

## 1. כללי ברזל (חובה)

1. **לא נוגעים בלוגיקה.** לא משנים קבצים ב-`lib/`, `context/`, `types/`, `utils/`, `supabase/`, `app/api/`. לא משנים state, hooks, קריאות ל-Supabase, handlers, props, תנאים (`isAdmin`, `usePermission` וכו'), routes או שמות קבצים.
2. **משנים רק מראה:** `className`, `style`, קבצי CSS, ואייקונים. מותר לעטוף אלמנט ב-`div` לצורך פריסה (למשל גלילה אופקית לטבלה), בתנאי שלא משתנה שום התנהגות.
3. **כל טקסט נשאר כמו שהוא**, כולל סדר הפריטים בתפריטים ובטבלאות.
4. **RTL:** משתמשים ב-utilities לוגיים של Tailwind (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`) ולא ב-`ml/mr/left/right` בקוד חדש.
5. **עבודה בשלבים** (סעיף 6). בסוף כל שלב: `npm run lint` ו-`npm run build` בלי שגיאות, ו-commit נפרד עם תיאור.
6. **ספק = עוצרים ושואלים.** אם שינוי עיצובי מחייב לגעת בלוגיקה, לא עושים אותו ומדווחים.

---

## 2. צבעים (Design tokens)

מגדירים פעם אחת ב-`app/globals.css` עם `@theme` של Tailwind v4, ומשתמשים רק בהם. **אין יותר צבעים קשיחים** (`bg-blue-600`, `text-gray-900`, `#1e88e5` וכו').

```css
@import "tailwindcss";

@theme {
  /* רקעים, מהכהה לבהיר */
  --color-bg: #0F0E0C;        /* רקע הדף */
  --color-surface: #151310;   /* כרטיסים, אזורים */
  --color-raised: #1C1915;    /* כרטיס מודגש, מודל, תפריט נפתח */
  --color-line: #2B2722;      /* קווי הפרדה, גבולות */
  --color-line-strong: #3A342D;

  /* טקסט */
  --color-fg: #EDE8E0;        /* טקסט ראשי */
  --color-fg-2: #D6D0C6;      /* טקסט גוף */
  --color-fg-3: #B8B2A8;      /* טקסט משני */
  --color-muted: #A39E95;     /* תוויות, תאריכים */
  --color-faint: #8A8379;     /* placeholder, מושבת */

  /* מותג */
  --color-accent: #E0763A;    /* הכתום: כפתור ראשי, פריט פעיל, הדגשה */
  --color-accent-hover: #EA8650;
  --color-on-accent: #14110E; /* טקסט על כתום */

  /* סטטוסים (מותאמים לרקע כהה) */
  --color-success: #5FB37A;
  --color-warning: #E3B341;
  --color-danger:  #E06A5F;
  --color-info:    #7FB0C9;

  /* גופנים */
  --font-sans: "Assistant", "Segoe UI", Arial, sans-serif;
  --font-display: "Karantina", "Assistant", sans-serif;

  --radius-card: 12px;
}

body { background: var(--color-bg); color: var(--color-fg); font-family: var(--font-sans); }
```

לרקעי סטטוס עדינים (במקום `bg-green-50` וכו') משתמשים בשקיפות: `bg-success/15`, `bg-warning/15`, `bg-danger/15`, וטקסט בצבע המלא.

### טבלת המרה (לעבור עליה בכל קובץ)

| היום | מחליפים ל |
|---|---|
| `bg-white`, `bg-gray-50`, `bg-gray-100` (רקע דף/כרטיס) | `bg-bg` לדף, `bg-surface` לכרטיס |
| `bg-gray-200`, `bg-gray-300` | `bg-raised` או `border-line` |
| `text-gray-900`, `text-gray-800`, `text-black` | `text-fg` |
| `text-gray-700`, `text-gray-600` | `text-fg-2` / `text-fg-3` |
| `text-gray-500`, `text-gray-400` | `text-muted` / `text-faint` |
| `border-gray-*` | `border-line` (או `border-line-strong`) |
| `bg-blue-600/700`, `bg-indigo-*`, כפתור ראשי | `bg-accent hover:bg-accent-hover text-on-accent` |
| `bg-blue-50/100`, `text-blue-*` (הדגשה) | `bg-accent/15 text-accent` |
| `bg-green-*` / `text-green-*` | `success` (רקע `bg-success/15`) |
| `bg-yellow-*`, `bg-orange-*` | `warning` |
| `bg-red-*` | `danger` |
| `bg-gradient-to-*` (כותרות, כרטיסי סטטיסטיקה) | רקע אחיד: `bg-surface border border-line`. בלי גרדיאנטים |
| `shadow-*` כבדים | `border border-line`; צל רק למודלים ותפריטים נפתחים |

**שמירה על משמעות:** כל מקום שבו צבע מעביר מידע נשאר עם אותה משמעות. למשל בטבלת "אימוני טיפוס" (`components/workout-stats-display.tsx`): ירוק מעל 80% ביצוע, צהוב 50%–80%, אדום מתחת ל-50%. מחליפים רק לגוונים של success/warning/danger.

---

## 3. טיפוגרפיה

- גופנים דרך `next/font/google` ב-`app/layout.tsx`: **Assistant** (400, 600, 700) לטקסט, **Karantina** (700) לכותרות גדולות ולמספרים בולטים (למשל 35 / 71 / 49% בדשבורד).
- כותרת עמוד: `font-display text-5xl leading-none`. כותרת כרטיס: `text-lg font-bold`. גוף: `text-base`. תוויות: `text-sm text-muted`.
- מינימום 16px לשדות קלט (מונע זום אוטומטי באייפון).

---

## 4. רכיבים

מגדירים פעם אחת ב-`globals.css` כ-`@utility` (ב-Tailwind v4 רק utilities אפשר לשלב עם `@apply`), ומשתמשים בכל מקום:

```css
@utility card { @apply bg-surface border border-line rounded-[var(--radius-card)] p-4; }
@utility btn { @apply inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-full font-bold transition-colors; }
@utility btn-primary { @apply btn bg-accent text-on-accent hover:bg-accent-hover; }
@utility btn-ghost { @apply btn border border-line-strong text-fg hover:border-fg-3; }
@utility btn-danger { @apply btn bg-danger/15 text-danger hover:bg-danger/25; }
@utility input { @apply w-full min-h-11 rounded-lg bg-bg border border-line-strong px-3 text-base text-fg placeholder:text-faint focus:outline-none focus:border-accent; }
@utility chip { @apply inline-flex items-center rounded-full px-3 py-1 text-sm border border-line-strong; }
@utility chip-active { @apply bg-accent text-on-accent border-accent; }
```

- **מודלים:** רקע `bg-raised`, מסך כהה מאחור `bg-black/60`. בטלפון: מלא רוחב, צמוד לתחתית (bottom sheet), עם גלילה פנימית.
- **פוקוס:** `focus-visible:outline-2 focus-visible:outline-accent` לכל אלמנט לחיץ.
- **אייקונים:** במקום אימוג'י בתפריטים ובכפתורים, אייקונים מ-`react-icons` (כבר מותקן), סט אחד בלבד (מומלץ `react-icons/lu`).

### גרפים ולוח שנה
- **Recharts ו-Chart.js:** צבעי סדרות מהטוקנים (accent, info, success, warning). רשת וצירים ב-`line`, טקסט ב-`muted`. ל-Chart.js מגדירים ברירות מחדל פעם אחת (`Chart.defaults.color`, `Chart.defaults.borderColor`).
- **react-big-calendar ו-FullCalendar:** את ה-overrides ב-`globals.css` וב-`app/calendar/calendar-custom.css` מעדכנים לטוקנים: רקע surface, היום הנוכחי `accent/10`, אירועים בצבעי סטטוס.

---

## 5. מובייל (390px קודם)

- **כל מסך נבדק ברוחב 390px וב-1280px.**
- **אזורי לחיצה:** מינימום 44×44 פיקסלים.
- **טבלאות:** עוטפים ב-`div.overflow-x-auto` עם `min-w` לטבלה. בטבלאות שהמתאמנים רואים (סטטיסטיקות אימונים בדשבורד), מתחת ל-640px מציגים כל שורה ככרטיס: אותו מידע, בלי לשנות את הנתונים.
- **כותרת עליונה (`components/UserHeader.tsx`):** בטלפון, שורת הקישורים הופכת לשורה אחת עם גלילה אופקית, או לתפריט נפתח. כל הקישורים והתנאים (`isAdmin` וכו') נשארים בדיוק כמו שהם.
- **פוטר "החלף" (`components/Footer.tsx`):** נשאר קבוע בתחתית. מוסיפים `padding-bottom: env(safe-area-inset-bottom)` לאייפון.
- **`app/mobile-fixes.css`:** בשלב האחרון מחליפים את ה-`!important` הגורפים בפתרונות נקודתיים. מוחקים כלל רק אחרי שבדקת שהמסך עובד בלעדיו.
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` ו-`theme-color` בצבע `#0F0E0C`.

---

## 6. סדר העבודה (commit לכל שלב)

0. **סקירה:** רשימת כל המסכים, ורשימת כל הצבעים הקשיחים שבשימוש (`grep -rhoE "(bg|text|border)-(gray|blue|indigo|green|red|yellow|orange|purple)-[0-9]+" app components | sort | uniq -c`). לא משנים קוד בשלב הזה, רק מציגים את התכנית.
1. **יסודות:** טוקנים, גופנים, רכיבי ה-`@utility`, רקע ה-body, ו-overrides של לוח השנה והגרפים.
2. **שלד:** `ClientLayoutWrapper`, `UserHeader`, `Footer`, ומסך הכניסה (`app/page.tsx`), כולל `forgot-password` ו-`reset-password`.
3. **מסכי מתאמן:** `dashboard`, `workouts`, `workout/[id]`, `calendar`, `climbing-log`, `goals`, `profile`, `athlete-stats`, `exercise-analytics`, `roadmap-progress`, `monthly-sessions`, `media`.
4. **מסכי מאמן ומנהל:** `coach/urgency`, `admin/*`, `exercises/*`, `workouts-editor/*`, `calendar-edit`, `analysis`.
5. **ליטוש:** מודלים, מצבי ריק וטעינה, `mobile-fixes.css`, ומעבר עקביות על כל המסכים.

### בדיקה בסוף כל מסך
- [ ] אין צבעים קשיחים, רק טוקנים
- [ ] טקסט קריא: ניגודיות של 4.5:1 לפחות לטקסט רגיל
- [ ] עובד ב-390px בלי גלילה אופקית של הדף (מלבד בתוך טבלה)
- [ ] כפתורים ושדות בגובה 44px לפחות
- [ ] אותם נתונים, אותם כפתורים, אותה התנהגות כמו לפני השינוי
- [ ] `npm run lint` ו-`npm run build` עוברים
