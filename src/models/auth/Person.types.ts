/**
 * IPerson (Basic) - Core person data shared across all user types
 *
 * This file defines the basic person structure that is common to all users
 * (staff, learners, admins). Context-specific fields belong in PersonExtended.
 *
 * @module models/auth/Person.types
 */

import { Schema } from 'mongoose';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Phone number with metadata
 */
export interface IPhone {
  /** Phone number in E.164 format (e.g., +1-555-123-4567) */
  number: string;

  /** Type of phone number */
  type: 'mobile' | 'home' | 'work' | 'other';

  /** Primary phone number for contact */
  isPrimary: boolean;

  /** Whether phone number has been verified */
  verified: boolean;

  /** Whether user consents to SMS messages */
  allowSMS: boolean;

  /** Optional label for custom phone types */
  label?: string;
}

/**
 * Email address with metadata
 */
export interface IEmail {
  /** Email address */
  email: string;

  /** Type of email */
  type: 'institutional' | 'personal' | 'work' | 'other';

  /** Primary email for communications */
  isPrimary: boolean;

  /** Whether email has been verified */
  verified: boolean;

  /** Whether user consents to notifications at this email */
  allowNotifications: boolean;

  /** Optional label for custom email types */
  label?: string;
}

/**
 * Physical or mailing address
 */
export interface IAddress {
  /** Street address line 1 */
  street1: string;

  /** Street address line 2 (apt, suite, etc.) */
  street2?: string;

  /** City */
  city: string;

  /** State/Province/Region */
  state: string;

  /** Postal/ZIP code */
  postalCode: string;

  /** Country (ISO 3166-1 alpha-2 code, e.g., US, CA, GB) */
  country: string;

  /** Type of address */
  type: 'home' | 'work' | 'mailing' | 'other';

  /** Primary address */
  isPrimary: boolean;

  /** Optional label */
  label?: string;
}

/**
 * Legal consent tracking for compliance (FERPA, GDPR, etc.)
 */
export interface ILegalConsent {
  /** Consent to FERPA directory information release */
  ferpaConsent?: boolean;
  ferpaConsentDate?: Date;

  /** Consent to GDPR data processing */
  gdprConsent?: boolean;
  gdprConsentDate?: Date;

  /** Consent to institutional photography/media */
  photoConsent?: boolean;
  photoConsentDate?: Date;

  /** Consent to marketing communications */
  marketingConsent?: boolean;
  marketingConsentDate?: Date;

  /** Consent to data sharing with third parties */
  thirdPartyDataSharing?: boolean;
  thirdPartyDataSharingDate?: Date;
}

/**
 * Communication preferences
 */
export interface ICommunicationPreferences {
  /** Preferred method of contact */
  preferredMethod?: 'email' | 'phone' | 'sms' | 'mail';

  /** Whether to allow email notifications */
  allowEmail?: boolean;

  /** Whether to allow SMS notifications */
  allowSMS?: boolean;

  /** Whether to allow phone calls */
  allowPhoneCalls?: boolean;

  /** Quiet hours - no notifications (24-hour format) */
  quietHoursStart?: string; // e.g., "22:00"
  quietHoursEnd?: string;   // e.g., "08:00"

  /** Notification frequency preference */
  notificationFrequency?: 'immediate' | 'daily-digest' | 'weekly-digest' | 'none';
}

/**
 * IPerson (Basic) - Core identity and contact information
 *
 * This interface represents the essential person data shared across all user types.
 * All fields here should be relevant to both staff and learners.
 */
export interface IPerson {
  // ========================================
  // Core Identity
  // ========================================

  /** Legal first name */
  firstName: string;

  /** Middle name or initial */
  middleName?: string;

  /** Legal last name */
  lastName: string;

  /** Suffix (Jr., Sr., III, etc.) */
  suffix?: string;

  /** Preferred first name (for chosen names, nicknames) */
  preferredFirstName?: string;

  /** Preferred last name */
  preferredLastName?: string;

  /** Pronouns (e.g., she/her, he/him, they/them) */
  pronouns?: string;

