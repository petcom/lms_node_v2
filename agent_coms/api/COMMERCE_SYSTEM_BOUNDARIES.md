# System Boundaries: Commerce Platform vs LMS

**Document Version:** 1.0
**Created:** 2025-01-14
**Status:** ✅ ARCHITECTURAL DECISION

---

## Overview

This document defines the clear separation between three independent systems:

| System | Responsibility | Codebase |
|--------|---------------|----------|
| **Commerce Platform** | Billing, orders, payments IN | Separate repo |
| **Payout Platform** | Revenue sharing, payments OUT | Separate repo (or module) |
| **Cadence LMS** | Learning, enrollments, progress | Current repo |

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         COMMERCE PLATFORM (New)                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Catalog    │  │    Cart      │  │   Checkout   │  │   Orders     │    │
│  │   Service    │  │   Service    │  │   Service    │  │   Service    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                              │                                              │
│                              ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    Payment Processors (IN)                            │  │
│  │    Stripe │ Square │ PayPal │ Elavon │ Google Pay │ Apple Pay        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                              │                                              │
│                              ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      Revenue Ledger                                   │  │
│  │   Per Course │ Per Content Creator │ Per Instructor │ Platform Fee   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Webhook / Connector
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CADENCE LMS (Current)                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Enrollments  │  │   Progress   │  │  Completions │  │ Certificates │    │
│  │  (Pending)   │  │   Tracking   │  │   Tracking   │  │  Generation  │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                              │                                              │
│                              ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │              Completion Events → Commerce Platform                    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Completion Webhook
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PAYOUT PLATFORM (New)                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Revenue    │  │   Payout     │  │   Creator    │  │  Instructor  │    │
│  │   Splits     │  │   Queue      │  │   Payments   │  │   Payments   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                              │                                              │
│                              ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    Payout Processors (OUT)                            │  │
│  │         Stripe Connect │ PayPal Payouts │ ACH │ Wire                 │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## System 1: Commerce Platform (Billing System)

**Purpose:** Handle all money COMING IN

### Owns
- Course/Program Catalog (pricing, descriptions, availability)
- Shopping Cart
- Checkout Flow
- Order Management
- Payment Processing (charges)
- Tax Calculation
- Refunds
- Revenue Ledger (tracking, not distribution)

### Does NOT Own
- User accounts (syncs from LMS or shared auth)
- Learning content
- Enrollment state
- Progress tracking
- Completions
- Instructor assignments

### Data Models
```typescript
// Commerce Platform owns these
CourseCatalogItem    // Pricing wrapper for LMS course
Cart / CartItem
Order / OrderItem
Payment
Refund
TaxRecord
RevenueLedgerEntry   // Per-transaction revenue breakdown
```

### API Endpoints (Commerce)
```
/api/v1/catalog/*           // Browse purchasable items
/api/v1/cart/*              // Cart management
/api/v1/checkout/*          // Payment flow
/api/v1/orders/*            // Order history
/api/v1/payments/*          // Payment records
/api/v1/revenue/*           // Revenue reporting
```

---

## System 2: Cadence LMS (Learning System)

**Purpose:** Handle all LEARNING activities

### Owns
- User accounts & authentication
- Departments & organizational structure
- Course content & curriculum
- Enrollments
- Progress tracking
- Completions & grades
- Certificates
- Instructor assignments to enrollments

### Does NOT Own
- Pricing
- Shopping cart
- Payment processing
- Revenue tracking
- Payout calculations

### Receives from Commerce Platform
```typescript
interface PendingEnrollmentRequest {
  externalOrderId: string;
  externalOrderItemId: string;
  userId: string;           // Must exist in LMS
  courseId: string;         // Must exist in LMS
  instructorId?: string;    // Optional: assigned instructor
  approvalStatus: 'pending' | 'auto-approved';
  metadata: {
    purchaseDate: Date;
    amount: number;
    currency: string;
  };
}
```

### Sends to Payout Platform
```typescript
interface CompletionEvent {
  enrollmentId: string;
  userId: string;
  courseId: string;
  instructorId: string;     // Who taught this learner
  completedAt: Date;
  grade?: number;
  externalOrderId: string;  // Links back to commerce
}
```

---

## System 3: Payout Platform (Payment System)

**Purpose:** Handle all money GOING OUT

### Owns
- Revenue split configurations
- Payout schedules
- Creator payment accounts
- Instructor payment accounts
- Payout processing
- Payment history (outbound)
- Tax reporting (1099s, etc.)

### Does NOT Own
- Payment collection
- Order management
- Course content
- User learning progress

