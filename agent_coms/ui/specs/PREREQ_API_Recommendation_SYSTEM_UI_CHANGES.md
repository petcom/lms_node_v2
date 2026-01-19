# Prerequisite System - UI Changes & API Recommendations

**Document Type:** UI/Frontend Specification & API Integration Guide
**Created:** 2026-01-16
**Status:** DRAFT - Awaiting UI Team Review
**Feature Type:** CORE/FREE (Always Available)
**Priority:** CRITICAL - Phase 1 Implementation
**Related Documents:**
- `/agent_coms/api/CONTENT_UNLOCKING_ARCHITECTURE.md` (Architecture)
- `/agent_coms/api/PREREQUISITE_SYSTEM_DESIGN.md` (API Design)
- `/agent_coms/api/PREREQUISITE_SYSTEM_IMPLEMENTATION_PLAN.md` (Implementation)
- `/agent_coms/messages/API_CONTRACT_CHANGES_PREREQUISITE_SYSTEM.md` (API Contracts)
**Target Audience:** UI/Frontend Team

---

## Executive Summary

This document specifies all user interface changes needed to support the **Core Prerequisite System** - a self-paced learning platform with completion-based content unlocking. This is a FREE/DEFAULT feature available to all users.

**Key UI Components:**
1. **Learner: Locked Content Indicators** - Show why content is locked and how to unlock it
2. **Learner: Progress Dashboard** - Track completion and see what's next
3. **Learner: Progress Warnings** - Alert when falling behind suggested pace
4. **Instructor: Prerequisite Configuration** - Set up prerequisite rules
5. **Instructor: Override Requests** - Request exceptions for learners
6. **Dept-Admin: Override Approval** - Review and approve/deny requests
7. **Dept-Admin: Warning Configuration** - Set progress warning thresholds
8. **Content-Admin: Flow Diagram** - Visualize prerequisite relationships

---

## User Roles & Permissions

| Role | View Locked Content | Configure Prerequisites | Request Override | Approve Override | Configure Warnings |
|------|---------------------|-------------------------|------------------|------------------|-------------------|
| **Learner** | ✅ (own classes) | ❌ | ❌ | ❌ | ❌ |
| **Instructor** | ✅ (own classes) | ❌ | ✅ (own classes) | ✅ (if dept-admin) | ❌ |
| **Content Admin** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Dept Admin** | ✅ (dept classes) | ✅ (dept courses) | ✅ | ✅ (dept) | ✅ (dept) |
| **System Admin** | ✅ (all) | ✅ (all) | ✅ | ✅ (all) | ✅ (all) |

---

## UI Component Overview

### Learner Interfaces

```
My Classes Dashboard
└── Class Detail Page
    ├── Content/Module List (ENHANCED)
    │   ├── Lock Indicators (NEW)
    │   ├── Prerequisite Messages (NEW)
    │   └── Progress Bars (ENHANCED)
    ├── Progress Tab (NEW)
    │   ├── Completion Stats
    │   ├── Timeline Visualization
    │   └── Progress Warnings
    └── Warnings Banner (NEW)
```

### Instructor Interfaces

```
Course Builder
└── Course Content Management
    ├── Content List
    │   └── Prerequisite Column (NEW)
    └── Prerequisite Configuration Modal (NEW)
        ├── Sequential Config
        ├── Specific Config
        └── Any-Of Config

Class Management
└── Class Detail Page
    ├── Learner Roster
    │   └── Override Request Button (NEW)
    └── Override Requests Tab (NEW)
```

### Admin Interfaces

```
Department Dashboard
├── Pending Overrides Widget (NEW)
│   └── Approval Queue
└── Settings
    └── Progress Warnings Config (NEW)

Content Admin Tools
└── Course Management
    └── Prerequisite Flow Diagram (NEW)
```

---

## 1. Learner: Locked Content Indicators

### Location
`/classes/:classId` → Content/Modules list (existing page, enhanced)

### Purpose
Show learners which content is available vs locked, with clear explanations

---

### Enhanced Module List with Lock States

