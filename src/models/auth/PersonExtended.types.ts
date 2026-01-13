/**
 * PersonExtended Types - Context-specific person data
 *
 * This file defines extended person structures that are specific to either
 * Staff or Learner contexts. Shared fields belong in Person.types.ts (Basic).
 *
 * @module models/auth/PersonExtended.types
 */

import { Schema } from 'mongoose';

// ============================================================================
// STAFF-SPECIFIC INTERFACES
// ============================================================================

/**
 * Professional credential (degree, certification, license)
 */
export interface ICredential {
  /** Type of credential */
  type: 'degree' | 'certification' | 'license' | 'other';

  /** Name/title of credential (e.g., "Ph.D. in Computer Science") */
  name: string;

  /** Issuing institution/organization */
  issuingOrganization: string;

  /** Date issued/earned */
  dateEarned?: Date;

  /** Expiration date (for certifications/licenses) */
  expirationDate?: Date;

  /** Credential number/ID */
  credentialId?: string;

  /** Field of study (for degrees) */
  fieldOfStudy?: string;
}

/**
 * Academic or professional publication
 */
export interface IPublication {
  /** Title of publication */
  title: string;

  /** Type of publication */
  type: 'journal-article' | 'conference-paper' | 'book' | 'book-chapter' | 'other';

  /** Authors (comma-separated) */
  authors: string;

  /** Publication venue (journal, conference, publisher) */
  venue: string;

  /** Publication date */
  publicationDate?: Date;

  /** DOI (Digital Object Identifier) */
  doi?: string;

  /** URL to publication */
  url?: string;

  /** Abstract/summary */
  abstract?: string;
}

/**
 * Professional organization membership
 */
export interface IProfessionalMembership {
  /** Organization name */
  organizationName: string;

  /** Type of membership */
  membershipType?: string; // e.g., "Full Member", "Fellow", "Associate"

  /** Start date */
  startDate?: Date;

  /** End date (if no longer active) */
  endDate?: Date;

  /** Whether currently active */
  isActive: boolean;

  /** Member ID/number */
  memberId?: string;
}

/**
 * Office hours schedule
 */
export interface IOfficeHours {
  /** Day of week */
  dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

  /** Start time (24-hour format, e.g., "14:00") */
  startTime: string;

  /** End time (24-hour format, e.g., "16:00") */
  endTime: string;

  /** Location (office number, building, or "Virtual") */
  location?: string;

  /** Whether appointment is required */
  appointmentRequired?: boolean;

  /** Additional notes */
  notes?: string;
}

/**
 * Staff-specific extended person data
 */
export interface IStaffPersonExtended {
  // ========================================
  // Professional Identity
  // ========================================

  /** Professional title (e.g., "Associate Professor", "Department Chair") */
  professionalTitle?: string;

  /** Office location (building & room number) */
  officeLocation?: string;

  /** Professional headline/tagline */
  headline?: string;

  // ========================================
  // Academic & Professional Background
  // ========================================

  /** Academic degrees, certifications, licenses */
  credentials: ICredential[];

  /** Research interests/specializations */
  researchInterests?: string[];

  /** Publications (papers, books, etc.) */
  publications?: IPublication[];

  /** Professional organization memberships */
  professionalMemberships?: IProfessionalMembership[];

  // ========================================
  // Teaching & Availability
  // ========================================

  /** Office hours schedule */
  officeHours?: IOfficeHours[];

  // ========================================
  // Professional Links
  // ========================================

  /** LinkedIn profile URL */
  linkedInUrl?: string;

  /** ORCID iD (researcher identifier) */
  orcidId?: string;

  /** Google Scholar profile URL */
  googleScholarUrl?: string;

  /** Personal/professional website */
  websiteUrl?: string;

  // ========================================
  // Institution-Specific
  // ========================================

  /** Employee ID number */
  employeeId?: string;

