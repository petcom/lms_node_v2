# Billing & Registration User Stories

**Date:** 2026-01-14  
**Status:** 📋 DRAFT  
**Parent Doc:** [BILLING_REGISTRATION_SYSTEM_SPEC.md](./BILLING_REGISTRATION_SYSTEM_SPEC.md)

---

## Story Hierarchy

```
Epic (E-XXX)
  └── Feature (F-XXX)
       └── User Story (US-XXX)
            └── Task (T-XXX)
```

---

## Epic Summary

| Epic ID | Epic Name | Priority | Status |
|---------|-----------|----------|--------|
| E-001 | Catalog & Pricing Management | High | Not Started |
| E-002 | Shopping Cart & Checkout | High | Not Started |
| E-003 | Payment Processing | Critical | Not Started |
| E-004 | Registration & Approval | High | Not Started |
| E-005 | Auto-Enrollment | High | Not Started |
| E-006 | Progress & Completion Tracking | High | Not Started |
| E-007 | Certificate Generation | High | Not Started |
| E-008 | Subscriptions & Recurring Billing | Medium | Not Started |
| E-009 | Reporting & Analytics | Medium | Not Started |

---

## E-001: Catalog & Pricing Management

### F-001.1: Course Pricing Configuration

#### US-001: Set Course Price
> **As a** billing-admin  
> **I want to** set a price for a published course  
> **So that** learners can purchase access

**Acceptance Criteria:**
- [ ] Can set price in cents (avoid floating point)
- [ ] Can specify currency (USD default)
- [ ] Can set effective date range
- [ ] Price only applies to published courses
- [ ] Previous pricing is archived, not deleted

**Tasks:**
| ID | Task | Est. | Assignee |
|----|------|------|----------|
| T-001-01 | Create CoursePricing model/schema | 2h | |
| T-001-02 | Create POST /api/v2/admin/pricing endpoint | 2h | |
| T-001-03 | Create GET /api/v2/admin/pricing endpoint | 1h | |
| T-001-04 | Add pricing validation (positive amount, valid dates) | 1h | |
| T-001-05 | Write unit tests for pricing service | 2h | |
| T-001-06 | Write integration tests | 2h | |

---

#### US-002: Create Program Bundle Pricing
> **As a** billing-admin  
> **I want to** create a program with bundle pricing  
> **So that** learners get a discount for buying multiple courses

**Acceptance Criteria:**
- [ ] Can select multiple courses for the bundle
- [ ] Bundle price is less than sum of individual prices
- [ ] Shows "You save $X" calculation
- [ ] Courses can be in multiple bundles
- [ ] Bundle maintains course order/sequence

**Tasks:**
| ID | Task | Est. | Assignee |
|----|------|------|----------|
| T-002-01 | Create ProgramBundle model (or extend Program) | 3h | |
| T-002-02 | Add bundled pricing field to CoursePricing | 1h | |
| T-002-03 | Create bundle CRUD API | 3h | |
| T-002-04 | Calculate savings display | 1h | |
| T-002-05 | Tests | 2h | |

---

#### US-003: Manage Discount Codes
> **As a** billing-admin  
> **I want to** create discount codes  
> **So that** I can run promotions

**Acceptance Criteria:**
- [ ] Create percentage or fixed amount discounts
- [ ] Set usage limits (total uses, per-user uses)
- [ ] Set validity date range
- [ ] Restrict to specific courses/programs
- [ ] Set minimum purchase amount
- [ ] View usage statistics

**Tasks:**
| ID | Task | Est. | Assignee |
|----|------|------|----------|
| T-003-01 | Create DiscountCode model | 2h | |
| T-003-02 | Create discount CRUD API | 3h | |
| T-003-03 | Implement discount validation logic | 2h | |
| T-003-04 | Track discount usage | 1h | |
| T-003-05 | Tests | 2h | |

---

### F-001.2: Public Catalog

#### US-004: Browse Course Catalog
> **As a** learner  
> **I want to** browse available courses  
> **So that** I can find courses to purchase

**Acceptance Criteria:**
- [ ] See all published courses with active pricing
- [ ] Filter by department/category
- [ ] Search by keyword
- [ ] See price displayed
- [ ] See course thumbnail and description
- [ ] Works without authentication

