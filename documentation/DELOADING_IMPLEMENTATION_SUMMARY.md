# Deloading & Event Colors Implementation Summary

## Overview
This document summarizes the implementation of deloading functionality and enhanced event colors for the climbing app calendar system.

## Features Implemented

### 1. Database Fields Support
- Added support for `Deloading` (boolean) and `DeloadingPercentage` (integer, 1-100) fields
- Calendar queries now fetch these fields from the `Calendar` table
- Fields are properly passed through the application flow
- **Note**: Column name is `Deloading` (not `IsDeloading`) in the database

### 2. Event Color System
Created a new utility function `getEventColor()` in `lib/calendarUtils.ts` that determines event colors based on:
- **Deloading State**:
  - Completed deload: Light green (`#b7f7b3`)
  - Upcoming deload: Light blue (`#cce9ff`)
- **Normal States**:
  - Completed: Green (`rgb(34 197 94)`)
  - Today: Amber/Yellow (`rgb(251 191 36)`)
  - Past/Missed: Red (`rgb(239 68 68)`)
  - Future: Blue (`rgb(37 99 235)`)

### 3. Bulk Deloading Operations
Created two helper functions in `lib/calendarUtils.ts`:

#### `applyDeloading(email, startDate, endDate, percentage)`
- Updates ALL calendar events for a user within the date range
- Sets `Deloading = true` and `DeloadingPercentage = percentage`
- Handles date range boundaries (start of day to end of day)

#### `clearDeloading(email, startDate, endDate)`
- Updates ALL calendar events for a user within the date range
- Sets `Deloading = false` and `DeloadingPercentage = null`

### 4. Admin UI - Deloading Modal
Created `components/DeloadingModal.tsx`:
- Two modes: "Apply" and "Remove"
- **Apply Mode**: Asks for start date, end date, and percentage (1-100)
- **Remove Mode**: Asks for start date and end date only
- Input validation (dates must be valid, end > start, percentage 1-100)
- Success/error feedback
- Styled with Hebrew RTL support

### 5. Calendar Page Enhancements
Updated `app/calendar/page.tsx`:
- Added admin action buttons (fixed position, bottom-left):
  - "🔵 דילודינג" - Apply deloading
  - "❌ הסר דילודינג" - Remove deloading
- Integrated DeloadingModal component
- Updated calendar event type to include deloading fields
- Fixed calendar interaction behavior:
  - Desktop: Drag & drop enabled, click to navigate
  - Mobile: Tap slots to add, tap events to navigate
  - No more long-press menu (simplified UX)

### 6. Enhanced EventComponent
Updated `components/EventComponent.tsx`:
- Simplified component (removed long-press logic)
- Dynamic colors using `getEventColor()` utility
- Shows deloading percentage badge in top-right corner
- Proper event styling with `onMouseDown` to prevent slot selection interference
- Delete button only visible to admins

### 7. Session Reminder Banner
Updated `app/workout/[id]/WorkoutDetailClient.tsx`:
- Fetches `Deloading` and `DeloadingPercentage` from Calendar table
- Displays prominent blue gradient banner when deloading is active
- Banner shows: "🔵 שבוע דילודינג - בצע רק X% מהסטים המתוכננים"
- Visible before starting the workout session

## Files Created
1. `lib/calendarUtils.ts` - Utility functions for colors and deloading operations
2. `components/DeloadingModal.tsx` - Modal for bulk deloading management

## Files Modified
1. `components/EventComponent.tsx` - Enhanced with color logic and deloading badge
2. `app/calendar/page.tsx` - Added deloading UI and updated event handling
3. `app/workout/[id]/WorkoutDetailClient.tsx` - Added deloading session banner

## Usage Instructions

### For Coaches/Admins:
1. **Apply Deloading**:
   - Click "🔵 דילודינג" button in calendar
   - Select start date and end date
   - Enter percentage (e.g., 70 for 70% of prescribed sets)
   - Confirm - all events in range will be marked as deloading

2. **Remove Deloading**:
   - Click "❌ הסר דילודינג" button in calendar
   - Select start date and end date
   - Confirm - deloading will be removed from all events in range

### For Athletes:
1. **Calendar View**:
   - Deloading events show with light blue background (upcoming) or light green (completed)
   - Percentage badge appears in top-right corner of deloading events

2. **Workout Session**:
   - When starting a deload workout, a prominent blue banner appears
   - Banner reminds athlete to perform only X% of prescribed sets

## Technical Notes
- All date operations use proper timezone handling (Asia/Jerusalem)
- Date ranges are inclusive (start of start date to end of end date)
- Bulk operations update via Supabase with date range filters
- Event colors are calculated dynamically based on current state
- Mobile and desktop have optimized interaction patterns

## Testing Checklist
- [x] Development server starts without errors
- [x] Calendar page loads successfully
- [x] Event colors display correctly
- [x] Fixed database column name issues (Deloading vs IsDeloading)
- [ ] Admin can apply deloading to date range
- [ ] Admin can remove deloading from date range
- [ ] Deloading badge appears on calendar events
- [ ] Session banner appears in workout detail when deloading is active
- [ ] Desktop drag & drop works correctly
- [ ] Mobile tap interactions work correctly

## Future Enhancements
- Add visual indicator in calendar month view for deload weeks
- Email notifications when deload periods start
- Analytics dashboard showing deload week compliance
- Automatic deload scheduling based on training cycles
