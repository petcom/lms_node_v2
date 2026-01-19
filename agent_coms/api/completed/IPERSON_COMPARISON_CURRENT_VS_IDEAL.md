# IPerson Type: Current vs Ideal for LMS Use Case

**Date:** 2026-01-12
**Purpose:** Compare current IPerson implementation with ideal design for LMS context
**Status:** Analysis for decision-making

---

## Current IPerson Implementation

```typescript
// File: src/models/auth/Person.types.ts (CURRENT)

export interface IEmail {
  email: string;
  type: 'primary' | 'secondary' | 'work' | 'personal';
  verified: boolean;
}

export interface IAddress {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  type: 'business' | 'home' | 'other';
  isPrimary: boolean;
}

export interface IIdentification {
  idNumber: string;  // Should be encrypted
  idType: 'passport' | 'drivers-license' | 'state-id' | 'student-id' | 'other';
  issuingAuthority?: string;
  expirationDate?: Date;
}

export interface IPerson {
  // Name fields
  firstName: string;
  middleName?: string;
  lastName: string;
  preferredName?: string;  // Context-specific

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
  avatar?: string;

  // Preferences
  timezone?: string;
  languagePreference?: string;
}
```

---

## Ideal IPerson for LMS Context

```typescript
// IDEAL - Designed specifically for LMS use cases

/**
 * Phone number with type and verification
 * LMS Use: Emergency contact, SMS notifications, 2FA
 */
export interface IPhone {
  number: string;                    // E.164 format: +1-555-0123
  type: 'mobile' | 'home' | 'work' | 'other';
  isPrimary: boolean;
  verified: boolean;                 // SMS verification
  allowSMS: boolean;                 // Opt-in for SMS notifications
}

/**
 * Email with enhanced LMS features
 * LMS Use: Communication, notifications, account recovery
 */
export interface IEmail {
  email: string;
  type: 'institutional' | 'personal' | 'work' | 'other';  // More specific for LMS
  isPrimary: boolean;                // Added for clarity
  verified: boolean;
  allowNotifications: boolean;       // Opt-in for email notifications
}

/**
 * Address for LMS context
 * LMS Use: Mailing transcripts, emergency contact, compliance
 */
export interface IAddress {
  // Geographic
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;

  // Metadata
  type: 'home' | 'campus' | 'mailing' | 'billing' | 'other';  // LMS-specific
  isPrimary: boolean;
  isActive: boolean;                 // Can mark as inactive vs delete

  // Validation
  verified: boolean;                 // Address verification status
  verifiedAt?: Date;
}

/**
 * Emergency Contact
 * LMS Use: Critical for learners, health & safety compliance
 */
export interface IEmergencyContact {
  name: string;
  relationship: 'parent' | 'guardian' | 'spouse' | 'sibling' | 'friend' | 'other';
  phones: IPhone[];                  // Multiple contact numbers
  email?: string;
  isPrimary: boolean;                // Can have multiple, one primary
  notes?: string;                    // Special instructions
}

/**
 * Identification for LMS
 * LMS Use: Student ID, government ID, accreditation compliance
 */
export interface IIdentification {
  idNumber: string;                  // Encrypted in storage
  idType: 'student-id' | 'passport' | 'drivers-license' | 'state-id' | 'national-id' | 'other';
  issuingAuthority?: string;
  issueDate?: Date;
  expirationDate?: Date;
  countryOfIssue?: string;           // Important for international students
  isVerified: boolean;               // Staff has verified physical ID
  verifiedBy?: string;               // Staff member who verified
  verifiedAt?: Date;
}

/**
 * Demographic Information
 * LMS Use: Reporting, compliance (IPEDS), diversity tracking, accessibility
 */
export interface IDemographics {
  // FERPA-protected, optional fields
  gender?: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say' | 'other';
  genderIdentity?: string;           // Self-described
  pronouns?: string;                 // e.g., "she/her", "they/them"

  ethnicity?: string[];              // Multi-select: Hispanic/Latino, etc.
  race?: string[];                   // Multi-select: As defined by institution

  citizenship?: 'citizen' | 'permanent-resident' | 'visa' | 'other';
  countryOfCitizenship?: string;

  veteranStatus?: boolean;
  firstGeneration?: boolean;         // First in family to attend college

  // Accessibility
  hasDisability?: boolean;
  accommodationsRequired?: boolean;
  accommodationDetails?: string;     // Managed by accessibility services
}

/**
 * Legal and Consent Information
 * LMS Use: Compliance (FERPA, GDPR), terms acceptance, photo release
 */
export interface ILegalConsent {
  ferpaConsentGiven: boolean;        // FERPA directory information release
  ferpaConsentDate?: Date;

  photoReleaseConsent: boolean;      // Can use photos in marketing
  photoReleaseDate?: Date;

  dataProcessingConsent: boolean;    // GDPR compliance
  dataProcessingDate?: Date;

  termsAcceptedVersion?: string;     // Which version of terms accepted
  termsAcceptedDate?: Date;
}

/**
 * IDEAL IPerson for LMS Context
 * Used in both Staff and Learner models
 */
export interface IPerson {
  // ==========================================
  // CORE IDENTITY
  // ==========================================

  // Legal name (for transcripts, diplomas, official documents)
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;                   // Jr., Sr., III, PhD, etc.

  // Display name (for UI, communications)
  preferredFirstName?: string;       // "Bob" instead of "Robert"
  preferredLastName?: string;        // Maiden name, chosen name
  displayName?: string;              // Calculated: preferredFirst + lastName

  // Pronunciation (accessibility feature)
  pronunciationGuide?: string;       // "ROH-bert JOHN-son"
  pronunciationAudio?: string;       // URL to audio file

  // ==========================================
  // CONTACT INFORMATION
  // ==========================================

  emails: IEmail[];                  // Enhanced with LMS features
  phones: IPhone[];                  // NEW - critical for LMS
  addresses: IAddress[];             // Enhanced with verification

  // Primary contact preference
  preferredContactMethod?: 'email' | 'phone' | 'sms' | 'in-app';

  // ==========================================
  // PERSONAL INFORMATION
  // ==========================================

  dateOfBirth?: Date;                // Age verification, COPPA compliance
  birthplace?: string;               // Optional, for some certifications

  // Government/Official IDs
  last4SSN?: string;                 // Only last 4 for security
  identifications: IIdentification[]; // Enhanced with verification

  // ==========================================
  // EMERGENCY CONTACTS
  // ==========================================

  emergencyContacts: IEmergencyContact[];  // NEW - critical for safety

  // ==========================================
  // DEMOGRAPHICS & COMPLIANCE
  // ==========================================

  demographics?: IDemographics;      // NEW - optional, compliance reporting
  legalConsent?: ILegalConsent;      // NEW - FERPA, GDPR, photo release

  // ==========================================
  // PROFILE & PREFERENCES
  // ==========================================

  // Profile
  bio?: string;
  avatar?: string;
  headline?: string;                 // NEW - "Senior Instructor in Biology"

  // Social/Professional (optional)
  linkedInUrl?: string;
  personalWebsite?: string;

  // System Preferences
  timezone: string;                  // Required, not optional (default: institution timezone)
  languagePreference: string;        // Required, not optional (default: 'en')
  locale?: string;                   // NEW - en-US, en-GB, es-MX

  // Accessibility Preferences
  accessibilityPreferences?: {
    screenReaderEnabled?: boolean;
    highContrastMode?: boolean;
    fontSize?: 'small' | 'medium' | 'large' | 'x-large';
    captionsPreferred?: boolean;
  };

  // Communication Preferences
  communicationPreferences?: {
    emailFrequency?: 'immediate' | 'daily-digest' | 'weekly-digest' | 'none';
    smsEnabled?: boolean;
    pushNotificationsEnabled?: boolean;
    marketingEmailsEnabled?: boolean;
  };

  // ==========================================
  // METADATA
  // ==========================================

  // Data quality
  profileCompleteness?: number;      // 0-100%, calculated
  lastVerified?: Date;               // Last time staff verified info
  verifiedBy?: string;               // Staff member who verified

  // Privacy
  isPublicProfile?: boolean;         // Show in directory
  hideFromSearch?: boolean;          // Exclude from people search
}
```