**Visual Design:**
```
┌─────────────────────────────────────────────────────────────────┐
│ CS101 - Spring 2026                          Deadline: Apr 15   │
│ Progress: 45% Complete (18/40 items) • 60 days remaining        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ✅ Module 1: Introduction to Programming (COMPLETED)            │
│    Completed Jan 20 • 100% (4/4 items)                          │
│    ├─ ✅ Welcome Video              [View]                      │
│    ├─ ✅ Setup Guide                [View]                      │
│    ├─ ✅ Quiz: Intro (Score: 95%)   [Review]                    │
│    └─ ✅ Assignment: Hello World     [View Submission]          │
│                                                                   │
│ 🟢 Module 2: Variables and Data Types (IN PROGRESS)             │
│    Started Jan 21 • 66% (4/6 items) • Complete to unlock next   │
│    ├─ ✅ Variables Lesson           [View]                      │
│    ├─ ✅ Data Types Video           [View]                      │
│    ├─ ✅ Quiz: Variables (85%)      [Review]                    │
│    ├─ ⏺ Practice Exercises         [Start] ← Your next step    │
│    ├─ 🔒 Assignment 1               (Complete Quiz with 70%+)   │
│    └─ 🔒 Code Review Video          (Complete Assignment 1)     │
│                                                                   │
│ 🔒 Module 3: Control Flow (LOCKED)                              │
│    Unlocks after completing Module 2 with 70% or higher         │
│    └─ 🔒 6 items will unlock       [What do I need to complete?]│
│                                                                   │
│ 🔒 Module 4: Functions (LOCKED)                                 │
│    Unlocks after completing Module 3                            │
│    └─ 🔒 7 items locked            [View Requirements]          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Status Icons & Colors:**
- ✅ Completed (green checkmark)
- 🟢 In Progress (green circle)
- ⏺ Available but not started (gray circle)
- 🔒 Locked (gray padlock)
- ⚠️ Needs attention (yellow warning)

---

### Locked Content Click Behavior

**When learner clicks locked content:**

```
┌──────────────────────────────────────────┐
│ 🔒 Content Locked                        │
├──────────────────────────────────────────┤
│                                          │
│ Assignment 1: Variables                  │
│                                          │
│ This content is locked because you need  │
│ to complete prerequisites first.         │
│                                          │
│ To unlock, you must:                     │
│ • Complete Quiz: Variables with 70% or   │
│   higher (Current: 85%) ✅               │
│                                          │
│ ✨ Great news! You've met all requirements│
│    Try refreshing the page.              │
│                                          │
│ [Refresh Page]                  [Close]  │
└──────────────────────────────────────────┘
```

**Variant: Multiple Prerequisites:**

```
┌──────────────────────────────────────────┐
│ 🔒 Content Locked                        │
├──────────────────────────────────────────┤
│                                          │
│ Final Exam                               │
│                                          │
│ To unlock, you must complete all of:    │
│                                          │
│ ✅ Module 1: Introduction (Complete)     │
│ ✅ Module 2: Variables (Complete)        │
│ ❌ Module 3: Control Flow (60% complete) │
│ ❌ Module 4: Functions (Not started)     │
│ ❌ All Assignments (3 of 5 submitted)    │
│                                          │
│ Progress: 3/5 prerequisites met          │
│                                          │
│ [View My Progress]             [Close]   │
└──────────────────────────────────────────┘
```

---

### Prerequisite Override Granted

**When learner has approved override:**

```
┌──────────────────────────────────────────┐
│ Module 3: Control Flow                   │
│                                          │
│ 🎓 Special Access Granted                │
│                                          │
│ Your instructor has granted you access   │
│ to this content even though prerequisites│
│ are not met. This is a special exception.│
│                                          │
│ Normal prerequisites:                    │
│ • Complete Module 2 with 70%+ (Not met)  │
│                                          │
│ Reason for exception:                    │
│ "Learner demonstrated proficiency through│
│ alternative assessment during office hrs"│
│                                          │
│ [Start Module 3]               [Close]   │
└──────────────────────────────────────────┘
```

---

## 2. Learner: Progress Dashboard

### Location
`/classes/:classId/progress` (new tab in Class Detail page)

### Purpose
Comprehensive view of learner's progress, what's completed, what's next, warnings

---

### Progress Dashboard Layout

**Visual Design:**
```
┌─────────────────────────────────────────────────────────────────┐
│ CS101 - Spring 2026 • My Progress                               │
│ Instructor: Dr. Jane Smith                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Overall Progress                                          │   │
│ │ ████████████████░░░░░░░░░░░░ 45% Complete (18/40 items)  │   │
│ │                                                           │   │
│ │ Enrolled: Jan 15, 2026                                   │   │
│ │ Deadline: Apr 15, 2026 (60 days remaining)               │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│ ⚠️ Progress Warning: Behind Suggested Pace                      │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ You have completed 45% of content with 60% of time       │   │
│ │ elapsed. Consider increasing your pace to stay on track. │   │
│ │                                                           │   │
│ │ [Review My Schedule]  [Contact Instructor]    [Dismiss]  │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Your Next Steps                                           │   │
│ │ ⏺ Practice Exercises (Module 2)      [Start Now]        │   │
│ │ 🔒 Assignment 1 (Module 2)            Locked - complete   │   │
│ │                                        quiz first         │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Module Breakdown                                          │   │
│ │                                                           │   │
│ │ ✅ Module 1: Introduction            100% (4/4)          │   │
│ │    Completed Jan 20                                       │   │
│ │    ████████████████████████████████████ 4/4               │   │
│ │                                                           │   │
│ │ 🟢 Module 2: Variables                66% (4/6)          │   │
│ │    Started Jan 21 • In Progress                          │   │
│ │    ████████████████████░░░░░░░░░░░░░░░ 4/6               │   │
│ │    2 items remaining to unlock Module 3                  │   │
│ │                                                           │   │
│ │ 🔒 Module 3: Control Flow             0% (0/6) Locked    │   │
│ │    Complete Module 2 with 70%+ to unlock                 │   │
│ │    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0/6               │   │
│ │                                                           │   │
│ │ 🔒 Module 4: Functions                0% (0/7) Locked    │   │
│ │    Complete Module 3 to unlock                           │   │
│ │    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0/7               │   │
│ │                                                           │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Timeline Estimate                                         │   │
│ │                                                           │   │
│ │ Jan 15──────Jan 30──────Feb 15──────Mar 1──────Apr 15   │   │
│ │    ▲         ▲           ▲           │           ▲       │   │
│ │  Start    Module 2    Module 3    Today    Deadline      │   │
│ │           Complete    Started                             │   │
│ │                                                           │   │
│ │ Suggested pace: Complete 2 items per week                │   │
│ │ Your pace: 3 items per week (ahead of suggested!)        │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