**Tasks:**
| ID | Task | Est. | Assignee |
|----|------|------|----------|
| T-004-01 | Create GET /api/v2/catalog/courses endpoint | 2h | |
| T-004-02 | Join with CoursePricing for price data | 1h | |
| T-004-03 | Add filtering (department, category, search) | 2h | |
| T-004-04 | Add pagination | 1h | |
| T-004-05 | Tests | 2h | |

---

#### US-005: View Course Details
> **As a** learner  
> **I want to** view course details and pricing  
> **So that** I can decide to purchase

**Acceptance Criteria:**
- [ ] See full course description
- [ ] See instructor info
- [ ] See module/lesson outline (without content)
- [ ] See price clearly
- [ ] See "Add to Cart" button
- [ ] See reviews/ratings (if available)

**Tasks:**
| ID | Task | Est. | Assignee |
|----|------|------|----------|
| T-005-01 | Create GET /api/v2/catalog/courses/:id | 2h | |
| T-005-02 | Include limited module info (titles only) | 1h | |
| T-005-03 | Include pricing and "already owned" flag | 1h | |
| T-005-04 | Tests | 1h | |

---

#### US-006: View Program Details
> **As a** learner  
> **I want to** view program details with included courses  
> **So that** I can evaluate the bundle value

**Acceptance Criteria:**
- [ ] See program description
- [ ] See list of included courses
- [ ] See bundle price vs individual total
- [ ] See savings amount
- [ ] See estimated completion time

**Tasks:**
| ID | Task | Est. | Assignee |
|----|------|------|----------|
| T-006-01 | Create GET /api/v2/catalog/programs/:id | 2h | |
| T-006-02 | Calculate individual total vs bundle | 1h | |
| T-006-03 | Aggregate course metadata | 1h | |
| T-006-04 | Tests | 1h | |

---

## E-002: Shopping Cart & Checkout

### F-002.1: Cart Management

#### US-007: Add Course to Cart
> **As a** learner  
> **I want to** add a course to my cart  
> **So that** I can purchase it later

**Acceptance Criteria:**
- [ ] Course added with current price
- [ ] Cannot add already-owned course
- [ ] Cannot add duplicate to cart
- [ ] Cart persists across sessions (if logged in)
- [ ] Guest cart uses session ID

**Tasks:**
| ID | Task | Est. | Assignee |
|----|------|------|----------|
| T-007-01 | Create Cart model | 2h | |
| T-007-02 | Create POST /api/v2/cart/items | 2h | |
| T-007-03 | Check ownership before adding | 1h | |
| T-007-04 | Handle guest vs authenticated carts | 2h | |
| T-007-05 | Tests | 2h | |

---

#### US-008: Add Program to Cart
> **As a** learner  
> **I want to** add a program bundle to my cart  
> **So that** I can purchase all courses at once

**Acceptance Criteria:**
- [ ] Program added as single line item
- [ ] Bundle price used, not sum of courses
- [ ] Cannot add if already own all courses
- [ ] Partial ownership shows adjusted price (stretch)

**Tasks:**
| ID | Task | Est. | Assignee |
|----|------|------|----------|
| T-008-01 | Support program itemType in cart | 1h | |
| T-008-02 | Check ownership of all courses | 2h | |
| T-008-03 | Handle partial ownership (TBD) | 3h | |
| T-008-04 | Tests | 2h | |

---

#### US-009: Remove Cart Item
> **As a** learner  
> **I want to** remove items from my cart  
> **So that** I can adjust my purchase

**Acceptance Criteria:**
- [ ] Item removed immediately
- [ ] Cart total updates
- [ ] Empty cart shows appropriate message

**Tasks:**
| ID | Task | Est. | Assignee |
|----|------|------|----------|
| T-009-01 | Create DELETE /api/v2/cart/items/:id | 1h | |
| T-009-02 | Recalculate totals | 0.5h | |
| T-009-03 | Tests | 1h | |

---

#### US-010: Apply Discount Code
> **As a** learner  
> **I want to** apply a discount code  
> **So that** I can get a reduced price

**Acceptance Criteria:**
- [ ] Code validated against rules
- [ ] Discount amount shown
- [ ] Only one code at a time
- [ ] Error message for invalid codes
- [ ] Can remove discount code

