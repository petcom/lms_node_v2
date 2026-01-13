/**
 * Demographics Types - Compliance and reporting data
 *
 * This file defines demographic data used for compliance reporting (IPEDS),
 * institutional research, and legal requirements. The same structure is used
 * for both Staff and Learners.
 *
 * IMPORTANT: This data is sensitive and optional. Users must explicitly
 * consent to provide demographic information.
 *
 * @module models/auth/Demographics.types
 */

import { Schema } from 'mongoose';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Race and ethnicity categories (IPEDS-compliant)
 */
export type RaceCategory =
  | 'american-indian-alaska-native'
  | 'asian'
  | 'black-african-american'
  | 'native-hawaiian-pacific-islander'
  | 'white'
  | 'two-or-more-races'
  | 'other'
  | 'prefer-not-to-say';

/**
 * Legal gender categories
 */
export type LegalGender =
  | 'male'
  | 'female'
  | 'non-binary'
  | 'other'
  | 'prefer-not-to-say';

/**
 * Citizenship status
 */
export type CitizenshipStatus =
  | 'us-citizen'
  | 'us-national'
  | 'permanent-resident'
  | 'refugee-asylee'
  | 'temporary-resident'
  | 'visa-holder'
  | 'other'
  | 'prefer-not-to-say';

/**
 * Visa types (for non-citizens)
 */
export type VisaType =
  | 'f1' // Academic student
  | 'j1' // Exchange visitor
  | 'h1b' // Specialty occupation
  | 'm1' // Vocational student
  | 'h4' // H1B dependent
  | 'other';

/**
 * Marital status
 */
export type MaritalStatus =
  | 'single'
  | 'married'
  | 'domestic-partnership'
  | 'divorced'
  | 'widowed'
  | 'separated'
  | 'prefer-not-to-say';

/**
 * Military/veteran status
 */
export type VeteranStatus =
  | 'not-veteran'
  | 'active-duty'
  | 'veteran'
  | 'reserve'
  | 'dependent'
  | 'prefer-not-to-say';

/**
 * Demographics - Compliance and reporting data
 *
 * This structure is identical for both Staff and Learners to ensure
 * consistent reporting across the institution.
 */
export interface IDemographics {
  // ========================================
  // Gender & Identity
  // ========================================

  /** Legal gender (as on government documents) */
  legalGender?: LegalGender;

  /** Gender identity (self-identified) */
  genderIdentity?: string;

  /** Pronouns (she/her, he/him, they/them, etc.) */
  pronouns?: string;

  // ========================================
  // Race & Ethnicity (IPEDS Reporting)
  // ========================================

  /** Is the person Hispanic or Latino? (separate from race per IPEDS) */
  isHispanicLatino?: boolean;

  /** Race categories (can select multiple per IPEDS) */
  race?: RaceCategory[];

  /** Tribal affiliation (if American Indian/Alaska Native) */
  tribalAffiliation?: string;

  // ========================================
  // Citizenship & Immigration
  // ========================================

  /** Citizenship status */
  citizenship?: CitizenshipStatus;

  /** Country of citizenship (ISO 3166-1 alpha-2 code) */
  countryOfCitizenship?: string;

  /** Country of birth (ISO 3166-1 alpha-2 code) */
  countryOfBirth?: string;

  /** Visa type (if applicable) */
  visaType?: VisaType;

  /** Visa expiration date */
  visaExpirationDate?: Date;

  /** Alien registration number (A-number) */
  alienRegistrationNumber?: string;

  // ========================================
  // Personal Status
  // ========================================

  /** Marital status */
  maritalStatus?: MaritalStatus;

  /** Number of dependents */
  numberOfDependents?: number;

  // ========================================
  // Veteran & Military
  // ========================================

  /** Military/veteran status */
  veteranStatus?: VeteranStatus;

  /** Branch of service (if veteran/active duty) */
  militaryBranch?: string;

  /** Years of service */
  yearsOfService?: number;

  /** Discharge type */
  dischargeType?: 'honorable' | 'general' | 'other-than-honorable' | 'dishonorable' | 'bad-conduct';

  // ========================================
  // First Generation & Educational Background
  // ========================================

  /** Is first-generation college student? */
  firstGenerationStudent?: boolean;

  /** Parent 1 highest education level */
  parent1EducationLevel?: 'less-than-high-school' | 'high-school' | 'some-college' | 'associates' | 'bachelors' | 'masters' | 'doctorate';

