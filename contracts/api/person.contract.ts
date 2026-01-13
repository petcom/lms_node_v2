/**
 * Person API Contracts
 * Version: 1.0.0
 *
 * These contracts define person data management endpoints for the LMS API.
 * Person data includes basic contact information, preferences, and profile
 * information shared across all user types (staff, learners).
 *
 * Both backend and UI teams use these as the source of truth.
 */

export const PersonContract = {
  /**
   * GET /users/me/person - Get Current User's Person Data
   *
   * Returns basic person information for the authenticated user.
   * This is the "Basic" layer of the three-layer person architecture:
   * - IPerson (Basic) - this endpoint
   * - IPersonExtended - GET /users/me/person/extended
   * - IDemographics - GET /users/me/demographics
   */
  getMyPerson: {
    endpoint: '/api/v2/users/me/person',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get basic person data for current authenticated user',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            // Core Identity
            firstName: 'string',
            middleName: 'string | null',
            lastName: 'string',
            suffix: 'string | null',
            preferredFirstName: 'string | null',
            preferredLastName: 'string | null',
            pronouns: 'string | null',

            // Contact Information
            emails: [{
              email: 'string',
              type: 'institutional | personal | work | other',
              isPrimary: 'boolean',
              verified: 'boolean',
              allowNotifications: 'boolean',
              label: 'string | null'
            }],
            phones: [{
              number: 'string',
              type: 'mobile | home | work | other',
              isPrimary: 'boolean',
              verified: 'boolean',
              allowSMS: 'boolean',
              label: 'string | null'
            }],
            addresses: [{
              street1: 'string',
              street2: 'string | null',
              city: 'string',
              state: 'string',
              postalCode: 'string',
              country: 'string',
              type: 'home | work | mailing | other',
              isPrimary: 'boolean',
              label: 'string | null'
            }],

            // Personal Information
            dateOfBirth: 'Date | null',
            last4SSN: 'string | null',

            // Profile
            avatar: 'string | null',
            bio: 'string | null',

            // Preferences
            timezone: 'string',
            languagePreference: 'string',
            locale: 'string | null',

            // Communication & Legal
            communicationPreferences: {
              preferredMethod: 'email | phone | sms | mail | null',
              allowEmail: 'boolean',
              allowSMS: 'boolean',
              allowPhoneCalls: 'boolean',
              quietHoursStart: 'string | null',
              quietHoursEnd: 'string | null',
              notificationFrequency: 'immediate | daily-digest | weekly-digest | none'
            },
            legalConsent: {
              ferpaConsent: 'boolean | null',
              ferpaConsentDate: 'Date | null',
              gdprConsent: 'boolean | null',
              gdprConsentDate: 'Date | null',
              photoConsent: 'boolean | null',
              photoConsentDate: 'Date | null',
              marketingConsent: 'boolean | null',
              marketingConsentDate: 'Date | null',
              thirdPartyDataSharing: 'boolean | null',
              thirdPartyDataSharingDate: 'Date | null'
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 404, code: 'PERSON_NOT_FOUND', message: 'Person data not found for user' }
      ]
    },

    example: {
      request: {},
      response: {
        success: true,
        data: {
          firstName: 'Jane',
          middleName: 'Marie',
          lastName: 'Smith',
          suffix: null,
          preferredFirstName: 'Janey',
          preferredLastName: null,
          pronouns: 'she/her',
          emails: [
            {
              email: 'jane.smith@university.edu',
              type: 'institutional',
              isPrimary: true,
              verified: true,
              allowNotifications: true,
              label: null
            },
            {
              email: 'jane.personal@gmail.com',
              type: 'personal',
              isPrimary: false,
              verified: true,
              allowNotifications: false,
              label: null
            }
          ],
          phones: [
            {
              number: '+1-555-0123',
              type: 'mobile',
              isPrimary: true,
              verified: true,
              allowSMS: true,
              label: null
            }
          ],
          addresses: [
            {
              street1: '123 Main Street',
              street2: 'Apt 4B',
              city: 'Boston',
              state: 'MA',
              postalCode: '02101',
              country: 'US',
              type: 'home',
              isPrimary: true,
              label: null
            }
          ],
          dateOfBirth: '1998-03-15',
          last4SSN: '4567',
          avatar: 'https://cdn.example.com/avatars/jane-smith.jpg',
          bio: 'Computer Science major passionate about AI and machine learning.',
          timezone: 'America/New_York',
          languagePreference: 'en',
          locale: 'en-US',
          communicationPreferences: {
            preferredMethod: 'email',
            allowEmail: true,
            allowSMS: true,
            allowPhoneCalls: false,
            quietHoursStart: '22:00',
            quietHoursEnd: '08:00',
            notificationFrequency: 'daily-digest'
          },
          legalConsent: {
            ferpaConsent: true,
            ferpaConsentDate: '2025-09-01T00:00:00.000Z',
            gdprConsent: true,
            gdprConsentDate: '2025-09-01T00:00:00.000Z',
            photoConsent: true,
            photoConsentDate: '2025-09-01T00:00:00.000Z',
            marketingConsent: false,
            marketingConsentDate: null,
            thirdPartyDataSharing: false,
            thirdPartyDataSharingDate: null
          }
        }
      }
    },

    permissions: ['authenticated'],

    notes: `
      - Returns IPerson (Basic) data for authenticated user
      - All users (staff, learners, admins) have person data
      - Phone numbers in E.164 format (e.g., +1-555-0123)
      - Country codes are ISO 3166-1 alpha-2 (US, CA, GB, etc.)
      - Timezone is IANA timezone (America/New_York, Europe/London, etc.)
      - Language preference is ISO 639-1 code (en, es, fr, etc.)
      - Arrays (emails, phones, addresses) must have exactly one isPrimary=true
      - Communication preferences control notification delivery
      - Legal consent tracks FERPA, GDPR, and other compliance requirements
      - Use this for profile pages, contact information display
      - This is part of the three-layer person architecture:
        * Basic (this endpoint) - shared across all user types
        * Extended (GET /users/me/person/extended) - role-specific data
        * Demographics (GET /users/me/demographics) - compliance/reporting
    `
  },

  /**
   * PUT /users/me/person - Update Current User's Person Data
   *
   * Allows authenticated users to update their basic person information.
   * Partial updates supported - only send fields to change.
   */
  updateMyPerson: {
    endpoint: '/api/v2/users/me/person',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update basic person data for current authenticated user',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        // Core Identity (optional)
        firstName: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 100,
          description: 'Legal first name'
        },
        middleName: {
          type: 'string',
          required: false,
          maxLength: 100,
          description: 'Middle name or initial'
        },
        lastName: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 100,
          description: 'Legal last name'
        },
        suffix: {
          type: 'string',
          required: false,
          maxLength: 20,
          description: 'Suffix (Jr., Sr., III, etc.)'
        },
        preferredFirstName: {
          type: 'string',
          required: false,
          maxLength: 100,
          description: 'Preferred first name (chosen name, nickname)'
        },
        preferredLastName: {
          type: 'string',
          required: false,
          maxLength: 100,
          description: 'Preferred last name'
        },
        pronouns: {
          type: 'string',
          required: false,
          maxLength: 50,
          description: 'Pronouns (she/her, he/him, they/them, etc.)'
        },

        // Contact Information (optional)
        emails: {
          type: 'array',
          required: false,
          description: 'Email addresses (must have at least one, exactly one primary)'
        },
        phones: {
          type: 'array',
          required: false,
          description: 'Phone numbers (at most one primary)'
        },
        addresses: {
          type: 'array',
          required: false,
          description: 'Physical addresses (at most one primary)'
        },

        // Personal Information (optional)
        dateOfBirth: {
          type: 'Date',
          required: false,
          description: 'Date of birth'
        },

        // Profile (optional)
        avatar: {
          type: 'string',
          required: false,
          description: 'Avatar URL (S3 key or full URL)'
        },
        bio: {
          type: 'string',
          required: false,
          maxLength: 1000,
          description: 'Short biography'
        },

        // Preferences (optional)
        timezone: {
          type: 'string',
          required: false,
          description: 'IANA timezone (America/New_York)'
        },
        languagePreference: {
          type: 'string',
          required: false,
          pattern: '^[a-z]{2}$',
          description: 'ISO 639-1 language code (en, es, fr)'
        },
        locale: {
          type: 'string',
          required: false,
          description: 'Locale for formatting (en-US, es-MX)'
        },

        // Communication & Legal (optional)
        communicationPreferences: {
          type: 'object',
          required: false,
          description: 'Communication preferences'
        },
        legalConsent: {
          type: 'object',
          required: false,
          description: 'Legal consent tracking'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string',
          data: {
            /* Same structure as GET /users/me/person */
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data', errors: '[{ field, message }]' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 404, code: 'PERSON_NOT_FOUND', message: 'Person data not found for user' }
      ]
    },

    example: {
      request: {
        preferredFirstName: 'Janey',
        pronouns: 'she/her',
        phones: [
          {
            number: '+1-555-0123',
            type: 'mobile',
            isPrimary: true,
            verified: false,
            allowSMS: true
          }
        ],
        bio: 'Computer Science major passionate about AI and machine learning.',
        communicationPreferences: {
          preferredMethod: 'email',
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
          notificationFrequency: 'daily-digest'
        }
      },
      response: {
        success: true,
        message: 'Person data updated successfully',
        data: {
          /* Complete person object with updates applied */
        }
      }
    },

    permissions: ['authenticated'],

    notes: `
      - Users can only update their own person data (enforced by /me endpoint)
      - Partial updates supported (only send fields to change)
      - Validation rules:
        * firstName/lastName: 1-100 characters if provided
        * emails: Must have at least one, exactly one isPrimary
        * phones: At most one isPrimary
        * addresses: At most one isPrimary
        * Phone numbers validated for E.164 format
        * Email addresses validated for format
        * Country codes validated for ISO 3166-1 alpha-2
        * Timezone validated against IANA database
        * Language preference validated for ISO 639-1
      - Last 4 SSN cannot be updated via this endpoint (admin-only)
      - Returns complete updated person data on success
      - Frontend should use this instead of legacy PUT /users/me
      - BREAKING CHANGE: Replaces flat firstName/lastName/phone fields
        with nested person.firstName, person.phones[] structure
    `
  },

  /**
   * GET /users/me/person/extended - Get Current User's Extended Person Data
   *
   * Returns context-specific extended person information.
   * Response shape differs based on user role:
   * - Staff: IStaffPersonExtended (credentials, publications, office hours)
   * - Learner: ILearnerPersonExtended (emergency contacts, accommodations)
   */
  getMyPersonExtended: {
    endpoint: '/api/v2/users/me/person/extended',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get extended person data for current authenticated user (role-specific)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            role: 'staff | learner',
            // Staff-specific fields (when role === 'staff')
            staff: {
              professionalTitle: 'string | null',
              officeLocation: 'string | null',
              headline: 'string | null',
              credentials: '[array of credential objects]',
              researchInterests: 'string[] | null',
              publications: '[array of publication objects]',
              professionalMemberships: '[array of membership objects]',
              officeHours: '[array of office hours objects]',
              linkedInUrl: 'string | null',
              orcidId: 'string | null',
              googleScholarUrl: 'string | null',
              websiteUrl: 'string | null',
              employeeId: 'string | null',
              hireDate: 'Date | null',
              contractType: 'string | null',
              academicRank: 'string | null'
            },
            // Learner-specific fields (when role === 'learner')
            learner: {
              studentId: 'string | null',
              emergencyContacts: '[array of emergency contact objects]',
              parentGuardians: '[array of parent/guardian objects]',
              identifications: '[array of identification objects]',
              priorEducation: '[array of prior education objects]',
              transferCredits: 'number | null',
              accommodations: '[array of accommodation objects]',
              enrollmentStatus: 'string | null',
              expectedGraduationDate: 'Date | null',
              actualGraduationDate: 'Date | null',
              housingStatus: 'string | null',
              residenceHall: 'string | null',
              roomNumber: 'string | null',
              vehicleOnCampus: 'boolean',
              vehicleInfo: 'string | null',
              parkingPermit: 'string | null',
              financialAidRecipient: 'boolean',
              workStudyParticipant: 'boolean'
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 404, code: 'EXTENDED_DATA_NOT_FOUND', message: 'Extended person data not found' }
      ]
    },

    example: {
      request: {},
      response: {
        success: true,
        data: {
          role: 'learner',
          learner: {
            studentId: 'STU123456',
            emergencyContacts: [
              {
                fullName: 'Mary Smith',
                relationship: 'Mother',
                primaryPhone: '+1-555-1234',
                secondaryPhone: '+1-555-5678',
                email: 'mary.smith@email.com',
                priority: 1,
                medicalAuthorization: true,
                pickupAuthorization: true,
                notes: null
              }
            ],
            parentGuardians: [],
            identifications: [
              {
                idNumber: 'ENCRYPTED',
                idType: 'drivers-license',
                issuingAuthority: 'Massachusetts RMV',
                issueDate: '2022-01-15',
                expirationDate: '2027-01-15',
                documentUrl: null
              }
            ],
            priorEducation: [
              {
                institutionName: 'Lincoln High School',
                institutionType: 'high-school',
                degreeEarned: 'High School Diploma',
                major: null,
                minor: null,
                startDate: '2012-09-01',
                endDate: '2016-06-15',
                gpa: 3.8,
                gpaScale: 4.0,
                graduated: true,
                transcriptOnFile: true
              }
            ],
            transferCredits: 0,
            accommodations: [],
            enrollmentStatus: 'enrolled',
            expectedGraduationDate: '2026-05-15',
            actualGraduationDate: null,
            housingStatus: 'on-campus',
            residenceHall: 'Adams Hall',
            roomNumber: '312',
            vehicleOnCampus: false,
            vehicleInfo: null,
            parkingPermit: null,
            financialAidRecipient: true,
            workStudyParticipant: false
          }
        }
      }
    },

    permissions: ['authenticated'],

    notes: `
      - Returns role-specific extended person data
      - Staff users receive IStaffPersonExtended (professional data)
      - Learner users receive ILearnerPersonExtended (student data)
      - Emergency contacts critical for safety and compliance
      - Accommodations data supports ADA compliance
      - Prior education used for transfer credit evaluation
      - This is the "Extended" layer of three-layer architecture
      - Optional data - may be null/empty if not yet collected
      - Use this for role-specific profile pages and forms
    `
  },

  /**
   * PUT /users/me/person/extended - Update Current User's Extended Person Data
   *
   * Allows authenticated users to update their extended person information.
   * Request body shape depends on user role (staff vs learner).
   */
  updateMyPersonExtended: {
    endpoint: '/api/v2/users/me/person/extended',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update extended person data for current authenticated user',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        // For staff: IStaffPersonExtended fields
        // For learner: ILearnerPersonExtended fields
        // All fields optional (partial updates supported)
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string',
          data: {
            /* Same structure as GET /users/me/person/extended */
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data', errors: '[{ field, message }]' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 404, code: 'EXTENDED_DATA_NOT_FOUND', message: 'Extended person data not found' }
      ]
    },

    example: {
      request: {
        emergencyContacts: [
          {
            fullName: 'Mary Smith',
            relationship: 'Mother',
            primaryPhone: '+1-555-1234',
            email: 'mary.smith@email.com',
            priority: 1,
            medicalAuthorization: true
          }
        ],
        housingStatus: 'on-campus',
        residenceHall: 'Adams Hall',
        roomNumber: '312'
      },
      response: {
        success: true,
        message: 'Extended person data updated successfully',
        data: {
          /* Complete extended person object with updates applied */
        }
      }
    },

    permissions: ['authenticated'],

    notes: `
      - Users can only update their own extended data
      - Partial updates supported (only send fields to change)
      - Request body shape differs by role:
        * Staff: Send IStaffPersonExtended fields
        * Learner: Send ILearnerPersonExtended fields
      - Some fields may be restricted to admin updates only:
        * Staff: employeeId, hireDate, contractType, academicRank
        * Learner: studentId, enrollmentStatus, transferCredits
      - Emergency contacts critical - encourage users to keep updated
      - Returns complete updated extended data on success
    `
  }
};

// Type exports for consumers
export type PersonContractType = typeof PersonContract;
export type PersonDataResponse = typeof PersonContract.getMyPerson.example.response;
export type PersonUpdateRequest = typeof PersonContract.updateMyPerson.example.request;
export type PersonExtendedResponse = typeof PersonContract.getMyPersonExtended.example.response;
