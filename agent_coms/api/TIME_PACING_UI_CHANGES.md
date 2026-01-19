# Time-Based Pacing - Premium Feature UI Changes

**Document Type:** UI/Frontend Specification (Premium Feature)
**Created:** 2026-01-16
**Status:** DRAFT - Awaiting Approval
**Feature Type:** OPTIONAL/PAID ADD-ON
**Priority:** Phase 2 (After Core Prerequisite System)
**Related Documents:**
- CONTENT_UNLOCKING_ARCHITECTURE.md (Read this first!)
- TIME_PACING_PREMIUM_FEATURE.md (Design spec)
- PREREQUISITE_SYSTEM_UI_CHANGES.md (Core system UI - implement first!)
**Target Audience:** UI/Frontend Team

---

## ⚠️ IMPORTANT: Premium Feature UI

**This document describes UI for an OPTIONAL, PAID feature.**

- **Core UI (Free):** See PREREQUISITE_SYSTEM_UI_CHANGES.md (implement first)
- **Premium UI (Paid):** This document (adds time-based controls on top of core)

**Feature Gating:** All UI components in this document should be hidden/disabled when the premium feature is not enabled for the institution or class.

---

## Executive Summary

This document specifies all user interface changes needed to support the Class Pacing System. The pacing system allows instructors to control when learners can access course modules and content within specific class instances.

**Key UI Components:**
1. **Instructor: Class Content Schedule Manager** - Configure and manage pacing
2. **Instructor: Course Pacing Template Builder** - Set default pacing rules
3. **Learner: Content Access Indicators** - Show availability status
4. **Learner: Content Calendar View** - Visualize upcoming content

---

## User Roles & Permissions

| Role | View Schedule | Edit Schedule | Override Dates | Configure Course Template |
|------|--------------|---------------|----------------|---------------------------|
| **Learner** | Own classes only | ❌ | ❌ | ❌ |
| **Instructor** | Own classes | Own classes | Own classes | ❌ |
| **Content Admin** | All classes | ❌ | ❌ | ✅ |
| **Dept Admin** | Dept classes | Dept classes | Dept classes | Dept courses |
| **System Admin** | All | All | All | All |

---

## UI Component Overview

### Instructor Interfaces

```
Class Management Dashboard
└── Class Detail Page
    ├── Content Schedule Tab (NEW)
    │   ├── Timeline View
    │   ├── Module List View
    │   ├── Override Modal
    │   └── Recalculate Button
    └── Existing tabs (Roster, Grades, etc.)

Course Builder Dashboard
└── Course Edit Page
    └── Content Management
        └── Pacing Configuration Panel (NEW)
```

### Learner Interfaces

```
My Classes Dashboard
└── Class Detail Page
    ├── Content Module List
    │   └── Availability Indicators (ENHANCED)
    └── Content Calendar View (NEW)
```

---

## 1. Instructor: Class Content Schedule Manager

### Location
`/classes/:classId/content-schedule` (new tab in Class Detail page)

### Purpose
Allow instructors to view and manage content availability dates for their class.

---

### UI Layout Option A: Timeline View