**Tasks:**
| ID | Task | Est. | Assignee |
|----|------|------|----------|
| T-010-01 | Create POST /api/v2/cart/discount | 2h | |
| T-010-02 | Validate code against all rules | 2h | |
| T-010-03 | Calculate discount amount | 1h | |
| T-010-04 | Create DELETE /api/v2/cart/discount | 0.5h | |
| T-010-05 | Tests | 2h | |

---

#### US-011: View Cart Summary
> **As a** learner  
> **I want to** see my cart total with all fees  
> **So that** I know the final price

**Acceptance Criteria:**
- [ ] Show subtotal (before discount)
- [ ] Show discount (if any)
- [ ] Show tax (if applicable)
- [ ] Show final total
- [ ] Show each line item with price

**Tasks:**
| ID | Task | Est. | Assignee |
|----|------|------|----------|
| T-011-01 | Create GET /api/v2/cart | 1h | |
| T-011-02 | Calculate all totals | 1h | |
| T-011-03 | Include tax calculation (configurable) | 2h | |
| T-011-04 | Tests | 1h | |

---

### F-002.2: Checkout Flow

#### US-012: Initiate Checkout
> **As a** learner  
> **I want to** proceed to checkout  
> **So that** I can complete my purchase

**Acceptance Criteria:**
- [ ] Must be authenticated (redirect to login/register)
- [ ] Cart must not be empty
- [ ] All prices still valid (not expired)
- [ ] Returns payment intent for UI

**Tasks:**
| ID | Task | Est. | Assignee |
|----|------|------|----------|
| T-012-01 | Create POST /api/v2/cart/checkout | 2h | |
| T-012-02 | Validate cart state | 1h | |
| T-012-03 | Lock prices for checkout session | 1h | |
| T-012-04 | Tests | 2h | |

---

#### US-013: Guest Checkout
> **As a** new user  
> **I want to** create an account during checkout  
> **So that** I don't have to register first

**Acceptance Criteria:**
- [ ] Can enter email/password during checkout
- [ ] Account created atomically with order
- [ ] Cart merged to new account
- [ ] Email verification sent

**Tasks:**
| ID | Task | Est. | Assignee |
|----|------|------|----------|
| T-013-01 | Checkout endpoint accepts new user info | 2h | |
| T-013-02 | Create user in transaction with order | 2h | |
| T-013-03 | Merge guest cart to new user | 1h | |
| T-013-04 | Tests | 2h | |

---

## E-003: Payment Processing

### F-003.1: Payment Processor Abstraction

#### US-014: Create Payment Processor Interface
> **As a** developer  
> **I want to** use a common interface for all payment processors  
> **So that** we can easily swap or add processors

**Acceptance Criteria:**
- [ ] Interface supports create intent, confirm, refund
- [ ] Interface supports webhook verification
- [ ] Factory pattern for processor selection
- [ ] Configuration-driven processor selection

**Tasks:**
| ID | Task | Est. | Assignee |
|----|------|------|----------|
| T-014-01 | Define IPaymentProcessor interface | 2h | |
| T-014-02 | Create PaymentProcessorFactory | 1h | |
| T-014-03 | Create configuration for processor selection | 1h | |
| T-014-04 | Create base tests for interface contract | 2h | |

---

### F-003.2: Stripe Integration

#### US-015: Pay with Stripe
> **As a** learner  
> **I want to** pay with my credit card via Stripe  
> **So that** I can complete my purchase securely

**Acceptance Criteria:**
- [ ] Payment intent created on checkout
- [ ] Client secret returned for Stripe Elements
- [ ] Payment confirmed via webhook
- [ ] Order created on successful payment
- [ ] Handles SCA/3D Secure

**Tasks:**
| ID | Task | Est. | Assignee |
|----|------|------|----------|
| T-015-01 | Install Stripe SDK | 0.5h | |
| T-015-02 | Implement StripeProcessor class | 4h | |
| T-015-03 | Create POST /api/v2/payments/create-intent | 2h | |
| T-015-04 | Create POST /api/v2/payments/confirm | 2h | |
| T-015-05 | Implement webhook handler | 3h | |
| T-015-06 | Handle 3D Secure flows | 2h | |
| T-015-07 | Integration tests with Stripe test mode | 4h | |

---