  /** Date hired by institution */
  hireDate?: Date;

  /** Employment contract type */
  contractType?: 'full-time' | 'part-time' | 'adjunct' | 'visiting' | 'emeritus';

  /** Academic rank (for faculty) */
  academicRank?: 'instructor' | 'assistant-professor' | 'associate-professor' | 'professor' | 'distinguished-professor';
}

// ============================================================================
// LEARNER-SPECIFIC INTERFACES
// ============================================================================

/**
 * Emergency contact information
 */
export interface IEmergencyContact {
  /** Contact's full name */
  fullName: string;

  /** Relationship to learner */
  relationship: string; // e.g., "Mother", "Father", "Spouse", "Guardian"

  /** Primary phone number */
  primaryPhone: string;

  /** Secondary phone number */
  secondaryPhone?: string;

  /** Email address */
  email?: string;

  /** Physical address */
  address?: {
    street1: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };

  /** Priority order (1 = primary emergency contact) */
  priority: number;

  /** Whether this contact is authorized to make medical decisions */
  medicalAuthorization?: boolean;

  /** Whether this contact is authorized to pick up student */
  pickupAuthorization?: boolean;

  /** Additional notes */
  notes?: string;
}

/**
 * Parent or legal guardian information
 */
export interface IParentGuardian {
  /** Full name */
  fullName: string;

  /** Relationship */
  relationship: 'mother' | 'father' | 'legal-guardian' | 'other';

  /** Whether this is the custodial parent/guardian */
  isCustodial: boolean;

  /** Phone numbers */
  phones: Array<{
    number: string;
    type: 'mobile' | 'home' | 'work';
    isPrimary: boolean;
  }>;

  /** Email addresses */
  emails: Array<{
    email: string;
    type: 'personal' | 'work';
    isPrimary: boolean;
  }>;

  /** Mailing address */
  address?: {
    street1: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };

  /** Employer */
  employer?: string;

  /** Job title */
  jobTitle?: string;

  /** Education level */
  educationLevel?: 'high-school' | 'some-college' | 'associates' | 'bachelors' | 'masters' | 'doctorate' | 'other';

  /** Whether has FERPA access (can view student records) */
  ferpaAccess?: boolean;

  /** Additional notes */
  notes?: string;
}

/**
 * Identification document
 */
export interface IIdentification {
  /** ID number (should be encrypted in storage) */
  idNumber: string;

  /** Type of identification */
  idType: 'passport' | 'drivers-license' | 'state-id' | 'student-id' | 'visa' | 'birth-certificate' | 'other';

  /** Issuing authority/country */
  issuingAuthority?: string;

  /** Issue date */
  issueDate?: Date;

  /** Expiration date */
  expirationDate?: Date;

  /** Document file URL (if scanned) */
  documentUrl?: string;
}

/**
 * Prior education/academic background
 */
export interface IPriorEducation {
  /** Institution name */
  institutionName: string;

  /** Type of institution */
  institutionType: 'high-school' | 'community-college' | 'university' | 'vocational' | 'other';

  /** Degree/credential earned */
  degreeEarned?: string; // e.g., "High School Diploma", "Associate of Arts", "Bachelor of Science"

  /** Major/field of study */
  major?: string;

  /** Minor/field of study */
  minor?: string;

  /** Start date */
  startDate?: Date;

  /** End date (or expected graduation) */
  endDate?: Date;

  /** GPA */
  gpa?: number;

  /** GPA scale (e.g., 4.0, 5.0) */
  gpaScale?: number;

  /** Graduated? */
  graduated: boolean;

  /** Transcript on file? */
  transcriptOnFile?: boolean;
}

/**
 * ADA/disability accommodation
 */
export interface IAccommodation {
  /** Type of accommodation */
  type: string; // e.g., "Extended Test Time", "Note Taker", "Accessible Seating"

  /** Detailed description */
  description?: string;

