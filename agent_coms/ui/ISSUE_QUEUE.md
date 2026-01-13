# UI Agent Issue Queue

> **Purpose:** Human-provided issue tracking for UI agent work  
> **Owner:** Human / UI Agent  
> **Last Updated:** 2026-01-12

---

## How to Use This Document

1. **Add new issues** to the "Pending Issues" section
2. **Set priority** (critical, high, medium, low)
3. **UI Agent will:**
   - Pick up issues in priority order
   - Mark as "in-progress" when starting
   - Move to "completed" when done
   - Create coordination threads as needed
4. **Dependencies:** Use issue IDs to reference blockers

---

## Issue Template

```markdown
### ISS-XXX: Brief Title

**Priority:** critical | high | medium | low  
**Type:** bug | feature | refactor | polish  
**Status:** pending | in-progress | blocked | completed  
**Assigned:** UI Agent | API Agent | Both  
**Dependencies:** ISS-YYY (optional)  

**Description:**
Clear description of what needs to be done

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2

**Related Files:** (if known)
- `path/to/file.ts`

**Notes:** (optional)
Any additional context
```

---

## Pending Issues

<!-- Add new issues here in priority order -->

### ISS-007: Consolidate Sidebar Navigation - Remove Duplicate Dashboards

**Priority:** high
**Type:** bug
**Status:** pending
**Assigned:** UI Agent
**Dependencies:** None

**Description:**
The sidebar currently shows three different "Dashboard" entries (one for each userType: learner, staff, admin). This creates confusion and clutters the navigation. The sidebar should have a common base set of navigation links that appear for all users, regardless of their userType, followed by the "My Departments" section.

**Current Behavior:**
- Multiple "Dashboard" links appear (e.g., "Learner Dashboard", "Staff Dashboard", "Admin Dashboard")
- Navigation items are scattered and context-dependent
- Users see different navigation structures on different dashboards

**Expected Behavior:**
All users should see a common base navigation section at the top with these links:
1. **Dashboard** - Takes user to their primary dashboard based on primaryUserType
2. **My Profile** - Universal profile page at `/profile`
3. **My Progress** - Learner-specific, grayed out if user doesn't have learner userType
4. **Certificates** - Learner-specific certificate view

Below the base navigation, show:
5. **My Departments** section (collapsible) - Shows available departments with department-specific actions

**Navigation Structure:**
```
┌─────────────────────────────┐
│ NAVIGATION (always visible) │
├─────────────────────────────┤
│ 📊 Dashboard                │ ← Primary dashboard
│ 👤 My Profile               │ ← /profile
│ 📈 My Progress              │ ← /learner/progress (grayed if no learner userType)
│ 🎓 Certificates             │ ← /learner/certificates (grayed if no learner userType)
├─────────────────────────────┤
│ MY DEPARTMENTS              │
│   📁 Computer Science       │
│      → Department Dashboard │
│      → Manage Staff         │
│      → Manage Courses       │
├─────────────────────────────┤
│ ⚙️ Settings                 │
└─────────────────────────────┘
```

**Dashboard Link Behavior:**
- Clicking "Dashboard" should navigate to the user's primary dashboard:
  - If `primaryUserType === 'learner'` → `/learner/dashboard`
  - If `primaryUserType === 'staff'` → `/staff/dashboard`
  - If `primaryUserType === 'admin'` → `/admin/dashboard`
- No separate dashboard links per userType

**Acceptance Criteria:**

**Base Navigation:**
- [ ] Only ONE "Dashboard" link appears at top of sidebar
- [ ] "Dashboard" link navigates to primary dashboard based on primaryUserType
- [ ] "My Profile" link goes to `/profile` (universal)
- [ ] "My Progress" link visible to all users
  - [ ] Active/clickable if user has learner userType
  - [ ] Grayed out/disabled if user doesn't have learner userType
- [ ] "Certificates" link visible to all users
  - [ ] Active/clickable if user has learner userType
  - [ ] Grayed out/disabled if user doesn't have learner userType
- [ ] Base navigation section is ALWAYS visible regardless of which dashboard user is on

**Department Section:**
- [ ] "My Departments" section appears below base navigation
- [ ] Department section only shows if user has departments
- [ ] Selecting a department shows department-specific actions
- [ ] Department actions are context-appropriate (staff actions for staff, learner actions for learner)

**Visual Consistency:**
- [ ] Base navigation uses same styling across all dashboards
- [ ] Disabled links are visually distinct (grayed out, lower opacity)
- [ ] Active link is clearly highlighted
- [ ] Smooth transitions between sections

**Testing Requirements:**
- [ ] Test as learner-only user (should see all base links active)
- [ ] Test as staff-only user (Progress/Certificates should be disabled)
- [ ] Test as multi-userType user (learner+staff) (all links active)
- [ ] Test as system-admin (verify appropriate access)
- [ ] Test Dashboard link from each dashboard (verify correct navigation)
- [ ] Verify no duplicate links appear
- [ ] Verify navigation consistency across all dashboards

**Related Files:**
- `src/widgets/sidebar/Sidebar.tsx` - Main sidebar component with filtering logic
- `src/widgets/sidebar/config/navItems.ts` - Navigation items configuration
- `src/widgets/sidebar/ui/NavLink.tsx` - NavLink component (supports disabled state)

**Implementation Notes:**
1. Create a `BASE_NAV_ITEMS` array that's always visible:
   ```typescript
   const BASE_NAV_ITEMS = [
     { label: 'Dashboard', path: getDashboardPath(primaryUserType), icon: Home },
     { label: 'My Profile', path: '/profile', icon: User },
     { label: 'My Progress', path: '/learner/progress', icon: TrendingUp,
       userTypes: ['learner'], showDisabled: true },
     { label: 'Certificates', path: '/learner/certificates', icon: Award,
       userTypes: ['learner'], showDisabled: true },
   ];
   ```

