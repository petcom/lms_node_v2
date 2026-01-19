# IPerson Architecture: Basic, Extended, and Demographics

**Date:** 2026-01-12
**Purpose:** Define clean separation between shared (Basic), context-specific (Extended), and compliance (Demographics) data
**Status:** Architectural proposal for approval

---

## Architectural Principle

**Shared data goes in IPerson (Basic)**
- Fields that BOTH staff and learners need
- Core identity, contact info, preferences
- Single source of truth

**Context-specific data goes in IPersonExtended**
- Different extended fields for Staff vs Learner
- Staff: Professional/academic credentials
- Learner: Student-specific, emergency contacts, academic tracking

**Compliance data goes in IDemographics**
- Optional fields for reporting and compliance
- FERPA, IPEDS, Title IX, ADA
- Separate to make privacy/opt-in clear

---

## IPerson (Basic) - Shared by All

```typescript
/**
 * IPerson - Basic personal information
 * Shared by ALL users (Staff, Learner, GlobalAdmin)
 *
 * Contains ONLY fields that are universal across all user types
 */

// ==========================================
// Supporting Interfaces
// ==========================================

export interface IPhone {
  number: string;                    // E.164 format: +1-555-0123
  type: 'mobile' | 'home' | 'work' | 'other';
  isPrimary: boolean;
  verified: boolean;
  allowSMS: boolean;                 // Opt-in for SMS notifications
}

export interface IEmail {
  email: string;
  type: 'institutional' | 'personal' | 'work' | 'other';
  isPrimary: boolean;
  verified: boolean;
  allowNotifications: boolean;       // Opt-in for email notifications
}

export interface IAddress {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  type: 'home' | 'campus' | 'mailing' | 'billing' | 'other';
  isPrimary: boolean;
  verified: boolean;
  verifiedAt?: Date;
}

export interface ILegalConsent {
  ferpaConsentGiven: boolean;
  ferpaConsentDate?: Date;
  photoReleaseConsent: boolean;
  photoReleaseDate?: Date;
  dataProcessingConsent: boolean;    // GDPR
  dataProcessingDate?: Date;
  termsAcceptedVersion?: string;
  termsAcceptedDate?: Date;
}

export interface ICommunicationPreferences {
  emailFrequency: 'immediate' | 'daily-digest' | 'weekly-digest' | 'none';
  smsEnabled: boolean;
  pushNotificationsEnabled: boolean;
  marketingEmailsEnabled: boolean;
  preferredContactMethod: 'email' | 'phone' | 'sms' | 'in-app';
}

// ==========================================
// IPerson - Basic (SHARED)
// ==========================================

export interface IPerson {
  // ==========================================
  // CORE IDENTITY (Shared by all)
  // ==========================================

  firstName: string;                 // Legal first name
  middleName?: string;
  lastName: string;                  // Legal last name
  suffix?: string;                   // Jr., Sr., III, PhD, etc.

  preferredFirstName?: string;       // Display first name (if different from legal)
  preferredLastName?: string;        // Display last name (if different from legal)

  pronouns?: string;                 // "she/her", "they/them", etc.

  // ==========================================
  // CONTACT INFORMATION (Shared by all)
  // ==========================================

  emails: IEmail[];                  // Must have at least one primary
  phones: IPhone[];                  // At least one recommended
  addresses: IAddress[];             // At least one recommended

  // ==========================================
  // PERSONAL INFORMATION (Shared by all)
  // ==========================================

  dateOfBirth?: Date;                // Optional for privacy
  last4SSN?: string;                 // Optional, only last 4 digits

  // ==========================================
  // PROFILE (Shared by all)
  // ==========================================

  avatar?: string;                   // Profile photo URL
  bio?: string;                      // Short bio (500 chars max)

  // ==========================================
  // PREFERENCES (Shared by all)
  // ==========================================

  timezone: string;                  // Required, default: institution timezone
  languagePreference: string;        // Required, default: 'en'
  locale?: string;                   // Optional: 'en-US', 'en-GB', 'es-MX'

  communicationPreferences?: ICommunicationPreferences;

  // ==========================================
  // LEGAL & CONSENT (Shared by all)
  // ==========================================

  legalConsent?: ILegalConsent;

  // ==========================================
  // METADATA (Shared by all)
  // ==========================================

  profileCompleteness?: number;      // 0-100%, calculated
  lastVerified?: Date;
  verifiedBy?: string;               // Staff member who verified
}
```

