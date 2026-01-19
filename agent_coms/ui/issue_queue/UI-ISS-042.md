# UI-ISS-042: Department Actions Grouped Collapsible Navigation

## Status: COMPLETE

## Commit
`3443f11` - feat(UI-ISS-042): Add grouped collapsible department actions

## Problem
Department actions in the sidebar can exceed available vertical space when users have multiple permissions. This causes overflow issues and poor UX on smaller screens or when multiple sections are expanded.

## Solution
Implement grouped collapsible sections for department actions. Actions are organized into logical categories with expandable headers. Only one group expands at a time to conserve space.

## Design

```
▼ Content Management
    Manage Courses
    Manage Classes  
    Create Course
▶ People & Progress
    Student Progress
    My Enrollments
▶ Analytics & Settings
    Department Reports
    Department Settings
```

### Groups
1. **Content** - Course and class management
2. **People** - Student/enrollment related  
3. **Analytics** - Reports and settings

### Behavior
- Groups are collapsible with chevron indicators
- Clicking a group header toggles expansion
- Only one group can be expanded at a time (accordion behavior)
- Remember last expanded group per session
- Empty groups are hidden

## Implementation

### Files Modified
- `src/widgets/sidebar/config/navItems.ts` - Add `group` property to nav items
- `src/widgets/sidebar/Sidebar.tsx` - Render grouped collapsible sections

### Changes Required

1. **Update DepartmentNavItem type** to include `group` field
2. **Add group property** to each department nav item
3. **Group nav items** by category in Sidebar component
4. **Render collapsible groups** with accordion behavior
5. **Add state** for tracking expanded group

## Acceptance Criteria
- [ ] Department actions organized into 3 collapsible groups
- [ ] Only one group expanded at a time
- [ ] Empty groups are hidden
- [ ] Smooth expand/collapse animations
- [ ] Works on mobile sidebar
- [ ] No visual regression on desktop

## Priority
Medium - UX improvement

## Created
2026-01-18