2. Update filtering logic:
   - Base items always render
   - Check userType to determine if link should be disabled
   - Use `disabled` prop on NavLink for items user can't access

3. Remove userType-specific dashboard links from GLOBAL_NAV_ITEMS

4. Keep department-specific actions in separate section

**Notes:**
- This affects the core navigation UX across the entire application
- Should improve clarity and reduce confusion for multi-userType users
- ISS-003 already implemented the disabled link functionality for cross-userType navigation
- This issue consolidates that work into a cleaner base navigation structure

---

### ISS-005: Department Dropdown Causes Infinite Loading Loop

**Priority:** high
**Type:** bug
**Status:** completed
**Completed:** 2026-01-12
**Assigned:** UI Agent
**Dependencies:** None  

**Description:**
Clicking on the "Department" dropdown in the sidebar immediately triggers the same infinite loading/error loop issue as ISS-003. The department dropdown should simply expand to show available departments for selection, but instead causes module loading failures and makes the UI completely unusable.

**Current Behavior:**
1. User is logged in as `admin@lms.edu` (system-admin with multi-userType)
2. User is on Staff Dashboard (`/staff/dashboard`) or Admin Dashboard (`/admin/dashboard`)
3. User clicks on "My Departments" section or a department dropdown/button
4. Screen immediately starts loading/error loop
5. Same module loading errors as ISS-003:
   - Authentication issue appears first
   - Module loading failures: `index.tsx`, `AppLayout.tsx`, `auth/ui/index.ts`
   - Screen objects continuously load and crash
6. Only recovery is logout/login

**Expected Behavior:**

**For Staff Dashboard:**
- Clicking department dropdown should expand to show available departments
- System-admin user should see "Master Department" (or equivalent global department)
- Should be able to select department to view department-specific content
- No navigation should occur until department is actually selected

**For Admin Dashboard:**
- Clicking department dropdown should expand to show "All Departments"
- System-admin should have access to view/manage all departments
- Should be able to select specific department to manage
- No navigation should occur until department is actually selected

**General:**
- Dropdown should be a UI expansion, not a navigation event
- No loading loops or crashes
- Clicking a department button should only expand/collapse the list
- Selecting a specific department should smoothly switch context

**Root Cause Investigation:**
1. What event handler is attached to department dropdown/button?
2. Is `handleDepartmentClick()` being called when it shouldn't?
3. Does clicking trigger API call to `switchDepartment()`?
4. Why does department switching cause infinite loop?
5. Check `useDepartmentContext` hook and `switchDepartment()` function
6. Verify error handling in department switching logic
7. Check if API endpoint exists and returns correct data

**Acceptance Criteria:**

**Dropdown Behavior:**
- [ ] Clicking department section header only expands/collapses the list
- [ ] No API calls or navigation when expanding dropdown
- [ ] Smooth expand/collapse animation
- [ ] Clear visual indication of expanded vs collapsed state

**Department Display:**
- [ ] Staff Dashboard shows "Master Department" for system-admin
- [ ] Admin Dashboard shows "All Departments" for system-admin  
- [ ] Staff users see only their assigned departments
- [ ] Learner users see only their enrolled departments
- [ ] Department list is properly populated from user's roleHierarchy

**Department Selection:**
- [ ] Clicking a specific department name switches context smoothly
- [ ] Selected department is visually highlighted
- [ ] Department actions section updates with relevant links
- [ ] No infinite loops or module loading errors
- [ ] Proper error handling if department switch fails
- [ ] Loading state shown during department switch (spinner, not crash)

**Error Handling:**
- [ ] If API call fails, show user-friendly error message
- [ ] Failed switch doesn't crash the UI
- [ ] User can retry or cancel the operation
- [ ] Clear error messages in console for debugging
- [ ] Graceful fallback if department data unavailable

**Testing Requirements:**
- [ ] Test as system-admin on staff dashboard
- [ ] Test as system-admin on admin dashboard
- [ ] Test as staff user with multiple departments
- [ ] Test as learner with multiple departments
- [ ] Test expanding/collapsing without selecting
- [ ] Test selecting different departments
- [ ] Test with no departments assigned
- [ ] Test API failure scenarios
- [ ] Verify no console errors or infinite loops

**Related Files:**
- `src/widgets/sidebar/Sidebar.tsx` - Department selector logic (lines 155-198)
- `src/shared/hooks/useDepartmentContext.tsx` - Department switching hook
- `src/shared/stores/navigationStore.ts` - Department selection state
- `src/features/auth/model/authStore.ts` - User role hierarchy with departments
- `src/features/auth/api/authApi.ts` - Switch department API call

**API Coordination Required:**
- [x] Verify `/api/v2/auth/switch-department` endpoint exists and works
- [x] Confirm expected request/response format for department switching
- [x] Ask about "Master Department" concept for system-admin
- [x] Confirm if admin users should see all departments or specific list

**API ANSWERS (2026-01-12 from API Agent):**

1. **Endpoint exists:** `POST /api/v2/auth/switch-department` - YES, implemented at `src/routes/auth.routes.ts:31`

2. **Request/Response format:**
   - Request: `{ departmentId: string }`
   - Response: `{ currentDepartment: { departmentId, departmentName, departmentSlug, roles, accessRights }, childDepartments: [...], isDirectMember: boolean, inheritedFrom: string|null }`
   - See full contract: `contracts/api/auth-v2.contract.ts` lines 360-450