---

## Comparison Matrix: Current vs Ideal

| Feature Category | Current | Ideal | Why Change? |
|-----------------|---------|-------|-------------|
| **Phone Numbers** | ❌ Missing | ✅ `IPhone[]` with SMS opt-in | Critical for emergency contact, 2FA, SMS notifications |
| **Email Types** | Generic (work/personal) | LMS-specific (institutional/personal) | Better reflects LMS context |
| **Email Notifications** | ❌ Missing | ✅ `allowNotifications` flag | GDPR/CAN-SPAM compliance, user control |
| **Emergency Contacts** | ❌ Missing | ✅ `IEmergencyContact[]` | Legal requirement for minors, safety compliance |
| **Name Suffix** | ❌ Missing | ✅ `suffix` (Jr., PhD, etc.) | Professional credentials, formal documents |
| **Preferred vs Legal Name** | Only `preferredName` | ✅ Separate preferred first/last | Trans/non-binary support, cultural names |
| **Name Pronunciation** | ❌ Missing | ✅ Text + audio guide | Accessibility, respect, diversity |
| **Address Verification** | ❌ Missing | ✅ `verified` + `verifiedAt` | Mailing transcripts, fraud prevention |
| **Demographics** | ❌ Missing | ✅ `IDemographics` | IPEDS reporting, diversity tracking, accessibility |
| **Legal Consent** | ❌ Missing | ✅ `ILegalConsent` | FERPA compliance, GDPR, photo release |
| **Pronouns** | ❌ Missing | ✅ In demographics | Inclusivity, modern best practice |
| **Citizenship** | ❌ Missing | ✅ In demographics | International students, visa tracking |
| **Accessibility Needs** | ❌ Missing | ✅ In demographics + preferences | ADA compliance, accommodations |
| **ID Verification** | Basic | ✅ Enhanced with verification tracking | Fraud prevention, compliance |
| **Communication Prefs** | ❌ Missing | ✅ Full preference object | User control, reduce spam, GDPR |
| **Profile Headline** | ❌ Missing | ✅ `headline` | Professional identity, networking |
| **Social Links** | ❌ Missing | ✅ LinkedIn, website | Academic networking |
| **Locale** | Only language | ✅ `locale` (en-US vs en-GB) | Internationalization (date/number formats) |
| **Profile Completeness** | ❌ Missing | ✅ Calculated percentage | Encourage users to complete profile |
| **Primary Flags** | Only in Address | ✅ In Email, Phone, Emergency Contact | Consistency across all contact types |