### Progress Warning Variants

**Info (Blue):**
```
ℹ️ Behind Suggested Pace
You have completed 30% of content with 50% of time elapsed.
Consider reviewing your schedule.
[Review Progress]  [Dismiss]
```

**Warning (Yellow):**
```
⚠️ At Risk of Not Completing
You have 40% of content remaining with only 2 weeks left.
You may need assistance to complete on time.
[Contact Instructor]  [View Schedule]  [Dismiss]
```

**Critical (Red):**
```
🚨 Urgent Action Required
Critical: 30% of content remaining with only 1 week left.
Immediate action required to complete this class.
[Schedule Meeting]  [Request Extension]  [Dismiss]
```

---

## 3. Instructor: Prerequisite Configuration

### Location
`/courses/:courseId/edit` → Content Management tab

### Purpose
Configure prerequisite rules for course content

---

### Content List with Prerequisite Column

**Visual Design:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Course: CS101 - Intro to Programming                            │
│ Content Management                                [+ Add Content]│
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ Module | Content              | Type   | Prerequisites | Actions│
│ ─────────────────────────────────────────────────────────────── │
│   1    │ Welcome Video        │ Video  │ None          │ [Edit] │
│   1    │ Setup Guide          │ Doc    │ None          │ [Edit] │
│   1    │ Quiz: Intro          │ Quiz   │ None          │ [Edit] │
│   2    │ Variables Lesson     │ SCORM  │ Sequential    │ [Edit] │
│        │                      │        │ (Complete M1) │        │
│   2    │ Data Types Video     │ Video  │ Sequential    │ [Edit] │
│   2    │ Quiz: Variables      │ Quiz   │ Sequential    │ [Edit] │
│   2    │ Assignment 1         │ Asgn   │ Specific      │ [Edit] │
│        │                      │        │ (Quiz 70%+)   │        │
│                                                                   │
│ [Bulk Set Prerequisites]  [Validate Prerequisites]  [View Flow] │
└─────────────────────────────────────────────────────────────────┘
```

---

### Prerequisite Configuration Modal

**Triggered by:** Clicking [Edit] in Prerequisites column

```
┌──────────────────────────────────────────┐
│ Configure Prerequisites                  │
├──────────────────────────────────────────┤
│                                          │
│ Content: Quiz: Variables                 │
│ Module: 2                                │
│                                          │
│ Prerequisite Type:                       │
│ ( ) None - Always available              │
│ (•) Sequential - Complete previous item  │
│ ( ) Specific - Complete specific items   │
│ ( ) Any-Of - Complete N of M items       │
│                                          │
│ ┌────────────────────────────────────┐   │
│ │ Sequential Configuration:          │   │
│ │                                    │   │
│ │ Learners must complete the previous│   │
│ │ content item in sequence before    │   │
│ │ accessing this content.            │   │
│ │                                    │   │
│ │ Previous Item: Data Types Video    │   │
│ │                                    │   │
│ │ Requirements:                      │   │
│ │ ☑ Must complete (any score)        │   │
│ │ ☑ Minimum score: [70] %            │   │
│ │ ☐ Must pass (score >= passing)    │   │
│ │                                    │   │
│ │ Preview: Learners must complete    │   │
│ │ "Data Types Video" with 70% or     │   │
│ │ higher to access this quiz.        │   │
│ └────────────────────────────────────┘   │
│                                          │
│ ⚠️ Changing prerequisites will create a  │
│    new course version. Active classes   │
│    will continue using the old version.  │
│                                          │
│ [Cancel]                   [Save Changes]│
└──────────────────────────────────────────┘
```

---

### Specific Prerequisites Modal

```
┌──────────────────────────────────────────┐
│ Configure Prerequisites                  │
├──────────────────────────────────────────┤
│                                          │
│ Content: Final Exam                      │
│                                          │
│ Prerequisite Type:                       │
│ ( ) None                                 │
│ ( ) Sequential                           │
│ (•) Specific - Complete specific items   │
│ ( ) Any-Of                               │
│                                          │
│ ┌────────────────────────────────────┐   │
│ │ Specific Prerequisites:            │   │
│ │                                    │   │
│ │ Select content items that must be  │   │
│ │ completed:                         │   │
│ │                                    │   │
│ │ ☑ Module 1: Introduction           │   │
│ │ ☑ Module 2: Variables              │   │
│ │ ☑ Module 3: Control Flow           │   │
│ │ ☑ Module 4: Functions              │   │
│ │ ☑ All Assignments (5 items)        │   │
│ │                                    │   │
│ │ 5 items selected                   │   │
│ │                                    │   │
│ │ Logic:                             │   │
│ │ (•) All selected items required (AND)│  │
│ │ ( ) Any selected item required (OR)│   │
│ │                                    │   │
│ │ Minimum Score:                     │   │
│ │ ☑ Require [80] % on all items      │   │
│ │                                    │   │
│ │ Preview: Learners must complete    │   │
│ │ all 5 selected items with 80% or   │   │
│ │ higher to access the final exam.   │   │
│ └────────────────────────────────────┘   │
│                                          │
│ [Cancel]                   [Save Changes]│
└──────────────────────────────────────────┘
```

---

### Any-Of Prerequisites Modal

```
┌──────────────────────────────────────────┐
│ Configure Prerequisites                  │
├──────────────────────────────────────────┤
│                                          │
│ Content: Module 3: Control Flow          │
│                                          │
│ Prerequisite Type:                       │
│ ( ) None                                 │
│ ( ) Sequential                           │
│ ( ) Specific                             │
│ (•) Any-Of - Complete N of M items       │
│                                          │
│ ┌────────────────────────────────────┐   │
│ │ Any-Of Prerequisites:              │   │
│ │                                    │   │
│ │ Select pool of content items:      │   │
│ │                                    │   │
│ │ ☑ Practice Exercise 1              │   │
│ │ ☑ Practice Exercise 2              │   │
│ │ ☑ Practice Exercise 3              │   │
│ │ ☑ Practice Exercise 4              │   │
│ │ ☑ Practice Exercise 5              │   │
│ │                                    │   │
│ │ 5 items in pool                    │   │
│ │                                    │   │
│ │ Minimum Required:                  │   │
│ │ Learners must complete at least    │   │
│ │ [3 ▼] of the 5 items above         │   │
│ │                                    │   │
│ │ Optional Score Requirement:        │   │
│ │ ☑ Each item must score [70] % +    │   │
│ │                                    │   │
│ │ Preview: Learners must complete    │   │
│ │ any 3 of 5 practice exercises with │   │
│ │ 70% or higher to access Module 3.  │   │
│ └────────────────────────────────────┘   │
│                                          │
│ [Cancel]                   [Save Changes]│
└──────────────────────────────────────────┘
```

---

### Version Creation Warning

**When saving prerequisite changes:**

```
┌──────────────────────────────────────────┐
│ ⚠️ Create New Course Version?            │
├──────────────────────────────────────────┤
│                                          │
│ Changing prerequisites will create a new │
│ course version to protect active classes.│
│                                          │
│ What happens:                            │
│ ✓ New version created (v2)              │
│ ✓ Active classes stay on v1             │
│ ✓ New classes use v2                    │
│ ✓ Changes isolated from live classes    │
│                                          │
│ Current version: v1 (3 active classes)   │
│ New version: v2                          │
│                                          │
│ Reason for change: (optional)            │
│ ┌────────────────────────────────────┐   │
│ │ Updated prerequisites to require   │   │
│ │ 70% minimum score on all quizzes   │   │
│ └────────────────────────────────────┘   │
│                                          │
│ [Cancel]         [Create New Version]    │
└──────────────────────────────────────────┘
```

---

## 4. Instructor: Override Requests

### Location
`/classes/:classId/roster` → Individual learner view

### Purpose
Request prerequisite exception for specific learner

---

### Learner Detail with Override Button

```
┌─────────────────────────────────────────────────────────────────┐
│ Learner: John Doe                                               │
│ Email: john.doe@example.com                                     │
│ Enrolled: Jan 15, 2026 • Status: Active                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ Progress: 45% (18/40 items) • 60 days remaining                 │
│                                                                   │
│ Module Status:                                                   │
│ ✅ Module 1: Introduction (100%)                                │
│ 🟢 Module 2: Variables (66%) - In Progress                      │
│ 🔒 Module 3: Control Flow - Locked (requires Module 2 complete) │
│ 🔒 Module 4: Functions - Locked                                 │
│                                                                   │
│ [Request Prerequisite Override]                                 │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