  // ========================================
  // Contact Information
  // ========================================

  /** Email addresses */
  emails: IEmail[];

  /** Phone numbers */
  phones: IPhone[];

  /** Physical addresses */
  addresses: IAddress[];

  // ========================================
  // Personal Information
  // ========================================

  /** Date of birth */
  dateOfBirth?: Date;

  /** Last 4 digits of SSN (for partial identification) */
  last4SSN?: string;

  // ========================================
  // Profile
  // ========================================

  /** Avatar/profile picture URL (S3 key or full URL) */
  avatar?: string;

  /** Short biography or about me text */
  bio?: string;

  // ========================================
  // Preferences (REQUIRED for proper system operation)
  // ========================================

  /** User's timezone (IANA timezone, e.g., America/New_York) */
  timezone: string;

  /** Language preference (ISO 639-1 code, e.g., en, es, fr) */
  languagePreference: string;

  /** Locale for formatting (e.g., en-US, es-MX) */
  locale?: string;

  // ========================================
  // Communication & Legal
  // ========================================

  /** Communication preferences */
  communicationPreferences?: ICommunicationPreferences;

  /** Legal consent tracking */
  legalConsent?: ILegalConsent;
}

// ============================================================================
// MONGOOSE SCHEMAS
// ============================================================================

/**
 * Phone schema
 */
export const PhoneSchema = new Schema<IPhone>(
  {
    number: {
      type: String,
      required: true,
      trim: true,
      // Validate E.164 format (basic validation)
      validate: {
        validator: function(v: string) {
          return /^\+?[1-9]\d{1,14}$/.test(v.replace(/[\s\-\(\)]/g, ''));
        },
        message: 'Phone number must be in valid international format'
      }
    },
    type: {
      type: String,
      enum: ['mobile', 'home', 'work', 'other'],
      required: true,
      default: 'mobile'
    },
    isPrimary: {
      type: Boolean,
      default: false
    },
    verified: {
      type: Boolean,
      default: false
    },
    allowSMS: {
      type: Boolean,
      default: true
    },
    label: {
      type: String,
      trim: true
    }
  },
  { _id: false }
);

/**
 * Email schema
 */
export const EmailSchema = new Schema<IEmail>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v: string) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Invalid email format'
      }
    },
    type: {
      type: String,
      enum: ['institutional', 'personal', 'work', 'other'],
      required: true,
      default: 'personal'
    },
    isPrimary: {
      type: Boolean,
      default: false
    },
    verified: {
      type: Boolean,
      default: false
    },
    allowNotifications: {
      type: Boolean,
      default: true
    },
    label: {
      type: String,
      trim: true
    }
  },
  { _id: false }
);

/**
 * Address schema
 */
export const AddressSchema = new Schema<IAddress>(
  {
    street1: {
      type: String,
      required: true,
      trim: true
    },
    street2: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    postalCode: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: 'US',
      validate: {
        validator: function(v: string) {
          return /^[A-Z]{2}$/.test(v);
        },
        message: 'Country must be a 2-letter ISO code'
      }
    },
    type: {
      type: String,
      enum: ['home', 'work', 'mailing', 'other'],
      required: true,
      default: 'home'
    },
    isPrimary: {
      type: Boolean,
      default: false
    },
    label: {
      type: String,
      trim: true
    }
  },
  { _id: false }
);

/**
 * Legal consent schema
 */
export const LegalConsentSchema = new Schema<ILegalConsent>(
  {
    ferpaConsent: { type: Boolean },
    ferpaConsentDate: { type: Date },
    gdprConsent: { type: Boolean },
    gdprConsentDate: { type: Date },
    photoConsent: { type: Boolean },
    photoConsentDate: { type: Date },
    marketingConsent: { type: Boolean },
    marketingConsentDate: { type: Date },
    thirdPartyDataSharing: { type: Boolean },
    thirdPartyDataSharingDate: { type: Date }
  },
  { _id: false }
);

/**
 * Communication preferences schema
 */