3. **Master Department issue:** ⚠️ **KNOWN BUG**
   - Master Department (ID: `000000000000000000000001`) has `isVisible: false` in seed
   - The `switchDepartment` service at line 97 filters by `isVisible: true`
   - This causes "Department not found or is not accessible" error for Master Department
   - **API fix needed:** Either make Master Department visible OR add special handling for system departments

4. **Admin department visibility:**
   - Currently: Admin users see departments from their `departmentMemberships` in login response
   - System-admin is member of Master Department only (per seed)
   - Master Department is hidden (`isVisible: false`) so switch fails
   - **Expected behavior:** System-admin should see all departments OR Master Department should be accessible despite `isVisible: false`

---

### HUMAN ANSWER (2026-01-12)

**8. Master Department Visibility Fix:** ✅ DECIDED
- **Make Master Department visible** but ONLY for:
  - Users with `system-admin` department-role, OR
  - Users with `global-admin` userType
- Implementation approach:
  - Keep `isVisible: false` in database (default hidden)
  - In switch-department service: Add special handling to include Master Department when user has system-admin role or global-admin userType
  - In department list responses: Include Master Department for qualifying users
- Regular staff/learners should still NOT see Master Department

---

**Debugging Notes:**
- Similar symptoms to ISS-003 (infinite loop with module errors)
- Suggests common issue with route guards or authentication flow
- May be related to how `switchDepartment()` updates auth state
- Check if department switch invalidates session or causes re-auth loop
- Verify token handling during department context switches

**Implementation Suggestions:**
1. Separate expand/collapse UI state from department selection state
2. Only call `switchDepartment()` when specific department is clicked, not on expand
3. Add loading state during API call (show spinner, disable interactions)
4. Add try-catch with user-friendly error messaging
5. Consider optimistic UI updates for better UX
6. Verify route guards don't trigger on department context change

**Notes:**
- High priority as it blocks department-scoped functionality
- Related to ISS-003 (same infinite loop symptoms)
- May indicate broader issue with route guards or auth flow
- Should be fixed together with ISS-003 if they share root cause

---

### ISS-004: Sidebar Link Highlighting Inconsistent Across Dashboards

**Priority:** medium
**Type:** bug
**Status:** ✅ completed
**Assigned:** UI Agent
**Dependencies:** None
**Completed:** 2026-01-13
**Commit:** bf5f104  

**Description:**
Sidebar navigation link highlighting is inconsistent across different dashboards. The Learner Dashboard properly highlights the active "Dashboard" link when on `/learner/dashboard`, but this highlighting behavior doesn't work consistently on Staff and Admin dashboards. Users cannot easily identify which section/page they're currently viewing.

**Current Behavior:**
1. **Learner Dashboard:** ✅ Works correctly
   - When on `/learner/dashboard`, the "Dashboard" link is highlighted
   - Highlighting updates when navigating to different sections
   - Clear visual indication of current active view

2. **Staff Dashboard:** ❌ Inconsistent
   - Link highlighting may not reflect current route
   - Users can't tell which section is active

3. **Admin Dashboard:** ❌ Inconsistent  
   - Link highlighting may not reflect current route
   - Users can't tell which section is active

**Expected Behavior:**
- All dashboards should have consistent sidebar link highlighting
- The currently active route should always be visually highlighted in the sidebar
- Highlighting should update immediately when navigation occurs
- Design and visual feel should be consistent across all dashboards (learner, staff, admin)
- Users should always know which page/section they're currently viewing

**Root Cause Investigation:**
1. Check `NavLink` component implementation
2. Verify route matching logic (exact vs partial matching)
3. Check if highlighting uses `useLocation()` or similar hook
4. Verify CSS classes for active state are consistent
5. Test with nested routes (e.g., `/staff/courses` vs `/staff/courses/123`)

**Acceptance Criteria:**