---

## What's Good About Current Implementation ✅

1. **Clean separation of concerns** - Email, Address, Identification as separate interfaces
2. **Security-conscious** - Only last 4 SSN, notes about encryption
3. **Flexible arrays** - Multiple emails, addresses, IDs
4. **Basic compliance** - Has dateOfBirth, identifications
5. **Internationalization started** - Timezone, language preference
6. **Privacy-conscious** - Limited personal data

---

## What's Missing from Current Implementation ❌

### Critical for LMS (High Priority)

1. **Phone Numbers** - No phone support at all
   - Use case: Emergency contact, SMS notifications, 2FA
   - Impact: Safety risk, can't contact users urgently

2. **Emergency Contacts** - Not in Person model
   - Use case: Required for minors, safety incidents
   - Impact: Legal/compliance risk, duty of care

3. **Legal Consent Tracking** - No FERPA/GDPR consent
   - Use case: FERPA directory info release, photo consent
   - Impact: Legal compliance risk

4. **Primary Contact Flags** - Only addresses have isPrimary
   - Use case: Which email/phone to use for critical communications
   - Impact: Confusion, may contact wrong address

5. **Communication Preferences** - No opt-in/out mechanism
   - Use case: Email frequency, SMS opt-in, marketing consent
   - Impact: Spam complaints, GDPR violations

