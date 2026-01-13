/**
 * Person Type Definitions for Frontend
 *
 * These TypeScript types match the API contracts and can be imported
 * directly into the UI codebase for type-safe development.
 *
 * @see contracts/api/person.contract.ts
 * @see contracts/api/demographics.contract.ts
 * @see contracts/api/users.contract.ts
 */

// ============================================================================
// PERSON (BASIC)
// ============================================================================

export interface IPhone {
  number: string;
  type: 'mobile' | 'home' | 'work' | 'other';
  isPrimary: boolean;
  verified: boolean;
  allowSMS: boolean;
  label?: string;
}

export interface IEmail {
  email: string;
  type: 'institutional' | 'personal' | 'work' | 'other';
  isPrimary: boolean;
  verified: boolean;
  allowNotifications: boolean;
  label?: string;
}

export interface IAddress {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  type: 'home' | 'work' | 'mailing' | 'other';
  isPrimary: boolean;
  label?: string;
}

export interface ILegalConsent {
  ferpaConsent?: boolean;
  ferpaConsentDate?: string; // ISO date string
  gdprConsent?: boolean;
  gdprConsentDate?: string;
  photoConsent?: boolean;
  photoConsentDate?: string;
  marketingConsent?: boolean;
  marketingConsentDate?: string;
  thirdPartyDataSharing?: boolean;
  thirdPartyDataSharingDate?: string;
}

export interface ICommunicationPreferences {
  preferredMethod?: 'email' | 'phone' | 'sms' | 'mail';
  allowEmail?: boolean;
  allowSMS?: boolean;
  allowPhoneCalls?: boolean;
  quietHoursStart?: string; // HH:MM format
  quietHoursEnd?: string;
  notificationFrequency?: 'immediate' | 'daily-digest' | 'weekly-digest' | 'none';
}

export interface IPerson {
  // Core Identity
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  preferredFirstName?: string;
  preferredLastName?: string;
  pronouns?: string;

  // Contact
  emails: IEmail[];
  phones: IPhone[];
  addresses: IAddress[];

  // Personal
  dateOfBirth?: string; // ISO date string
  last4SSN?: string;

  // Profile
  avatar?: string;
  bio?: string;

  // Preferences
  timezone: string;
  languagePreference: string;
  locale?: string;

  // Communication & Legal
  communicationPreferences?: ICommunicationPreferences;
  legalConsent?: ILegalConsent;
}

// ============================================================================
// PERSON EXTENDED (STAFF)
// ============================================================================

export interface ICredential {
  type: 'degree' | 'certification' | 'license' | 'other';
  name: string;
  issuingOrganization: string;
  dateEarned?: string;
  expirationDate?: string;
  credentialId?: string;
  fieldOfStudy?: string;
}

export interface IPublication {
  title: string;
  type: 'journal-article' | 'conference-paper' | 'book' | 'book-chapter' | 'other';
  authors: string;
  venue: string;
  publicationDate?: string;
  doi?: string;
  url?: string;
  abstract?: string;
}

export interface IProfessionalMembership {
  organizationName: string;
  membershipType?: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  memberId?: string;
}

export interface IOfficeHours {
  dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  startTime: string; // HH:MM
  endTime: string;
  location?: string;
  appointmentRequired?: boolean;
  notes?: string;
}

export interface IStaffPersonExtended {
  professionalTitle?: string;
  officeLocation?: string;
  headline?: string;
  credentials: ICredential[];
  researchInterests?: string[];
  publications?: IPublication[];
  professionalMemberships?: IProfessionalMembership[];
  officeHours?: IOfficeHours[];
  linkedInUrl?: string;
  orcidId?: string;
  googleScholarUrl?: string;
  websiteUrl?: string;
  employeeId?: string;
  hireDate?: string;
  contractType?: 'full-time' | 'part-time' | 'adjunct' | 'visiting' | 'emeritus';
  academicRank?: 'instructor' | 'assistant-professor' | 'associate-professor' | 'professor' | 'distinguished-professor';
}

// ============================================================================
// PERSON EXTENDED (LEARNER)
// ============================================================================