  /** Start date (when accommodation becomes effective) */
  startDate?: Date;

  /** End date (if temporary) */
  endDate?: Date;

  /** Whether currently active */
  isActive: boolean;

  /** Supporting documentation on file? */
  documentationOnFile?: boolean;

  /** Notes for instructors */
  instructorNotes?: string;
}

/**
 * Learner-specific extended person data
 */
export interface ILearnerPersonExtended {
  // ========================================
  // Student Identity
  // ========================================

  /** Student ID number */
  studentId?: string;

  // ========================================
  // Emergency & Family Contacts (CRITICAL)
  // ========================================

  /** Emergency contacts (ordered by priority) */
  emergencyContacts: IEmergencyContact[];

  /** Parents/legal guardians */
  parentGuardians?: IParentGuardian[];

  // ========================================
  // Identification Documents
  // ========================================

  /** Government-issued IDs, student IDs, visas */
  identifications: IIdentification[];

  // ========================================
  // Academic Background
  // ========================================

  /** Prior education history */
  priorEducation?: IPriorEducation[];

  /** Transfer credits awarded */
  transferCredits?: number;

  // ========================================
  // Accommodations & Support
  // ========================================

  /** ADA/disability accommodations */
  accommodations?: IAccommodation[];

  // ========================================
  // Enrollment Status
  // ========================================

  /** Current enrollment status */
  enrollmentStatus?: 'prospective' | 'admitted' | 'enrolled' | 'leave-of-absence' | 'withdrawn' | 'graduated' | 'expelled';

  /** Expected graduation date */
  expectedGraduationDate?: Date;

  /** Actual graduation date */
  actualGraduationDate?: Date;

  // ========================================
  // Campus Life
  // ========================================

  /** Housing status */
  housingStatus?: 'on-campus' | 'off-campus' | 'commuter' | 'other';

  /** Residence hall/building (if on-campus) */
  residenceHall?: string;

  /** Room number (if on-campus) */
  roomNumber?: string;

  /** Vehicle on campus? */
  vehicleOnCampus?: boolean;

  /** Vehicle make/model/plate (if applicable) */
  vehicleInfo?: string;

  /** Parking permit number */
  parkingPermit?: string;

  // ========================================
  // Financial
  // ========================================

  /** Financial aid recipient? */
  financialAidRecipient?: boolean;

  /** Work-study participant? */
  workStudyParticipant?: boolean;
}

// ============================================================================
// MONGOOSE SCHEMAS
// ============================================================================

// ----------------------------------------------------------------------------
// STAFF SCHEMAS
// ----------------------------------------------------------------------------

export const CredentialSchema = new Schema<ICredential>(
  {
    type: {
      type: String,
      enum: ['degree', 'certification', 'license', 'other'],
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    issuingOrganization: {
      type: String,
      required: true,
      trim: true
    },
    dateEarned: { type: Date },
    expirationDate: { type: Date },
    credentialId: {
      type: String,
      trim: true
    },
    fieldOfStudy: {
      type: String,
      trim: true
    }
  },
  { _id: false }
);

export const PublicationSchema = new Schema<IPublication>(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['journal-article', 'conference-paper', 'book', 'book-chapter', 'other'],
      required: true
    },
    authors: {
      type: String,
      required: true,
      trim: true
    },
    venue: {
      type: String,
      required: true,
      trim: true
    },
    publicationDate: { type: Date },
    doi: {
      type: String,
      trim: true
    },
    url: {
      type: String,
      trim: true
    },
    abstract: {
      type: String,
      trim: true
    }
  },
  { _id: false }
);

export const ProfessionalMembershipSchema = new Schema<IProfessionalMembership>(
  {
    organizationName: {
      type: String,
      required: true,
      trim: true
    },
    membershipType: {
      type: String,
      trim: true
    },
    startDate: { type: Date },
    endDate: { type: Date },
    isActive: {
      type: Boolean,
      default: true
    },
    memberId: {
      type: String,
      trim: true
    }
  },
  { _id: false }
);