**Visual Design:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Class: CS101 - Spring 2026                          [Recalculate]│
│ Jan 15, 2026 - Apr 15, 2026                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Week 1      Week 2      Week 3      Week 4      Week 5          │
│  Jan 15      Jan 22      Jan 29      Feb 5       Feb 12          │
│  │           │           │           │           │               │
│  ├─ Module 1 │           │           │           │               │
│  │  ████████ │           │           │           │               │
│  │           │           │           │           │               │
│  │           ├─ Module 2 │           │           │               │
│  │           │  ████████ │           │           │               │
│  │           │           │           │           │               │
│  │           │           ├─ Module 3 │           │               │
│  │           │           │  ████████ │           │               │
│  │           │           │           │           │               │
│  │           │           │           ├─ Module 4 │               │
│  │           │           │           │  ████████ │               │
│                                                                   │
│  Legend: ████ Available Period   ⚠️ Override   📅 Original      │
└─────────────────────────────────────────────────────────────────┘
```

**Interactions:**
- Click on module bar → Show details popup
- Drag edges to adjust dates (triggers override)
- Right-click → "Reset to template" or "Edit dates"

---

### UI Layout Option B: Module List View

**Visual Design:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Class: CS101 - Spring 2026                   [Timeline View] [▼]│
│ Showing 4 modules, 32 content items                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ▼ Module 1: Introduction to Programming                          │
│   Available: Jan 15 - Jan 21 (7 days)                     [Edit]│
│   ├─ Welcome Video                     Jan 15 - Jan 21           │
│   ├─ Setup Guide                       Jan 15 - Jan 21           │
│   ├─ Quiz: Intro Quiz                  Jan 15 - Jan 21     ⚠️   │
│   │   Override: Extended to Jan 28 by John Doe                  │
│   └─ Assignment: Hello World           Jan 15 - Jan 21           │
│                                                                   │
│ ▶ Module 2: Variables and Data Types                             │
│   Available: Jan 22 - Jan 28 (7 days)                     [Edit]│
│                                                                   │
│ ▶ Module 3: Control Flow                                         │
│   Available: Jan 29 - Feb 4 (7 days)                      [Edit]│
│                                                                   │
│ ▶ Module 4: Functions                                            │
│   Available: Feb 5 - Feb 11 (7 days)                      [Edit]│
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Interactions:**
- Click module title → Expand/collapse
- Click [Edit] → Open override modal
- Drag-and-drop to reorder (updates sequence, not dates)
- Bulk select → "Apply same dates to all selected"

---

### Override Modal

**Triggered by:** Clicking [Edit] or individual content item

```
┌──────────────────────────────────────────┐
│ Override Content Availability            │
├──────────────────────────────────────────┤
│                                          │
│ Content: Quiz: Intro Quiz                │
│ Module: Module 1                         │
│                                          │
│ Original Schedule:                       │
│ • Available From: Jan 15, 2026           │
│ • Available Until: Jan 21, 2026          │
│                                          │
│ New Schedule:                            │
│ Available From: [Jan 15, 2026  ▼]        │
│ Available Until: [Jan 28, 2026  ▼]       │
│                 [X] No end date          │
│                                          │
│ Reason for Override: (required)          │
│ ┌────────────────────────────────────┐   │
│ │ Extended deadline due to holiday   │   │
│ │ week affecting student schedules   │   │
│ └────────────────────────────────────┘   │
│                                          │
│ ⚠️ This will only affect this class,    │
│    not the course template.             │
│                                          │
│ [Cancel]           [Reset] [Save Override]│
└──────────────────────────────────────────┘
```

**Validation:**
- Available From < Available Until
- Dates should be within class start/end (warning if outside)
- Reason required (10-500 chars)

---

### Recalculate Modal

**Triggered by:** Clicking [Recalculate] button

```
┌──────────────────────────────────────────┐
│ Recalculate Content Schedule             │
├──────────────────────────────────────────┤
│                                          │
│ This will update all content dates based │
│ on the current class start date and      │
│ course pacing template.                  │
│                                          │
│ ⚠️ Manual overrides will be preserved    │
│    (3 content items have overrides)      │
│                                          │
│ Reason for Recalculation:                │
│ ┌────────────────────────────────────┐   │
│ │ Class start date moved from Jan 15 │   │
│ │ to Jan 22 due to enrollment delay  │   │
│ └────────────────────────────────────┘   │
│                                          │
│ Preview Changes:                         │
│ • Module 1: Jan 22 - Jan 28 (was Jan 15)│
│ • Module 2: Jan 29 - Feb 4  (was Jan 22)│
│ • Module 3: Feb 5 - Feb 11  (was Jan 29)│
│ • 3 overrides will be preserved         │
│                                          │
│ [Cancel]              [Recalculate Schedule]│
└──────────────────────────────────────────┘
```

---

## 2. Instructor: Course Pacing Template Builder

### Location
`/courses/:courseId/edit` → "Content" tab → New "Pacing" column

### Purpose
Configure default pacing rules for course template (applied to new classes)

---

### UI Enhancement to Course Content List

**Visual Design:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Course: CS101 - Intro to Programming                            │
│ Content Management                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ Module | Content              | Type  | Pacing        | Actions │
│ ────────────────────────────────────────────────────────────────│
│   1    │ Welcome Video        │ Video │ Week 1        │ [Edit]  │
│   1    │ Setup Guide          │ Doc   │ Week 1        │ [Edit]  │
│   1    │ Quiz: Intro          │ Quiz  │ Week 1        │ [Edit]  │
│   2    │ Variables Lesson     │ SCORM │ Week 2        │ [Edit]  │
│   2    │ Data Types Video     │ Video │ Week 2        │ [Edit]  │
│   2    │ Assignment 1         │ Asgn  │ Week 2        │ [Edit]  │
│                                                                   │
│ [+ Add Content]                     [Bulk Set Pacing]            │
└─────────────────────────────────────────────────────────────────┘
```