### Important for LMS (Medium Priority)

6. **Demographics** - No gender, ethnicity, veteran status
   - Use case: IPEDS reporting, Title IX, diversity initiatives
   - Impact: Can't meet federal reporting requirements

7. **Pronouns** - No pronoun field
   - Use case: Inclusive communication, respect
   - Impact: Deadnaming risk, inclusivity gaps

8. **Accessibility Needs** - No accommodation tracking
   - Use case: ADA compliance, accessibility services
   - Impact: Can't properly serve disabled students

9. **Name Pronunciation** - No pronunciation guide
   - Use case: Respect, diversity, accessibility
   - Impact: Mispronunciation, disrespect

10. **Preferred vs Legal Name Split** - Only one `preferredName`
    - Use case: Trans students, cultural names, married names
    - Impact: Can't properly support name transitions

11. **ID Verification Tracking** - No verification metadata
    - Use case: Know who verified ID and when
    - Impact: Fraud risk, audit trail missing

### Nice to Have (Low Priority)

12. **Profile Headline** - No professional title
    - Use case: Networking, directory
    - Impact: Less professional appearance

13. **Social Links** - No LinkedIn, website fields
    - Use case: Academic networking, research profiles
    - Impact: Limited professional networking

14. **Profile Completeness** - No calculated metric
    - Use case: Encourage profile completion
    - Impact: Incomplete profiles

15. **Locale** - Only language, not full locale
    - Use case: Date formats, number formats (en-US vs en-GB)
    - Impact: Inconsistent formatting

---

## What's Unnecessary or Needs Refinement 🔄

### Questionable Design Choices

1. **`bio` field** - Probably too generic
   - **Issue:** Unlimited free-form text, no guidance
   - **Better:** Split into `shortBio` (200 chars) and `fullBio` (2000 chars)
   - **Or:** Move to separate Profile model

2. **Email types** - `'primary' | 'secondary' | 'work' | 'personal'`
   - **Issue:** What's the difference between primary and secondary?
   - **Better:** `'institutional' | 'personal' | 'work' | 'other'` + `isPrimary` flag

3. **Address types** - `'business' | 'home' | 'other'`
   - **Issue:** Too generic for LMS
   - **Better:** `'home' | 'campus' | 'mailing' | 'billing' | 'other'`

4. **Timezone/Language defaults** - Optional with defaults
   - **Issue:** Should never be null in LMS context
   - **Better:** Required fields with institution defaults

5. **Arrays default to `[]`** - Empty arrays everywhere
   - **Issue:** Should require at least one email
   - **Better:** Validation that ensures at least 1 primary email

---

## Use Case Analysis: Why These Changes Matter

### Use Case 1: Emergency Situation

**Scenario:** Learner has medical emergency on campus

**Current IPerson:**
```typescript
person: {
  firstName: "Jane",
  lastName: "Doe",
  emails: [{ email: "jane@example.com", type: "primary", verified: true }],
  // ❌ No phone numbers
  // ❌ No emergency contacts
}
```
**Problem:** Can't quickly contact learner or family. Must look elsewhere for emergency info.

**Ideal IPerson:**
```typescript
person: {
  firstName: "Jane",
  lastName: "Doe",
  phones: [
    { number: "+1-555-1234", type: "mobile", isPrimary: true, verified: true }
  ],
  emergencyContacts: [
    {
      name: "John Doe",
      relationship: "parent",
      phones: [{ number: "+1-555-5678", type: "mobile", isPrimary: true }],
      email: "john@example.com",
      isPrimary: true
    }
  ]
}
```
**Benefit:** Immediate access to emergency contact info in critical situation.

### Use Case 2: FERPA Compliance

**Scenario:** Staff wants to publish dean's list with student names