### What Goes in IPerson (Basic) ✅

**Include if:** Field is needed by BOTH staff AND learners

- ✅ Legal name (firstName, lastName)
- ✅ Preferred name (display name)
- ✅ Pronouns
- ✅ Contact info (emails, phones, addresses)
- ✅ Date of birth (both need it)
- ✅ Last 4 SSN (both might have it)
- ✅ Avatar, bio (both have profiles)
- ✅ Timezone, language (both need localization)
- ✅ Communication preferences (both get notifications)
- ✅ Legal consent (FERPA applies to both)

**Exclude if:** Field is specific to staff OR learners only

---

## IPersonExtended - Staff Variant

```typescript
/**
 * IPersonExtended (Staff) - Professional information
 * Additional fields specific to STAFF members
 *
 * Used ONLY in Staff model
 */

export interface ICredential {
  type: 'degree' | 'certification' | 'license' | 'other';
  name: string;                      // "PhD in Computer Science"
  issuingInstitution: string;        // "MIT"
  fieldOfStudy?: string;             // "Computer Science"
  dateEarned?: Date;
  expirationDate?: Date;             // For licenses/certifications
  credentialNumber?: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
}

export interface IProfessionalMembership {
  organizationName: string;          // "IEEE", "ACM"
  membershipType?: string;           // "Fellow", "Member", "Student"
  membershipNumber?: string;
  joinDate?: Date;
  expirationDate?: Date;
  isActive: boolean;
}

export interface IPublication {
  title: string;
  type: 'journal' | 'conference' | 'book' | 'chapter' | 'other';
  publicationDate?: Date;
  venue?: string;                    // Journal/Conference name
  doi?: string;
  url?: string;
  authors: string[];                 // Co-authors
}

export interface IOfficeHours {
  dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  startTime: string;                 // "09:00"
  endTime: string;                   // "11:00"
  location?: string;                 // "Office 123" or "Zoom"
  isActive: boolean;
}

/**
 * IPersonExtended for Staff
 */
export interface IStaffPersonExtended {
  // ==========================================
  // PROFESSIONAL IDENTITY
  // ==========================================

  professionalTitle?: string;        // "Associate Professor", "Lead Instructor"
  officeLocation?: string;           // "Building A, Room 123"
  officePhone?: string;              // Direct office line

  headline?: string;                 // "Senior Biology Instructor specializing in Marine Biology"

  // ==========================================
  // CREDENTIALS & QUALIFICATIONS
  // ==========================================

  credentials: ICredential[];        // Degrees, certifications, licenses

  // ==========================================
  // ACADEMIC & PROFESSIONAL
  // ==========================================

  researchInterests?: string[];      // ["Machine Learning", "NLP", "AI Ethics"]
  publications?: IPublication[];
  professionalMemberships?: IProfessionalMembership[];

  officeHours?: IOfficeHours[];

  // ==========================================
  // PROFESSIONAL LINKS
  // ==========================================

  linkedInUrl?: string;
  researchGateUrl?: string;
  orcidId?: string;                  // Open Researcher and Contributor ID
  googleScholarUrl?: string;
  personalWebsite?: string;

  // ==========================================
  // INSTITUTION SPECIFIC
  // ==========================================

  employeeId?: string;               // HR system employee ID
  hireDate?: Date;
  contractType?: 'full-time' | 'part-time' | 'adjunct' | 'contractor';

  // ==========================================
  // ACCESSIBILITY (Staff-specific)
  // ==========================================

  accessibilityNeeds?: string;       // Any accommodations staff member needs
}
```

### What Goes in IStaffPersonExtended ✅

**Staff-only fields:**
- ✅ Professional credentials (degrees, certifications)
- ✅ Professional title, office location
- ✅ Research interests, publications
- ✅ Professional memberships (IEEE, ACM, etc.)
- ✅ Office hours
- ✅ Academic social links (ORCID, Google Scholar)
- ✅ Employee ID, hire date, contract type
- ✅ Staff-specific accessibility needs

---

## IPersonExtended - Learner Variant