---

### Pacing Configuration Modal

**Triggered by:** Clicking [Edit] in Pacing column

```
┌──────────────────────────────────────────┐
│ Configure Content Pacing                 │
├──────────────────────────────────────────┤
│                                          │
│ Content: Welcome Video                   │
│ Module: 1                                │
│                                          │
│ Pacing Type: ( ) Fixed Dates             │
│              (•) Week-Based (Relative)   │
│              ( ) Always Available        │
│                                          │
│ ┌────────────────────────────────────┐   │
│ │ Week-Based Configuration:          │   │
│ │                                    │   │
│ │ Available Starting: Week [1 ▼]    │   │
│ │ Duration: [7] days                │   │
│ │                                    │   │
│ │ Preview (for class starting Jan 15):│   │
│ │ Available: Jan 15 - Jan 21        │   │
│ └────────────────────────────────────┘   │
│                                          │
│ OR                                       │
│                                          │
│ ┌────────────────────────────────────┐   │
│ │ Fixed Dates Configuration:         │   │
│ │                                    │   │
│ │ Available From: [2026-01-15  ▼]   │   │
│ │ Available Until: [2026-01-21  ▼]  │   │
│ │                 [X] No end date    │   │
│ │                                    │   │
│ │ ⚠️ Fixed dates apply to ALL classes│   │
│ └────────────────────────────────────┘   │
│                                          │
│ [Cancel]                    [Save Pacing]│
└──────────────────────────────────────────┘
```

**Pacing Type Explanations:**
- **Fixed Dates:** Same dates for all classes (e.g., Jan 15-21 for every class)
- **Week-Based:** Relative to class start date (e.g., "Week 1" = Days 0-6 from start)
- **Always Available:** No restrictions, available entire class duration

---

### Bulk Set Pacing Modal

**Triggered by:** Selecting multiple content items + [Bulk Set Pacing]

```
┌──────────────────────────────────────────┐
│ Bulk Set Pacing                          │
├──────────────────────────────────────────┤
│                                          │
│ Selected: 8 content items from Module 1  │
│                                          │
│ Pacing Type: (•) Week-Based              │
│              ( ) Fixed Dates             │
│              ( ) Always Available        │
│                                          │
│ Week-Based Configuration:                │
│ Starting Week: [1 ▼]                     │
│ Duration: [7] days                       │
│                                          │
│ Apply To:                                │
│ [✓] All selected items                   │
│ [✓] All items in Module 1                │
│ [ ] All items in entire course           │
│                                          │
│ [Cancel]           [Apply to All Selected]│
└──────────────────────────────────────────┘
```

---

## 3. Learner: Content Access Indicators

### Location
`/classes/:classId` → Content/Modules list (existing page, enhanced)

### Purpose
Show learners which content is available, upcoming, or closed

---

### Enhanced Module List with Availability