**Current IPerson:**
```typescript
// ❌ No way to track if student consented to directory info release
// Must check separate table or manual records
```

**Ideal IPerson:**
```typescript
person: {
  legalConsent: {
    ferpaConsentGiven: true,
    ferpaConsentDate: new Date("2024-08-15")
  }
}
```
**Benefit:** Can programmatically check consent before publishing student info.

### Use Case 3: Trans Student Support

**Scenario:** Student is transitioning and wants different name in system than legal name

**Current IPerson:**
```typescript
person: {
  firstName: "Robert",        // Legal name on transcripts
  lastName: "Smith",
  preferredName: "Robin"      // ⚠️ Only first name? What about last name?
}
```
**Problem:** Can't handle preferred last name. Can't clearly distinguish legal vs chosen name.

**Ideal IPerson:**
```typescript
person: {
  firstName: "Robert",              // Legal name (transcripts)
  lastName: "Smith",
  preferredFirstName: "Robin",      // Chosen name (UI)
  preferredLastName: "Smith",       // Could be different
  displayName: "Robin Smith",       // Calculated, used everywhere in UI
  pronouns: "they/them"
}
```
**Benefit:** Respectful, clear separation between legal and chosen names.

### Use Case 4: International Student

**Scenario:** International student from China needs visa tracking and proper name handling

**Current IPerson:**
```typescript
person: {
  firstName: "Wei",           // Western order, but Chinese names are surname-first
  lastName: "Zhang",
  // ❌ No citizenship tracking
  // ❌ No pronunciation guide
  // ❌ Can't track visa expiration
}
```

**Ideal IPerson:**
```typescript
person: {
  firstName: "Wei",
  lastName: "Zhang",
  pronunciationGuide: "Way Jahng",
  demographics: {
    citizenship: "visa",
    countryOfCitizenship: "China"
  },
  identifications: [
    {
      idType: "passport",
      idNumber: "E12345678",  // Encrypted
      issuingAuthority: "China",
      expirationDate: new Date("2027-06-15"),
      countryOfIssue: "China"
    }
  ]
}
```
**Benefit:** Can track visa status, provide better support for international students.

### Use Case 5: Accessibility Services

**Scenario:** Student needs closed captions, screen reader, extended time on tests

**Current IPerson:**
```typescript
person: {
  // ❌ No place to track accessibility needs
  // Must use separate system
}
```

**Ideal IPerson:**
```typescript
person: {
  demographics: {
    hasDisability: true,
    accommodationsRequired: true
    // Details managed by accessibility services (private)
  },
  accessibilityPreferences: {
    screenReaderEnabled: true,
    highContrastMode: true,
    fontSize: "large",
    captionsPreferred: true
  }
}
```
**Benefit:** System can automatically apply accommodations (captions, larger fonts, etc.)

### Use Case 6: SMS Notifications

**Scenario:** Send urgent campus alert via SMS

**Current IPerson:**
```typescript
person: {
  // ❌ No phone numbers at all
  // ❌ No SMS opt-in tracking
}
```

**Ideal IPerson:**
```typescript
person: {
  phones: [
    {
      number: "+1-555-1234",
      type: "mobile",
      isPrimary: true,
      verified: true,
      allowSMS: true  // ✅ Explicit consent for SMS
    }
  ],
  preferredContactMethod: "sms"
}
```
**Benefit:** Can send emergency alerts via SMS to opted-in users.

---

## Recommended Changes: Prioritized

### Phase 1: Critical (Must Have Before Production)

1. ✅ **Add IPhone interface and phones array**
   - Use case: Emergency contact, 2FA, SMS
   - Implementation: 1 hour
   - Breaking: Yes (new required field)