```typescript
/**
 * IPersonExtended (Learner) - Student information
 * Additional fields specific to LEARNERS
 *
 * Used ONLY in Learner model
 */

export interface IEmergencyContact {
  name: string;
  relationship: 'parent' | 'guardian' | 'spouse' | 'sibling' | 'friend' | 'grandparent' | 'other';
  phones: IPhone[];
  email?: string;
  address?: IAddress;
  isPrimary: boolean;
  canPickup?: boolean;               // For minors: authorized for pickup
  hasLegalAuthority?: boolean;       // For minors: can make decisions
  notes?: string;
}

export interface IParentGuardian {
  name: string;
  relationship: 'parent' | 'legal-guardian' | 'foster-parent' | 'other';
  phones: IPhone[];
  email: string;
  address?: IAddress;
  isPrimary: boolean;
  hasLegalCustody: boolean;
  hasEducationalRights: boolean;     // Can access grades, records
  canAuthorizeReleases: boolean;     // Can approve field trips, etc.
  employerName?: string;
  employerPhone?: string;
  notes?: string;
}

export interface IIdentification {
  idNumber: string;                  // Encrypted in storage
  idType: 'student-id' | 'passport' | 'drivers-license' | 'state-id' | 'national-id' | 'birth-certificate' | 'other';
  issuingAuthority?: string;
  issueDate?: Date;
  expirationDate?: Date;
  countryOfIssue?: string;
  isVerified: boolean;
  verifiedBy?: string;               // Staff member who verified
  verifiedAt?: Date;
}

export interface IPriorEducation {
  institutionName: string;
  institutionType: 'high-school' | 'college' | 'university' | 'trade-school' | 'other';
  country?: string;
  startDate?: Date;
  endDate?: Date;
  degreeEarned?: string;
  gpa?: number;
  transcriptOnFile: boolean;
}

export interface IAccommodation {
  type: 'academic' | 'physical' | 'dietary' | 'medical' | 'other';
  description: string;
  approvedBy?: string;               // Accessibility services staff
  approvalDate?: Date;
  expirationDate?: Date;
  isActive: boolean;
  confidential: boolean;             // Only accessibility office can see details
}

/**
 * IPersonExtended for Learner
 */
export interface ILearnerPersonExtended {
  // ==========================================
  // STUDENT IDENTITY
  // ==========================================

  studentId?: string;                // Institutional student ID number
  formerNames?: string[];            // Previous names (for records matching)

  // ==========================================
  // EMERGENCY & GUARDIAN CONTACTS
  // ==========================================

  emergencyContacts: IEmergencyContact[];

  parentGuardians?: IParentGuardian[];  // For minors or dependent students

  // ==========================================
  // IDENTIFICATION
  // ==========================================

  identifications: IIdentification[];

  // ==========================================
  // EDUCATIONAL BACKGROUND
  // ==========================================

  priorEducation?: IPriorEducation[];

  highSchoolGraduationDate?: Date;
  highSchoolName?: string;
  expectedGraduationDate?: Date;

  // ==========================================
  // ACADEMIC SUPPORT
  // ==========================================

  accommodations?: IAccommodation[];

  primaryAdvisorId?: string;         // Reference to Staff member

  // ==========================================
  // ENROLLMENT STATUS
  // ==========================================

  enrollmentStatus?: 'prospective' | 'admitted' | 'enrolled' | 'on-hold' | 'withdrawn' | 'graduated';
  expectedEnrollmentDate?: Date;
  actualEnrollmentDate?: Date;

  // ==========================================
  // LEARNER PREFERENCES
  // ==========================================

  learningStylePreferences?: string[];  // ["visual", "hands-on", "auditory"]
  careerInterests?: string[];

  // ==========================================
  // HOUSING (if campus housing)
  // ==========================================

  housingStatus?: 'on-campus' | 'off-campus' | 'commuter' | 'none';
  dormName?: string;
  roomNumber?: string;

  // ==========================================
  // FINANCIAL (minimal, if needed)
  // ==========================================

  hasFinancialAid?: boolean;
  financialAidEligible?: boolean;

  // ==========================================
  // TRANSPORTATION (for safety)
  // ==========================================

  vehicleOnCampus?: boolean;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleLicensePlate?: string;
  parkingPermitNumber?: string;
}
```

### What Goes in ILearnerPersonExtended ✅

**Learner-only fields:**
- ✅ Student ID
- ✅ Emergency contacts (critical for minors)
- ✅ Parent/Guardian info (for minors, FERPA)
- ✅ Identifications (student ID, passport, etc.)
- ✅ Prior education history
- ✅ Academic accommodations (ADA compliance)
- ✅ Enrollment status, graduation dates
- ✅ Academic advisor
- ✅ Housing info (campus residency)
- ✅ Vehicle/parking (campus safety)
- ✅ Learning preferences