  /** Parent 2 highest education level */
  parent2EducationLevel?: 'less-than-high-school' | 'high-school' | 'some-college' | 'associates' | 'bachelors' | 'masters' | 'doctorate';

  // ========================================
  // Disability & Accommodations
  // ========================================

  /** Has a disability (ADA)? */
  hasDisability?: boolean;

  /** Type of disability (if disclosed) */
  disabilityType?: Array<'physical' | 'learning' | 'mental-health' | 'visual' | 'hearing' | 'chronic-illness' | 'other'>;

  /** Requires accommodations? */
  accommodationsRequired?: boolean;

  // ========================================
  // Language
  // ========================================

  /** Primary/native language (ISO 639-1 code) */
  primaryLanguage?: string;

  /** English proficiency level (for non-native speakers) */
  englishProficiency?: 'native' | 'fluent' | 'advanced' | 'intermediate' | 'basic' | 'limited';

  /** Other languages spoken */
  otherLanguages?: string[];

  // ========================================
  // Socioeconomic
  // ========================================

  /** Eligible for federal Pell Grant? (for learners) */
  pellEligible?: boolean;

  /** Low-income status */
  lowIncomeStatus?: boolean;

  /** Household income range (annual, USD) */
  householdIncomeRange?: 'under-25k' | '25k-50k' | '50k-75k' | '75k-100k' | '100k-150k' | 'over-150k' | 'prefer-not-to-say';

  // ========================================
  // Religion (optional, for accommodations)
  // ========================================

  /** Religious affiliation */
  religiousAffiliation?: string;

  /** Religious accommodations needed? */
  religiousAccommodations?: boolean;

  // ========================================
  // Consent & Privacy
  // ========================================

  /** Consent to use data for institutional reporting */
  allowReporting?: boolean;

  /** Consent to use data for research */
  allowResearch?: boolean;

  /** Date demographic data was last updated */
  lastUpdated?: Date;

  /** Data collected date */
  collectedDate?: Date;
}

// ============================================================================
// MONGOOSE SCHEMA
// ============================================================================

/**
 * Demographics schema
 *
 * All fields are optional to respect privacy and allow gradual data collection.
 */
export const DemographicsSchema = new Schema<IDemographics>(
  {
    // Gender & Identity
    legalGender: {
      type: String,
      enum: ['male', 'female', 'non-binary', 'other', 'prefer-not-to-say']
    },
    genderIdentity: {
      type: String,
      trim: true
    },
    pronouns: {
      type: String,
      trim: true
    },

    // Race & Ethnicity
    isHispanicLatino: {
      type: Boolean
    },
    race: {
      type: [String],
      enum: [
        'american-indian-alaska-native',
        'asian',
        'black-african-american',
        'native-hawaiian-pacific-islander',
        'white',
        'two-or-more-races',
        'other',
        'prefer-not-to-say'
      ]
    },
    tribalAffiliation: {
      type: String,
      trim: true
    },

    // Citizenship & Immigration
    citizenship: {
      type: String,
      enum: [
        'us-citizen',
        'us-national',
        'permanent-resident',
        'refugee-asylee',
        'temporary-resident',
        'visa-holder',
        'other',
        'prefer-not-to-say'
      ]
    },
    countryOfCitizenship: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator: function(v: string) {
          return !v || /^[A-Z]{2}$/.test(v);
        },
        message: 'Country must be a 2-letter ISO code'
      }
    },
    countryOfBirth: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator: function(v: string) {
          return !v || /^[A-Z]{2}$/.test(v);
        },
        message: 'Country must be a 2-letter ISO code'
      }
    },
    visaType: {
      type: String,
      enum: ['f1', 'j1', 'h1b', 'm1', 'h4', 'other']
    },
    visaExpirationDate: {
      type: Date
    },
    alienRegistrationNumber: {
      type: String,
      trim: true
      // NOTE: Should be encrypted in storage
    },

    // Personal Status
    maritalStatus: {
      type: String,
      enum: ['single', 'married', 'domestic-partnership', 'divorced', 'widowed', 'separated', 'prefer-not-to-say']
    },
    numberOfDependents: {
      type: Number,
      min: 0
    },

    // Veteran & Military
    veteranStatus: {
      type: String,
      enum: ['not-veteran', 'active-duty', 'veteran', 'reserve', 'dependent', 'prefer-not-to-say']
    },
    militaryBranch: {
      type: String,
      trim: true
    },
    yearsOfService: {
      type: Number,
      min: 0
    },
    dischargeType: {
      type: String,
      enum: ['honorable', 'general', 'other-than-honorable', 'dishonorable', 'bad-conduct']
    },

    // First Generation & Educational Background
    firstGenerationStudent: {
      type: Boolean
    },
    parent1EducationLevel: {
      type: String,
      enum: ['less-than-high-school', 'high-school', 'some-college', 'associates', 'bachelors', 'masters', 'doctorate']
    },
    parent2EducationLevel: {
      type: String,
      enum: ['less-than-high-school', 'high-school', 'some-college', 'associates', 'bachelors', 'masters', 'doctorate']
    },

    // Disability & Accommodations
    hasDisability: {
      type: Boolean
    },
    disabilityType: {
      type: [String],
      enum: ['physical', 'learning', 'mental-health', 'visual', 'hearing', 'chronic-illness', 'other']
    },
    accommodationsRequired: {
      type: Boolean
    },

    // Language
    primaryLanguage: {
      type: String,
      trim: true,
      lowercase: true
    },
    englishProficiency: {
      type: String,
      enum: ['native', 'fluent', 'advanced', 'intermediate', 'basic', 'limited']
    },
    otherLanguages: {
      type: [String],
      default: []
    },

    // Socioeconomic
    pellEligible: {
      type: Boolean
    },
    lowIncomeStatus: {
      type: Boolean
    },
    householdIncomeRange: {
      type: String,
      enum: ['under-25k', '25k-50k', '50k-75k', '75k-100k', '100k-150k', 'over-150k', 'prefer-not-to-say']
    },

    // Religion
    religiousAffiliation: {
      type: String,
      trim: true
    },
    religiousAccommodations: {
      type: Boolean
    },

    // Consent & Privacy
    allowReporting: {
      type: Boolean,
      default: false
    },
    allowResearch: {
      type: Boolean,
      default: false
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    collectedDate: {
      type: Date
    }
  },
  { _id: false }
);