### Override Request Modal

```
┌──────────────────────────────────────────┐
│ Request Prerequisite Override            │
├──────────────────────────────────────────┤
│                                          │
│ Learner: John Doe                        │
│                                          │
│ Select locked content to grant access:  │
│                                          │
│ (•) Module 3: Control Flow               │
│     Currently locked: Requires Module 2  │
│     complete with 70%+                   │
│                                          │
│ ( ) Module 4: Functions                  │
│     Currently locked: Requires Module 3  │
│                                          │
│ Reason for Override: (required)          │
│ ┌────────────────────────────────────┐   │
│ │ Learner demonstrated proficiency   │   │
│ │ through alternative assessment     │   │
│ │ during office hours. Comfortable   │   │
│ │ with variables and ready for       │   │
│ │ control flow concepts.             │   │
│ └────────────────────────────────────┘   │
│                                          │
│ ℹ️ As an instructor, your request will  │
│    be sent to the department admin for  │
│    approval.                            │
│                                          │
│ [Cancel]                [Submit Request] │
└──────────────────────────────────────────┘
```

---

### Auto-Approval (Instructor is Dept-Admin)

```
┌──────────────────────────────────────────┐
│ ✓ Override Granted                       │
├──────────────────────────────────────────┤
│                                          │
│ Learner: John Doe                        │
│ Content: Module 3: Control Flow          │
│                                          │
│ ✓ As a department admin, your request   │
│   was automatically approved.            │
│                                          │
│ John Doe can now access Module 3 even    │
│ though prerequisites are not met.        │
│                                          │
│ John will be notified via email.         │
│                                          │
│ [View Learner Progress]          [Close] │
└──────────────────────────────────────────┘
```