**Visual Design:**
```
┌─────────────────────────────────────────────────────────────────┐
│ CS101 - Spring 2026                          [List] [Calendar] │
│ Instructor: Jane Doe                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ✅ Module 1: Introduction to Programming                         │
│    Completed • 4/4 items complete                                │
│    ├─ ✅ Welcome Video                  [View]                   │
│    ├─ ✅ Setup Guide                    [View]                   │
│    ├─ ✅ Quiz: Intro Quiz (Score: 95%)  [Review]                 │
│    └─ ✅ Assignment: Hello World         [View Submission]       │
│                                                                   │
│ 🟢 Module 2: Variables and Data Types (AVAILABLE NOW)            │
│    In Progress • 2/6 items complete • Available until Jan 28     │
│    ├─ ✅ Variables Lesson               [View]                   │
│    ├─ ✅ Data Types Video               [View]                   │
│    ├─ ⏺ Quiz: Variables (Not Started)  [Start]                  │
│    ├─ ⏺ Practice Exercises             [Start]                  │
│    ├─ ⏺ Assignment 1 (Due Jan 27)      [Start]                  │
│    └─ ⏺ Code Review Video              [Start]                  │
│                                                                   │
│ ⏰ Module 3: Control Flow (OPENS JAN 29)                         │
│    Available in 2 days                                           │
│    └─ 🔒 6 items will unlock on Jan 29                           │
│        [Add to Calendar]                                         │
│                                                                   │
│ ⏰ Module 4: Functions (OPENS FEB 5)                             │
│    Available in 9 days                                           │
│    └─ 🔒 7 items will unlock on Feb 5                            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Status Icons:**
- ✅ Complete (green checkmark)
- 🟢 Available now (green circle)
- ⏺ Not started but available (gray circle)
- ⏰ Upcoming (clock icon)
- 🔒 Locked (padlock icon)
- ⛔ Closed (red circle) - past deadline

---

### Locked Content Click Behavior

**When learner clicks locked content:**

```
┌──────────────────────────────────────────┐
│ Content Not Yet Available                │
├──────────────────────────────────────────┤
│                                          │
│ 🔒 Module 3: Control Flow                │
│                                          │
│ This module will be available on:        │
│ January 29, 2026 at 12:00 AM            │
│                                          │
│ ⏰ Opens in 2 days, 5 hours              │
│                                          │
│ [Add to Calendar] [Set Reminder] [Close] │
└──────────────────────────────────────────┘
```

---

### Closed Content Click Behavior

**When learner clicks closed content (past deadline):**

```
┌──────────────────────────────────────────┐
│ Content No Longer Available              │
├──────────────────────────────────────────┤
│                                          │
│ ⛔ Assignment 1: Variables                │
│                                          │
│ This content was available:              │
│ January 22 - January 28, 2026           │
│                                          │
│ The submission deadline has passed.      │
│                                          │
│ Need an extension? Contact your instructor:│
│ [Message Instructor]            [Close]  │
└──────────────────────────────────────────┘
```

**Note:** If `Class.allowLateAccess = true`, show "View Only" button instead

---

## 4. Learner: Content Calendar View

### Location
`/classes/:classId/calendar` (new page, accessible from class detail)

### Purpose
Visualize all content availability dates in calendar format

---

### Calendar UI

**Visual Design:**
```
┌─────────────────────────────────────────────────────────────────┐
│ CS101 - Spring 2026 Content Calendar          [< Jan 2026 >]   │
├─────────────────────────────────────────────────────────────────┤
│  Sun    Mon    Tue    Wed    Thu    Fri    Sat                  │
│         12     13     14     15     16     17                    │
│                             [████] [████] [████]                 │
│                             Module 1 Opens                       │
│                                                                   │
│   18     19     20     21     22     23     24                   │
│  [████] [████] [████] [🔵] [████] [████] [████]                 │
│                       M1 Ends  Module 2 Opens                    │
│                                                                   │
│   25     26     27     28     29     30     31                   │
│  [████] [████] [████] [🔵] [████] [████] [████]                 │
│                       M2 Ends  Module 3 Opens                    │
│                                                                   │
│ Legend: [████] Available  [🔵] Opens/Closes  [ ] Not Available  │
│                                                                   │
│ Upcoming Content:                                                │
│ • Jan 29 - Module 3: Control Flow opens                         │
│ • Feb 5  - Module 4: Functions opens                            │
│ • Feb 12 - Module 5: Arrays opens                               │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Interactions:**
- Click date → Show content available that day
- Hover date → Tooltip with content titles
- Export to Google Calendar / iCal
- Print view for weekly planner

---

## 5. Dashboard Widgets

### Instructor Dashboard Widget: "Classes Needing Attention"

```
┌──────────────────────────────────────────┐
│ Classes Needing Attention            [>] │
├──────────────────────────────────────────┤
│                                          │
│ ⚠️ CS101 - Spring 2026                   │
│    Class start date changed, content    │
│    schedule needs recalculation          │
│    [Recalculate Schedule]                │
│                                          │
│ ⚠️ CS102 - Spring 2026                   │
│    3 content items have no pacing set   │
│    [Review Content Schedule]             │
│                                          │
└──────────────────────────────────────────┘
```

---

### Learner Dashboard Widget: "Upcoming Content"

```
┌──────────────────────────────────────────┐
│ Content Unlocking Soon               [>] │
├──────────────────────────────────────────┤
│                                          │
│ CS101 - Spring 2026                      │
│ 🔒 Module 3 opens in 2 days (Jan 29)    │
│    [View Class]                          │
│                                          │
│ CS102 - Spring 2026                      │
│ 🔒 Week 4 content opens tomorrow (Jan 23)│
│    [View Class]                          │
│                                          │
└──────────────────────────────────────────┘
```

---

## API Endpoints (for UI Integration)

### 1. Get Class Content Schedule
```
GET /api/v2/classes/:classId/content-schedule
```