export const OfficeHoursSchema = new Schema<IOfficeHours>(
  {
    dayOfWeek: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      required: true
    },
    startTime: {
      type: String,
      required: true,
      validate: {
        validator: function(v: string) {
          return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
        },
        message: 'Start time must be in HH:MM format (24-hour)'
      }
    },
    endTime: {
      type: String,
      required: true,
      validate: {
        validator: function(v: string) {
          return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
        },
        message: 'End time must be in HH:MM format (24-hour)'
      }
    },
    location: {
      type: String,
      trim: true
    },
    appointmentRequired: {
      type: Boolean,
      default: false
    },
    notes: {
      type: String,
      trim: true
    }
  },
  { _id: false }
);

export const StaffPersonExtendedSchema = new Schema<IStaffPersonExtended>(
  {
    // Professional Identity
    professionalTitle: {
      type: String,
      trim: true
    },
    officeLocation: {
      type: String,
      trim: true
    },
    headline: {
      type: String,
      trim: true,
      maxlength: 200
    },

    // Academic & Professional Background
    credentials: {
      type: [CredentialSchema],
      default: []
    },
    researchInterests: {
      type: [String],
      default: []
    },
    publications: {
      type: [PublicationSchema],
      default: []
    },
    professionalMemberships: {
      type: [ProfessionalMembershipSchema],
      default: []
    },

    // Teaching & Availability
    officeHours: {
      type: [OfficeHoursSchema],
      default: []
    },

    // Professional Links
    linkedInUrl: {
      type: String,
      trim: true
    },
    orcidId: {
      type: String,
      trim: true
    },
    googleScholarUrl: {
      type: String,
      trim: true
    },
    websiteUrl: {
      type: String,
      trim: true
    },

    // Institution-Specific
    employeeId: {
      type: String,
      trim: true
    },
    hireDate: { type: Date },
    contractType: {
      type: String,
      enum: ['full-time', 'part-time', 'adjunct', 'visiting', 'emeritus']
    },
    academicRank: {
      type: String,
      enum: ['instructor', 'assistant-professor', 'associate-professor', 'professor', 'distinguished-professor']
    }
  },
  { _id: false }
);

// ----------------------------------------------------------------------------
// LEARNER SCHEMAS
// ----------------------------------------------------------------------------

export const EmergencyContactSchema = new Schema<IEmergencyContact>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    relationship: {
      type: String,
      required: true,
      trim: true
    },
    primaryPhone: {
      type: String,
      required: true,
      trim: true
    },
    secondaryPhone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    address: {
      street1: String,
      street2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    },
    priority: {
      type: Number,
      required: true,
      min: 1
    },
    medicalAuthorization: {
      type: Boolean,
      default: false
    },
    pickupAuthorization: {
      type: Boolean,
      default: false
    },
    notes: {
      type: String,
      trim: true
    }
  },
  { _id: false }
);

export const ParentGuardianSchema = new Schema<IParentGuardian>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    relationship: {
      type: String,
      enum: ['mother', 'father', 'legal-guardian', 'other'],
      required: true
    },
    isCustodial: {
      type: Boolean,
      default: true
    },
    phones: [{
      number: { type: String, required: true },
      type: { type: String, enum: ['mobile', 'home', 'work'], required: true },
      isPrimary: { type: Boolean, default: false }
    }],
    emails: [{
      email: { type: String, required: true, lowercase: true },
      type: { type: String, enum: ['personal', 'work'], required: true },
      isPrimary: { type: Boolean, default: false }
    }],
    address: {
      street1: String,
      street2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    },
    employer: {
      type: String,
      trim: true
    },
    jobTitle: {
      type: String,
      trim: true
    },
    educationLevel: {
      type: String,
      enum: ['high-school', 'some-college', 'associates', 'bachelors', 'masters', 'doctorate', 'other']
    },
    ferpaAccess: {
      type: Boolean,
      default: false
    },
    notes: {
      type: String,
      trim: true
    }
  },
  { _id: false }
);