---

## IDemographics - Compliance & Reporting

```typescript
/**
 * IDemographics - Compliance and reporting data
 * OPTIONAL fields for federal reporting, diversity, accessibility
 *
 * Separate from IPerson to make privacy/opt-in explicit
 * Used by BOTH Staff and Learner models (same structure)
 */

export interface IDemographics {
  // ==========================================
  // GENDER & IDENTITY
  // ==========================================

  legalGender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  genderIdentity?: string;           // Self-described
  pronouns?: string;                 // "she/her", "they/them", etc.

  // ==========================================
  // ETHNICITY & RACE (IPEDS)
  // ==========================================

  isHispanicLatino?: boolean;

  race?: Array<
    'american-indian-alaska-native' |
    'asian' |
    'black-african-american' |
    'native-hawaiian-pacific-islander' |
    'white' |
    'other'
  >;

  ethnicityDetails?: string;         // Self-described details

  // ==========================================
  // CITIZENSHIP & RESIDENCY
  // ==========================================

  citizenship?: 'us-citizen' | 'permanent-resident' | 'visa' | 'refugee' | 'other';
  countryOfCitizenship?: string;
  countryOfBirth?: string;

  visaType?: string;                 // F-1, J-1, etc.
  visaExpirationDate?: Date;

  primaryLanguage?: string;          // Native language
  languagesSpoken?: string[];        // All languages

  // ==========================================
  // VETERAN & MILITARY
  // ==========================================

  veteranStatus?: boolean;
  militaryBranch?: string;
  militaryServiceDates?: {
    startDate?: Date;
    endDate?: Date;
  };

  // ==========================================
  // FIRST GENERATION & SOCIOECONOMIC
  // ==========================================

  firstGenerationStudent?: boolean;  // First in family to attend college

  parentHighestEducation?: 'less-than-high-school' | 'high-school' | 'some-college' | 'associates' | 'bachelors' | 'masters' | 'doctorate';

  eligibleForReducedLunch?: boolean; // Socioeconomic indicator (K-12)
  pellGrantEligible?: boolean;       // Financial need indicator

  // ==========================================
  // DISABILITY & ACCESSIBILITY
  // ==========================================

  hasDisability?: boolean;
  disabilityTypes?: Array<
    'learning' |
    'visual' |
    'hearing' |
    'mobility' |
    'cognitive' |
    'psychological' |
    'chronic-health' |
    'other'
  >;

  accommodationsRequired?: boolean;
  accommodationsSummary?: string;    // High-level summary (details in IAccommodation)

  // ==========================================
  // ADDITIONAL (Optional)
  // ==========================================

  religion?: string;                 // Optional, for cultural awareness
  maritalStatus?: 'single' | 'married' | 'domestic-partnership' | 'divorced' | 'widowed' | 'prefer-not-to-say';

  hasDependents?: boolean;
  numberOfDependents?: number;

  // ==========================================
  // METADATA
  // ==========================================

  selfReported: boolean;             // User-entered vs admin-entered
  reportedAt?: Date;
  lastUpdated?: Date;

  // Consent to use this data
  allowReporting?: boolean;          // Can use for IPEDS, Title IX reports
  allowResearch?: boolean;           // Can use for institutional research
}
```

### What Goes in IDemographics ✅

**Compliance & reporting fields:**
- ✅ Gender identity, pronouns
- ✅ Ethnicity, race (IPEDS reporting)
- ✅ Citizenship, visa status
- ✅ Veteran status
- ✅ First generation status
- ✅ Disability status, accommodation needs
- ✅ Primary language, languages spoken
- ✅ Socioeconomic indicators
- ✅ Opt-in consent for reporting

**Applies to:** BOTH Staff and Learner (same structure for both)

---

## Implementation in Current Models

### Staff Model

```typescript
// File: src/models/auth/Staff.model.ts

import { IPerson } from './Person.types';
import { IStaffPersonExtended } from './PersonExtended.types';
import { IDemographics } from './Demographics.types';

export interface IStaff extends Document {
  _id: mongoose.Types.ObjectId;

  // ==========================================
  // PERSONAL INFORMATION
  // ==========================================

  person: IPerson;                   // REQUIRED - Basic shared info
  personExtended?: IStaffPersonExtended;  // OPTIONAL - Staff-specific info
  demographics?: IDemographics;      // OPTIONAL - Compliance data

  // ==========================================
  // STAFF-SPECIFIC (Job-related, not personal)
  // ==========================================

  title?: string;                    // Job title: "Senior Instructor"
  departmentMemberships: IDepartmentMembership[];

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Methods...
}
```