**Response:**
```json
{
  "success": true,
  "data": {
    "classId": "507f...",
    "className": "CS101 - Spring 2026",
    "startDate": "2026-01-15T00:00:00Z",
    "endDate": "2026-04-15T23:59:59Z",
    "modules": [
      {
        "moduleNumber": 1,
        "moduleName": "Introduction",
        "content": [
          {
            "scheduleId": "507f...",
            "contentId": "507f...",
            "contentTitle": "Welcome Video",
            "contentType": "video",
            "availableFrom": "2026-01-15T00:00:00Z",
            "availableUntil": "2026-01-21T23:59:59Z",
            "isOverridden": false,
            "status": "available"
          }
        ]
      }
    ]
  }
}
```

---

### 2. Override Content Schedule
```
PUT /api/v2/classes/:classId/content-schedule/:scheduleId
```

**Request Body:**
```json
{
  "availableFrom": "2026-01-15T00:00:00Z",
  "availableUntil": "2026-01-28T23:59:59Z",
  "reason": "Extended deadline due to holiday week"
}
```

---

### 3. Recalculate Schedule
```
POST /api/v2/classes/:classId/content-schedule/recalculate
```

**Request Body:**
```json
{
  "reason": "Class start date moved from Jan 15 to Jan 22"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recalculated": 45,
    "overridesPreserved": 3
  }
}
```

---

### 4. Check Learner Access Status
```
GET /api/v2/classes/:classId/content/:contentId/access-status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "canAccess": false,
    "reason": "Content not yet available",
    "availableFrom": "2026-01-29T00:00:00Z",
    "availableUntil": "2026-02-04T23:59:59Z",
    "moduleNumber": 3,
    "moduleName": "Control Flow"
  }
}
```

---

### 5. Update Course Content Pacing
```
PUT /api/v2/courses/:courseId/content/:courseContentId/pacing
```

**Request Body (Week-Based):**
```json
{
  "type": "relative",
  "relativeStartDay": 7,
  "relativeDurationDays": 7
}
```

**Request Body (Fixed Dates):**
```json
{
  "type": "fixed",
  "fixedAvailableFrom": "2026-01-15T00:00:00Z",
  "fixedAvailableUntil": "2026-01-21T23:59:59Z"
}
```

---

## UI Components Needed

### Reusable Components

1. **AvailabilityBadge**
   - Props: `status` ('available' | 'upcoming' | 'closed')
   - Variants: Small (icon only), Large (icon + text)
   - Example: `<AvailabilityBadge status="upcoming" date="2026-01-29" />`

2. **ContentScheduleTimeline**
   - Props: `modules[]`, `classStartDate`, `classEndDate`
   - Interactive drag-to-adjust
   - Zoom levels (day, week, month)

3. **PacingConfigForm**
   - Props: `type`, `initialValues`, `onSave`
   - Three modes: fixed, relative, always-available
   - Date pickers with validation

4. **OverrideReasonModal**
   - Props: `contentTitle`, `originalDates`, `onSave`
   - Form with date pickers + reason text area
   - Validation and preview

5. **ContentAccessStatusIndicator**
   - Props: `content`, `accessStatus`
   - Shows lock icon, countdown, or checkmark
   - Click → Modal with details

---

## Mobile Responsive Considerations

### Instructor: Timeline View
- Switch to vertical timeline on mobile
- Swipe left/right to navigate weeks
- Tap module → Expand details

### Learner: Module List
- Collapsible modules (accordion style)
- Large touch targets for locked content
- Sticky header with class info

### Calendar View
- Month view on desktop, week view on mobile
- Swipe to navigate months/weeks
- Tap date → Bottom sheet with content list

---

## Accessibility Requirements

### Screen Reader Support
- Announce availability status changes
- Provide text alternatives for icons
- Keyboard navigation for timeline

### Visual Indicators
- Don't rely solely on color (use icons too)
- High contrast mode support
- Clear text labels for all statuses

### Keyboard Navigation
- Tab through content items
- Space/Enter to expand modules
- Arrow keys to navigate timeline

---

## Error States & Edge Cases

### Error State 1: Schedule Generation Failed
```
┌──────────────────────────────────────────┐
│ ⚠️ Content Schedule Unavailable          │
├──────────────────────────────────────────┤
│                                          │
│ The content schedule for this class      │
│ could not be loaded. All content is      │
│ currently available.                     │
│                                          │
│ [Refresh] [Contact Support]              │
└──────────────────────────────────────────┘
```

---