export const IdentificationSchema = new Schema<IIdentification>(
  {
    idNumber: {
      type: String,
      required: true,
      trim: true
      // NOTE: Should be encrypted before storage
    },
    idType: {
      type: String,
      enum: ['passport', 'drivers-license', 'state-id', 'student-id', 'visa', 'birth-certificate', 'other'],
      required: true
    },
    issuingAuthority: {
      type: String,
      trim: true
    },
    issueDate: { type: Date },
    expirationDate: { type: Date },
    documentUrl: {
      type: String,
      trim: true
    }
  },
  { _id: false }
);

export const PriorEducationSchema = new Schema<IPriorEducation>(
  {
    institutionName: {
      type: String,
      required: true,
      trim: true
    },
    institutionType: {
      type: String,
      enum: ['high-school', 'community-college', 'university', 'vocational', 'other'],
      required: true
    },
    degreeEarned: {
      type: String,
      trim: true
    },
    major: {
      type: String,
      trim: true
    },
    minor: {
      type: String,
      trim: true
    },
    startDate: { type: Date },
    endDate: { type: Date },
    gpa: {
      type: Number,
      min: 0,
      max: 10 // Support different scales
    },
    gpaScale: {
      type: Number,
      default: 4.0
    },
    graduated: {
      type: Boolean,
      required: true
    },
    transcriptOnFile: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

export const AccommodationSchema = new Schema<IAccommodation>(
  {
    type: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    startDate: { type: Date },
    endDate: { type: Date },
    isActive: {
      type: Boolean,
      default: true
    },
    documentationOnFile: {
      type: Boolean,
      default: false
    },
    instructorNotes: {
      type: String,
      trim: true
    }
  },
  { _id: false }
);

export const LearnerPersonExtendedSchema = new Schema<ILearnerPersonExtended>(
  {
    // Student Identity
    studentId: {
      type: String,
      trim: true
    },

    // Emergency & Family Contacts
    emergencyContacts: {
      type: [EmergencyContactSchema],
      default: [],
      validate: {
        validator: function(v: IEmergencyContact[]) {
          // Check that priorities are unique
          const priorities = v.map(c => c.priority);
          return priorities.length === new Set(priorities).size;
        },
        message: 'Emergency contact priorities must be unique'
      }
    },
    parentGuardians: {
      type: [ParentGuardianSchema],
      default: []
    },

    // Identification Documents
    identifications: {
      type: [IdentificationSchema],
      default: []
    },

    // Academic Background
    priorEducation: {
      type: [PriorEducationSchema],
      default: []
    },
    transferCredits: {
      type: Number,
      min: 0,
      default: 0
    },

    // Accommodations & Support
    accommodations: {
      type: [AccommodationSchema],
      default: []
    },

    // Enrollment Status
    enrollmentStatus: {
      type: String,
      enum: ['prospective', 'admitted', 'enrolled', 'leave-of-absence', 'withdrawn', 'graduated', 'expelled']
    },
    expectedGraduationDate: { type: Date },
    actualGraduationDate: { type: Date },

    // Campus Life
    housingStatus: {
      type: String,
      enum: ['on-campus', 'off-campus', 'commuter', 'other']
    },
    residenceHall: {
      type: String,
      trim: true
    },
    roomNumber: {
      type: String,
      trim: true
    },
    vehicleOnCampus: {
      type: Boolean,
      default: false
    },
    vehicleInfo: {
      type: String,
      trim: true
    },
    parkingPermit: {
      type: String,
      trim: true
    },

    // Financial
    financialAidRecipient: {
      type: Boolean,
      default: false
    },
    workStudyParticipant: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);