### Data Models
```typescript
// Payout Platform owns these
RevenueShareConfig {
  courseId: string;
  contentCreatorId: string;
  contentCreatorShare: number;    // e.g., 0.40 (40%)
  instructorSharePool: number;    // e.g., 0.30 (30%)
  platformShare: number;          // e.g., 0.30 (30%)
}

PayoutAccount {
  userId: string;
  type: 'content-creator' | 'instructor';
  payoutMethod: 'stripe-connect' | 'paypal' | 'ach';
  payoutDetails: object;
  taxInfo: TaxInfo;
}

EarnedRevenue {
  userId: string;
  role: 'content-creator' | 'instructor';
  courseId: string;
  orderId: string;
  enrollmentId: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'paid';
  confirmedAt?: Date;  // After learner completes
  paidAt?: Date;
}

Payout {
  payoutAccountId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  earnedRevenueIds: string[];  // What's included
}
```

---

## Integration Connectors

### Connector 1: Commerce → LMS (Enrollment Creation)

**Trigger:** Successful payment
**Direction:** Commerce Platform → Cadence LMS

```typescript
// Commerce Platform sends
POST https://lms.api/api/v2/connectors/enrollment-request

{
  "source": "commerce-platform",
  "apiKey": "connector-api-key",
  "payload": {
    "orderId": "ord_123",
    "orderItemId": "oi_456",
    "userId": "user_789",
    "courseId": "course_abc",
    "instructorId": "inst_def",  // If pre-assigned
    "approvalStatus": "pending", // Always pending initially
    "autoApprove": true,         // Commerce says it can be auto-approved
    "purchaseMetadata": {
      "amount": 199.00,
      "currency": "USD",
      "purchaseDate": "2025-01-14T10:00:00Z"
    }
  }
}

// LMS responds
{
  "success": true,
  "enrollmentId": "enr_xyz",
  "status": "pending",  // Even if auto-approved, starts pending
  "message": "Enrollment created, pending approval"
}
```

**LMS Processing:**
1. Validate user exists
2. Validate course exists
3. Create enrollment with status = `pending`
4. If `autoApprove: true`, run approval workflow (still creates pending first)
5. Emit `enrollment.approved` event after approval

### Connector 2: LMS → Commerce (Enrollment Status)

**Trigger:** Enrollment approved/rejected
**Direction:** Cadence LMS → Commerce Platform

```typescript
// LMS sends
POST https://commerce.api/api/v1/webhooks/enrollment-status

{
  "source": "cadence-lms",
  "event": "enrollment.approved",  // or enrollment.rejected
  "payload": {
    "enrollmentId": "enr_xyz",
    "orderId": "ord_123",
    "orderItemId": "oi_456",
    "status": "approved",
    "approvedAt": "2025-01-14T10:05:00Z",
    "approvedBy": "auto-approval" | "admin_user_id"
  }
}
```

### Connector 3: LMS → Payout (Completion Event)

**Trigger:** Learner completes course
**Direction:** Cadence LMS → Payout Platform

```typescript
// LMS sends
POST https://payout.api/api/v1/webhooks/course-completion

{
  "source": "cadence-lms",
  "event": "enrollment.completed",
  "payload": {
    "enrollmentId": "enr_xyz",
    "userId": "user_789",
    "courseId": "course_abc",
    "instructorId": "inst_def",      // Who interacted with learner
    "contentCreatorId": "creator_1", // Course author
    "completedAt": "2025-02-01T15:30:00Z",
    "grade": 92,
    "orderId": "ord_123",            // Links to commerce
    "orderItemId": "oi_456"
  }
}
```

**Payout Processing:**
1. Look up revenue share config for course
2. Calculate creator's share → add to EarnedRevenue (status: confirmed)
3. Calculate instructor's share → add to EarnedRevenue (status: confirmed)
4. Queue for next payout cycle

### Connector 4: Commerce → Payout (Revenue Ledger)

**Trigger:** Payment successful
**Direction:** Commerce Platform → Payout Platform

```typescript
// Commerce sends
POST https://payout.api/api/v1/webhooks/revenue-recorded

{
  "source": "commerce-platform",
  "event": "payment.completed",
  "payload": {
    "orderId": "ord_123",
    "orderItemId": "oi_456",
    "courseId": "course_abc",
    "contentCreatorId": "creator_1",
    "grossAmount": 199.00,
    "netAmount": 192.31,      // After payment processor fees
    "platformFee": 5.77,      // Stripe's cut
    "currency": "USD",
    "paidAt": "2025-01-14T10:00:00Z"
  }
}
```