#### US-016: Process Refund
> **As a** billing-admin  
> **I want to** refund a payment  
> **So that** I can handle customer service issues

**Acceptance Criteria:**
- [ ] Full or partial refund supported
- [ ] Reason required for audit
- [ ] Refund recorded on payment record
- [ ] Order status updated
- [ ] Email sent to learner
- [ ] Related registrations cancelled

**Tasks:**
| ID | Task | Est. | Assignee |
|----|------|------|----------|
| T-016-01 | Create POST /api/v2/admin/payments/:id/refund | 2h | |
| T-016-02 | Implement processor refund call | 2h | |
| T-016-03 | Update order/payment records | 1h | |
| T-016-04 | Cancel related registrations | 2h | |
| T-016-05 | Send refund notification | 1h | |
| T-016-06 | Tests | 2h | |

---

### F-003.3: Additional Processors

#### US-017: Pay with Square
> **As a** learner  
> **I want to** pay with Square  
> **So that** I have payment options

**Tasks:**
| ID | Task | Est. | Assignee |
|----|------|------|----------|
| T-017-01 | Install Square SDK | 0.5h | |
| T-017-02 | Implement SquareProcessor class | 4h | |
| T-017-03 | Webhook handler for Square | 2h | |
| T-017-04 | Tests | 2h | |

---

#### US-018: Pay with Google Pay
> **As a** learner  
> **I want to** pay with Google Pay  
> **So that** I can use my saved payment methods

**Tasks:**
| ID | Task | Est. | Assignee |
|----|------|------|----------|
| T-018-01 | GPay integration through Stripe/Square | 3h | |
| T-018-02 | Alternative: Direct GPay API | 6h | |
| T-018-03 | Tests | 2h | |

---

#### US-019: Pay with Elavon
> **As an** enterprise customer  
> **I want to** use Elavon as our payment processor  
> **So that** we can use our existing merchant account

**Tasks:**
| ID | Task | Est. | Assignee |
|----|------|------|----------|
| T-019-01 | Elavon API integration | 6h | |
| T-019-02 | Implement ElavonProcessor class | 4h | |
| T-019-03 | Handle Elavon-specific flows | 3h | |
| T-019-04 | Tests | 2h | |

---

## E-004: Registration & Approval

### F-004.1: Registration Creation

#### US-020: Create Registration on Order Complete
> **As a** system  
> **I want to** create registrations when an order completes  
> **So that** the learner can be enrolled

**Acceptance Criteria:**
- [ ] One registration per purchased item
- [ ] Registration linked to order
- [ ] Status set based on approval config
- [ ] Program purchases create multiple registrations

**Tasks:**
| ID | Task | Est. | Assignee |
|----|------|------|----------|
| T-020-01 | Create Registration model | 2h | |
| T-020-02 | Create registration on payment success | 2h | |
| T-020-03 | Handle program → multiple registrations | 2h | |
| T-020-04 | Link registration to order item | 1h | |
| T-020-05 | Tests | 2h | |

---

### F-004.2: Approval Workflow

#### US-021: Auto-Approve Registration
> **As a** system  
> **I want to** auto-approve registrations when configured  
> **So that** learners can start immediately

**Acceptance Criteria:**
- [ ] Check course/department approval settings
- [ ] If auto-approve, status → APPROVED immediately
- [ ] Trigger enrollment creation

**Tasks:**
| ID | Task | Est. | Assignee |
|----|------|------|----------|
| T-021-01 | Add approvalRequired field to course/dept config | 1h | |
| T-021-02 | Check config on registration creation | 1h | |
| T-021-03 | Auto-trigger approval flow | 1h | |
| T-021-04 | Tests | 1h | |

---

#### US-022: Admin Review Registrations
> **As an** enrollment-admin  
> **I want to** see pending registrations  
> **So that** I can review and approve them

**Acceptance Criteria:**
- [ ] List pending registrations for my department
- [ ] See learner info, course, payment status
- [ ] Filter by course, date, status
- [ ] Sort by date (oldest first)

**Tasks:**
| ID | Task | Est. | Assignee |
|----|------|------|----------|
| T-022-01 | Create GET /api/v2/admin/registrations | 2h | |
| T-022-02 | Department scoping | 1h | |
| T-022-03 | Filtering and sorting | 1h | |
| T-022-04 | Tests | 1h | |