2. ✅ **Add emergencyContacts array (separate from person?)**
   - Use case: Safety, legal compliance
   - Implementation: 1 hour
   - Breaking: Yes (but currently doesn't exist)
   - **Question:** Should this be in IPerson or in Learner model only?

3. ✅ **Add ILegalConsent for FERPA/GDPR**
   - Use case: Legal compliance
   - Implementation: 1 hour
   - Breaking: No (optional field)

4. ✅ **Add isPrimary to IEmail**
   - Use case: Know which email to use
   - Implementation: 15 minutes
   - Breaking: No (optional, can default to first)

5. ✅ **Make timezone and languagePreference required (not optional)**
   - Use case: Always need these for proper UX
   - Implementation: 15 minutes
   - Breaking: Yes (migration sets defaults)

### Phase 2: Important (Should Have)

6. ✅ **Add IDemographics for IPEDS reporting**
   - Use case: Federal reporting, diversity
   - Implementation: 2 hours
   - Breaking: No (optional field)

7. ✅ **Add pronouns field**
   - Use case: Inclusivity, respect
   - Implementation: 15 minutes
   - Breaking: No (optional field)

8. ✅ **Split preferredName into preferredFirstName/preferredLastName**
   - Use case: Trans students, married names
   - Implementation: 30 minutes
   - Breaking: Yes (migration copies preferredName to preferredFirstName)

9. ✅ **Add verification tracking to IIdentification**
   - Use case: Fraud prevention, audit trail
   - Implementation: 30 minutes
   - Breaking: No (optional fields)

10. ✅ **Add communicationPreferences**
    - Use case: Email frequency, opt-outs
    - Implementation: 1 hour
    - Breaking: No (optional field)

### Phase 3: Nice to Have (Polish)

11. ✅ **Add name pronunciation**
12. ✅ **Add profile headline**
13. ✅ **Add social links**
14. ✅ **Add locale field**
15. ✅ **Add profileCompleteness calculation**
16. ✅ **Add accessibilityPreferences**

---

## Key Questions for You

Before I refine the ideal design, please clarify:

### 1. Emergency Contacts
**Question:** Should emergency contacts be:
- **Option A:** Inside IPerson (available for both staff and learners)
- **Option B:** Only in Learner model (not needed for staff)
- **Option C:** Separate EmergencyContact model (referenced, not embedded)

**My recommendation:** Option A (inside IPerson) - staff might need emergency contacts too.

### 2. Demographics
**Question:** How much demographic data do you need?
- **Minimal:** Just gender/pronouns
- **Standard:** Gender, ethnicity, race, veteran status (IPEDS required)
- **Comprehensive:** Add citizenship, disability, first-generation status

**My recommendation:** Standard for now, can expand later.

### 3. Phone Numbers
**Question:** Should phones be:
- **Required:** Must have at least one phone
- **Optional:** Can have zero phones
- **Required for learners, optional for staff**

**My recommendation:** Optional but encouraged (some people don't have phones).

### 4. Legal Consent
**Question:** Track consent in IPerson or separate Consent model?
- **Option A:** In IPerson (simpler, fewer joins)
- **Option B:** Separate Consent model (better audit trail, versioning)

**My recommendation:** In IPerson for MVP, separate model later if needed.

### 5. Breaking Changes Scope
**Question:** How aggressive should we be?
- **Conservative:** Only add new optional fields (no breaking changes)
- **Moderate:** Add critical fields, require migration
- **Aggressive:** Complete redesign, require full data re-entry

**My recommendation:** Moderate - add critical fields, migrate what we can.

---

## Final Recommendation

**For pre-production LMS:**

1. **Keep current structure as base** ✅ It's solid
2. **Add critical missing fields:**
   - Phones (IPhone[])
   - Emergency contacts (IEmergencyContact[])
   - Legal consent (ILegalConsent)
   - Demographics (IDemographics - optional)
   - Communication preferences
3. **Refine existing fields:**
   - Split preferredName → preferredFirstName/preferredLastName
   - Add isPrimary to IEmail
   - Make timezone/language required
   - Enhance IIdentification with verification
4. **Keep optional:**
   - Profile headline
   - Social links
   - Pronunciation guide
   - Locale

This gives you **80% of ideal functionality** with **reasonable migration effort**.

---

**Ready for your feedback!** Which features are must-haves for your LMS?