### Edge Case 1: No Pacing Configured
```
┌──────────────────────────────────────────┐
│ ℹ️ Content Pacing Not Enabled            │
├──────────────────────────────────────────┤
│                                          │
│ This class does not have content pacing │
│ configured. All content is available.    │
│                                          │
│ [Enable Pacing] [Learn More]            │
└──────────────────────────────────────────┘
```

---

### Edge Case 2: Late Enrollment
**Learner enrolled Week 3, Weeks 1-2 closed**

Show banner:
```
┌─────────────────────────────────────────┐
│ ℹ️ You enrolled late in this class      │
│    Some content from earlier weeks      │
│    may not be accessible. Contact       │
│    your instructor for access.          │
│    [Message Instructor]         [Dismiss]│
└─────────────────────────────────────────┘
```

---

## User Onboarding & Help

### Instructor First-Time Setup

**Show guided tour when instructor first visits Content Schedule page:**

1. **Step 1:** "This is your class content schedule"
2. **Step 2:** "Content is automatically scheduled based on your course template"
3. **Step 3:** "Click Edit to override dates for specific content"
4. **Step 4:** "If you change class dates, click Recalculate to update schedules"
5. **Step 5:** "Your changes only affect this class, not the course template"

---

### Learner First-Time Experience

**Show tooltip on first locked content encounter:**

```
┌──────────────────────────────────────────┐
│ 💡 Did You Know?                         │
├──────────────────────────────────────────┤
│                                          │
│ Your instructor has scheduled when       │
│ content becomes available. This helps    │
│ you stay on track!                       │
│                                          │
│ 🔒 Locked content will automatically     │
│    unlock on the scheduled date.         │
│                                          │
│ [Got it!]                    [Learn More]│
└──────────────────────────────────────────┘
```

---

## Testing Scenarios for UI Team

### Instructor Tests
1. ✅ View class with pacing enabled (multiple modules)
2. ✅ Override single content item availability
3. ✅ Recalculate schedule after class date change
4. ✅ Reset override to template
5. ✅ Configure week-based pacing in course builder
6. ✅ Configure fixed-date pacing in course builder
7. ✅ Bulk set pacing for entire module
8. ✅ Handle API errors gracefully

### Learner Tests
1. ✅ View class with available, upcoming, and locked content
2. ✅ Click locked content → See availability message
3. ✅ Access available content → No blocking
4. ✅ View calendar with all content dates
5. ✅ Late enrollment → See appropriate messaging
6. ✅ Content becomes available → Update UI in real-time
7. ✅ Closed content → See "contact instructor" option

---

## Design System Integration

### Colors (Suggested)

| Status | Background | Border | Text |
|--------|-----------|--------|------|
| Available | `bg-green-50` | `border-green-200` | `text-green-700` |
| Upcoming | `bg-blue-50` | `border-blue-200` | `text-blue-700` |
| Closed | `bg-gray-100` | `border-gray-300` | `text-gray-600` |
| Overridden | `bg-yellow-50` | `border-yellow-300` | `text-yellow-800` |

---

### Icons (Suggested)

- Available: ✅ Checkmark Circle (green)
- Upcoming: ⏰ Clock (blue)
- Locked: 🔒 Padlock (gray)
- Closed: ⛔ No Entry (red)
- Override: ⚠️ Warning Triangle (yellow)

---

## Performance Considerations

### Data Fetching
- Cache schedule data for 5 minutes
- Prefetch calendar data when learner views class
- Lazy load content details (only fetch when expanded)

### Real-Time Updates
- WebSocket for schedule changes (instructor overrides)
- Poll for availability status when near unlock time
- Show countdown timer that updates every second

---

## Questions for UI Team

1. **Timeline vs List:** Which view should be default for instructors?
2. **Calendar Integration:** Should we integrate with Google Calendar API or just export .ics files?
3. **Notifications:** Should UI show in-app notifications when content unlocks?
4. **Mobile Priority:** Should we build mobile web responsive or native app features?
5. **Offline Mode:** Should learners be able to see schedule offline?

---

## Approval Checklist

- [ ] UI mockups reviewed and approved
- [ ] Component library compatibility confirmed
- [ ] Accessibility requirements reviewed
- [ ] Mobile responsive strategy approved
- [ ] API contracts match UI needs
- [ ] Testing scenarios documented
- [ ] Ready for UI development

---

**Next Steps:**
1. UI team reviews this document
2. Create high-fidelity mockups/prototypes
3. Validate with instructors and learners (user testing)
4. Coordinate API + UI development timelines
5. Begin UI implementation alongside API Phase 4