---

### Pending Approval (Regular Instructor)

```
┌──────────────────────────────────────────┐
│ ℹ️ Request Submitted                     │
├──────────────────────────────────────────┤
│                                          │
│ Your override request has been submitted │
│ to the department admin for review.      │
│                                          │
│ Learner: John Doe                        │
│ Content: Module 3: Control Flow          │
│ Status: Pending Approval                 │
│                                          │
│ You will be notified when the request    │
│ is reviewed (usually within 24 hours).   │
│                                          │
│ [Track Request Status]           [Close] │
└──────────────────────────────────────────┘
```

---

## 5. Dept-Admin: Override Approval

### Location
`/departments/:deptId/dashboard` → Pending Actions widget

### Purpose
Review and approve/deny prerequisite override requests

---

### Pending Overrides Widget

```
┌──────────────────────────────────────────┐
│ ⚠️ Pending Override Requests (5)         │
├──────────────────────────────────────────┤
│                                          │
│ ● CS101 - John Doe                       │
│   Module 3 access • Requested 2 days ago │
│   Instructor: Dr. Smith                  │
│   [Review]                               │
│                                          │
│ ● CS102 - Jane Smith                     │
│   Final Exam access • Requested 1 day ago│
│   Instructor: Dr. Johnson                │
│   [Review]                               │
│                                          │
│ ● CS101 - Bob Wilson                     │
│   Module 4 access • Requested 5 hours ago│
│   Instructor: Dr. Smith                  │
│   [Review]                               │
│                                          │
│ [View All Requests]                      │
└──────────────────────────────────────────┘
```

---

### Override Review Modal

```
┌──────────────────────────────────────────┐
│ Review Prerequisite Override Request     │
├──────────────────────────────────────────┤
│                                          │
│ Class: CS101 - Spring 2026               │
│ Learner: John Doe (john.doe@example.com) │
│ Progress: 45% • 60 days remaining        │
│                                          │
│ Content Requested: Module 3: Control Flow│
│                                          │
│ Current Prerequisites:                   │
│ • Complete Module 2 with 70% or higher   │
│                                          │
│ Learner's Status:                        │
│ ❌ Module 2: 66% complete (4/6 items)    │
│                                          │
│ Requested By: Dr. Jane Smith (Instructor)│
│ Requested: Jan 25, 2026 (2 days ago)     │
│                                          │
│ Reason:                                  │
│ ┌────────────────────────────────────┐   │
│ │ Learner demonstrated proficiency   │   │
│ │ through alternative assessment     │   │
│ │ during office hours. Comfortable   │   │
│ │ with variables and ready for       │   │
│ │ control flow concepts.             │   │
│ └────────────────────────────────────┘   │
│                                          │
│ Your Decision:                           │
│ (•) Approve - Grant access               │
│ ( ) Deny - Keep locked                   │
│                                          │
│ Review Notes: (optional)                 │
│ ┌────────────────────────────────────┐   │
│ │ Approved based on instructor       │   │
│ │ recommendation and learner's       │   │
│ │ demonstrated skills in office hours│   │
│ └────────────────────────────────────┘   │
│                                          │
│ [Cancel]          [Deny]   [Approve]     │
└──────────────────────────────────────────┘
```

---

## 6. Dept-Admin: Warning Configuration

### Location
`/departments/:deptId/settings` → Progress Warnings tab

### Purpose
Configure department-wide progress warning thresholds

---

### Warning Configuration UI