export const CommunicationPreferencesSchema = new Schema<ICommunicationPreferences>(
  {
    preferredMethod: {
      type: String,
      enum: ['email', 'phone', 'sms', 'mail']
    },
    allowEmail: { type: Boolean, default: true },
    allowSMS: { type: Boolean, default: true },
    allowPhoneCalls: { type: Boolean, default: true },
    quietHoursStart: {
      type: String,
      validate: {
        validator: function(v: string) {
          return !v || /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
        },
        message: 'Quiet hours must be in HH:MM format (24-hour)'
      }
    },
    quietHoursEnd: {
      type: String,
      validate: {
        validator: function(v: string) {
          return !v || /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
        },
        message: 'Quiet hours must be in HH:MM format (24-hour)'
      }
    },
    notificationFrequency: {
      type: String,
      enum: ['immediate', 'daily-digest', 'weekly-digest', 'none'],
      default: 'immediate'
    }
  },
  { _id: false }
);

/**
 * Person schema (Basic)
 */
export const PersonSchema = new Schema<IPerson>(
  {
    // Core Identity
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    middleName: {
      type: String,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    suffix: {
      type: String,
      trim: true
    },
    preferredFirstName: {
      type: String,
      trim: true
    },
    preferredLastName: {
      type: String,
      trim: true
    },
    pronouns: {
      type: String,
      trim: true
    },

    // Contact Information
    emails: {
      type: [EmailSchema],
      default: [],
      validate: {
        validator: function(v: IEmail[]) {
          // Must have at least one email
          if (v.length === 0) return false;
          // Can only have one primary
          const primaryCount = v.filter(e => e.isPrimary).length;
          return primaryCount <= 1;
        },
        message: 'Must have at least one email and only one primary email'
      }
    },
    phones: {
      type: [PhoneSchema],
      default: [],
      validate: {
        validator: function(v: IPhone[]) {
          // Can only have one primary
          const primaryCount = v.filter(p => p.isPrimary).length;
          return primaryCount <= 1;
        },
        message: 'Can only have one primary phone'
      }
    },
    addresses: {
      type: [AddressSchema],
      default: [],
      validate: {
        validator: function(v: IAddress[]) {
          // Can only have one primary
          const primaryCount = v.filter(a => a.isPrimary).length;
          return primaryCount <= 1;
        },
        message: 'Can only have one primary address'
      }
    },

    // Personal Information
    dateOfBirth: {
      type: Date
    },
    last4SSN: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          return !v || /^\d{4}$/.test(v);
        },
        message: 'Last 4 SSN must be exactly 4 digits'
      }
    },

    // Profile
    avatar: {
      type: String,
      trim: true
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 1000
    },

    // Preferences (REQUIRED)
    timezone: {
      type: String,
      required: true,
      default: 'America/New_York',
      trim: true
    },
    languagePreference: {
      type: String,
      required: true,
      default: 'en',
      trim: true,
      lowercase: true
    },
    locale: {
      type: String,
      trim: true
    },

    // Communication & Legal
    communicationPreferences: {
      type: CommunicationPreferencesSchema
    },
    legalConsent: {
      type: LegalConsentSchema
    }
  },
  { _id: false }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the primary email from a person's email list
 */
export function getPrimaryEmail(person: IPerson): IEmail | undefined {
  return person.emails.find(e => e.isPrimary) || person.emails[0];
}

/**
 * Get the primary phone from a person's phone list
 */
export function getPrimaryPhone(person: IPerson): IPhone | undefined {
  return person.phones.find(p => p.isPrimary) || person.phones[0];
}

/**
 * Get the primary address from a person's address list
 */
export function getPrimaryAddress(person: IPerson): IAddress | undefined {
  return person.addresses.find(a => a.isPrimary) || person.addresses[0];
}

/**
 * Get the display name for a person (prefers preferred name)
 */
export function getDisplayName(person: IPerson): string {
  const firstName = person.preferredFirstName || person.firstName;
  const lastName = person.preferredLastName || person.lastName;
  return `${firstName} ${lastName}`.trim();
}

/**
 * Get the full legal name for a person
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