export interface IEmergencyContact {
  fullName: string;
  relationship: string;
  primaryPhone: string;
  secondaryPhone?: string;
  email?: string;
  address?: {
    street1: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  priority: number;
  medicalAuthorization?: boolean;
  pickupAuthorization?: boolean;
  notes?: string;
}

export interface IParentGuardian {
  fullName: string;
  relationship: 'mother' | 'father' | 'legal-guardian' | 'other';
  isCustodial: boolean;
  phones: Array<{
    number: string;
    type: 'mobile' | 'home' | 'work';
    isPrimary: boolean;
  }>;
  emails: Array<{
    email: string;
    type: 'personal' | 'work';
    isPrimary: boolean;
  }>;
  address?: {
    street1: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  employer?: string;
  jobTitle?: string;
  educationLevel?: 'high-school' | 'some-college' | 'associates' | 'bachelors' | 'masters' | 'doctorate' | 'other';
  ferpaAccess?: boolean;
  notes?: string;
}

export interface IIdentification {
  idNumber: string; // Will be encrypted by API
  idType: 'passport' | 'drivers-license' | 'state-id' | 'student-id' | 'visa' | 'birth-certificate' | 'other';
  issuingAuthority?: string;
  issueDate?: string;
  expirationDate?: string;
  documentUrl?: string;
}

export interface IPriorEducation {
  institutionName: string;
  institutionType: 'high-school' | 'community-college' | 'university' | 'vocational' | 'other';
  degreeEarned?: string;
  major?: string;
  minor?: string;
  startDate?: string;
  endDate?: string;
  gpa?: number;
  gpaScale?: number;
  graduated: boolean;
  transcriptOnFile?: boolean;
}

export interface IAccommodation {
  type: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  documentationOnFile?: boolean;
  instructorNotes?: string;
}

export interface ILearnerPersonExtended {
  studentId?: string;
  emergencyContacts: IEmergencyContact[];
  parentGuardians?: IParentGuardian[];
  identifications: IIdentification[];
  priorEducation?: IPriorEducation[];
  transferCredits?: number;
  accommodations?: IAccommodation[];
  enrollmentStatus?: 'prospective' | 'admitted' | 'enrolled' | 'leave-of-absence' | 'withdrawn' | 'graduated' | 'expelled';
  expectedGraduationDate?: string;
  actualGraduationDate?: string;
  housingStatus?: 'on-campus' | 'off-campus' | 'commuter' | 'other';
  residenceHall?: string;
  roomNumber?: string;
  vehicleOnCampus?: boolean;
  vehicleInfo?: string;
  parkingPermit?: string;
  financialAidRecipient?: boolean;
  workStudyParticipant?: boolean;
}

// ============================================================================
// DEMOGRAPHICS
// ============================================================================

export type RaceCategory =
  | 'american-indian-alaska-native'
  | 'asian'
  | 'black-african-american'
  | 'native-hawaiian-pacific-islander'
  | 'white'
  | 'two-or-more-races'
  | 'other'
  | 'prefer-not-to-say';

export type LegalGender =
  | 'male'
  | 'female'
  | 'non-binary'
  | 'other'
  | 'prefer-not-to-say';

export type CitizenshipStatus =
  | 'us-citizen'
  | 'us-national'
  | 'permanent-resident'
  | 'refugee-asylee'
  | 'temporary-resident'
  | 'visa-holder'
  | 'other'
  | 'prefer-not-to-say';

export type VisaType = 'f1' | 'j1' | 'h1b' | 'm1' | 'h4' | 'other';

export type MaritalStatus =
  | 'single'
  | 'married'
  | 'domestic-partnership'
  | 'divorced'
  | 'widowed'
  | 'separated'
  | 'prefer-not-to-say';

export type VeteranStatus =
  | 'not-veteran'
  | 'active-duty'
  | 'veteran'
  | 'reserve'
  | 'dependent'
  | 'prefer-not-to-say';

export type EducationLevel =
  | 'less-than-high-school'
  | 'high-school'
  | 'some-college'
  | 'associates'
  | 'bachelors'
  | 'masters'
  | 'doctorate';

export type DisabilityType =
  | 'physical'
  | 'learning'
  | 'mental-health'
  | 'visual'
  | 'hearing'
  | 'chronic-illness'
  | 'other';

export type IncomeRange =
  | 'under-25k'
  | '25k-50k'
  | '50k-75k'
  | '75k-100k'
  | '100k-150k'
  | 'over-150k'
  | 'prefer-not-to-say';

export interface IDemographics {
  // Gender & Identity
  legalGender?: LegalGender;
  genderIdentity?: string;
  pronouns?: string;