---

#### US-023: Approve Registration
> **As an** enrollment-admin  
> **I want to** approve a registration  
> **So that** the learner can be enrolled

**Acceptance Criteria:**
- [ ] Status changes to APPROVED
- [ ] Reviewer and timestamp recorded
- [ ] Enrollment auto-created
- [ ] Learner notified via email

**Tasks:**
| ID | Task | Est. | Assignee |
|----|------|------|----------|
| T-023-01 | Create POST /api/v2/admin/registrations/:id/approve | 2h | |
| T-023-02 | Update registration record | 1h | |
| T-023-03 | Trigger enrollment creation | 1h | |
| T-023-04 | Send notification | 1h | |
| T-023-05 | Tests | 2h | |

---

#### US-024: Reject Registration
> **As an** enrollment-admin  
> **I want to** reject a registration with a reason  
> **So that** the learner knows why and can get refunded

**Acceptance Criteria:**
- [ ] Reason required (min 10 chars)
- [ ] Status changes to REJECTED
- [ ] Reviewer and timestamp recorded
- [ ] Learner notified with reason
- [ ] Refund initiated (configurable)

**Tasks:**
| ID | Task | Est. | Assignee |
|----|------|------|----------|
| T-024-01 | Create POST /api/v2/admin/registrations/:id/reject | 2h | |
| T-024-02 | Require reason field | 0.5h | |
| T-024-03 | Trigger refund process | 2h | |
| T-024-04 | Send rejection email | 1h | |
| T-024-05 | Tests | 2h | |

---

## E-005: Auto-Enrollment

#### US-025: Create Enrollment on Approval
> **As a** system  
> **I want to** create enrollments when registrations are approved  
> **So that** learners can access content

**Acceptance Criteria:**
- [ ] Enrollment created with source = 'registration'
- [ ] Learner appears in course roster
- [ ] Learner can access course content
- [ ] Welcome email sent

**Tasks:**
| ID | Task | Est. | Assignee |
|----|------|------|----------|
| T-025-01 | Call EnrollmentService from approval flow | 2h | |
| T-025-02 | Set enrollment source metadata | 1h | |
| T-025-03 | Send welcome email | 1h | |
| T-025-04 | Tests | 2h | |

---

## E-007: Certificate Generation

#### US-026: Auto-Generate Course Certificate
> **As a** system  
> **I want to** generate certificates when courses are completed  
> **So that** learners have proof of achievement

**Acceptance Criteria:**
- [ ] Certificate created when completion criteria met
- [ ] Unique certificate number generated
- [ ] Certificate stored in database
- [ ] Learner notified via email

**Tasks:**
| ID | Task | Est. | Assignee |
|----|------|------|----------|
| T-026-01 | Create Certificate model | 2h | |
| T-026-02 | Create CertificateService | 3h | |
| T-026-03 | Hook into progress completion event | 2h | |
| T-026-04 | Generate unique certificate number | 1h | |
| T-026-05 | Send certificate email | 1h | |
| T-026-06 | Tests | 2h | |

---

#### US-027: Download Certificate PDF
> **As a** learner  
> **I want to** download my certificate as PDF  
> **So that** I can print or share it

**Acceptance Criteria:**
- [ ] PDF generated on-demand
- [ ] Uses certificate template
- [ ] Includes verification URL
- [ ] Professional appearance

**Tasks:**
| ID | Task | Est. | Assignee |
|----|------|------|----------|
| T-027-01 | Create PDF generation service | 4h | |
| T-027-02 | Create certificate template renderer | 3h | |
| T-027-03 | Create GET /api/v2/certificates/:id/download | 2h | |
| T-027-04 | Cache generated PDFs | 1h | |
| T-027-05 | Tests | 2h | |

---

#### US-028: Verify Certificate
> **As a** third party  
> **I want to** verify a certificate is valid  
> **So that** I can trust the credential

**Acceptance Criteria:**
- [ ] Public endpoint (no auth required)
- [ ] Returns certificate details if valid
- [ ] Returns error if invalid/revoked
- [ ] Shows recipient name, course, date

**Tasks:**
| ID | Task | Est. | Assignee |
|----|------|------|----------|
| T-028-01 | Create GET /api/v2/certificates/verify/:number | 2h | |
| T-028-02 | Return sanitized public info | 1h | |
| T-028-03 | Handle revoked certificates | 0.5h | |
| T-028-04 | Tests | 1h | |