```
┌─────────────────────────────────────────────────────────────────┐
│ Department: Computer Science                                    │
│ Progress Warnings Configuration                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ Enable Progress Warnings: [✓] On  [ ] Off                       │
│                                                                   │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Warning Threshold 1: Behind Suggested Pace (INFO)        │   │
│ │                                              [Edit] [Delete]  │
│ │                                                           │   │
│ │ Trigger Conditions:                                       │   │
│ │ • Time Elapsed: 50% of class duration                     │   │
│ │ • Content Complete: Less than 30%                         │   │
│ │                                                           │   │
│ │ Message:                                                  │   │
│ │ "You have completed 30% of content with 50% of time      │   │
│ │ elapsed. Consider increasing your pace."                  │   │
│ │                                                           │   │
│ │ Action: [Review your progress and plan your schedule]    │   │
│ │ Notify Instructor: [ ] No                                │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Warning Threshold 2: At Risk (WARNING)                   │   │
│ │                                              [Edit] [Delete]  │
│ │                                                           │   │
│ │ Trigger Conditions:                                       │   │
│ │ • Days Remaining: Less than 14 days                       │   │
│ │ • Content Remaining: More than 40%                        │   │
│ │                                                           │   │
│ │ Message:                                                  │   │
│ │ "You have 40% of content remaining with only 2 weeks     │   │
│ │ left. You may need assistance."                           │   │
│ │                                                           │   │
│ │ Action: [Contact your instructor for support]            │   │
│ │ Notify Instructor: [✓] Yes                               │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Warning Threshold 3: Critical (CRITICAL)                 │   │
│ │                                              [Edit] [Delete]  │
│ │                                                           │   │
│ │ Trigger Conditions:                                       │   │
│ │ • Days Remaining: Less than 7 days                        │   │
│ │ • Content Remaining: More than 30%                        │   │
│ │                                                           │   │
│ │ Message:                                                  │   │
│ │ "Critical: 30% of content remaining with only 1 week     │   │
│ │ left. Immediate action required."                         │   │
│ │                                                           │   │
│ │ Action: [Schedule meeting with instructor immediately]   │   │
│ │ Notify Instructor: [✓] Yes                               │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│ [+ Add Warning Threshold]                                        │
│                                                                   │
│ [Cancel]                               [Save Configuration]      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

### Edit Warning Threshold Modal

```
┌──────────────────────────────────────────┐
│ Edit Warning Threshold                   │
├──────────────────────────────────────────┤
│                                          │
│ Threshold Name:                          │
│ [Behind Suggested Pace______________]    │
│                                          │
│ Severity:                                │
│ (•) Info (Blue)                          │
│ ( ) Warning (Yellow)                     │
│ ( ) Critical (Red)                       │
│                                          │
│ Trigger Condition Type:                  │
│ (•) Time Elapsed                         │
│ ( ) Content Remaining                    │
│ ( ) Custom Formula (Advanced)            │
│                                          │
│ ┌────────────────────────────────────┐   │
│ │ Time Elapsed Conditions:           │   │
│ │                                    │   │
│ │ When time elapsed:                 │   │
│ │ [50] % of class duration           │   │
│ │                                    │   │
│ │ And content completed:             │   │
│ │ Less than [30] %                   │   │
│ │                                    │   │
│ │ This triggers when learners are    │   │
│ │ behind the expected pace.          │   │
│ └────────────────────────────────────┘   │
│                                          │
│ Warning Message:                         │
│ ┌────────────────────────────────────┐   │
│ │ You have completed {contentPercent}│   │
│ │ of content with {timePercent} of   │   │
│ │ time elapsed. Consider increasing  │   │
│ │ your pace.                         │   │
│ └────────────────────────────────────┘   │
│                                          │
│ Action Prompt:                           │
│ [Review your progress________________]   │
│                                          │
│ ☑ Notify instructor when triggered       │
│                                          │
│ [Cancel]                     [Save]      │
└──────────────────────────────────────────┘
```

---

## 7. Content-Admin: Prerequisite Flow Diagram

### Location
`/courses/:courseId/prerequisites/diagram` (new page)

### Purpose
Visualize prerequisite relationships and validate structure

---

### Flow Diagram View

```
┌─────────────────────────────────────────────────────────────────┐
│ Course: CS101 - Intro to Programming                            │
│ Prerequisite Flow Diagram                    [Validate] [Export]│
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ┌─────────┐                                                      │
│ │Module 1 │                                                      │
│ │  Intro  │──────────┐                                          │
│ └─────────┘          │                                          │
│                      ▼                                           │
│                 ┌─────────┐                                      │
│                 │Module 2 │                                      │
│                 │Variables│──────────┐                          │
│                 └─────────┘          │                          │
│                      │               ▼                           │
│                      │          ┌─────────┐                      │
│                      ▼          │Module 3 │                      │
│                 ┌─────────┐    │Control  │                      │
│                 │Quiz: Var│    │  Flow   │──────────┐          │
│                 │(70%+)   │    └─────────┘          │          │
│                 └─────────┘                         ▼          │
│                      │                         ┌─────────┐      │
│                      ▼                         │Module 4 │      │
│                 ┌─────────┐                    │Functions│      │
│                 │Asgn 1   │                    └─────────┘      │
│                 └─────────┘                         │           │
│                      │                              │           │
│                      └──────────────┬───────────────┘          │
│                                     ▼                           │
│                                ┌─────────┐                      │
│                                │ Final   │                      │
│                                │  Exam   │                      │
│                                └─────────┘                      │
│                                                                   │
│ Legend:                                                           │
│ ──▶ Sequential   ──▶ Specific (AND)   ⇢ Any-of                 │
│ ✓ Valid  ⚠️ Warning  ❌ Error                                    │
│                                                                   │
│ ✓ No circular dependencies detected                             │
│ ✓ All content reachable from start                              │
│ ✓ No orphaned content                                           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

### Flow Diagram with Issues