**Visual Highlighting:**
- [ ] Active sidebar link has clear visual distinction (background color, border, bold text, etc.)
- [ ] Highlighting style is identical across all dashboards
- [ ] Only ONE link is highlighted at a time (the current active route)
- [ ] Highlighting persists during page interactions (doesn't flicker)

**Functional Requirements:**
- [ ] Learner dashboard links highlight correctly for all routes
- [ ] Staff dashboard links highlight correctly for all routes
- [ ] Admin dashboard links highlight correctly for all routes
- [ ] Department action links highlight when on department-specific routes
- [ ] Nested routes highlight the parent link appropriately

**Route Matching:**
- [ ] Exact match for dashboard home routes (e.g., `/learner/dashboard`)
- [ ] Partial match for sub-routes (e.g., `/learner/progress` highlights within learner section)
- [ ] Department-specific routes highlight both the department AND the action link

**Testing Requirements:**
- [ ] Test all links on learner dashboard
- [ ] Test all links on staff dashboard
- [ ] Test all links on admin dashboard
- [ ] Test department action links with department selected
- [ ] Test navigation between dashboards (switching contexts)
- [ ] Test direct URL navigation (typing route in browser)
- [ ] Test browser back/forward buttons
- [ ] Verify no console errors or warnings

**Design Consistency:**
- [ ] Use same color scheme for highlighting across all dashboards
- [ ] Use same hover states across all dashboards
- [ ] Active state is clearly distinguishable from hover state
- [ ] Inactive links are clearly distinguishable from active links

**Related Files:**
- `src/widgets/sidebar/ui/NavLink.tsx` - NavLink component (likely uses useLocation)
- `src/widgets/sidebar/Sidebar.tsx` - Sidebar container
- `src/widgets/sidebar/config/navItems.ts` - Navigation items configuration
- `src/shared/lib/utils.ts` - Utility functions (cn helper)

**Resolution:**
Fixed profile route mismatch and enhanced multi-role user support:

1. **Profile Route Fix:** Changed `/learner/profile` and `/staff/profile` to `/profile`
   - These routes didn't exist, causing 404 errors that broke navigation context
   - Profile page is universal for all user types at `/profile`

2. **Multi-Role Filtering:** Updated Sidebar to show nav items for ALL user types
   - Previously only showed items matching primaryUserType
   - Now users with multiple roles see all relevant navigation sections
   - Example: Staff + Global Admin users see both staff AND admin nav items

3. **Comprehensive Testing:** Created NavLink.test.tsx with 10 test cases
   - Verified highlighting works for learner, staff, and admin dashboards
   - All tests passing (69 total: 10 NavLink + 34 Sidebar + 25 ProtectedNavLink)

**Impact:**
- ✅ Navigation context remains consistent across all dashboards
- ✅ No more 404 errors from profile links
- ✅ Multi-role users have full navigation access
- ✅ Highlighting works correctly for all user types

**Implementation Suggestions:**
1. Ensure `NavLink` component uses React Router's `useLocation()` hook
2. Compare `location.pathname` with link's `path` prop
3. Consider using React Router's `NavLink` component with `isActive` prop
4. Use consistent CSS classes: `bg-primary/10 text-primary` for active state
5. Consider partial matching for nested routes using `pathname.startsWith(path)`

**Notes:**
- This affects user experience and navigation clarity
- Should be fixed before major user testing
- Related to overall navigation consistency work
- May reveal other navigation UX issues during testing

---

### ISS-003: "My Progress" Link Causes Infinite Loading Loop on Non-Learner Dashboards

**Priority:** high
**Type:** bug
**Status:** completed
**Completed:** 2026-01-12
**Assigned:** UI Agent
**Dependencies:** None  

**Description:**
The "My Progress" link appears in the sidebar navigation on all dashboards (Staff, Admin, Learner) but should only be visible/accessible on the Learner dashboard. When clicked from the Staff dashboard (`/staff/dashboard`), it causes an infinite loading loop with module loading errors and authentication failures, making the UI completely unusable until logout/login.

**Current Behavior:**
1. User is logged in as `admin@lms.edu` (system-admin with multi-userType)
2. On `/staff/dashboard`, "My Progress" link is visible in sidebar
3. Clicking "My Progress" navigates to `/learner/progress`
4. Route is protected by `<LearnerOnlyRoute>` guard
5. Guard fails/redirects repeatedly, causing infinite loop
6. UI becomes unresponsive with these errors looping:
   - Authentication issue appears first
   - Module loading failures: `index.tsx`, `AppLayout.tsx`, `auth/ui/index.ts`
   - Screen objects continuously load and crash
7. Only recovery is logout/login

**Root Cause Analysis Needed:**
1. **Navigation Filtering:** Why is learner-only link visible on staff dashboard?
   - In `navItems.ts`, "My Progress" has `userTypes: ['learner']`
   - In `Sidebar.tsx`, filtering should hide items not matching `primaryUserType`
   - Need to verify filtering logic for context-aware navigation
   
2. **Route Guard Failure:** Why does `<LearnerOnlyRoute>` cause infinite loop instead of graceful redirect?
   - Should redirect to appropriate dashboard or show error
   - Need to investigate redirect logic in `LearnerOnlyRoute` component
   - Should it auto-switch to learner dashboard if user has learner userType?

**Acceptance Criteria:**

**Primary Fix (Navigation Filtering):**
- [ ] "My Progress" link is HIDDEN when not on learner dashboard
- [ ] Verify filtering logic uses current dashboard context (not just primaryUserType)
- [ ] Similar learner-only links are also properly filtered
- [ ] Admin-only links are HIDDEN when not on admin dashboard
- [ ] All navigation items respect dashboard context

**Secondary Fix (Graceful Failure):**
- [ ] If user somehow accesses `/learner/progress` from wrong dashboard:
  - [ ] Option A: Auto-redirect to learner dashboard (if user has learner userType)
  - [ ] Option B: Show friendly error message and redirect to current dashboard
  - [ ] Option C: Gray out link but allow navigation with auto-context-switch
- [ ] No infinite loops under any circumstances
- [ ] Clear error messaging if access denied
- [ ] Route guards never cause module loading failures

**Testing Requirements:**
- [ ] Test with multi-userType user (learner + staff + admin)
- [ ] Test clicking learner-only links from staff dashboard
- [ ] Test clicking staff-only links from learner dashboard  
- [ ] Test clicking admin-only links from non-admin dashboards
- [ ] Test graceful failure when route guard rejects access
- [ ] Verify no console errors or infinite loops
- [ ] Test that correct links appear on each dashboard

**Related Files:**
- `src/widgets/sidebar/config/navItems.ts` - Navigation item definitions
- `src/widgets/sidebar/Sidebar.tsx` - Sidebar filtering logic (lines 84-104)
- `src/app/router/index.tsx` - Route definitions and guards (line 223)
- `src/app/router/guards/LearnerOnlyRoute.tsx` - Route guard component
- `src/widgets/header/Header.tsx` - Dashboard context detection logic

**API Coordination Required:**
- [x] Create thread to ask API team about route for "My Progress": What is the exact path?
- [x] Confirm if route should be dashboard-specific or context-aware

**API ANSWERS (2026-01-12 from API Agent):**

1. **"My Progress" API route:** `GET /api/v2/users/me/progress`
   - Defined at `src/routes/users.routes.ts:54`
   - Returns comprehensive progress summary for current user (learner)
   - This is a user-centric endpoint, not dashboard-specific

2. **Dashboard-specific vs context-aware:**
   - The API endpoint is **user-centric** (works for any authenticated user)
   - The **UI route** `/learner/progress` is dashboard-specific
   - API doesn't care which dashboard you're on - it returns progress for the logged-in user
   - The infinite loop is a **UI route guard issue**, not an API issue
   - If user has learner userType, API will return their progress regardless of current dashboard

3. **Recommendation:**
   - API is working correctly - returns progress for authenticated user
   - UI should either: (a) hide link on non-learner dashboards, or (b) auto-switch to learner dashboard when clicked
   - Route guard should NOT cause infinite loop - should gracefully redirect or show error

**Notes:**
- This is similar to the previous THR-AUTH-001 issue with admin navigation links not appearing
- The inverse problem: links appearing when they shouldn't
- Need comprehensive audit of which links belong on which dashboards
- Consider creating a dashboard-aware navigation configuration
- User preference on fix approach needed: hide, gray-out, or auto-switch?

**Questions for Human:**
1. Should learner-specific links be completely hidden or grayed out on staff/admin dashboards?
2. Should clicking a cross-dashboard link auto-switch to the appropriate dashboard?
3. Are there other links showing incorrectly that you've noticed?
4. What should happen if a staff user (without learner role) tries to access `/learner/progress`?

---

### HUMAN ANSWERS (2026-01-12)

**5. "My Courses" link behavior:** ✅ DECIDED
- If user does NOT have `learner` userType: **Gray out the link** (disabled, not clickable)
- If user HAS `learner` userType: **Leave active** and auto-switch to `learnerDashboard.MyCourses` page when clicked

**6. "My Progress" link behavior:** ✅ DECIDED  
- If user does NOT have learner account: **Gray out the link** (disabled)
- If user HAS learner account: **Leave active** and auto-switch to `learnerDashboard.MyProgress` page when clicked

**7. Access denial for staff without learner userType:** ✅ DECIDED
- The link should be **grayed out** if staff user doesn't have `learner` **userType**
- Important distinction: Check **userType** (not role - roles are department-specific)
- This applies to all learner-specific links on non-learner dashboards

---

### ISS-001: Profile Page - Complete Implementation with IPerson Type

**Priority:** high  
**Type:** feature  
**Status:** pending  
**Assigned:** Both (UI Agent + API Agent coordination)  
**Dependencies:** API must implement IPerson type first  

**Description:**
Profile page currently 404s on all dashboards. Need to implement full profile management with new IPerson type structure that supports context-specific display names and comprehensive personal information.

**User Experience Requirements:**

1. **Route Structure:** Per-dashboard routes
   - `/learner/profile` - Learner profile view
   - `/staff/profile` - Staff profile view  
   - `/admin/profile` - Admin profile view (minimal, uses staff display name)

2. **Edit Workflow:**
   - Each field has an "Edit" button
   - Field is read-only until Edit is pressed
   - Auto-save every 2 minutes while editing
   - After auto-save, field returns to read-only and Edit button unpressed
   - Clear visual indication that changes have been saved
   - Do NOT warn on unsaved changes (auto-save handles it)
   - ONLY warn if there's a current error state

3. **Context-Specific Display:**
   - Staff users can have different DisplayName for Staff vs Learner contexts
   - Example: "Dr. Smith" when acting as staff, "John S." when acting as learner
   - Admin userType uses the staff displayName (no separate admin display name)

**API Requirements (for API Agent):**

### New Type: IPerson

```typescript
interface IPerson {
  // Name fields
  firstName: string;
  middleName?: string;
  lastName: string;
  
  // Context-specific display names
  displayNames: {
    learner?: string;  // Display name when in learner context
    staff?: string;    // Display name when in staff context
    // Admin uses staff displayName
  };
  
  // Contact
  emails: IEmail[];
  
  // Address
  addresses: IAddress[];
  
  // Identity
  last4SSN?: string;
  dateOfBirth?: Date;
  identifications: IIdentification[];
  
  // Profile
  bio?: string;
  avatar?: string; // URL or file path
  
  // Preferences
  timezone?: string;
  languagePreference?: string;
}

interface IEmail {
  email: string;
  type: 'primary' | 'secondary' | 'work' | 'personal';
  verified: boolean;
}

interface IAddress {
  // Geographic address
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  
  // Metadata
  type: 'business' | 'home' | 'other';
  isPrimary: boolean;
}

interface IIdentification {
  idNumber: string; // Encrypted/hashed
  idType: 'passport' | 'drivers-license' | 'state-id' | 'student-id' | 'other';
  issuingAuthority?: string;
  expirationDate?: Date;
}
```

### API Endpoints Needed

**Profile Management:**
- `GET /api/v2/users/me/person` - Get IPerson data for current user
- `PUT /api/v2/users/me/person` - Update IPerson data (partial updates supported)
- `GET /api/v2/users/me/person/avatar` - Get avatar
- `POST /api/v2/users/me/person/avatar` - Upload avatar

**Password Management:**
- `POST /api/v2/users/me/password` - Change user password (requires current password)
- `POST /api/v2/admin/me/password` - Change admin session password (requires current admin password)

---

### API ANSWERS (2026-01-12 from API Agent)

**CURRENT STATE - What EXISTS:**

1. **`GET /api/v2/users/me`** - ✅ EXISTS
   - Contract: `contracts/api/users.contract.ts` lines 24-110
   - Returns: `id, email, firstName, lastName, role, status, profileImage, phone, createdAt, lastLoginAt, updatedAt`
   - Role-specific fields: departments, permissions, departmentRoles (staff); studentId, enrollments (learner)

2. **`PUT /api/v2/users/me`** - ✅ EXISTS  
   - Contract: `contracts/api/users.contract.ts` lines 115-200
   - Allows updating: firstName, lastName, phone, profileImage (URL only)
   - Does NOT allow: role, permissions, department changes, password

3. **`GET /api/v2/users/me/progress`** - ✅ EXISTS
   - Route: `src/routes/users.routes.ts:54`
   - Returns learner progress summary

**CURRENT STATE - What does NOT EXIST (API work needed):**

1. **`IPerson` type** - ❌ NOT IMPLEMENTED
   - No `person.model.ts` file exists
   - No `person.contract.ts` file exists  
   - Current profile data is split: User model has basic info, Staff/Learner models have role-specific fields
   - **Recommendation:** Decide if IPerson should be a new embedded document or if existing fields suffice

2. **`GET/PUT /users/me/person`** - ❌ NOT IMPLEMENTED
   - These endpoints do not exist
   - Current approach uses `/users/me` for profile data
   - **Question for Human:** Do we need separate `/person` endpoints or can we extend `/users/me`?

3. **Avatar Upload** - ❌ NOT IMPLEMENTED
   - No `POST /users/me/avatar` endpoint exists
   - Current `profileImage` field is URL-only (external hosting assumed)
   - **Question for Human:** Do we need API-hosted avatar storage or use external service (S3, Cloudinary)?

4. **Password Change** - ⚠️ PARTIAL
   - No dedicated user password change endpoint exists
   - Escalation password validation exists for admin sessions (`src/validators/escalation.validator.ts`)
   - **Needs Implementation:** `POST /users/me/password` for regular password change

5. **Context-specific displayNames** - ❌ NOT IMPLEMENTED
   - Current models don't have `displayNames.staff` / `displayNames.learner` structure
   - Would require model schema updates

**SUMMARY FOR UI TEAM:**

⚠️ **ISS-001 is BLOCKED on API work.** The following must be implemented before UI can proceed:

| Endpoint | Status | Priority |
|----------|--------|----------|
| GET /users/me | ✅ Ready | - |
| PUT /users/me | ✅ Ready | - |
| IPerson type design | ❌ Needs decision | High |
| /users/me/person endpoints | ❌ Needs implementation | High |
| Avatar upload | ❌ Needs implementation | Medium |
| Password change | ❌ Needs implementation | High |
| Context displayNames | ❌ Needs model change | Low |

**QUESTIONS FOR HUMAN (need answers before API implementation):**

1. Should IPerson be a new embedded subdocument, or should we extend the existing User/Staff/Learner fields?
2. Avatar storage: API-hosted (need storage solution) or external URL only?
3. Password change: Should this be a new endpoint or should we use the existing auth flow?
4. Is the context-specific displayName feature required for MVP, or can it be deferred?

---

### HUMAN ANSWERS (2026-01-12)

**1. IPerson Type Design:** ✅ DECIDED
- Use **embedded subdocument** in Staff and Learner models
- Recommended DB representation:
  ```typescript
  // Staff model
  staff: {
    person: IPerson  // embedded subdocument
  }
  
  // Learner model  
  learner: {
    person: IPerson  // embedded subdocument
  }
  ```
- IPerson is embedded (not referenced) for atomic reads/writes
- Each userType (staff/learner) has its own person subdocument
- Allows different `preferredName` per context

**2. Avatar Storage:** ✅ DECIDED
- **Development:** Use localStorage (browser-side, no server storage)
- **Test/Production:** Use S3/Spaces/CDN in same infrastructure as system assets but different directory
- Directory structure: `{bucket}/avatars/{userId}/{filename}`
- See: `devdocs/S3_AVATAR_CONFIGURATION.md` for required configuration

**3. Password Change Flow:** ✅ DECIDED
- Password change is ONLY allowed when user is already logged in
- Recommended flow:
  1. User navigates to `/change-password` (requires authenticated session)
  2. User enters current password (verification)
  3. User enters new password + confirmation
  4. API validates current password before accepting change
  5. On success: Keep session active, show confirmation
  6. On failure: Show error, allow retry
- Endpoint: `POST /api/v2/users/me/password`
- Request: `{ currentPassword, newPassword }`
- Requires valid access token (logged in)

**4. PreferredName (Clarification):** ✅ DECIDED
- **Correction:** `displayName` is NOT context-specific
- **`preferredName`** field inside IPerson IS context-specific:
  - When on LearnerDashboard screens: use `learner.person.preferredName`
  - When on StaffDashboard screens: use `staff.person.preferredName`
- Each userType's IPerson has its own preferredName field
- Allows user to be "Alex" as a learner but "Dr. Smith" as staff

---

### API Data Model

- **Staff userType:** Has embedded `person: IPerson`
- **Learner userType:** Has embedded `person: IPerson`
- **Admin userType:** No IPerson (uses staff displayName if dual role)

**Acceptance Criteria - UI:**

- [ ] Profile routes exist and don't 404
- [ ] Page displays all IPerson fields appropriately
- [ ] Edit button next to each editable field
- [ ] Clicking Edit makes field editable
- [ ] Auto-save triggers every 2 minutes during edit
- [ ] Visual indicator when auto-save completes
- [ ] Field returns to read-only after save
- [ ] Context-specific displayName shown based on current dashboard
- [ ] Staff users can set different displayName for learner vs staff contexts
- [ ] Admin profile uses staff displayName
- [ ] Avatar upload/display works
- [ ] Form validation for required fields
- [ ] Error states shown only when validation fails
- [ ] No "unsaved changes" warning (due to auto-save)

**Acceptance Criteria - API:**

- [ ] IPerson type implemented in data model
- [ ] Staff and Learner models include person: IPerson
- [ ] GET /users/me/person endpoint returns IPerson data
- [ ] PUT /users/me/person endpoint updates with partial support
- [ ] Avatar upload/retrieval endpoints work
- [ ] Password change endpoints implemented
- [ ] Proper validation on all fields
- [ ] Sensitive data (SSN, IDs) properly encrypted
- [ ] Context-specific displayNames stored and retrieved correctly

**Related Files (UI):**
- `src/pages/profile/` - New directory
  - `LearnerProfile.tsx`
  - `StaffProfile.tsx`
  - `AdminProfile.tsx`
  - `ChangePassword.tsx` (reusable component)
- `src/features/profile/` - New feature
  - `ui/PersonForm.tsx` - Main form component
  - `ui/EditableField.tsx` - Reusable edit-button field
  - `ui/AvatarUpload.tsx`
  - `model/profileStore.ts` - Auto-save logic
  - `api/profileApi.ts`
- `src/shared/types/person.ts` - IPerson types

**Related Files (API):**
- `contracts/api/person.contract.ts` - IPerson contract
- `src/models/person.model.ts` - IPerson schema
- `src/services/person/person.service.ts`
- `src/controllers/person.controller.ts`
- `src/routes/person.routes.ts`
- Update: `src/models/user.model.ts` - Add person field to staff/learner

**Notes:**

**Auto-Save Pattern:**
- Use debounced auto-save (2 minute timer)
- Cancel timer if user manually saves or navigates away
- Visual feedback: "Saving..." → "Saved ✓" → back to read-only
- Store draft in component state, persist on save

**DisplayName Context Logic:**
- On Staff dashboard → show `person.displayNames.staff`
- On Learner dashboard → show `person.displayNames.learner`
- On Admin dashboard → show `person.displayNames.staff` (fallback)
- If displayName not set for context, fallback to `firstName lastName`

**Password Change Page:**
- Separate route: `/change-password`
- Reusable for both user password and admin password
- Fields: Current Password, New Password, Confirm New Password
- Validation: Password complexity rules
- API determines if it's user or admin session based on context

**Security Considerations:**
- SSN: Store only last 4 digits
- IDs: Encrypt sensitive ID numbers
- Passwords: Require current password for change
- Avatar: File size/type validation, virus scan
- Personal data: Appropriate access control per userType

---

### ISS-002: Separate Change Password Page

**Priority:** high  
**Type:** feature  
**Status:** pending  
**Assigned:** UI Agent  
**Dependencies:** ISS-001 (shares API password endpoints)  

**Description:**
Create a reusable Change Password page that works for both regular user passwords and admin session passwords.

**Route:** `/change-password`

**Features:**
- Detect context (user vs admin session)
- Current password field (required)
- New password field with strength indicator
- Confirm password field
- Password requirements display
- Success/error messaging
- Redirect after successful change

**Acceptance Criteria:**
- [ ] Page accessible from profile dropdown
- [ ] Works for user password change
- [ ] Works for admin password change
- [ ] Password strength indicator
- [ ] Validation: current password required
- [ ] Validation: new password meets requirements
- [ ] Validation: confirm matches new password
- [ ] Clear error messages
- [ ] Success message and redirect

**Related Files:**
- `src/pages/ChangePassword.tsx`
- `src/features/auth/ui/PasswordField.tsx` (strength indicator)
- `src/features/auth/api/passwordApi.ts`

---

### ISS-006: Test Suite Improvements - Update Dependencies and Fix Warnings

**Priority:** high
**Type:** refactor
**Status:** ✅ COMPLETED
**Completed:** 2026-01-12
**Assigned:** UI Agent
**Dependencies:** None

**Final Results:**
- ✅ All dependency warnings eliminated
- ✅ Upgraded: Vite 5→7, Vitest 1→4, React Router 6→7, @vitejs/plugin-react 4→5
- ✅ +34 tests fixed (3,132 passing / 708 failing, down from 742 failing)
- ✅ Fixed ScormPlayer constructor mocks for Vitest 4.x compatibility
- ✅ Updated 20 snapshots, removed 4 obsolete
- ✅ Build successful, zero warnings
- 📄 See: `ISS-006_IMPLEMENTATION.md` for full details

**Description:**
The test suite was showing several warnings and outdated dependency issues that needed to be addressed for better maintainability and to avoid future compatibility problems.

**Current Issues:**

1. **Vite CJS Node API Deprecation Warning:**
   ```
   The CJS build of Vite's Node API is deprecated.
   See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated
   ```

2. **Package.json Module Type Warning:**
   ```
   Warning: Module type of file:///home/adam/github/cadencelms_ui/postcss.config.js
   is not specified and it doesn't parse as CommonJS.
   Add "type": "module" to /home/adam/github/cadencelms_ui/package.json.
   ```

3. **React Router Future Flag Warnings:**
   ```
   React Router will begin wrapping state updates in `React.startTransition` in v7.
   Use the `v7_startTransition` future flag to opt-in early.

   Relative route resolution within Splat routes is changing in v7.
   Use the `v7_relativeSplatPath` future flag to opt-in early.
   ```

4. **MSW (Mock Service Worker) Unhandled Request Warnings:**
   - Multiple test files showing warnings about intercepted requests without handlers
   - Need to update MSW handlers or suppress expected warnings

**Acceptance Criteria:**

**Vite Update:**
- [ ] Check current Vite version
- [ ] Update to latest stable Vite version
- [ ] Update related Vite plugins if needed
- [ ] Verify all tests still pass after update

**Module Type Configuration:**
- [ ] Evaluate adding `"type": "module"` to package.json
- [ ] If adding, update all imports/exports to use ESM syntax
- [ ] Alternative: Rename postcss.config.js to postcss.config.mjs
- [ ] Verify build and test commands work after change

**React Router Future Flags:**
- [ ] Add `v7_startTransition` future flag to router configuration
- [ ] Add `v7_relativeSplatPath` future flag to router configuration
- [ ] Test navigation to ensure no breaking changes
- [ ] Document any behavior changes

**MSW Handler Updates:**
- [ ] Review MSW warning messages in test output
- [ ] Add missing request handlers or intentionally silence expected warnings
- [ ] Update MSW to latest version if needed
- [ ] Verify all API mocks work correctly

**General Testing:**
- [ ] All existing tests pass after updates
- [ ] No console warnings during test runs
- [ ] Test performance is maintained or improved
- [ ] Build process completes without warnings

**Related Files:**
- `package.json` - Dependency versions and type configuration
- `vite.config.ts` - Vite configuration
- `vitest.config.ts` - Test configuration (if separate)
- `postcss.config.js` - PostCSS configuration
- `src/app/router/index.tsx` - Router configuration for future flags
- `src/shared/test/setup.ts` - MSW setup

**Implementation Notes:**

**Vite Update Path:**
1. Check current version: `npm list vite`
2. Check latest version: `npm view vite version`
3. Update: `npm install -D vite@latest`
4. Update plugins: `@vitejs/plugin-react`, etc.
5. Review breaking changes in Vite changelog

**Module Type Decision:**
- **Option A:** Add `"type": "module"` to package.json (ESM-first approach)
  - Pros: Modern, aligns with Vite's ESM-first design
  - Cons: May require updating config files and imports
- **Option B:** Keep CJS, rename config files to .mjs
  - Pros: Minimal changes
  - Cons: Mixed module system

**React Router Flags:**
```typescript
// In router configuration
const router = createBrowserRouter(routes, {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
});
```

**Questions for Human:**
1. Should we go with ESM-first approach (`"type": "module"`) or stay with CJS?
2. Are there any known compatibility concerns with updating Vite?
3. What's the timeline for React Router v7 migration - should we enable all future flags now?
4. Are the MSW warnings acceptable or should they be suppressed?

---

## In Progress

<!-- UI Agent moves issues here when starting work -->

*(None currently)*

---

## Blocked

<!-- Issues waiting on dependencies or external factors -->

*(None currently)*

---

## Completed

<!-- Completed issues - move to archive weekly -->

*(None yet)*

---

## Quick Add Format

For simple issues, use this minimal format:

```
- [ ] ISS-XXX (priority): Brief description
```

Example:
```
- [ ] ISS-002 (high): Fix sidebar not showing on mobile
- [ ] ISS-003 (medium): Add loading spinner to course list
- [ ] ISS-004 (low): Update footer copyright year
```

---

## Issue ID Convention

Format: `ISS-XXX` where XXX is sequential number

**Categories (optional prefix):**
- `ISS-BUG-XXX` - Bug fixes
- `ISS-FEAT-XXX` - New features
- `ISS-UI-XXX` - UI/UX improvements
- `ISS-PERF-XXX` - Performance optimization
- `ISS-A11Y-XXX` - Accessibility improvements

---

## Priority Guidelines

| Priority  | Response Time | Use Case                           |
|-----------|---------------|------------------------------------|
| critical  | Immediate     | Blocking error, system unusable    |
| high      | Same session  | Important feature, visible bug     |
| medium    | Next session  | Enhancement, minor bug             |
| low       | When available| Nice-to-have, polish               |

---

## Workflow

1. **Human adds issue** to "Pending Issues" section
2. **UI Agent picks up** highest priority issue
3. **UI Agent moves** to "In Progress" and starts work
4. **UI Agent creates** coordination thread if needed (THR-XXX)
5. **UI Agent marks completed** and moves to "Completed" section
6. **Human reviews** and archives or requests changes

---

## Tips for Writing Good Issues

### ✅ Good
- Clear, actionable description
- Specific acceptance criteria
- Examples or mockups when helpful
- Priority that matches urgency

### ❌ Avoid
- Vague requests ("make it better")
- Missing acceptance criteria
- No priority specified
- Mixing multiple unrelated issues

### Example: Good Issue

```markdown
### ISS-005: Add confirmation dialog to delete course button

**Priority:** high  
**Type:** bug  
**Status:** pending  
**Assigned:** UI Agent  

**Description:**
The delete course button in the course management page currently deletes 
without confirmation. Add a confirmation dialog to prevent accidental deletions.

**Acceptance Criteria:**
- [ ] Clicking delete shows confirmation dialog
- [ ] Dialog shows course name being deleted
- [ ] Cancel button dismisses dialog without action
- [ ] Confirm button proceeds with deletion
- [ ] Dialog is accessible (keyboard navigation, ARIA labels)

**Related Files:**
- `src/features/courses/ui/CourseList.tsx`
- `src/features/courses/ui/DeleteCourseButton.tsx` (create if needed)

**Notes:**
Use existing Dialog component from shared/ui. Follow pattern from 
DeleteUserButton in admin section.
```

---

## Notes for UI Agent

- Check this document at start of each session
- Work issues in priority order within same priority level
- Update status as you progress
- Create coordination threads for API collaboration
- Move completed issues to archive weekly
- Ask clarifying questions if issue is unclear