**Payout Processing:**
1. Record revenue in ledger
2. Create pending EarnedRevenue entries (confirmed after completion)

---

## Revenue Tracking Matrix

### Per-Transaction Breakdown

| Recipient | Calculation | Confirmed When |
|-----------|-------------|----------------|
| **Payment Processor** | Fixed % (e.g., 2.9% + $0.30) | Immediately |
| **Platform (Admin)** | Configured % of net | After enrollment approved |
| **Content Creator** | Configured % of net | After learner completes |
| **Instructor** | Configured % of net | After learner completes |

### Example: $199 Course Purchase

```
Gross Amount:           $199.00
Payment Processor Fee:  -$6.07  (2.9% + $0.30)
═══════════════════════════════
Net Amount:             $192.93

Revenue Split (after completion):
├── Platform Fee (30%):     $57.88  → Confirmed on enrollment approval
├── Content Creator (40%):  $77.17  → Confirmed on completion
└── Instructor (30%):       $57.88  → Confirmed on completion
```

---

## Instructor Interaction Requirement

The Payout Platform only releases instructor payment when:

1. **Instructor is assigned** to the enrollment
2. **Learner completes** the course
3. **Interaction verified** (one of):
   - Instructor responded to at least 1 discussion post
   - Instructor graded at least 1 assignment
   - Instructor participated in live session
   - Manual admin verification

```typescript
interface InstructorInteractionRequirement {
  enrollmentId: string;
  instructorId: string;
  required: {
    discussionReplies?: number;   // Min replies required
    assignmentsGraded?: number;   // Min assignments graded
    liveSessionMinutes?: number;  // Min live time
    manualVerification?: boolean; // Admin can override
  };
  actual: {
    discussionReplies: number;
    assignmentsGraded: number;
    liveSessionMinutes: number;
    manuallyVerified: boolean;
    verifiedBy?: string;
  };
  eligible: boolean;  // Calculated
}
```

---

## Shared Services

### Authentication
- LMS owns user accounts
- Commerce & Payout use LMS SSO or shared JWT validation
- API keys for system-to-system communication

### User Sync
```typescript
// Commerce Platform caches minimal user data
interface CommerceUser {
  lmsUserId: string;
  email: string;
  name: string;
  lastSyncedAt: Date;
}
```

### Course Sync
```typescript
// Commerce Platform caches course catalog data
interface CatalogCourse {
  lmsCourseId: string;
  title: string;
  description: string;
  contentCreatorId: string;
  thumbnail: string;
  lastSyncedAt: Date;
  // Commerce adds:
  pricing: PricingInfo;
  availability: AvailabilityInfo;
}
```

---

## Deployment Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ commerce.app.io │    │   lms.app.io    │    │  payout.app.io  │
│   (React SPA)   │    │   (React SPA)   │    │   (React SPA)   │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ commerce-api    │◄──►│  cadence-api    │◄──►│   payout-api    │
│   (NestJS)      │    │   (Express)     │    │    (NestJS)     │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  commerce_db    │    │   cadence_db    │    │   payout_db     │
│   (Postgres)    │    │   (MongoDB)     │    │   (Postgres)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Repository Structure
```
github.com/cadence/
├── cadence-lms-api        # Current: Learning management
├── cadence-lms-ui         # Current: LMS frontend
├── cadence-commerce-api   # NEW: Billing/orders
├── cadence-commerce-ui    # NEW: Catalog/checkout
├── cadence-payout-api     # NEW: Revenue/payouts
├── cadence-payout-ui      # NEW: Creator/instructor dashboard
└── cadence-shared         # Shared types, auth utils
```

---

## Summary

| Concern | System | Money Flow |
|---------|--------|------------|
| Selling courses | Commerce | IN |
| Learning courses | LMS | - |
| Paying creators | Payout | OUT |
| Paying instructors | Payout | OUT |

**Key Principle:** Each system is independently deployable and scalable. They communicate via well-defined webhooks and API connectors.

---

## Related Documents

- [BILLING_REGISTRATION_SYSTEM_SPEC.md](BILLING_REGISTRATION_SYSTEM_SPEC.md) - Commerce Platform details
- [INSTRUCTOR_CONTENT_PAYMENT_SYSTEM.md](INSTRUCTOR_CONTENT_PAYMENT_SYSTEM.md) - Payout Platform details
- [BILLING_USER_STORIES.md](BILLING_USER_STORIES.md) - User stories (needs split by system)