  // Race & Ethnicity
  isHispanicLatino?: boolean;
  race?: RaceCategory[];
  tribalAffiliation?: string;

  // Citizenship
  citizenship?: CitizenshipStatus;
  countryOfCitizenship?: string; // ISO 3166-1 alpha-2
  countryOfBirth?: string;
  visaType?: VisaType;
  visaExpirationDate?: string;
  alienRegistrationNumber?: string;

  // Personal Status
  maritalStatus?: MaritalStatus;
  numberOfDependents?: number;

  // Veteran & Military
  veteranStatus?: VeteranStatus;
  militaryBranch?: string;
  yearsOfService?: number;
  dischargeType?: 'honorable' | 'general' | 'other-than-honorable' | 'dishonorable' | 'bad-conduct';

  // First Generation
  firstGenerationStudent?: boolean;
  parent1EducationLevel?: EducationLevel;
  parent2EducationLevel?: EducationLevel;

  // Disability
  hasDisability?: boolean;
  disabilityType?: DisabilityType[];
  accommodationsRequired?: boolean;

  // Language
  primaryLanguage?: string; // ISO 639-1
  englishProficiency?: 'native' | 'fluent' | 'advanced' | 'intermediate' | 'basic' | 'limited';
  otherLanguages?: string[];

  // Socioeconomic
  pellEligible?: boolean;
  lowIncomeStatus?: boolean;
  householdIncomeRange?: IncomeRange;

  // Religion
  religiousAffiliation?: string;
  religiousAccommodations?: boolean;

  // Consent
  allowReporting?: boolean;
  allowResearch?: boolean;
  lastUpdated?: string;
  collectedDate?: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface UserResponse {
  id: string;
  email: string;
  role: 'global-admin' | 'staff' | 'learner';
  status: 'active' | 'inactive' | 'withdrawn';
  isActive: boolean;
  person: IPerson;
  // Staff fields (when role === 'staff')
  departments?: string[];
  permissions?: string[];
  departmentRoles?: Array<{
    departmentId: string;
    role: string;
  }>;
  // Learner fields (when role === 'learner')
  studentId?: string;
  programEnrollments?: string[];
  courseEnrollments?: string[];
  // Metadata
  createdAt: string;
  lastLoginAt?: string;
  updatedAt: string;
}

export interface PersonExtendedResponse {
  role: 'staff' | 'learner';
  staff?: IStaffPersonExtended;
  learner?: ILearnerPersonExtended;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get primary email or first email
 */
export function getPrimaryEmail(person: IPerson): IEmail | undefined {
  return person.emails.find(e => e.isPrimary) || person.emails[0];
}

/**
 * Get primary phone or first phone
 */
export function getPrimaryPhone(person: IPerson): IPhone | undefined {
  return person.phones.find(p => p.isPrimary) || person.phones[0];
}

/**
 * Get primary address or first address
 */
export function getPrimaryAddress(person: IPerson): IAddress | undefined {
  return person.addresses.find(a => a.isPrimary) || person.addresses[0];
}

/**
 * Get display name (prefers preferred name over legal name)
 */
export function getDisplayName(person: IPerson): string {
  const firstName = person.preferredFirstName || person.firstName;
  const lastName = person.preferredLastName || person.lastName;
  return `${firstName} ${lastName}`.trim();
}

/**
 * Get full legal name
 */
export function getFullLegalName(person: IPerson): string {
  const parts = [
    person.firstName,
    person.middleName,
    person.lastName,
    person.suffix
  ].filter(Boolean);
  return parts.join(' ');
}

/**
 * Format phone number for display (US format)
 */
export function formatPhoneNumber(phone: IPhone): string {
  const cleaned = phone.number.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone.number;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate phone number (basic E.164)
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  return /^\+?[1-9]\d{1,14}$/.test(cleaned);
}

/**
 * Check if demographics is complete for IPEDS reporting
 */
export function isIPEDSComplete(demographics: IDemographics): boolean {
  return (
    demographics.isHispanicLatino !== undefined &&
    demographics.race !== undefined &&
    demographics.race.length > 0
  );
}