```
┌─────────────────────────────────────────────────────────────────┐
│ Course: CS102 - Advanced Programming                            │
│ Prerequisite Flow Diagram              [Validate] [Export] [Fix]│
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ⚠️ 2 Issues Detected                                             │
│                                                                   │
│ ┌─────────┐          ┌─────────┐                                │
│ │Module 1 │──────────│Module 2 │◄─────────┐                     │
│ └─────────┘          └─────────┘          │                     │
│                           │                │                     │
│                           ▼                │                     │
│                      ┌─────────┐          │                     │
│                      │Module 3 │──────────┘                     │
│                      └─────────┘                                │
│                        ❌ Circular                               │
│                                                                   │
│                                          ┌─────────┐            │
│                                          │Module 5 │            │
│                                          │(Orphan) │            │
│                                          └─────────┘            │
│                                            ⚠️ No Path            │
│                                                                   │
│ Issues:                                                           │
│ ❌ Circular dependency: Module 2 → Module 3 → Module 2           │
│    Fix: Remove prerequisite from Module 3 to Module 2           │
│                                                                   │
│ ⚠️ Orphaned content: Module 5 has no path from starting point   │
│    Fix: Add prerequisite or remove module                       │
│                                                                   │
│ [Auto-Fix Issues]                          [Cancel] [Save]       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Reusable Components

### AvailabilityBadge Component

```typescript
interface AvailabilityBadgeProps {
  status: 'completed' | 'available' | 'locked';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

// Small variant (icon only)
<AvailabilityBadge status="locked" size="sm" />
// Output: 🔒

// Medium variant (icon + short text)
<AvailabilityBadge status="locked" size="md" showLabel />
// Output: 🔒 Locked

// Large variant (icon + full text)
<AvailabilityBadge status="locked" size="lg" showLabel />
// Output: 🔒 Content Locked - Complete prerequisites first
```

---

### PrerequisiteMessage Component

```typescript
interface PrerequisiteMessageProps {
  prerequisites: MissingPrerequisite[];
  variant: 'inline' | 'modal' | 'banner';
}

<PrerequisiteMessage
  prerequisites={[
    { contentTitle: 'Quiz: Variables', reason: 'Complete with 70%+', currentScore: 65, requiredScore: 70 }
  ]}
  variant="inline"
/>

// Output:
// 🔒 Complete Quiz: Variables with 70%+ (Current: 65%)
```

---

### ProgressBar Component

```typescript
interface ProgressBarProps {
  completed: number;
  total: number;
  showLabel?: boolean;
  variant?: 'default' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

<ProgressBar
  completed={18}
  total={40}
  showLabel
  variant="warning"
  size="md"
/>

// Output:
// ████████████░░░░░░░░░░░░ 45% (18/40)
```

---

### WarningAlert Component

```typescript
interface WarningAlertProps {
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  actionPrompt?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}

<WarningAlert
  severity="warning"
  title="At Risk of Not Completing"
  message="You have 40% of content remaining with only 2 weeks left."
  actionPrompt="Contact Instructor"
  onAction={() => navigate('/contact')}
  onDismiss={() => dismissWarning()}
/>
```

---

## 9. API Integration Guide

### Checking Content Access Before Launch

```typescript
// Before allowing learner to launch content
const checkAccess = async (classId: string, contentId: string) => {
  const response = await api.get(
    `/classes/${classId}/content/${contentId}/access-status`
  );

  if (!response.data.canAccess) {
    // Show lock UI with reason
    showLockModal({
      reason: response.data.reason,
      message: response.data.message,
      missingPrerequisites: response.data.missingPrerequisites
    });
    return false;
  }

  // Allow launch
  return true;
};

// Usage
const handleContentClick = async (content) => {
  if (content.status === 'locked') {
    const canAccess = await checkAccess(classId, content.id);
    if (!canAccess) return;
  }

  // Launch content
  launchContent(content.id);
};
```

---

### Loading Progress Data

```typescript
const loadLearnerProgress = async (classId: string) => {
  const response = await api.get(`/classes/${classId}/progress`);

  return {
    overall: response.data.progress,
    modules: response.data.modules,
    warnings: response.data.warnings,
    deadline: response.data.enrollment.deadline,
    daysRemaining: response.data.enrollment.daysRemaining
  };
};

// Usage in component
useEffect(() => {
  loadLearnerProgress(classId).then(progress => {
    setProgress(progress);
    setWarnings(progress.warnings);
  });
}, [classId]);
```

---

### Requesting Prerequisite Override

```typescript
const requestOverride = async (
  classId: string,
  enrollmentId: string,
  contentId: string,
  reason: string
) => {
  const response = await api.post(
    `/classes/${classId}/enrollments/${enrollmentId}/prerequisite-override/request`,
    { contentId, reason }
  );

  if (response.data.status === 'approved') {
    // Auto-approved (instructor is dept-admin)
    showSuccessNotification('Override granted immediately!');
  } else {
    // Pending approval
    showInfoNotification('Request submitted for approval');
  }

  return response.data;
};
```

---

### Configuring Prerequisites

```typescript
const savePrerequisites = async (
  courseId: string,
  courseContentId: string,
  config: PrerequisiteConfig
) => {
  const response = await api.put(
    `/courses/${courseId}/content/${courseContentId}/prerequisites`,
    config
  );

  // Check if version was created
  if (response.data.versionCreated) {
    showWarning(
      `New course version created (v${response.data.newVersion}). ` +
      `Active classes will continue using v${response.data.oldVersion}.`
    );
  }

  return response.data;
};
```

---

## 10. TypeScript Contracts

### Create Frontend Contracts

**File:** `src/types/prerequisites.ts`

```typescript
export type PrerequisiteType = 'none' | 'sequential' | 'specific' | 'any-of';

export interface PrerequisiteConfig {
  type: PrerequisiteType;
  sequential?: {
    enabled: boolean;
    mustComplete: boolean;
    minimumScore?: number;
    mustPass?: boolean;
  };
  specific?: {
    contentIds: string[];
    requireAll: boolean;
    minimumScore?: number;
    mustPass?: boolean;
  };
  anyOf?: {
    contentIds: string[];
    minimumRequired: number;
    minimumScore?: number;
  };
}

export interface MissingPrerequisite {
  contentId?: string;
  contentTitle?: string;
  reason: string;
  currentScore?: number;
  requiredScore?: number;
}

export interface AccessCheckResponse {
  canAccess: boolean;
  reason?: 'not-enrolled' | 'deadline-passed' | 'class-inactive' | 'prerequisites-not-met';
  message?: string;
  deadline?: string;
  missingPrerequisites?: MissingPrerequisite[];
}

export interface LearnerProgress {
  classId: string;
  className: string;
  enrollment: {
    enrolledAt: string;
    deadline: string;
    customDeadline: boolean;
    daysRemaining: number;
  };
  progress: {
    totalContent: number;
    completed: number;
    inProgress: number;
    locked: number;
    percentComplete: number;
  };
  modules: ModuleProgress[];
  warnings?: ProgressWarning[];
}

export interface ModuleProgress {
  moduleNumber: number;
  moduleName?: string;
  status: 'completed' | 'in-progress' | 'locked';
  reason?: string;
  content: ContentProgress[];
}

export interface ContentProgress {
  contentId: string;
  title: string;
  type: string;
  status: 'completed' | 'in-progress' | 'locked';
  score?: number;
  completedAt?: string;
  reason?: string;
}

export interface ProgressWarning {
  id: string;
  name: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  actionPrompt?: string;
  triggeredAt: string;
}

export type OverrideStatus = 'pending' | 'approved' | 'denied';

export interface PrerequisiteOverride {
  overrideId: string;
  contentId: string;
  contentTitle: string;
  learnerId: string;
  learnerName: string;
  requestedBy: string;
  instructorName: string;
  requestedAt: string;
  reason: string;
  status: OverrideStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  daysWaiting?: number;
}
```

---

## 11. Mobile Responsive Considerations

### Learner Content List (Mobile)

- Collapse module headers by default
- Swipe to expand module details
- Large touch targets for locked content
- Bottom sheet for prerequisite messages
- Sticky progress bar at top

### Instructor Configuration (Mobile)

- Vertical tabs for prerequisite types
- Dropdown for content selection
- Simplified UI with fewer visible options
- Save button always visible (sticky footer)

### Admin Approval (Mobile)

- Card-based layout for pending requests
- Swipe actions (left = deny, right = approve)
- Full-screen modal for review details

---

## 12. Accessibility Requirements

### Screen Reader Support
- Announce lock status changes
- Describe prerequisite requirements
- Read progress percentages
- Alert on warning triggers

### Keyboard Navigation
- Tab through content items
- Space/Enter to expand modules
- Arrow keys for prerequisite selection
- Escape to close modals

### Visual Indicators
- Don't rely solely on color (use icons + text)
- High contrast mode support
- Clear focus indicators
- Text alternatives for all icons

---

## 13. Implementation Timeline

### Phase 1: Core UI (Week 1-2)
- [ ] Lock indicators on content list
- [ ] Prerequisite message modals
- [ ] Basic progress display
- [ ] API integration for access checks

### Phase 2: Progress Dashboard (Week 2-3)
- [ ] Full progress page
- [ ] Warning alerts
- [ ] Timeline visualization
- [ ] Module breakdown

### Phase 3: Instructor Tools (Week 3-4)
- [ ] Prerequisite configuration UI
- [ ] All three prerequisite types
- [ ] Override request flow
- [ ] Version warning modal

### Phase 4: Admin Tools (Week 4-5)
- [ ] Override approval queue
- [ ] Review modal
- [ ] Warning configuration
- [ ] Threshold editor

### Phase 5: Advanced Features (Week 5-6)
- [ ] Flow diagram visualization
- [ ] Circular dependency detection
- [ ] Auto-layout algorithm
- [ ] Validation tools

---

## 14. Testing Checklist

### Unit Tests (Components)
- [ ] AvailabilityBadge renders all states
- [ ] PrerequisiteMessage formats correctly
- [ ] ProgressBar calculates percentages
- [ ] WarningAlert handles all severities

### Integration Tests
- [ ] Access check prevents locked content launch
- [ ] Progress updates after content completion
- [ ] Warnings trigger at thresholds
- [ ] Override request creates notification

### E2E Tests
- [ ] Learner progression through prerequisites
- [ ] Instructor configures prerequisites
- [ ] Admin approves override request
- [ ] Warning appears when threshold met
- [ ] Flow diagram detects circular dependency

---

## 15. Open Questions for UI Team

1. **Design System:** Which component library are we using? (Material-UI, Ant Design, custom?)
2. **State Management:** Redux, Context, or other?
3. **Charting Library:** For progress visualizations (Chart.js, Recharts, D3)?
4. **Graph Visualization:** For flow diagram (React Flow, Cytoscape, custom?)
5. **Notification System:** Existing toast/notification library?
6. **Modal Library:** Existing modal component or build custom?

---

## Approval Checklist

**UI Team Review:**
- [ ] Reviewed all UI components
- [ ] Design patterns acceptable
- [ ] API integration approach clear
- [ ] Timeline feasible
- [ ] No blocking concerns
- [ ] Ready to begin implementation

**Questions? Concerns?**
→ Contact API team via Slack #api-prerequisite-system

---

**END OF UI SPECIFICATION**

**Document Length:** ~1,800 lines
**Estimated Reading Time:** 45 minutes
**Implementation Timeline:** 5-6 weeks (parallel with API development)
