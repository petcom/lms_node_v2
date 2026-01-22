# Commerce-LMS Integration Specification

**Version:** 1.0.0  
**Status:** DRAFT - Pending API Team Review  
**Date:** 2026-01-19  
**Authors:** Architecture Team  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Domain Boundaries](#3-domain-boundaries)
4. [Role & Permission Model](#4-role--permission-model)
5. [Integration Points](#5-integration-points)
6. [API Contracts](#6-api-contracts)
7. [Data Models](#7-data-models)
8. [Sequence Diagrams](#8-sequence-diagrams)
9. [Security Considerations](#9-security-considerations)
10. [Migration Path](#10-migration-path)
11. [Open Questions](#11-open-questions)

---

## 1. Executive Summary

### 1.1 Purpose

This specification defines the integration architecture between the Commerce platform and the LMS (Learning Management System). The design prioritizes **separation of concerns** where each system owns its domain-specific data and logic.

### 1.2 Key Principles

| Principle | Description |
|-----------|-------------|
| **Single Identity Source** | Commerce owns user identity (credentials, sessions, SSO) |
| **Domain Isolation** | Each system owns its domain data; no cross-domain logic |
| **Opaque References** | Systems pass IDs without understanding internal structures |
| **Event-Driven Integration** | Async events for loose coupling where possible |
| **API-First Communication** | All integration via documented API contracts |

### 1.3 Scope

**In Scope:**
- SSO authentication flow
- Product catalog synchronization
- Purchase → Enrollment entitlement flow
- Revenue event flow (completions → payouts)
- Service-to-service authentication

**Out of Scope:**
- Internal Commerce architecture (see COMMERCE_ARCHITECTURE.md)
- Internal LMS architecture (see existing LMS docs)
- Third-party payment processor integration (Stripe, etc.)
- Payout system architecture

---

## 2. System Architecture

### 2.1 High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           COMMERCE DOMAIN                                    │
│                   (Identity, Purchasing, Payments)                          │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │   Identity  │  │   Catalog   │  │   Orders    │  │   Payouts   │       │
│  │   Service   │  │   Service   │  │   Service   │  │   Service   │       │
│  │             │  │             │  │             │  │             │       │
│  │ • Users     │  │ • Products  │  │ • Cart      │  │ • Balances  │       │
│  │ • Passwords │  │ • Pricing   │  │ • Checkout  │  │ • Transfers │       │
│  │ • Sessions  │  │ • Bundles   │  │ • Payments  │  │ • Statements│       │
│  │ • SSO       │  │             │  │ • Refunds   │  │             │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                                             │
│  Commerce Roles: [purchaser, payee, commerce-admin]                        │
└─────────────────────────────────────────────────────────────────────────────┘
          │                    ▲                              │
          │ SSO Token          │ Product Catalog              │ Entitlement
          │ Validation         │ Sync                         │ Grants
          ▼                    │                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LMS DOMAIN                                      │
│              (Learning, Teaching, Administration)                           │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │ Departments │  │   Content   │  │ Enrollments │  │   Revenue   │       │
│  │   Service   │  │   Service   │  │   Service   │  │   Events    │       │
│  │             │  │             │  │             │  │             │       │
│  │ • Depts     │  │ • Courses   │  │ • Learners  │  │ • Calc rev  │       │
│  │ • Programs  │  │ • Lessons   │  │ • Progress  │  │ • Split %   │       │
│  │ • Hierarchy │  │ • Exams     │  │ • Grades    │  │ • Emit to   │       │
│  │             │  │             │  │             │  │   Commerce  │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                                             │
│  LMS Roles: [learner, instructor, content-admin, dept-admin, system-admin] │
└─────────────────────────────────────────────────────────────────────────────┘
          │                                                   ▲
          │ Revenue Events                                    │
          │ (credits/debits)                                  │
          ▼                                                   │
┌─────────────────────────────────────────────────────────────────────────────┐
│                           COMMERCE DOMAIN                                    │
│                         (Payout Processing)                                 │
│                                                                             │
│  • Receives revenue split events from LMS                                   │
│  • Credits instructor payout balances                                       │
│  • Processes payout transfers                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Integration Flow Summary

| Flow | Direction | Trigger | Purpose |
|------|-----------|---------|---------|
| SSO Validation | Commerce → LMS | User accesses LMS | Authenticate user |
| Catalog Sync | LMS → Commerce | Course published/updated | Make products available |
| Entitlement Grant | Commerce → LMS | Purchase completed | Grant learning access |
| Revenue Event | LMS → Commerce | Sale completed | Credit instructor balance |

---

## 3. Domain Boundaries

### 3.1 Commerce Domain Ownership

Commerce **owns and is authoritative for:**

| Data | Description |
|------|-------------|
| User Identity | Email, password hash, MFA settings |
| Sessions | Access tokens, refresh tokens, SSO sessions |
| Commerce Roles | purchaser, payee, commerce-admin |
| Products | Catalog items (synced from external sources) |
| Pricing | Product prices, discounts, bundles |
| Orders | Order records, line items, status |
| Payments | Payment records, processor references |
| Refunds | Refund records, status |
| Payout Balances | Available/pending balances per payee |
| Payout Transfers | Transfer records to bank accounts |

Commerce **does NOT own:**

- LMS departments, programs, courses (receives as products)
- LMS roles (instructor, content-admin, etc.)
- Learning progress, grades, completions
- Revenue split percentages (receives from LMS)

### 3.2 LMS Domain Ownership

LMS **owns and is authoritative for:**

| Data | Description |
|------|-------------|
| Departments | Organizational hierarchy |
| Programs | Degree/certificate programs |
| Courses | Learning content containers |
| Classes | Course instances with schedules |
| Content | Lessons, exams, SCORM packages |
| LMS User Types | learner, staff, global-admin |
| LMS Roles | instructor, content-admin, dept-admin, etc. |
| Department Memberships | User ↔ Department ↔ Role assignments |
| Enrollments | Learner access to programs/courses/classes |
| Progress | Completion status, grades, attempts |
| Revenue Configuration | Split percentages per course/instructor |

LMS **does NOT own:**

- User credentials (delegates to Commerce)
- Payment processing
- Product pricing (can suggest, Commerce decides)
- Payout balances and transfers

### 3.3 Shared References

| Reference | Created By | Used By | Purpose |
|-----------|------------|---------|---------|
| `commerceUserId` | Commerce | LMS | Link LMS user to Commerce identity |
| `externalProductId` | LMS | Commerce | Link Commerce product to LMS course/program |
| `orderId` | Commerce | LMS | Track which order granted an enrollment |
| `enrollmentId` | LMS | Commerce | Confirm entitlement was granted |

---

## 4. Role & Permission Model

### 4.1 Commerce Roles

Commerce maintains a **simple, flat role model** focused on purchasing and payouts:

```typescript
enum CommerceRole {
  /**
   * Can browse catalog, add to cart, make purchases.
   * All authenticated users have this role by default.
   */
  PURCHASER = 'purchaser',
  
  /**
   * Can receive payouts. Granted when LMS indicates user
   * is an instructor or content creator with revenue share.
   */
  PAYEE = 'payee',
  
  /**
   * Can manage orders, process refunds, view all transactions.
   * Requires escalation for sensitive operations.
   */
  COMMERCE_ADMIN = 'commerce-admin'
}
```

### 4.2 LMS Roles

LMS maintains its **existing complex role model** (unchanged):

```typescript
// User types (top-level classification)
enum LMSUserType {
  LEARNER = 'learner',
  STAFF = 'staff',
  GLOBAL_ADMIN = 'global-admin'
}

// Staff roles within departments
enum LMSStaffRole {
  INSTRUCTOR = 'instructor',
  CONTENT_ADMIN = 'content-admin',
  DEPARTMENT_ADMIN = 'department-admin',
  BILLING_ADMIN = 'billing-admin'
}

// Access rights (granular permissions)
// e.g., 'content:courses:manage', 'enrollment:department:read'
```

### 4.3 Role Mapping

Commerce does not understand LMS roles. Instead, LMS tells Commerce which users should have Commerce roles:

| LMS Condition | Commerce Role Granted |
|---------------|----------------------|
| User exists | `purchaser` (default) |
| User is instructor with revenue share | `payee` |
| User has `billing-admin` role | `commerce-admin` (optional) |

This mapping is triggered via API when:
- LMS assigns instructor to a course with revenue share
- LMS removes instructor from revenue-generating courses

---

## 5. Integration Points

### 5.1 SSO: Commerce → LMS

**Purpose:** Allow users who logged into Commerce to seamlessly access LMS.

**Flow:**
1. User authenticates with Commerce, receives `accessToken`
2. User clicks link to LMS (e.g., "Go to My Courses")
3. LMS receives request with Commerce `accessToken`
4. LMS calls Commerce to validate token
5. Commerce returns user identity
6. LMS creates/updates local user record
7. LMS establishes local session (or trusts Commerce token)

**Token Validation Options:**

| Option | Pros | Cons |
|--------|------|------|
| **A: LMS trusts Commerce JWT** | Fast, no network call | Requires shared secret, harder to revoke |
| **B: LMS calls Commerce API** | Real-time validation | Latency, Commerce must be available |
| **C: Commerce issues LMS-specific token** | Clean separation | Extra token exchange step |

**Recommendation:** Option B for initial implementation, with short-lived token cache.

### 5.2 Catalog Sync: LMS → Commerce

**Purpose:** Make LMS courses/programs available for purchase in Commerce.

**Trigger Events:**
- Course published
- Course price changed (suggested price)
- Course unpublished/archived
- Program structure changed

**Sync Strategy:**

| Strategy | Description | Recommendation |
|----------|-------------|----------------|
| **Push (Webhook)** | LMS sends updates to Commerce | ✅ Primary |
| **Pull (Polling)** | Commerce fetches from LMS periodically | Backup/reconciliation |

**Product Data:**
- `externalId`: LMS course/program ID
- `externalSource`: "lms"
- `type`: "course" | "program" | "class"
- `name`, `description`: Display info
- `suggestedPrice`: LMS recommendation (Commerce can override)
- `metadata`: Opaque LMS data (department, duration, etc.)

### 5.3 Entitlement Grant: Commerce → LMS

**Purpose:** After purchase, grant learner access to courses/programs.

**Trigger:** Order status changes to `completed` (payment successful)

**Flow:**
1. Commerce payment succeeds
2. Commerce sends entitlement grant request to LMS
3. LMS creates/updates Learner record
4. LMS creates Enrollment record
5. LMS returns confirmation
6. Commerce marks entitlement as granted

**Failure Handling:**
- Retry with exponential backoff
- Dead letter queue for manual intervention
- Reconciliation job to catch missed grants

### 5.4 Revenue Events: LMS → Commerce

**Purpose:** Credit instructor payout balances when courses are sold.

**Trigger:** Commerce sends entitlement grant (includes order/payment info)

**Flow:**
1. Commerce grants entitlement (includes `orderId`, `amount`)
2. LMS looks up revenue configuration for the course
3. LMS calculates splits (e.g., 70% instructor, 30% platform)
4. LMS sends revenue event to Commerce
5. Commerce credits instructor's payout balance
6. Commerce records platform revenue

**Split Configuration (LMS-owned):**
```typescript
CourseRevenueConfig {
  courseId: ObjectId,
  instructorUserId: ObjectId,      // LMS user ID
  instructorCommerceUserId: string, // Commerce user ID (for payout)
  instructorSplit: 0.70,           // 70% to instructor
  platformSplit: 0.30,             // 30% to platform
  effectiveDate: Date,
  // Supports historical tracking for split changes
}
```

---

## 6. API Contracts

### 6.1 Commerce APIs (Called by LMS)

#### 6.1.1 Token Validation

```typescript
/**
 * POST /api/v1/auth/validate-token
 * 
 * Validates a Commerce access token and returns user identity.
 * Called by LMS during SSO flow.
 */
ValidateTokenRequest {
  token: string;                    // Commerce access token
}

ValidateTokenResponse {
  valid: boolean;
  user?: {
    id: string;                     // Commerce user ID
    email: string;
    commerceRoles: CommerceRole[];
  };
  error?: {
    code: 'INVALID_TOKEN' | 'EXPIRED_TOKEN' | 'REVOKED_TOKEN';
    message: string;
  };
}
```

#### 6.1.2 Catalog Sync (Webhook Receiver)

```typescript
/**
 * POST /api/v1/catalog/sync
 * 
 * Receives product catalog updates from LMS.
 * Called by LMS when courses/programs are published or updated.
 */
CatalogSyncRequest {
  source: 'lms';
  idempotencyKey: string;           // Prevent duplicate processing
  products: Array<{
    action: 'upsert' | 'archive';
    externalId: string;             // LMS course/program ID
    type: 'course' | 'program' | 'class';
    name: string;
    description?: string;
    suggestedPrice: number;         // Commerce can override
    currency: string;               // ISO 4217 (e.g., 'USD')
    metadata?: {
      departmentId?: string;        // Opaque to Commerce
      programId?: string;
      durationWeeks?: number;
      thumbnailUrl?: string;
      [key: string]: unknown;
    };
  }>;
  signature: string;                // HMAC-SHA256 for verification
}

CatalogSyncResponse {
  success: boolean;
  processed: number;
  results: Array<{
    externalId: string;
    productId: string;              // Commerce product ID
    status: 'created' | 'updated' | 'archived' | 'failed';
    error?: string;
  }>;
}
```

#### 6.1.3 Revenue Event (Webhook Receiver)

```typescript
/**
 * POST /api/v1/revenue/events
 * 
 * Receives revenue split events from LMS.
 * Called by LMS after entitlement is granted and split is calculated.
 */
RevenueEventRequest {
  source: 'lms';
  idempotencyKey: string;
  events: Array<{
    eventId: string;                // LMS-generated unique ID
    type: 'course_sale' | 'program_sale' | 'subscription_renewal';
    orderId: string;                // Original Commerce order ID
    productExternalId: string;      // LMS course/program ID
    totalAmount: number;
    currency: string;
    splits: Array<{
      payeeUserId: string;          // Commerce user ID
      amount: number;
      reason: 'instructor_share' | 'platform_fee' | 'affiliate' | 'other';
      description?: string;
    }>;
    occurredAt: string;             // ISO 8601 timestamp
  }>;
  signature: string;
}

RevenueEventResponse {
  success: boolean;
  processed: number;
  results: Array<{
    eventId: string;
    status: 'processed' | 'duplicate' | 'failed';
    error?: string;
  }>;
}
```

#### 6.1.4 Grant Payee Role

```typescript
/**
 * POST /api/v1/users/:userId/roles
 * 
 * Grants Commerce roles to a user.
 * Called by LMS when instructor is assigned to a revenue-generating course.
 */
GrantRoleRequest {
  role: 'payee';
  reason: string;                   // Audit trail
  metadata?: {
    lmsUserId: string;
    courseIds?: string[];
  };
}

GrantRoleResponse {
  success: boolean;
  user: {
    id: string;
    commerceRoles: CommerceRole[];
  };
}
```

### 6.2 LMS APIs (Called by Commerce)

#### 6.2.1 SSO User Lookup

```typescript
/**
 * GET /api/v2/auth/sso/user
 * 
 * Returns LMS user info for a Commerce user.
 * Called by Commerce to check if user exists in LMS.
 */
Request Headers {
  'Authorization': 'Bearer <service-token>'
  'X-Commerce-User-Id': string
}

SSOUserResponse {
  success: boolean;
  data: {
    exists: boolean;
    lmsUserId?: string;
    userTypes?: LMSUserType[];
    hasActiveEnrollments?: boolean;
  };
}
```

#### 6.2.2 Entitlement Grant (Webhook Receiver)

```typescript
/**
 * POST /api/v2/webhooks/commerce/entitlement
 * 
 * Grants learning access after purchase.
 * Called by Commerce when order is completed.
 */
EntitlementGrantRequest {
  event: 'entitlement.granted' | 'entitlement.revoked';
  idempotencyKey: string;
  orderId: string;                  // Commerce order ID
  commerceUserId: string;           // Commerce user ID
  email: string;                    // For user creation if needed
  items: Array<{
    productType: 'course' | 'program' | 'class';
    externalId: string;             // LMS course/program/class ID
    grantedAt: string;              // ISO 8601
    expiresAt?: string;             // For time-limited access
    metadata?: {
      orderId: string;
      transactionId: string;
      amount: number;
      currency: string;
    };
  }>;
  signature: string;
}

EntitlementGrantResponse {
  success: boolean;
  results: Array<{
    externalId: string;
    status: 'granted' | 'already_enrolled' | 'failed';
    enrollmentId?: string;          // LMS enrollment ID
    error?: string;
  }>;
  lmsUserId: string;                // For Commerce to store reference
}
```

#### 6.2.3 Product Catalog Export

```typescript
/**
 * GET /api/v2/commerce/catalog
 * 
 * Returns publishable courses/programs for Commerce catalog.
 * Called by Commerce for initial sync or reconciliation.
 */
Request Headers {
  'Authorization': 'Bearer <service-token>'
}

Query Parameters {
  updatedSince?: string;            // ISO 8601, for incremental sync
  type?: 'course' | 'program' | 'class';
  departmentId?: string;
  limit?: number;
  cursor?: string;
}

CatalogExportResponse {
  success: boolean;
  data: {
    products: Array<{
      externalId: string;
      type: 'course' | 'program' | 'class';
      name: string;
      description: string;
      suggestedPrice: number;
      currency: string;
      status: 'published' | 'archived';
      metadata: {
        departmentId: string;
        departmentName: string;
        instructorName?: string;
        durationWeeks?: number;
        thumbnailUrl?: string;
      };
      updatedAt: string;
    }>;
    pagination: {
      nextCursor?: string;
      hasMore: boolean;
    };
  };
}
```

### 6.3 Service-to-Service Authentication

Both systems authenticate service calls using **signed requests**:

```typescript
/**
 * Service Token Request
 * 
 * Commerce and LMS exchange long-lived service credentials
 * for short-lived service tokens.
 */

// Commerce requesting LMS service token
POST /api/v2/auth/service-token
{
  clientId: 'commerce-service',
  clientSecret: '<secret>',
  scope: ['entitlements:write', 'catalog:read']
}

// Response
{
  accessToken: '<jwt>',
  expiresIn: 3600,
  scope: ['entitlements:write', 'catalog:read']
}
```

**Webhook Signature Verification:**

```typescript
// Sender generates signature
const payload = JSON.stringify(requestBody);
const signature = crypto
  .createHmac('sha256', sharedSecret)
  .update(payload)
  .digest('hex');

// Request includes header
'X-Webhook-Signature': `sha256=${signature}`

// Receiver verifies
const expectedSignature = crypto
  .createHmac('sha256', sharedSecret)
  .update(rawBody)
  .digest('hex');

if (signature !== `sha256=${expectedSignature}`) {
  throw new Error('Invalid webhook signature');
}
```

---

## 7. Data Models

### 7.1 Commerce Data Models

```typescript
/**
 * Commerce User
 * Owns identity and credentials
 */
interface CommerceUser {
  id: string;                       // Primary key
  email: string;                    // Unique
  passwordHash: string;
  mfaEnabled: boolean;
  mfaSecret?: string;
  
  commerceRoles: CommerceRole[];
  
  // External references (opaque)
  lmsUserId?: string;               // Link to LMS user
  
  // Payment info
  stripeCustomerId?: string;        // For purchases
  stripeConnectAccountId?: string;  // For payouts
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

/**
 * Commerce Product
 * Synced from external sources (LMS)
 */
interface CommerceProduct {
  id: string;                       // Commerce product ID
  externalId: string;               // Source system ID (LMS course ID)
  externalSource: 'lms' | 'other';
  
  type: 'course' | 'program' | 'class' | 'subscription';
  name: string;
  description?: string;
  
  // Pricing (Commerce can override suggested)
  suggestedPrice: number;
  price: number;                    // Actual sale price
  currency: string;
  
  // Status
  status: 'active' | 'archived';
  
  // Pass-through metadata from source
  metadata: Record<string, unknown>;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Payout Balance
 * Tracks amounts owed to payees
 */
interface PayoutBalance {
  userId: string;                   // Commerce user ID
  availableBalance: number;         // Ready for payout
  pendingBalance: number;           // Awaiting clearing period
  currency: string;
  lastUpdatedAt: Date;
}

/**
 * Revenue Ledger Entry
 * Immutable record of revenue events
 */
interface RevenueLedgerEntry {
  id: string;
  eventId: string;                  // From LMS, for idempotency
  orderId: string;
  productId: string;
  
  type: 'credit' | 'debit';
  amount: number;
  currency: string;
  
  payeeUserId?: string;             // For instructor credits
  reason: string;
  
  createdAt: Date;
}
```

### 7.2 LMS Data Models (Additions/Changes)

```typescript
/**
 * LMS User
 * Updated to reference Commerce identity
 */
interface User {
  _id: ObjectId;
  
  // Commerce integration (NEW)
  commerceUserId?: string;          // Link to Commerce identity
  
  // Existing fields
  email: string;                    // Cached from Commerce
  userTypes: LMSUserType[];
  isActive: boolean;
  
  // NO password fields - Commerce owns auth
  // passwordHash: REMOVED
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Course Revenue Configuration (NEW)
 * Defines revenue splits for a course
 */
interface CourseRevenueConfig {
  _id: ObjectId;
  courseId: ObjectId;
  
  // Revenue recipients
  instructorUserId: ObjectId;       // LMS user ID
  instructorCommerceUserId: string; // Commerce user ID (for payout)
  
  // Split percentages (must sum to 1.0)
  instructorSplit: number;          // e.g., 0.70
  platformSplit: number;            // e.g., 0.30
  
  // Validity period (for historical tracking)
  effectiveDate: Date;
  endDate?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Enrollment
 * Updated to track Commerce order
 */
interface Enrollment {
  _id: ObjectId;
  learnerId: ObjectId;
  
  // What they're enrolled in
  programId?: ObjectId;
  courseId?: ObjectId;
  classId?: ObjectId;
  
  // Commerce integration (NEW)
  source: 'manual' | 'commerce' | 'import';
  commerceOrderId?: string;         // Links to Commerce order
  commerceEntitlementId?: string;
  
  // Access control
  grantedAt: Date;
  expiresAt?: Date;
  
  // Status
  status: 'active' | 'completed' | 'expired' | 'revoked';
  
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 8. Sequence Diagrams

### 8.1 User Registration & First Purchase

```
┌────────┐     ┌──────────┐     ┌─────────┐
│  User  │     │ Commerce │     │   LMS   │
└───┬────┘     └────┬─────┘     └────┬────┘
    │               │                │
    │ 1. Register   │                │
    │──────────────>│                │
    │               │                │
    │ 2. Account    │                │
    │   created     │                │
    │<──────────────│                │
    │               │                │
    │ 3. Browse     │                │
    │   catalog     │                │
    │──────────────>│                │
    │               │                │
    │ 4. Products   │                │
    │   (from LMS)  │                │
    │<──────────────│                │
    │               │                │
    │ 5. Purchase   │                │
    │   course      │                │
    │──────────────>│                │
    │               │                │
    │               │ 6. Grant       │
    │               │    entitlement │
    │               │───────────────>│
    │               │                │
    │               │ 7. Create      │
    │               │    enrollment  │
    │               │<───────────────│
    │               │                │
    │               │ 8. Revenue     │
    │               │    event       │
    │               │<───────────────│
    │               │                │
    │ 9. Order      │                │
    │   confirmed   │                │
    │<──────────────│                │
    │               │                │
```

### 8.2 SSO: Commerce to LMS

```
┌────────┐     ┌──────────┐     ┌─────────┐
│  User  │     │ Commerce │     │   LMS   │
└───┬────┘     └────┬─────┘     └────┬────┘
    │               │                │
    │ 1. Logged in  │                │
    │   at Commerce │                │
    │               │                │
    │ 2. Click "My  │                │
    │   Courses"    │                │
    │──────────────>│                │
    │               │                │
    │ 3. Redirect   │                │
    │   to LMS      │                │
    │<──────────────│                │
    │               │                │
    │ 4. Access LMS │                │
    │   with token  │                │
    │──────────────────────────────>│
    │               │                │
    │               │ 5. Validate    │
    │               │    token       │
    │               │<───────────────│
    │               │                │
    │               │ 6. User info   │
    │               │───────────────>│
    │               │                │
    │               │                │ 7. Create/update
    │               │                │    local user
    │               │                │
    │ 8. LMS        │                │
    │   session     │                │
    │<──────────────────────────────│
    │               │                │
```

### 8.3 Instructor Creates Course, Receives Payout

```
┌────────────┐     ┌─────────┐     ┌──────────┐
│ Instructor │     │   LMS   │     │ Commerce │
└─────┬──────┘     └────┬────┘     └────┬─────┘
      │                 │               │
      │ 1. Login (SSO)  │               │
      │────────────────────────────────>│
      │                 │               │
      │ 2. Redirect     │               │
      │<────────────────────────────────│
      │                 │               │
      │ 3. Create       │               │
      │   course        │               │
      │────────────────>│               │
      │                 │               │
      │ 4. Set price    │               │
      │   & publish     │               │
      │────────────────>│               │
      │                 │               │
      │                 │ 5. Sync       │
      │                 │    product    │
      │                 │──────────────>│
      │                 │               │
      │                 │ 6. Grant      │
      │                 │    payee role │
      │                 │──────────────>│
      │                 │               │
      │                 │               │
      │     ... time passes, students buy course ...
      │                 │               │
      │                 │ 7. Revenue    │
      │                 │    events     │
      │                 │──────────────>│
      │                 │               │
      │ 8. View payout  │               │
      │   balance       │               │
      │────────────────────────────────>│
      │                 │               │
      │ 9. $1,523.40    │               │
      │   available     │               │
      │<────────────────────────────────│
      │                 │               │
```

---

## 9. Security Considerations

### 9.1 Authentication & Authorization

| Concern | Mitigation |
|---------|------------|
| Token theft | Short-lived access tokens (1hr), secure refresh token rotation |
| Service impersonation | Signed webhooks with HMAC-SHA256 |
| Privilege escalation | Commerce roles separate from LMS roles |
| Cross-site attacks | CORS configuration, CSRF tokens |
| Replay attacks | Idempotency keys, timestamp validation |

### 9.2 Data Protection

| Concern | Mitigation |
|---------|------------|
| PII exposure | Minimal data in webhooks, no passwords cross-system |
| Payment data | PCI compliance via Stripe tokenization |
| Audit trail | Immutable ledger entries, webhook logs |
| Data breach | Encryption at rest, TLS in transit |

### 9.3 Webhook Security

```typescript
// Required headers for all webhooks
{
  'X-Webhook-Signature': 'sha256=<hmac>',
  'X-Webhook-Timestamp': '<unix-timestamp>',
  'X-Idempotency-Key': '<uuid>',
  'X-Source-Service': 'commerce' | 'lms'
}

// Validation rules
1. Signature must match HMAC of body
2. Timestamp must be within 5 minutes
3. Idempotency key must be unique (dedup window: 24hr)
```

---

## 10. Migration Path

### 10.1 Current State

- LMS owns user identity (credentials stored in LMS)
- No Commerce system exists
- Users authenticate directly with LMS

### 10.2 Migration Phases

#### Phase 1: Commerce Foundation (No Auth Migration)

1. Deploy Commerce system
2. Commerce creates NEW users only
3. LMS continues to own existing users
4. Catalog sync: LMS → Commerce
5. Entitlement flow: Commerce → LMS

**Users:**
- New users register at Commerce
- Existing users continue using LMS auth

#### Phase 2: SSO Bridge

1. Implement token validation endpoint in Commerce
2. LMS can validate Commerce tokens
3. New users get Commerce tokens
4. Existing users still have LMS tokens

#### Phase 3: Identity Migration

1. Migrate existing LMS users to Commerce
2. LMS removes password storage
3. All auth flows through Commerce
4. LMS becomes pure OAuth client

```typescript
// Migration script (simplified)
for (user of lmsUsers) {
  // Create Commerce user
  commerceUser = await commerce.createUser({
    email: user.email,
    passwordHash: user.passwordHash,  // Migrate hash directly
    lmsUserId: user._id
  });
  
  // Update LMS user
  await lms.updateUser(user._id, {
    commerceUserId: commerceUser.id,
    passwordHash: null  // Remove password
  });
}
```

### 10.3 Rollback Plan

Each phase can be rolled back:
- Phase 1: Remove Commerce, no user impact
- Phase 2: LMS falls back to own auth
- Phase 3: Restore password hashes to LMS (maintain backup)

---

## 11. Open Questions

### 11.1 For API Team Review

| # | Question | Options | Recommendation |
|---|----------|---------|----------------|
| 1 | Should LMS trust Commerce JWT directly or always validate via API? | A) Trust JWT, B) Always validate, C) Cache validation | B initially, C for performance |
| 2 | How should Commerce handle LMS downtime during entitlement grant? | A) Fail order, B) Queue and retry, C) Grant with reconciliation | B with C as backup |
| 3 | Should revenue events be real-time or batched? | A) Real-time webhook, B) Hourly batch, C) Daily batch | A for UX, B acceptable |
| 4 | Who sets the final product price? | A) LMS only, B) Commerce only, C) LMS suggests, Commerce decides | C |
| 5 | Should existing LMS auth endpoints remain during migration? | A) Remove immediately, B) Deprecate with timeline, C) Keep indefinitely | B |

### 11.2 For Business Decision

| # | Question | Impact |
|---|----------|--------|
| 1 | What is the default revenue split (instructor vs platform)? | Revenue model |
| 2 | Can instructors set their own prices? | Pricing flexibility |
| 3 | Should learners be able to request refunds directly? | Support workflow |
| 4 | What is the payout schedule (weekly, monthly)? | Cash flow |

### 11.3 Technical Debt to Address

| Item | Current State | Required Change |
|------|---------------|-----------------|
| LMS User model | Stores passwordHash | Remove, add commerceUserId |
| LMS auth endpoints | Full auth implementation | Convert to SSO client |
| LMS session management | Own JWT issuance | Validate Commerce tokens |

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Commerce** | The purchasing, payments, and payout system |
| **LMS** | Learning Management System - courses, progress, administration |
| **Entitlement** | Permission to access a course/program, granted after purchase |
| **Payee** | User who can receive payouts (instructors) |
| **Revenue Event** | Record of money earned and split between parties |
| **SSO** | Single Sign-On - one login for multiple systems |

---

## Appendix B: Related Documents

- [COMMERCE_ARCHITECTURE.md](./COMMERCE_ARCHITECTURE.md) - Internal Commerce design
- [LMS API Contracts](/contracts/README.md) - LMS endpoint specifications
- [LMS Role System](/README-ROLE-SYSTEM-V2.md) - LMS roles and permissions

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-19 | Architecture Team | Initial draft |