---

## Story Point Summary

| Epic | Total Points | High Priority Points |
|------|--------------|---------------------|
| E-001: Catalog & Pricing | 35 | 25 |
| E-002: Cart & Checkout | 32 | 28 |
| E-003: Payment Processing | 55 | 40 |
| E-004: Registration & Approval | 28 | 25 |
| E-005: Auto-Enrollment | 8 | 8 |
| E-006: Progress Tracking | 16 | 16 |
| E-007: Certificates | 25 | 20 |
| E-008: Subscriptions | 35 | 0 (future) |
| **TOTAL** | **234** | **162** |

**Velocity Assumption:** 20-25 points/sprint (2 weeks)

**Estimated Sprints:** 7-8 sprints for core features (14-16 weeks)

---

## Priority Matrix

### Must Have (MVP)

| Story | Epic | Points |
|-------|------|--------|
| US-001: Set Course Price | E-001 | 3 |
| US-004: Browse Catalog | E-001 | 3 |
| US-005: View Course Details | E-001 | 2 |
| US-007: Add to Cart | E-002 | 3 |
| US-011: View Cart | E-002 | 2 |
| US-012: Checkout | E-002 | 3 |
| US-015: Pay with Stripe | E-003 | 8 |
| US-020: Create Registration | E-004 | 3 |
| US-021: Auto-Approve | E-004 | 3 |
| US-025: Create Enrollment | E-005 | 2 |
| US-026: Generate Certificate | E-007 | 5 |

**MVP Total:** ~37 points (2 sprints)

### Should Have (Phase 2)

| Story | Epic | Points |
|-------|------|--------|
| US-002: Program Bundle | E-001 | 5 |
| US-003: Discount Codes | E-001 | 5 |
| US-008: Add Program to Cart | E-002 | 3 |
| US-010: Apply Discount | E-002 | 3 |
| US-016: Process Refund | E-003 | 5 |
| US-022: Review Registrations | E-004 | 3 |
| US-023: Approve Registration | E-004 | 3 |
| US-024: Reject Registration | E-004 | 3 |
| US-027: Download PDF | E-007 | 5 |
| US-028: Verify Certificate | E-007 | 3 |

**Phase 2 Total:** ~38 points (2 sprints)

### Could Have (Phase 3)

| Story | Epic | Points |
|-------|------|--------|
| US-006: Program Details | E-001 | 3 |
| US-009: Remove Cart Item | E-002 | 2 |
| US-013: Guest Checkout | E-002 | 5 |
| US-017: Pay with Square | E-003 | 5 |
| US-018: Pay with GPay | E-003 | 5 |
| US-019: Pay with Elavon | E-003 | 8 |

**Phase 3 Total:** ~28 points (1.5 sprints)

---

## Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEPENDENCY CHAIN                              │
└─────────────────────────────────────────────────────────────────┘

CoursePricing Model ──────────────────────────────────────────────┐
        │                                                          │
        ▼                                                          │
Catalog API ──────────────────────────────────────────┐           │
        │                                              │           │
        ▼                                              ▼           │
Cart Model ─────────────────────────────────────▶ Checkout ◀──────┘
        │                                              │
        │                                              ▼
        │                                    Payment Processor
        │                                              │
        │                                              ▼
        └──────────────────────────────────────▶ Order Creation
                                                       │
                                                       ▼
                                               Registration
                                                       │
                                        ┌──────────────┴──────────────┐
                                        ▼                              ▼
                                   Auto-Approve                  Manual Approve
                                        │                              │
                                        └──────────────┬───────────────┘
                                                       ▼
                                                  Enrollment
                                                       │
                                                       ▼
                                              Progress Tracking
                                                       │
                                                       ▼
                                                 Completion
                                                       │
                                                       ▼
                                                 Certificate
```

---

## Next Steps

1. **Review & Approve** - Human review of user stories
2. **Technical Design** - Create detailed technical specs for Phase 1
3. **Sprint Planning** - Break MVP into Sprint 1 scope
4. **Create Issues** - Add API-ISS-XXX issues for first sprint

---

**Document Status:** DRAFT - Pending Review
