# Instructor & Content Creator Payment System (Payout Platform)

**Document Version:** 2.0
**Created:** 2025-01-14
**Updated:** 2025-01-14
**Status:** 📋 PLANNING - Architecture Defined

---

## Table of Contents

1. [Overview](#overview)
2. [System Purpose](#system-purpose)
3. [Stakeholder Roles](#stakeholder-roles)
4. [Creatives Model](#creatives-model)
5. [Revenue Flow](#revenue-flow)
6. [Data Models](#data-models)
7. [Revenue Share Configurations](#revenue-share-configurations)
8. [No-Instructor Redistribution](#no-instructor-redistribution)
9. [Payout Rules & Triggers](#payout-rules--triggers)
10. [Instructor Interaction Requirements](#instructor-interaction-requirements)
11. [API Endpoints](#api-endpoints)
12. [Reporting & Analytics](#reporting--analytics)
13. [Tax & Compliance](#tax--compliance)
14. [Integration Points](#integration-points)
15. [Phase Breakdown](#phase-breakdown)

---

## Overview

The **Payout Platform** is an independent system responsible for:

- **Tracking revenue** per course, per content creator, per instructor
- **Managing revenue splits** based on **fully customizable** percentages
- **Supporting multiple creatives** (1-to-many instructors AND content creators per course)
- **Automatic redistribution** when no instructor is assigned
- **Processing payouts** to content creators and instructors
- **Verifying instructor interactions** before releasing payments
- **Tax reporting** (1099s for US-based recipients)

### Key Design Principles

| Principle | Description |
|-----------|-------------|
| **Customizable Percentages** | All shares are system-definable, not hardcoded |
| **Multi-Creative Support** | 1-to-many instructors AND content creators per course |
| **Proportional Redistribution** | When no instructor, their share redistributes proportionally |
| **Per-Creative Overrides** | Each creative can have custom share percentages |

```
┌─────────────────────────────────────────────────────────────────┐
│                      PAYOUT PLATFORM                            │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    Revenue Ledger                         │ │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐      │ │
│  │  │ Course  │  │ Creator │  │Instructor│  │Platform │      │ │
│  │  │ Revenue │  │ Revenue │  │ Revenue  │  │   Fee   │      │ │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘      │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                              ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              Creatives (Instructors + Creators)           │ │
│  │  ┌─────────────────────┐  ┌─────────────────────────┐    │ │
│  │  │ Content Creators    │  │     Instructors         │    │ │
│  │  │ (1-to-many/course)  │  │   (1-to-many/course)    │    │ │
│  │  └─────────────────────┘  └─────────────────────────┘    │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                              ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                   Earned Revenue                          │ │
│  │     Pending → Confirmed (on completion) → Paid            │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                              ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    Payout Queue                           │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │ │
│  │  │   Weekly    │  │   Monthly   │  │  On-Demand  │       │ │
│  │  │   Payouts   │  │   Payouts   │  │   Payouts   │       │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                              ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                 Payout Processors                         │ │
│  │    Stripe Connect │ PayPal Payouts │ ACH │ Wire          │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Revenue Split Model (4-Way)

> **Updated:** Revenue is split 4 ways: Platform, Creatives, Instructors, Administration

### Default Revenue Split

| Pool | Default % | Recipients | When Confirmed |
|------|-----------|------------|----------------|
| **Platform** | 30% | Organization operations | On enrollment approval |
| **Creative** | 30% | Content creators | On learner completion |
| **Instructor** | 30% | Teaching instructors | On completion + interaction |
| **Administration** | 10% | Dept admins + global admins | On learner completion |

### Administration Pool Distribution

The 10% administration pool is split between:

```
Administration Pool (10%)
├── Department Admins (70% of pool = 7% of total)
│   ├── Split among all admins assigned to the department
│   └── Roles: dept-admin, billing-admin, enrollment-admin
│
└── Global Admins (30% of pool = 3% of total)
    ├── Split among all global-admin users
    └── Receive 30% of ALL admin fees across organization
```

### Example: $100 Net Revenue

```
Platform:       $30.00  → Organization operations
Creative Pool:  $30.00  → Split among content creators
Instructor Pool: $30.00 → Split among instructors (if any)
Admin Pool:     $10.00  
├── Dept Admins: $7.00  → Split among dept admins (e.g., 3 admins = $2.33 each)
└── Global Admins: $3.00 → Split among global admins (e.g., 2 = $1.50 each)
```

---

## Course Difficulty & Instructor Effort Levels

> Courses have difficulty rankings that affect instructor payout rates.
> Higher difficulty = more instructor effort = higher instructor share.

### Difficulty Levels

| Level | Description | Instructor Pool % | Instructor Effort |
|-------|-------------|-------------------|-------------------|
| **Instructorless** | Self-paced, no instructor | 0% (redistributed) | None |
| **Easy** | Minimal interaction needed | 20% | Low |
| **Medium** | Regular discussions, grading | 30% | Standard |
| **Difficult** | Heavy interaction, live sessions | 40% | High |

### Difficulty-Based Revenue Splits

```typescript
// Instructorless Course
{ platform: 0.30, creative: 0.45, instructor: 0.00, admin: 0.10, 
  // Remaining 15% redistributed to creative pool
  redistributeInstructorTo: 'creative' }

// Easy Course  
{ platform: 0.30, creative: 0.40, instructor: 0.20, admin: 0.10 }

// Medium Course (Default)
{ platform: 0.30, creative: 0.30, instructor: 0.30, admin: 0.10 }

// Difficult Course
{ platform: 0.25, creative: 0.25, instructor: 0.40, admin: 0.10 }
```

---

## Incentive Model

> Payouts are **delayed and projected** to align incentives with learner success.

### The Problem: Pay-on-Purchase

```
❌ Instructor gets paid immediately
❌ No incentive to respond to learner questions
❌ Learner frustrated, bad reviews
❌ Platform reputation suffers
```

### The Solution: Delayed/Milestone Payouts

```
✅ Funds held until conditions met
✅ Instructor must engage to earn share
✅ Learner gets support
✅ Quality maintained
```

### Payout Confirmation Triggers

| Stakeholder | Confirmed When | Rationale |
|-------------|----------------|-----------|
| **Platform** | Enrollment approved | Ops costs incurred |
| **Creative** | Learner completes course | Content delivered value |
| **Instructor** | Completion + interaction verified | Ensured engagement |
| **Dept Admin** | Learner completes course | Administration complete |
| **Global Admin** | Learner completes course | Oversight complete |

### Instructor Interaction Requirements by Difficulty

| Difficulty | Requirements to Earn Payout |
|------------|----------------------------|
| **Instructorless** | N/A - no instructor share |
| **Easy** | ≥1 discussion reply OR ≥1 assignment graded |
| **Medium** | ≥3 discussion replies AND all assignments graded within 5 days |
| **Difficult** | All Medium requirements + ≥30 min live session OR ≥5 feedback items |

### Dropout Protection

What happens if learner drops out but instructor did their job?

```typescript
interface DropoutPolicy {
  // Learner drops out, instructor engaged
  onDropoutWithInteraction: {
    waitDays: 90,                    // Wait 90 days
    releasePercentage: 0.50,         // Release 50% to instructor
    remainderTo: 'creative-pool'     // Other 50% to creators
  };
  
  // Learner drops out, instructor never engaged
  onDropoutNoInteraction: {
    waitDays: 90,
    releasePercentage: 0,            // Nothing to instructor
    remainderTo: 'platform'          // Platform keeps it
  };
  
  // Time-based release (fallback)
  maxHoldDays: 365,                  // After 1 year, force resolution
  forceResolution: 'admin-review'    // Admin decides
}
```

---

## Payout Thresholds & Scheduling

> Reduce transaction fees by batching payouts.

### Payout Triggers

Payouts are executed when EITHER condition is met:

| Trigger | Description | Default |
|---------|-------------|---------|
| **Amount Threshold** | Confirmed balance reaches $X | $50.00 |
| **Time Threshold** | X weeks since last payout | 4 weeks |

### Configurable Per-Recipient

```typescript
interface PayoutPreferences {
  recipientId: string;
  
  // Threshold triggers (first one met triggers payout)
  minimumPayoutAmount: number;     // Default: $50.00
  maximumPayoutInterval: number;   // Default: 4 weeks
  
  // Schedule preference
  preferredSchedule: 'weekly' | 'biweekly' | 'monthly' | 'threshold-only';
  preferredDayOfWeek?: number;     // 0-6 for weekly
  preferredDayOfMonth?: number;    // 1-28 for monthly
  
  // Options
  allowEarlyPayout: boolean;       // Can request payout before threshold
  earlyPayoutFee?: number;         // Fee for early payout (e.g., $2.00)
}
```

### Fee Optimization

```
Stripe Transfer Fee: $0.25 per payout

Scenario A: Pay $10 weekly × 4 weeks = $40 revenue, $1.00 fees (2.5%)
Scenario B: Pay $40 monthly × 1 time  = $40 revenue, $0.25 fees (0.6%)

→ Batching saves $0.75 per recipient per month
```

---

## Creatives Model

> **Creatives** are the people who create and deliver educational content.
> Both Content Creators and Instructors are "creatives" in the system.

### Creative Types

| Type | Role | When Paid |
|------|------|-----------|
| **Content Creator** | Created the course content | On learner completion |
| **Instructor** | Teaches/facilitates when learner takes course | On completion + interaction verified |

### Multi-Creative Support

A course can have:
- **1-to-many Content Creators** (co-authors, contributors)
- **1-to-many Instructors** (team teaching, rotating instructors)
- **Zero Instructors** (self-paced, no facilitation needed)

```
┌─────────────────────────────────────────────────────────────────┐
│                         COURSE                                  │
│                                                                 │
│  Content Creators (1-to-many)         Instructors (0-to-many)  │
│  ┌──────────────────────────┐        ┌──────────────────────┐  │
│  │ Creator A: 60% of pool   │        │ Instructor X: 50%    │  │
│  │ Creator B: 40% of pool   │        │ Instructor Y: 50%    │  │
│  └──────────────────────────┘        └──────────────────────┘  │
│                                                                 │
│  Platform: 30%   Creator Pool: 30%   Instructor Pool: 30%      │
│                  Admin Pool: 10%                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## System Purpose

### What This System DOES

| Responsibility | Description |
|---------------|-------------|
| Revenue Tracking | Record every dollar earned, by whom, for what |
| Split Calculations | Apply revenue share formulas per course/creator/instructor |
| Earnings Management | Track pending → confirmed → paid lifecycle |
| Payout Processing | Send money to creators and instructors |
| Interaction Verification | Ensure instructors engaged with learners |
| Tax Compliance | Generate 1099s, track tax withholdings |
| Reporting | Earnings reports, payout history, revenue analytics |

### What This System DOES NOT DO

| Not Responsible | Handled By |
|-----------------|------------|
| Payment collection | Commerce Platform |
| Order management | Commerce Platform |
| User authentication | LMS (shared auth) |
| Course content | LMS |
| Learning progress | LMS |
| Enrollments | LMS |

---

## Stakeholder Roles

### Content Creator

The person or entity who **created the course content**.

```typescript
interface ContentCreator {
  id: string;
  userId: string;              // Link to LMS user
  displayName: string;
  email: string;
  
  // Business info
  businessType: 'individual' | 'company';
  businessName?: string;
  taxId?: string;              // EIN or SSN (encrypted)
  
  // Payout settings
  payoutAccountId: string;
  defaultRevenueShare: number; // Default % for new courses
  minimumPayout: number;       // Don't pay until threshold
  payoutSchedule: 'weekly' | 'biweekly' | 'monthly';
  
  // Status
  status: 'pending-verification' | 'active' | 'suspended';
  verifiedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Instructor

The person who **teaches/facilitates** when a learner takes the course.

```typescript
interface Instructor {
  id: string;
  userId: string;              // Link to LMS user
  displayName: string;
  email: string;
  
  // Instructor type
  type: 'internal' | 'external' | 'contractor';
  
  // Payout settings (external/contractors only)
  payoutAccountId?: string;    // Null for internal employees
  minimumPayout: number;
  payoutSchedule: 'weekly' | 'biweekly' | 'monthly';
  
  // Tax info (for contractors)
  taxId?: string;
  w9OnFile: boolean;
  
  // Status
  status: 'active' | 'inactive' | 'suspended';
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Administrator (Revenue Recipient)

Administrators who earn a share of the admin pool.

```typescript
interface AdminRevenueRecipient {
  id: string;
  userId: string;              // Link to LMS user
  displayName: string;
  email: string;
  
  // Admin type
  adminLevel: 'department' | 'global';
  departmentId?: string;       // For dept-level admins
  
  // Role(s) that qualify for revenue share
  qualifyingRoles: ('dept-admin' | 'billing-admin' | 'enrollment-admin' | 'global-admin' | 'financial-admin')[];
  
  // Payout settings
  payoutAccountId?: string;    // Null if internal employee
  minimumPayout: number;
  payoutSchedule: 'weekly' | 'biweekly' | 'monthly';
  
  // Status
  status: 'active' | 'inactive';
  
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Configurable Revenue Percentages

> **All percentages are user-definable** at organization, department, course, and individual levels.
> Financial-admin (global-admin) can adjust any percentage in the system.

### Configuration Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                   CONFIGURATION HIERARCHY                       │
│                                                                 │
│  Level 1: ORGANIZATION DEFAULTS (lowest priority)              │
│  ├── Set by: financial-admin, global-admin                     │
│  └── Applies to: All departments, courses, individuals         │
│                                                                 │
│  Level 2: DEPARTMENT OVERRIDES                                 │
│  ├── Set by: financial-admin, global-admin                     │
│  └── Applies to: All courses in department                     │
│                                                                 │
│  Level 3: COURSE OVERRIDES                                     │
│  ├── Set by: financial-admin, dept-admin                       │
│  └── Applies to: All enrollments in course                     │
│                                                                 │
│  Level 4: INDIVIDUAL OVERRIDES (highest priority)              │
│  ├── Set by: financial-admin                                   │
│  └── Applies to: Specific creative/admin person                │
│                                                                 │
│  Resolution: Most specific (highest level) wins                │
└─────────────────────────────────────────────────────────────────┘
```

### Organization-Level Defaults

```typescript
interface OrganizationRevenueConfig {
  id: string;
  organizationId: string;
  
  // ═══════════════════════════════════════════════════════════════
  // DEFAULT POOL SHARES (must sum to 1.0)
  // ═══════════════════════════════════════════════════════════════
  defaultPlatformShare: number;      // Default: 0.30 (30%)
  defaultCreativeShare: number;      // Default: 0.30 (30%)
  defaultInstructorShare: number;    // Default: 0.30 (30%)
  defaultAdminShare: number;         // Default: 0.10 (10%)
  
  // ═══════════════════════════════════════════════════════════════
  // ADMIN POOL DISTRIBUTION
  // ═══════════════════════════════════════════════════════════════
  adminGlobalShare: number;          // Default: 0.30 (30% of admin pool)
  adminDeptShare: number;            // Default: 0.70 (70% of admin pool)
  
  // ═══════════════════════════════════════════════════════════════
  // DIFFICULTY-BASED INSTRUCTOR ADJUSTMENTS
  // ═══════════════════════════════════════════════════════════════
  difficultyMultipliers: {
    instructorless: { instructorShare: 0.00, redistributeTo: 'creative' };
    easy: { instructorShare: 0.20, creativeShare: 0.40 };
    medium: { instructorShare: 0.30, creativeShare: 0.30 };  // Default
    difficult: { instructorShare: 0.40, creativeShare: 0.20 };
  };
  
  // ═══════════════════════════════════════════════════════════════
  // PAYOUT THRESHOLDS
  // ═══════════════════════════════════════════════════════════════
  defaultMinimumPayout: number;      // Default: 5000 ($50.00)
  defaultPayoutIntervalWeeks: number; // Default: 4
  allowEarlyPayouts: boolean;        // Default: true
  earlyPayoutFee: number;            // Default: 200 ($2.00)
  
  // ═══════════════════════════════════════════════════════════════
  // DROPOUT POLICIES
  // ═══════════════════════════════════════════════════════════════
  dropoutHoldDays: number;           // Default: 90
  dropoutReleasePercentage: number;  // Default: 0.50 (50%)
  maxHoldDays: number;               // Default: 365
  
  // Metadata
  lastModifiedBy: string;            // financial-admin user ID
  lastModifiedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Department-Level Overrides

```typescript
interface DepartmentRevenueConfig {
  id: string;
  departmentId: string;
  departmentName: string;
  
  // Override organization defaults (null = use org default)
  platformShare?: number;
  creativeShare?: number;
  instructorShare?: number;
  adminShare?: number;
  
  // Override admin distribution for this dept
  adminGlobalShare?: number;
  adminDeptShare?: number;
  
  // Override difficulty multipliers
  difficultyMultipliers?: Partial<DifficultyMultipliers>;
  
  // Override payout settings
  minimumPayout?: number;
  payoutIntervalWeeks?: number;
  
  // Who can earn admin share in this department
  eligibleAdminRoles: string[];      // ['dept-admin', 'billing-admin', ...]
  
  // Metadata
  lastModifiedBy: string;
  lastModifiedAt: Date;
  effectiveFrom: Date;
  effectiveUntil?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Course-Level Overrides

```typescript
interface CourseRevenueConfig {
  id: string;
  courseId: string;
  departmentId: string;
  
  // Course difficulty (affects instructor share)
  difficulty: 'instructorless' | 'easy' | 'medium' | 'difficult';
  
  // Override department/org defaults (null = inherit)
  platformShare?: number;
  creativeShare?: number;
  instructorShare?: number;
  adminShare?: number;
  
  // ═══════════════════════════════════════════════════════════════
  // MULTI-CREATIVE ASSIGNMENTS
  // ═══════════════════════════════════════════════════════════════
  contentCreators: {
    creatorId: string;
    shareOfPool: number;           // e.g., 0.60 (60% of creative pool)
    customShare?: number;          // Override: fixed % of total instead
  }[];
  
  instructors: {
    instructorId: string;
    shareOfPool: number;           // e.g., 0.50 (50% of instructor pool)
    customShare?: number;          // Override: fixed % of total instead
  }[];
  
  instructorDistribution: 'fixed' | 'equal' | 'weighted-by-interaction';
  
  // No-instructor redistribution
  noInstructorRedistribution: 'proportional' | 'to-creative' | 'to-platform' | 'custom';
  customRedistribution?: {
    toCreative?: number;
    toPlatform?: number;
    toAdmin?: number;
  };
  
  // Metadata
  lastModifiedBy: string;
  lastModifiedAt: Date;
  effectiveFrom: Date;
  effectiveUntil?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Individual-Level Overrides

```typescript
interface IndividualRevenueConfig {
  id: string;
  
  // Who this override applies to
  userId: string;
  recipientType: 'content-creator' | 'instructor' | 'admin';
  
  // Scope (where does this override apply?)
  scope: 'global' | 'department' | 'course';
  departmentId?: string;           // If scope = department
  courseId?: string;               // If scope = course
  
  // ═══════════════════════════════════════════════════════════════
  // SHARE OVERRIDES
  // ═══════════════════════════════════════════════════════════════
  
  // Option 1: Override their share of the pool
  shareOfPoolOverride?: number;    // e.g., 0.75 (75% of pool instead of default)
  
  // Option 2: Fixed percentage of total revenue
  fixedShareOverride?: number;     // e.g., 0.35 (always 35% of total)
  
  // Option 3: Bonus on top of calculated share
  bonusPercentage?: number;        // e.g., 0.05 (extra 5% on top)
  
  // ═══════════════════════════════════════════════════════════════
  // PAYOUT OVERRIDES
  // ═══════════════════════════════════════════════════════════════
  minimumPayout?: number;
  payoutSchedule?: 'weekly' | 'biweekly' | 'monthly';
  
  // Reason for override
  reason: string;                  // "Top performer bonus", "Negotiated rate"
  
  // Approval
  approvedBy: string;              // financial-admin who approved
  approvedAt: Date;
  
  // Validity
  effectiveFrom: Date;
  effectiveUntil?: Date;           // Null = permanent
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Revenue Calculation Engine

```typescript
/**
 * Calculates effective revenue shares for a transaction
 * Resolves configuration hierarchy: Org → Dept → Course → Individual
 */
interface RevenueCalculator {
  calculateShares(params: {
    courseId: string;
    departmentId: string;
    creatorIds: string[];
    instructorIds: string[];
    deptAdminIds: string[];
    globalAdminIds: string[];
    netAmount: number;
  }): RevenueBreakdown;
}

interface RevenueBreakdown {
  // Calculated from hierarchy
  platformAmount: number;
  platformShare: number;
  
  creativePoolAmount: number;
  creativePoolShare: number;
  creators: {
    id: string;
    name: string;
    shareOfPool: number;
    effectiveShare: number;        // After individual overrides
    amount: number;
  }[];
  
  instructorPoolAmount: number;
  instructorPoolShare: number;
  instructors: {
    id: string;
    name: string;
    shareOfPool: number;
    effectiveShare: number;
    amount: number;
  }[];
  
  adminPoolAmount: number;
  adminPoolShare: number;
  deptAdmins: {
    id: string;
    name: string;
    role: string;
    shareOfPool: number;
    amount: number;
  }[];
  globalAdmins: {
    id: string;
    name: string;
    shareOfPool: number;
    amount: number;
  }[];
  
  // Audit trail
  configsApplied: {
    level: 'organization' | 'department' | 'course' | 'individual';
    configId: string;
    fieldsUsed: string[];
  }[];
}
```

---

## Financial Admin Permissions

> **financial-admin** is a global role that can modify any revenue configuration.

### Role Capabilities

| Role | Org Config | Dept Config | Course Config | Individual Config |
|------|------------|-------------|---------------|-------------------|
| **financial-admin** | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **global-admin** | ✅ Full | ✅ Full | ⚠️ View only | ❌ None |
| **dept-admin** | ❌ View only | ⚠️ View only | ✅ Their dept | ❌ None |
| **billing-admin** | ❌ View only | ❌ View only | ⚠️ View only | ❌ None |

### API Endpoints for Configuration

```
# Organization Level
GET  /api/v1/config/organization              # Get org config
PUT  /api/v1/config/organization              # Update org config (financial-admin)
GET  /api/v1/config/organization/history      # Audit history

# Department Level
GET  /api/v1/config/departments               # List all dept configs
GET  /api/v1/config/departments/:deptId       # Get dept config
PUT  /api/v1/config/departments/:deptId       # Update dept config
POST /api/v1/config/departments/:deptId       # Create dept override
DELETE /api/v1/config/departments/:deptId     # Remove override (use org defaults)

# Course Level
GET  /api/v1/config/courses/:courseId         # Get course config
PUT  /api/v1/config/courses/:courseId         # Update course config
GET  /api/v1/config/courses/:courseId/effective  # Get resolved effective config

# Individual Level
GET  /api/v1/config/individuals               # List all individual overrides
GET  /api/v1/config/individuals/:userId       # Get user's overrides
POST /api/v1/config/individuals               # Create individual override
PUT  /api/v1/config/individuals/:id           # Update override
DELETE /api/v1/config/individuals/:id         # Remove override

# Simulation
POST /api/v1/config/simulate                  # Simulate revenue split for scenario
```

---

## Revenue Flow

### Complete Transaction Lifecycle (4-Way Split)

```
1. PURCHASE (Commerce Platform)
   └── Customer pays $199 for course
   └── Stripe takes $6.07 (2.9% + $0.30)
   └── Net: $192.93
   └── Commerce → Payout: "Revenue recorded"
   └── Revenue breakdown calculated:
       ├── Platform (30%):   $57.88  → Status: PENDING
       ├── Creative (30%):   $57.88  → Status: PENDING
       ├── Instructor (30%): $57.88  → Status: PENDING
       └── Admin (10%):      $19.29  → Status: PENDING
           ├── Dept Admins (70%): $13.50
           └── Global Admins (30%): $5.79

2. ENROLLMENT APPROVED (LMS)
   └── LMS → Payout: "Enrollment approved"
   └── Platform share confirmed: $57.88  → Status: CONFIRMED

3. LEARNING IN PROGRESS (LMS)
   └── Learner progresses through course
   └── Instructor interacts (discussions, grading)
   └── LMS tracks all interactions
   └── LMS → Payout: "interaction.logged" events

4. COURSE COMPLETION (LMS)
   └── Learner completes all requirements
   └── LMS → Payout: "Course completed"
   └── Verify instructor interactions (by difficulty level)
   └── If verified:
       ├── Creative share:   $57.88  → Status: CONFIRMED
       ├── Instructor share: $57.88  → Status: CONFIRMED
       └── Admin shares:     $19.29  → Status: CONFIRMED
           ├── Dept Admins: Split among 3 admins = $4.50 each
           └── Global Admins: Split among 2 = $2.90 each

5. PAYOUT CYCLE (Payout Platform)
   └── Monthly payout job runs
   └── For each recipient with CONFIRMED balance ≥ threshold:
       └── Aggregate all CONFIRMED earnings
       └── Execute Stripe transfer
       └── Status: CONFIRMED → PAID
```

### Revenue States

```typescript
type RevenueStatus = 
  | 'recorded'      // Payment received, revenue logged
  | 'pending'       // Waiting for trigger (approval/completion)
  | 'confirmed'     // Trigger met, ready for payout queue
  | 'queued'        // Added to payout batch
  | 'processing'    // Payout in progress
  | 'paid'          // Successfully paid out
  | 'failed'        // Payout failed, needs retry
  | 'cancelled'     // Refund issued, revenue reversed
  | 'forfeited';    // Dropout + no interaction, redistributed

5. PAYOUT (Payout Platform)
   └── Payout cycle runs (weekly/monthly)
   └── Aggregate confirmed earnings per recipient
   └── Process payouts via Stripe Connect/PayPal/ACH
   └── Update status: confirmed → paid
```

### Revenue States

```typescript
type RevenueStatus = 
  | 'recorded'     // Payment received, revenue logged
  | 'pending'      // Waiting for completion to confirm
  | 'confirmed'    // Completion verified, ready for payout
  | 'queued'       // Added to payout batch
  | 'processing'   // Payout in progress
  | 'paid'         // Successfully paid out
  | 'failed'       // Payout failed, needs retry
  | 'cancelled'    // Refund issued, revenue reversed
```

---

## Data Models

### Course Revenue Configuration

```typescript
/**
 * Revenue configuration for a course
 * Supports multiple content creators and instructors with custom shares
 */
interface CourseRevenueConfig {
  id: string;
  courseId: string;              // LMS course ID
  
  // ═══════════════════════════════════════════════════════════════
  // PLATFORM SHARE (fixed percentage)
  // ═══════════════════════════════════════════════════════════════
  platformShare: number;         // e.g., 0.30 (30%) - system default or custom
  
  // ═══════════════════════════════════════════════════════════════
  // CONTENT CREATOR POOL (1-to-many creators)
  // ═══════════════════════════════════════════════════════════════
  creatorPoolShare: number;      // e.g., 0.40 (40% of net goes to creator pool)
  
  contentCreators: CreatorShare[];  // How pool is split among creators
  
  // ═══════════════════════════════════════════════════════════════
  // INSTRUCTOR POOL (0-to-many instructors)
  // ═══════════════════════════════════════════════════════════════
  instructorPoolShare: number;   // e.g., 0.30 (30% of net goes to instructor pool)
  requiresInstructor: boolean;   // If false, instructor pool redistributes
  
  instructors: InstructorShare[];   // How pool is split among instructors
  instructorDistribution: 'fixed' | 'equal' | 'weighted-by-interaction';
  
  // ═══════════════════════════════════════════════════════════════
  // NO-INSTRUCTOR REDISTRIBUTION
  // ═══════════════════════════════════════════════════════════════
  noInstructorRedistribution: 'proportional' | 'to-creators' | 'to-platform' | 'custom';
  customRedistribution?: {
    toCreatorPool?: number;      // e.g., 0.60 (60% of instructor pool → creators)
    toPlatform?: number;         // e.g., 0.40 (40% of instructor pool → platform)
  };
  
  // ═══════════════════════════════════════════════════════════════
  // VALIDATION: platformShare + creatorPoolShare + instructorPoolShare = 1.0
  // ═══════════════════════════════════════════════════════════════
  
  // Overrides
  customSplitRules?: CustomSplitRule[];
  
  effectiveFrom: Date;
  effectiveUntil?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Individual content creator's share of the creator pool
 */
interface CreatorShare {
  creatorId: string;             // ContentCreator.id
  creatorName: string;           // Denormalized for display
  shareOfPool: number;           // e.g., 0.60 (60% of creator pool)
  // All CreatorShare.shareOfPool values must sum to 1.0
}

/**
 * Individual instructor's share of the instructor pool
 */
interface InstructorShare {
  instructorId: string;          // Instructor.id
  instructorName: string;        // Denormalized for display
  shareOfPool: number;           // e.g., 0.50 (50% of instructor pool)
  // For 'fixed' distribution: must sum to 1.0
  // For 'equal': ignored, calculated at runtime
  // For 'weighted-by-interaction': base weight, adjusted by interaction
}

interface CustomSplitRule {
  condition: 'volume' | 'date-range' | 'promo-code';
  parameters: object;
  adjustedShares: {
    platformShare?: number;
    creatorPoolShare?: number;
    instructorPoolShare?: number;
  };
}
```

### System-Level Defaults

```typescript
/**
 * System-wide default percentages
 * Can be overridden per-course
 */
interface SystemRevenueDefaults {
  id: string;
  
  // Default pool shares
  defaultPlatformShare: number;       // e.g., 0.30 (30%)
  defaultCreatorPoolShare: number;    // e.g., 0.40 (40%)
  defaultInstructorPoolShare: number; // e.g., 0.30 (30%)
  
  // Default redistribution when no instructor
  defaultNoInstructorRedistribution: 'proportional' | 'to-creators' | 'to-platform';
  
  // Payout defaults
  defaultMinimumPayout: number;       // e.g., 5000 ($50.00 in cents)
  defaultPayoutSchedule: 'weekly' | 'biweekly' | 'monthly';
  defaultHoldPeriodDays: number;      // e.g., 14
  
  updatedAt: Date;
  updatedBy: string;
}
```

### Creative Profile

```typescript
/**
 * Base creative profile (shared by Instructor and ContentCreator)
 */
interface CreativeProfile {
  id: string;
  userId: string;                // Link to LMS user
  type: 'instructor' | 'content-creator';
  
  // Display
  displayName: string;
  email: string;
  bio?: string;
  avatarUrl?: string;
  
  // Custom share overrides (per-creative defaults)
  customDefaultShare?: number;   // Override system default for this creative
  
  // Payout settings
  payoutAccountId?: string;
  minimumPayout: number;
  payoutSchedule: 'weekly' | 'biweekly' | 'monthly';
  
  // Tax info
  businessType: 'individual' | 'company';
  businessName?: string;
  taxId?: string;                // Encrypted
  w9OnFile: boolean;
  
  // Status
  status: 'pending-verification' | 'active' | 'suspended';
  verifiedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}
```
```

### Revenue Ledger Entry

```typescript
/**
 * Records each transaction's revenue and how it's split
 * Supports multiple creators and instructors
 */
interface RevenueLedgerEntry {
  id: string;
  
  // Source
  orderId: string;               // From Commerce
  orderItemId: string;
  transactionId: string;         // Payment processor tx
  
  // Course info
  courseId: string;
  courseName: string;
  
  // Learner
  learnerId: string;
  learnerName: string;
  
  // Amounts
  grossAmount: number;
  processorFee: number;
  netAmount: number;
  currency: string;
  
  // ═══════════════════════════════════════════════════════════════
  // REVENUE BREAKDOWN (calculated at time of purchase)
  // ═══════════════════════════════════════════════════════════════
  breakdown: {
    // Platform
    platformAmount: number;
    platformShare: number;
    
    // Creator Pool (split among 1+ creators)
    creatorPoolAmount: number;
    creatorPoolShare: number;
    creators: {
      creatorId: string;
      creatorName: string;
      shareOfPool: number;       // e.g., 0.60
      amount: number;            // Actual $ for this creator
    }[];
    
    // Instructor Pool (split among 0+ instructors)
    instructorPoolAmount: number;
    instructorPoolShare: number;
    instructors: {
      instructorId: string;
      instructorName: string;
      shareOfPool: number;       // e.g., 0.50
      amount: number;            // Actual $ for this instructor
    }[];
    
    // Redistribution (if no instructors)
    wasRedistributed: boolean;
    redistributedFrom?: 'instructor-pool';
    redistributedTo?: {
      toCreatorPool?: number;
      toPlatform?: number;
    };
  };
  
  // Status
  status: 'recorded' | 'confirmed' | 'cancelled';
  
  // Lifecycle
  recordedAt: Date;
  confirmedAt?: Date;           // When learner completed
  cancelledAt?: Date;           // If refunded
  cancelReason?: string;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Earned Revenue

```typescript
/**
 * Individual earning record for each creative
 * One entry per creative per transaction
 */
interface EarnedRevenue {
  id: string;
  
  // Recipient
  recipientType: 'content-creator' | 'instructor' | 'platform';
  recipientId: string;           // CreativeProfile.id
  
  // Source
  ledgerEntryId: string;
  orderId: string;
  courseId: string;
  enrollmentId: string;
  
  // Amount
  amount: number;
  currency: string;
  sharePercentage: number;
  
  // Status
  status: 'pending' | 'confirmed' | 'queued' | 'paid' | 'cancelled';
  
  // Lifecycle
  pendingAt: Date;              // When order placed
  confirmedAt?: Date;           // When completion verified
  queuedAt?: Date;              // When added to payout
  paidAt?: Date;                // When payout completed
  cancelledAt?: Date;
  
  // Payout reference
  payoutId?: string;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Payout Account

```typescript
interface PayoutAccount {
  id: string;
  ownerId: string;               // ContentCreator.id or Instructor.id
  ownerType: 'content-creator' | 'instructor';
  
  // Payout method
  method: 'stripe-connect' | 'paypal' | 'ach' | 'wire' | 'check';
  
  // Method-specific details (encrypted)
  stripeConnectAccountId?: string;
  paypalEmail?: string;
  achDetails?: {
    routingNumber: string;       // Encrypted
    accountNumber: string;       // Encrypted
    accountType: 'checking' | 'savings';
  };
  wireDetails?: {
    bankName: string;
    swiftCode: string;
    accountNumber: string;       // Encrypted
    iban?: string;
  };
  
  // Verification
  verified: boolean;
  verifiedAt?: Date;
  verificationMethod: 'micro-deposit' | 'instant' | 'manual';
  
  // Status
  status: 'pending' | 'active' | 'suspended';
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Payout

```typescript
interface Payout {
  id: string;
  
  // Recipient
  payoutAccountId: string;
  recipientType: 'content-creator' | 'instructor';
  recipientId: string;
  recipientName: string;
  
  // Amount
  totalAmount: number;
  currency: string;
  earnedRevenueIds: string[];    // What's included
  itemCount: number;
  
  // Period
  periodStart: Date;
  periodEnd: Date;
  
  // Processing
  method: 'stripe-connect' | 'paypal' | 'ach' | 'wire' | 'check';
  processorReference?: string;   // Stripe transfer ID, etc.
  
  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processedAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  retryCount: number;
  
  // Fees
  transferFee: number;           // Payout processor fee
  netAmount: number;             // What recipient receives
  
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Revenue Share Configurations

### System Defaults (Fully Customizable)

| Pool | Default Share | Customizable At |
|------|--------------|-----------------|
| Platform | 30% | System, Course |
| Creator Pool | 40% | System, Course, Per-Creator |
| Instructor Pool | 30% | System, Course, Per-Instructor |

### Configuration Hierarchy

```
System Defaults
    └── Course Override
            └── Per-Creative Override
```

1. **System Defaults** - Global defaults for all courses
2. **Course Override** - Course-specific percentages
3. **Per-Creative Override** - Individual creative's custom share

### Example: Multiple Content Creators

```typescript
// Course co-authored by 2 creators
{
  courseId: "co-authored-course",
  platformShare: 0.30,
  creatorPoolShare: 0.40,        // 40% to creator pool
  contentCreators: [
    { creatorId: "creator-A", shareOfPool: 0.60 },  // 60% of 40% = 24% of net
    { creatorId: "creator-B", shareOfPool: 0.40 }   // 40% of 40% = 16% of net
  ],
  instructorPoolShare: 0.30,
  instructors: [
    { instructorId: "inst-X", shareOfPool: 1.0 }    // 100% of 30% = 30% of net
  ]
}
```

### Example: Team-Taught Course (Multiple Instructors)

```typescript
{
  courseId: "team-taught-course",
  platformShare: 0.25,           // Custom: lower platform fee
  creatorPoolShare: 0.35,
  contentCreators: [
    { creatorId: "creator-A", shareOfPool: 1.0 }    // Solo creator
  ],
  instructorPoolShare: 0.40,     // Custom: higher instructor pool
  instructorDistribution: 'equal',  // Split equally among assigned instructors
  instructors: [
    { instructorId: "inst-X", shareOfPool: 0.50 },
    { instructorId: "inst-Y", shareOfPool: 0.50 }
  ]
}
```

---

## No-Instructor Redistribution

> When a course **does not require an instructor** (self-paced, fully automated),
> the instructor pool share is **redistributed proportionally** to other stakeholders.

### Redistribution Modes

| Mode | Description | Example |
|------|-------------|---------|
| `proportional` | Split by existing ratios (platform:creators) | Default |
| `to-creators` | 100% goes to content creators | Creator-friendly |
| `to-platform` | 100% goes to platform | Platform-preferred |
| `custom` | Custom split percentages | Flexible |

### Proportional Redistribution (Default)

When no instructor assigned, redistribute their 30% share:

```
Original:  Platform 30% | Creators 40% | Instructors 30%
                                              ↓
                                        (redistributed)
                                              ↓
Adjusted:  Platform 42.86% | Creators 57.14% | Instructors 0%

Calculation:
- Total non-instructor shares: 30% + 40% = 70%
- Platform ratio: 30/70 = 0.4286
- Creator ratio: 40/70 = 0.5714
- Instructor 30% redistributed:
  - To Platform: 30% × 0.4286 = 12.86% (total: 42.86%)
  - To Creators: 30% × 0.5714 = 17.14% (total: 57.14%)
```

### Example: Self-Paced Course

```typescript
{
  courseId: "self-paced-course",
  platformShare: 0.30,
  creatorPoolShare: 0.40,
  contentCreators: [
    { creatorId: "creator-A", shareOfPool: 1.0 }
  ],
  instructorPoolShare: 0.30,
  requiresInstructor: false,          // ← No instructor needed
  instructors: [],                     // ← Empty
  noInstructorRedistribution: 'proportional'
}

// Result: Creator-A gets 57.14% of net, Platform gets 42.86%
```

### Example: Creator-Friendly Redistribution

```typescript
{
  courseId: "creator-friendly-course",
  platformShare: 0.30,
  creatorPoolShare: 0.40,
  contentCreators: [
    { creatorId: "creator-A", shareOfPool: 0.70 },
    { creatorId: "creator-B", shareOfPool: 0.30 }
  ],
  instructorPoolShare: 0.30,
  requiresInstructor: false,
  instructors: [],
  noInstructorRedistribution: 'to-creators'  // ← All to creators
}

// Result:
// - Platform: 30% (unchanged)
// - Creator-A: 70% of 70% = 49%
// - Creator-B: 30% of 70% = 21%
```

### Example: Custom Redistribution

```typescript
{
  courseId: "custom-split-course",
  platformShare: 0.30,
  creatorPoolShare: 0.40,
  contentCreators: [
    { creatorId: "creator-A", shareOfPool: 1.0 }
  ],
  instructorPoolShare: 0.30,
  requiresInstructor: false,
  instructors: [],
  noInstructorRedistribution: 'custom',
  customRedistribution: {
    toCreatorPool: 0.80,    // 80% of instructor pool → creators
    toPlatform: 0.20        // 20% of instructor pool → platform
  }
}

// Result:
// - Platform: 30% + (30% × 0.20) = 36%
// - Creator-A: 40% + (30% × 0.80) = 64%
```

---

## Split Variations

### Volume-Based Adjustments

```typescript
{
  courseId: "popular-course",
  platformShare: 0.30,
  creatorPoolShare: 0.40,
  instructorPoolShare: 0.30,
  customSplitRules: [
    {
      condition: 'volume',
      parameters: { minSalesPerMonth: 100 },
      adjustedShares: {
        platformShare: 0.20,         // Reduced platform fee
        creatorPoolShare: 0.50       // Bonus for high volume
      }
    }
  ]
}
```

---

## Payout Rules & Triggers

### Confirmation Triggers

| Event | Effect | Recipients Affected |
|-------|--------|---------------------|
| Enrollment Approved | Confirm platform share | Platform |
| Course Completed | Confirm creator & instructor shares | Creator, Instructor |
| Refund Issued | Cancel all shares | All |

### Payout Schedules

```typescript
type PayoutSchedule = 'weekly' | 'biweekly' | 'monthly' | 'on-demand';

interface PayoutScheduleConfig {
  schedule: PayoutSchedule;
  dayOfWeek?: number;          // 0-6 for weekly
  dayOfMonth?: number;         // 1-28 for monthly
  minimumAmount: number;       // Don't pay below threshold
  holdPeriod: number;          // Days to hold before payout eligible
}
```

### Default Payout Rules

1. **Hold Period:** 14 days after confirmation before payout eligible
2. **Minimum Threshold:** $50 minimum per payout
3. **Schedule:** Monthly on the 15th
4. **Failed Payouts:** Retry 3 times, then hold for manual review

---

## Instructor Interaction Requirements

### Why Require Interactions?

Instructors must **actively engage** with learners to earn their share. This ensures:
- Learners receive support
- Instructors are accountable
- Quality of instruction is maintained

### Interaction Types

```typescript
interface InteractionRequirement {
  id: string;
  courseId: string;
  
  // Minimum requirements (any one must be met)
  requirements: {
    discussionReplies?: {
      minimum: number;           // e.g., 3 replies
      withinDays: number;        // e.g., within 2 days of post
    };
    
    assignmentsGraded?: {
      minimum: number;           // e.g., all assignments
      withinDays: number;        // e.g., within 5 days of submission
    };
    
    liveSessionMinutes?: {
      minimum: number;           // e.g., 30 minutes
      sessionType: 'one-on-one' | 'group' | 'any';
    };
    
    feedbackProvided?: {
      minimum: number;           // e.g., 5 feedback items
      types: ('written' | 'video' | 'audio')[];
    };
    
    manualVerification?: {
      allowed: boolean;          // Admin can override
    };
  };
  
  // Grace period
  gracePeriodDays: number;       // Days after completion to meet requirements
}
```

### Interaction Tracking

```typescript
interface InstructorInteractionLog {
  id: string;
  enrollmentId: string;
  instructorId: string;
  courseId: string;
  learnerId: string;
  
  // Tracked interactions
  interactions: {
    discussionReplies: DiscussionReplyLog[];
    assignmentsGraded: AssignmentGradedLog[];
    liveSessions: LiveSessionLog[];
    feedbackItems: FeedbackLog[];
  };
  
  // Summary
  totalInteractions: number;
  lastInteractionAt: Date;
  
  // Requirement check
  requirementsMet: boolean;
  metAt?: Date;
  
  // Override
  manuallyVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  verificationNotes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Verification Process

```
1. Learner completes course
2. LMS sends completion event to Payout Platform
3. Payout Platform checks InteractionRequirement for course
4. Payout Platform queries LMS for instructor interactions
5. If requirements met:
   └── Confirm instructor EarnedRevenue
6. If requirements NOT met:
   └── Mark instructor share as "pending-verification"
   └── Start grace period countdown
   └── Notify instructor of missing requirements
7. After grace period:
   └── If still not met: Redistribute to creator or platform
   └── Or: Admin manually verifies
```

---

## API Endpoints

### System Configuration

```
GET  /api/v1/system/revenue-defaults          # Get system defaults
PUT  /api/v1/system/revenue-defaults          # Update system defaults (admin)
```

### Creatives (Unified)

```
GET  /api/v1/creatives                        # All creatives (creators + instructors)
GET  /api/v1/creatives/:id                    # Single creative profile
POST /api/v1/creatives                        # Register as creative
PUT  /api/v1/creatives/:id                    # Update profile
GET  /api/v1/creatives/:id/earnings           # Creative's earnings
GET  /api/v1/creatives/:id/courses            # Courses they're on
PUT  /api/v1/creatives/:id/default-share      # Set custom default share
```

### Revenue Tracking

```
GET  /api/v1/revenue/ledger                   # All ledger entries
GET  /api/v1/revenue/ledger/:id               # Single entry
GET  /api/v1/revenue/by-course/:courseId      # Revenue for course
GET  /api/v1/revenue/by-creator/:creatorId    # Revenue for creator
GET  /api/v1/revenue/by-instructor/:instructorId  # Revenue for instructor
GET  /api/v1/revenue/summary                  # Aggregate summary
```

### Earnings

```
GET  /api/v1/earnings                         # All earned revenue
GET  /api/v1/earnings/me                      # My earnings (creator/instructor)
GET  /api/v1/earnings/:id                     # Single earning
GET  /api/v1/earnings/pending                 # Pending confirmation
GET  /api/v1/earnings/confirmed               # Ready for payout
GET  /api/v1/earnings/by-period               # Earnings by date range
```

### Payouts

```
GET  /api/v1/payouts                          # All payouts
GET  /api/v1/payouts/me                       # My payouts
GET  /api/v1/payouts/:id                      # Single payout
POST /api/v1/payouts/request                  # Request early payout
GET  /api/v1/payouts/upcoming                 # Scheduled payouts
POST /api/v1/payouts/:id/retry                # Retry failed payout
```

### Payout Accounts

```
GET  /api/v1/payout-accounts                  # All accounts (admin)
GET  /api/v1/payout-accounts/me               # My account
POST /api/v1/payout-accounts                  # Create account
PUT  /api/v1/payout-accounts/:id              # Update account
POST /api/v1/payout-accounts/:id/verify       # Initiate verification
DELETE /api/v1/payout-accounts/:id            # Remove account
```

### Content Creators

```
GET  /api/v1/creators                         # All creators
GET  /api/v1/creators/:id                     # Single creator
POST /api/v1/creators                         # Register as creator
PUT  /api/v1/creators/:id                     # Update profile
GET  /api/v1/creators/:id/earnings            # Creator earnings
GET  /api/v1/creators/:id/courses             # Creator's courses
```

### Instructors

```
GET  /api/v1/instructors                      # All instructors
GET  /api/v1/instructors/:id                  # Single instructor
PUT  /api/v1/instructors/:id                  # Update profile
GET  /api/v1/instructors/:id/earnings         # Instructor earnings
GET  /api/v1/instructors/:id/interactions     # Interaction history
```

### Course Revenue Configs

```
GET  /api/v1/revenue-configs                  # All configs
GET  /api/v1/revenue-configs/course/:courseId # Config for course
POST /api/v1/revenue-configs                  # Create config
PUT  /api/v1/revenue-configs/:id              # Update config

# Multi-creative management
POST /api/v1/revenue-configs/:id/creators     # Add creator to course
PUT  /api/v1/revenue-configs/:id/creators/:creatorId  # Update creator's share
DELETE /api/v1/revenue-configs/:id/creators/:creatorId # Remove creator

POST /api/v1/revenue-configs/:id/instructors  # Add instructor to course
PUT  /api/v1/revenue-configs/:id/instructors/:instructorId  # Update share
DELETE /api/v1/revenue-configs/:id/instructors/:instructorId # Remove instructor

# Redistribution settings
PUT  /api/v1/revenue-configs/:id/redistribution  # Set no-instructor behavior
```

### Webhooks (Inbound)

```
POST /api/v1/webhooks/revenue-recorded        # From Commerce
POST /api/v1/webhooks/course-completion       # From LMS
POST /api/v1/webhooks/enrollment-status       # From LMS
POST /api/v1/webhooks/refund-issued           # From Commerce
POST /api/v1/webhooks/interaction-logged      # From LMS
```

---

## Reporting & Analytics

### Creator Dashboard

```typescript
interface CreatorDashboard {
  summary: {
    totalEarnings: number;
    pendingEarnings: number;
    confirmedEarnings: number;
    paidEarnings: number;
    totalCourses: number;
    totalEnrollments: number;
  };
  
  recentEarnings: EarnedRevenue[];
  
  earningsByMonth: {
    month: string;
    amount: number;
    enrollments: number;
  }[];
  
  topCourses: {
    courseId: string;
    courseName: string;
    totalRevenue: number;
    enrollments: number;
  }[];
  
  upcomingPayout: {
    amount: number;
    scheduledDate: Date;
    itemCount: number;
  };
}
```

### Instructor Dashboard

```typescript
interface InstructorDashboard {
  summary: {
    totalEarnings: number;
    pendingEarnings: number;
    confirmedEarnings: number;
    paidEarnings: number;
    activeLearners: number;
    completedLearners: number;
  };
  
  interactionStatus: {
    enrollmentId: string;
    learnerName: string;
    courseName: string;
    requirementsMet: boolean;
    missingRequirements: string[];
    gracePeriodEnds?: Date;
  }[];
  
  recentEarnings: EarnedRevenue[];
  
  upcomingPayout: {
    amount: number;
    scheduledDate: Date;
    itemCount: number;
  };
}
```

### Admin Reports

```typescript
interface AdminRevenueReport {
  period: {
    start: Date;
    end: Date;
  };
  
  totals: {
    grossRevenue: number;
    processorFees: number;
    netRevenue: number;
    platformRevenue: number;
    creatorPayouts: number;
    instructorPayouts: number;
  };
  
  byMonth: {
    month: string;
    grossRevenue: number;
    netRevenue: number;
    platformRevenue: number;
  }[];
  
  byCourse: {
    courseId: string;
    courseName: string;
    creatorName: string;
    totalRevenue: number;
    enrollments: number;
    completionRate: number;
  }[];
  
  byCreator: {
    creatorId: string;
    creatorName: string;
    totalEarnings: number;
    courseCount: number;
    enrollmentCount: number;
  }[];
  
  payoutSummary: {
    totalPaid: number;
    pendingPayouts: number;
    failedPayouts: number;
  };
}
```

---

## Tax & Compliance

### 1099 Requirements (US)

- Issue 1099-NEC for payments ≥ $600/year to non-employees
- Collect W-9 from all US-based creators/instructors
- Report payments to IRS

### W-9 Collection

```typescript
interface W9Info {
  id: string;
  ownerId: string;
  ownerType: 'content-creator' | 'instructor';
  
  // From W-9
  name: string;
  businessName?: string;
  taxClassification: 'individual' | 'c-corp' | 's-corp' | 'partnership' | 'llc' | 'other';
  address: Address;
  taxId: string;                 // Encrypted SSN or EIN
  taxIdType: 'ssn' | 'ein';
  
  // Signature
  signedAt: Date;
  signatureData: string;         // Encrypted
  
  // Verification
  verified: boolean;
  verifiedAt?: Date;
  verificationMethod: 'tin-match' | 'manual';
  
  // Validity
  expiresAt?: Date;              // Some orgs require annual renewal
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Tax Reporting

```typescript
interface TaxReport1099 {
  id: string;
  year: number;
  
  // Recipient
  recipientId: string;
  recipientType: 'content-creator' | 'instructor';
  recipientName: string;
  recipientTaxId: string;        // Encrypted
  recipientAddress: Address;
  
  // Payments
  totalPayments: number;
  payoutIds: string[];
  
  // Status
  status: 'draft' | 'generated' | 'filed' | 'sent';
  generatedAt?: Date;
  filedAt?: Date;
  sentAt?: Date;
  
  // Document
  documentUrl?: string;          // PDF storage
  
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Integration Points

### From Commerce Platform

| Event | Webhook | Action |
|-------|---------|--------|
| Payment Completed | `revenue-recorded` | Create ledger entry, pending earnings |
| Refund Issued | `refund-issued` | Cancel ledger entry, reverse earnings |

### From LMS

| Event | Webhook | Action |
|-------|---------|--------|
| Enrollment Approved | `enrollment-status` | Confirm platform share |
| Course Completed | `course-completion` | Confirm creator/instructor shares |
| Interaction Logged | `interaction-logged` | Update interaction tracking |

### To Commerce Platform

| Event | Webhook | Purpose |
|-------|---------|---------|
| Payout Completed | `payout-completed` | Notify of payout (optional) |

### To LMS

| Event | Webhook | Purpose |
|-------|---------|---------|
| Instructor Verification Failed | `instructor-verification-failed` | Alert admin |

---

## Phase Breakdown

### Phase 1: Foundation (Weeks 1-2)
- [ ] Revenue ledger model
- [ ] Earned revenue model
- [ ] Basic revenue tracking API
- [ ] Webhook receivers (revenue-recorded, course-completion)

### Phase 2: Revenue Configs (Week 3)
- [ ] Course revenue config model
- [ ] Default split configuration
- [ ] Revenue calculation engine
- [ ] API for managing configs

### Phase 3: Payout Accounts (Week 4)
- [ ] Payout account model
- [ ] Stripe Connect integration
- [ ] PayPal payout integration
- [ ] Account verification flow

### Phase 4: Payout Processing (Weeks 5-6)
- [ ] Payout model
- [ ] Payout scheduler (cron)
- [ ] Payout processing engine
- [ ] Retry logic for failures

### Phase 5: Instructor Interactions (Week 7)
- [ ] Interaction requirement model
- [ ] Interaction tracking model
- [ ] Verification engine
- [ ] Grace period handling

### Phase 6: Dashboards (Week 8)
- [ ] Creator earnings dashboard
- [ ] Instructor earnings dashboard
- [ ] Admin revenue reports

### Phase 7: Tax Compliance (Week 9)
- [ ] W-9 collection
- [ ] 1099 generation
- [ ] Tax reporting exports

### Phase 8: UI (Weeks 10-12)
- [ ] Creator payout portal
- [ ] Instructor earnings view
- [ ] Admin payout management

---

## Open Questions

| # | Question | Impact | Status |
|---|----------|--------|--------|
| 1 | Should failed instructor payouts go to platform or creator? | Revenue distribution | ❓ NEEDS ANSWER |
| 2 | International tax requirements (VAT, etc.)? | Tax compliance | ❓ NEEDS ANSWER |
| 3 | Support for non-USD currencies in payouts? | Payout processing | ❓ NEEDS ANSWER |
| 4 | Dispute resolution process for earnings? | Edge cases | ❓ NEEDS ANSWER |
| 5 | Tiered revenue shares based on sales volume? | Revenue configs | ❓ NEEDS ANSWER |

---

## Related Documents

- [SYSTEM_BOUNDARIES.md](SYSTEM_BOUNDARIES.md) - System separation architecture
- [BILLING_REGISTRATION_SYSTEM_SPEC.md](BILLING_REGISTRATION_SYSTEM_SPEC.md) - Commerce Platform
- [BILLING_USER_STORIES.md](BILLING_USER_STORIES.md) - User stories (needs split)