// Add a pre-save hook to update lastUpdated
DemographicsSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if demographics data is complete enough for IPEDS reporting
 */
export function isIPEDSComplete(demographics: IDemographics): boolean {
  // IPEDS requires: Hispanic/Latino status and race
  return (
    demographics.isHispanicLatino !== undefined &&
    demographics.race !== undefined &&
    demographics.race.length > 0
  );
}

/**
 * Get a human-readable summary of race/ethnicity
 */
export function getRaceEthnicitySummary(demographics: IDemographics): string {
  const parts: string[] = [];

  if (demographics.isHispanicLatino) {
    parts.push('Hispanic or Latino');
  }

  if (demographics.race && demographics.race.length > 0) {
    const raceNames = demographics.race.map(r => {
      switch (r) {
        case 'american-indian-alaska-native':
          return 'American Indian/Alaska Native';
        case 'asian':
          return 'Asian';
        case 'black-african-american':
          return 'Black/African American';
        case 'native-hawaiian-pacific-islander':
          return 'Native Hawaiian/Pacific Islander';
        case 'white':
          return 'White';
        case 'two-or-more-races':
          return 'Two or More Races';
        case 'other':
          return 'Other';
        case 'prefer-not-to-say':
          return 'Prefer Not to Say';
        default:
          return r;
      }
    });
    parts.push(...raceNames);
  }

  return parts.length > 0 ? parts.join(', ') : 'Not specified';
}

/**
 * Check if person is an international student/staff (non-US citizen)
 */
export function isInternational(demographics: IDemographics): boolean {
  return (
    demographics.citizenship !== undefined &&
    demographics.citizenship !== 'us-citizen' &&
    demographics.citizenship !== 'us-national' &&
    demographics.citizenship !== 'permanent-resident' &&
    demographics.citizenship !== 'prefer-not-to-say'
  );
}

/**
 * Check if visa is expiring soon (within 60 days)
 */
export function isVisaExpiringSoon(demographics: IDemographics): boolean {
  if (!demographics.visaExpirationDate) return false;

  const now = new Date();
  const expirationDate = new Date(demographics.visaExpirationDate);
  const daysUntilExpiration = Math.floor(
    (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysUntilExpiration <= 60 && daysUntilExpiration > 0;
}