**What changed:**
- ✅ `person` is now REQUIRED (basic info)
- ✅ Added `personExtended` (optional staff-specific)
- ✅ Added `demographics` (optional compliance)
- ❌ Removed duplicate fields (firstName, lastName, phoneNumber)
- ✅ Kept `title` in Staff model (it's job-related, not personal)

### Learner Model

```typescript
// File: src/models/auth/Learner.model.ts

import { IPerson } from './Person.types';
import { ILearnerPersonExtended } from './PersonExtended.types';
import { IDemographics } from './Demographics.types';

export interface ILearner extends Document {
  _id: mongoose.Types.ObjectId;

  // ==========================================
  // PERSONAL INFORMATION
  // ==========================================

  person: IPerson;                   // REQUIRED - Basic shared info
  personExtended?: ILearnerPersonExtended;  // OPTIONAL - Learner-specific info
  demographics?: IDemographics;      // OPTIONAL - Compliance data

  // ==========================================
  // LEARNER-SPECIFIC (Academic-related)
  // ==========================================

  departmentMemberships: IDepartmentMembership[];

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Methods...
}
```

**What changed:**
- ✅ `person` is now REQUIRED (basic info)
- ✅ Added `personExtended` (optional learner-specific)
- ✅ Added `demographics` (optional compliance)
- ❌ Removed duplicate fields (firstName, lastName, dateOfBirth, phoneNumber, address)
- ❌ Removed `emergencyContact` (now in personExtended.emergencyContacts)

### GlobalAdmin Model (if exists)

```typescript
// File: src/models/GlobalAdmin.model.ts

import { IPerson } from './Person.types';
import { IDemographics } from './Demographics.types';

export interface IGlobalAdmin extends Document {
  _id: mongoose.Types.ObjectId;

  // ==========================================
  // PERSONAL INFORMATION
  // ==========================================

  person: IPerson;                   // REQUIRED - Basic shared info
  // No personExtended - global admins don't need staff or learner specifics
  demographics?: IDemographics;      // OPTIONAL - Same structure as others

  // ==========================================
  // ADMIN-SPECIFIC
  // ==========================================

  adminLevel: 'super' | 'global' | 'system';
  permissions: string[];

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**What changed:**
- ✅ `person` is REQUIRED (basic info)
- ❌ No `personExtended` (global admins are not staff or learners)
- ✅ `demographics` available (same structure)

---

## File Structure

```
src/models/auth/
├── Person.types.ts              # IPerson (Basic) + supporting interfaces
├── PersonExtended.types.ts      # IStaffPersonExtended + ILearnerPersonExtended
├── Demographics.types.ts        # IDemographics (shared structure)
├── Staff.model.ts               # Uses IPerson + IStaffPersonExtended + IDemographics
├── Learner.model.ts             # Uses IPerson + ILearnerPersonExtended + IDemographics
└── User.model.ts                # No person data (only authentication)
```

---

## Data Flow Examples

### Example 1: Creating a Staff Member

```typescript
await Staff.create({
  _id: userId,

  // Basic info (REQUIRED)
  person: {
    firstName: 'John',
    lastName: 'Doe',
    preferredFirstName: 'Johnny',
    pronouns: 'he/him',
    emails: [{
      email: 'john.doe@university.edu',
      type: 'institutional',
      isPrimary: true,
      verified: true,
      allowNotifications: true
    }],
    phones: [{
      number: '+1-555-1234',
      type: 'mobile',
      isPrimary: true,
      verified: true,
      allowSMS: true
    }],
    addresses: [{
      street1: '123 Campus Dr',
      city: 'College Town',
      state: 'CA',
      postalCode: '12345',
      country: 'USA',
      type: 'campus',
      isPrimary: true,
      verified: false
    }],
    dateOfBirth: new Date('1985-05-15'),
    avatar: '/avatars/john-doe.jpg',
    timezone: 'America/Los_Angeles',
    languagePreference: 'en'
  },

  // Staff-specific info (OPTIONAL)
  personExtended: {
    professionalTitle: 'Associate Professor',
    officeLocation: 'Science Building, Room 305',
    headline: 'Biologist specializing in Marine Ecosystems',
    credentials: [{
      type: 'degree',
      name: 'PhD in Marine Biology',
      issuingInstitution: 'Stanford University',
      fieldOfStudy: 'Marine Biology',
      dateEarned: new Date('2012-06-15'),
      verified: true
    }],
    researchInterests: ['Marine Ecosystems', 'Climate Change', 'Coral Reefs'],
    officeHours: [{
      dayOfWeek: 'monday',
      startTime: '14:00',
      endTime: '16:00',
      location: 'Office 305',
      isActive: true
    }],
    linkedInUrl: 'https://linkedin.com/in/johndoe',
    orcidId: '0000-0001-2345-6789',
    employeeId: 'EMP-12345',
    hireDate: new Date('2015-08-01'),
    contractType: 'full-time'
  },

  // Demographics (OPTIONAL - compliance reporting)
  demographics: {
    legalGender: 'male',
    pronouns: 'he/him',
    race: ['white'],
    citizenship: 'us-citizen',
    veteranStatus: false,
    firstGenerationStudent: false,
    hasDisability: false,
    selfReported: true,
    reportedAt: new Date(),
    allowReporting: true
  },

  // Job-related fields
  title: 'Associate Professor',
  departmentMemberships: [...],
  isActive: true
});
```

### Example 2: Creating a Learner

```typescript
await Learner.create({
  _id: userId,

  // Basic info (REQUIRED)
  person: {
    firstName: 'Maria',
    lastName: 'Garcia',
    preferredFirstName: 'Mari',
    pronouns: 'she/her',
    emails: [{
      email: 'maria.garcia@student.edu',
      type: 'institutional',
      isPrimary: true,
      verified: true,
      allowNotifications: true
    }],
    phones: [{
      number: '+1-555-9876',
      type: 'mobile',
      isPrimary: true,
      verified: true,
      allowSMS: true
    }],
    addresses: [{
      street1: '456 Dorm Hall',
      city: 'College Town',
      state: 'CA',
      postalCode: '12345',
      country: 'USA',
      type: 'campus',
      isPrimary: true,
      verified: true
    }],
    dateOfBirth: new Date('2005-03-20'),
    avatar: '/avatars/maria-garcia.jpg',
    timezone: 'America/Los_Angeles',
    languagePreference: 'en'
  },

  // Learner-specific info (OPTIONAL but recommended)
  personExtended: {
    studentId: 'STU-67890',
    emergencyContacts: [{
      name: 'Carlos Garcia',
      relationship: 'parent',
      phones: [{
        number: '+1-555-1111',
        type: 'mobile',
        isPrimary: true,
        verified: false,
        allowSMS: true
      }],
      email: 'carlos.garcia@email.com',
      isPrimary: true,
      canPickup: true,
      hasLegalAuthority: true
    }],
    identifications: [{
      idNumber: 'STU-67890',  // Encrypted in actual storage
      idType: 'student-id',
      issuingAuthority: 'University',
      issueDate: new Date('2023-08-15'),
      isVerified: true,
      verifiedBy: 'admin@university.edu',
      verifiedAt: new Date('2023-08-15')
    }],
    priorEducation: [{
      institutionName: 'Lincoln High School',
      institutionType: 'high-school',
      startDate: new Date('2019-09-01'),
      endDate: new Date('2023-06-15'),
      degreeEarned: 'High School Diploma',
      gpa: 3.8,
      transcriptOnFile: true
    }],
    highSchoolGraduationDate: new Date('2023-06-15'),
    expectedGraduationDate: new Date('2027-05-15'),
    enrollmentStatus: 'enrolled',
    actualEnrollmentDate: new Date('2023-08-20'),
    housingStatus: 'on-campus',
    dormName: 'North Hall',
    roomNumber: '305'
  },

  // Demographics (OPTIONAL - same structure as Staff)
  demographics: {
    legalGender: 'female',
    pronouns: 'she/her',
    isHispanicLatino: true,
    race: ['white'],
    citizenship: 'us-citizen',
    primaryLanguage: 'Spanish',
    languagesSpoken: ['Spanish', 'English'],
    firstGenerationStudent: true,
    pellGrantEligible: true,
    hasDisability: false,
    selfReported: true,
    reportedAt: new Date(),
    allowReporting: true
  },

  departmentMemberships: [...],
  isActive: true
});
```

### Example 3: Accessing Data

```typescript
// Get staff member
const staff = await Staff.findById(staffId);

// Basic info (ALWAYS available)
console.log(staff.person.firstName);           // "John"
console.log(staff.person.preferredFirstName);  // "Johnny"
console.log(staff.person.emails[0].email);     // "john.doe@university.edu"
console.log(staff.person.phones[0].number);    // "+1-555-1234"

// Staff-specific info (if provided)
if (staff.personExtended) {
  console.log(staff.personExtended.professionalTitle);  // "Associate Professor"
  console.log(staff.personExtended.officeLocation);     // "Science Building, Room 305"
  console.log(staff.personExtended.credentials.length); // 1 (PhD)
}

// Demographics (if provided and user consented)
if (staff.demographics?.allowReporting) {
  console.log(staff.demographics.race);         // ["white"]
  console.log(staff.demographics.veteranStatus); // false
}

// Job-specific (in Staff model, not person)
console.log(staff.title);                       // "Associate Professor"
console.log(staff.departmentMemberships);       // [...]
```

---

## Summary: What Goes Where

### ✅ IPerson (Basic) - SHARED by All
**Core fields everyone needs:**
- Name (legal + preferred)
- Pronouns
- Contact (emails, phones, addresses)
- Date of birth, last 4 SSN
- Avatar, bio
- Timezone, language, locale
- Communication preferences
- Legal consent (FERPA, photo, etc.)

### ✅ IStaffPersonExtended - Staff Only
**Professional/academic fields:**
- Professional title, office location
- Credentials (degrees, certifications, licenses)
- Research interests, publications
- Professional memberships
- Office hours
- Academic social links (ORCID, Google Scholar)
- Employee ID, hire date, contract type

### ✅ ILearnerPersonExtended - Learner Only
**Student-specific fields:**
- Student ID
- Emergency contacts
- Parent/Guardian info (minors)
- Identifications (student ID, passport, etc.)
- Prior education history
- Accommodations (ADA)
- Enrollment status, graduation dates
- Academic advisor
- Housing, parking info

### ✅ IDemographics - SHARED Structure (Optional)
**Compliance/reporting fields:**
- Gender identity, pronouns
- Ethnicity, race (IPEDS)
- Citizenship, visa status
- Veteran status
- First generation status
- Disability status
- Language proficiency
- Opt-in consent for reporting

---

## Migration Path

1. **Create new type files:**
   - `Person.types.ts` (IPerson basic)
   - `PersonExtended.types.ts` (Staff and Learner variants)
   - `Demographics.types.ts` (IDemographics)

2. **Update models:**
   - Staff: Add `person`, `personExtended`, `demographics`
   - Learner: Add `person`, `personExtended`, `demographics`
   - Remove duplicate fields from both

3. **Migrate existing data:**
   - Copy legacy fields → `person` (basic)
   - Copy context-specific fields → `personExtended`
   - Leave `demographics` null (users will fill out gradually)

4. **Update services:**
   - Access `staff.person.firstName` instead of `staff.firstName`
   - Access `staff.personExtended.officeLocation` for staff-specific
   - Check `staff.demographics?.allowReporting` before using compliance data

---

## Questions for You

1. **Emergency Contacts:**
   - ✅ In `ILearnerPersonExtended.emergencyContacts` (learner-only)
   - OR also add to `IStaffPersonExtended` (staff can have emergency contacts too)?

2. **Student ID:**
   - ✅ In `ILearnerPersonExtended.studentId` (learner-only)
   - OR in `IIdentification` as type `'student-id'`?

3. **Demographics Opt-In:**
   - Should demographics collection be:
     - **Optional:** User can skip entirely
     - **Required minimal:** Must provide gender/ethnicity for IPEDS
     - **Encouraged:** System prompts to complete but allows skip

4. **Title Field Duplication:**
   - Currently `title` is in Staff model AND could be in `personExtended.professionalTitle`
   - Should we:
     - Keep both (title = job title, professionalTitle = academic title)?
     - Merge into one in personExtended?
     - Keep in Staff model only (it's job-related)?

5. **Pronouns Location:**
   - Currently in both `IPerson.pronouns` AND `IDemographics.pronouns`
   - Should we:
     - Only in IPerson (everyone can set pronouns)?
     - Only in Demographics (compliance data)?
     - Both (IPerson for display, Demographics for reporting)?

---

**Ready for your feedback on this architecture!** 🎯

Once you approve the structure, I'll implement all three types with migration scripts.
