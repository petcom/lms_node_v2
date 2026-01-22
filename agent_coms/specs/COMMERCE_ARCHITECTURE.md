# Commerce Architecture

## Purpose
The commerce system is responsible for all incoming payments, order lifecycle
management, and revenue accounting for courses and registrations. It publishes
entitlement and revenue events to the LMS and payout systems.

## High-Level Components
- **Auth Service**: proxy authentication to LMS, manage CommerceUser records
- Catalog Service: pricing, availability, and purchasable items
- Cart Service: cart and cart items
- Checkout Service: payment intents, tax, promo validation
- Orders Service: order state machine and fulfillment status
- Payments Service: processor integration and payment records
- Refunds Service: refunds and adjustments
- Revenue Ledger Service: immutable financial events
- Revenue Splits Service: course/instructor split rules
- Entitlements Service: enrollment grant requests to LMS
- Webhook Service: inbound/outbound webhook processing
- **Learner Dashboard Service**: aggregated views of orders, payments, entitlements

## System Boundaries
- Commerce owns pricing, order, and payment records.
- LMS owns learning content, enrollment state, completion events, **and user identity**.
- Payout system owns instructor payout scheduling and distribution.
- **Commerce references LMS users via `lmsUserId` (no duplicate identity management).**

## Data Flow (Happy Path)
1. Learner registers/logs in (Commerce proxies to LMS, stores CommerceUser reference).
2. Learner adds catalog item to cart.
3. Checkout creates payment intent and calculates tax/promo.
4. Payment succeeds, order is finalized.
5. Commerce sends entitlement grant to LMS.
6. LMS sends completion event to payout system (or commerce relay).
7. Revenue ledger records and revenue splits are applied.

## Learner Dashboard Flow
1. Authenticated learner requests order history.
2. Commerce returns orders, payments, and entitlements for that user.
3. Entitlements include deep links to LMS courses.
4. Receipts are generated on-demand as PDFs.

## Key Design Principles
- Idempotent write operations (client or server-generated idempotency keys).
- Immutable ledger entries for all financial events.
- Webhooks as the source of truth for payment status changes.
- Separation of concerns between billing (commerce) and payouts.

## Security
- All write endpoints require auth + idempotency.
- Webhooks require signature validation and replay protection.
- PCI data handled only by payment processors (tokenized payments).
