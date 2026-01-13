/**
 * Demographics API Contracts
 * Version: 1.0.0
 *
 * These contracts define demographics data management endpoints for the LMS API.
 * Demographics data is used for compliance reporting (IPEDS), institutional
 * research, and legal requirements (FERPA, ADA, Title IX).
 *
 * IMPORTANT: Demographics data is sensitive, optional, and requires explicit
 * user consent. The same structure is used for both staff and learners.
 *
 * Both backend and UI teams use these as the source of truth.
 */

export const DemographicsContract = {
  /**
   * GET /users/me/demographics - Get Current User's Demographics Data
   *
   * Returns demographic information for compliance and reporting.
   * All fields are optional - users control what they share.
   * Same structure for both staff and learners.
   */
  getMyDemographics: {
    endpoint: '/api/v2/users/me/demographics',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get demographics data for current authenticated user',

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
            // Gender & Identity
            legalGender: 'male | female | non-binary | other | prefer-not-to-say | null',
            genderIdentity: 'string | null',
            pronouns: 'string | null',

            // Race & Ethnicity (IPEDS)
            isHispanicLatino: 'boolean | null',
            race: 'Array<RaceCategory> | null',
            tribalAffiliation: 'string | null',

            // Citizenship & Immigration
            citizenship: 'CitizenshipStatus | null',
            countryOfCitizenship: 'string | null',
            countryOfBirth: 'string | null',
            visaType: 'f1 | j1 | h1b | m1 | h4 | other | null',
            visaExpirationDate: 'Date | null',
            alienRegistrationNumber: 'string | null',

            // Personal Status
            maritalStatus: 'MaritalStatus | null',
            numberOfDependents: 'number | null',

            // Veteran & Military
            veteranStatus: 'VeteranStatus | null',
            militaryBranch: 'string | null',
            yearsOfService: 'number | null',
            dischargeType: 'honorable | general | other-than-honorable | dishonorable | bad-conduct | null',

            // First Generation & Educational Background
            firstGenerationStudent: 'boolean | null',
            parent1EducationLevel: 'EducationLevel | null',
            parent2EducationLevel: 'EducationLevel | null',

            // Disability & Accommodations
            hasDisability: 'boolean | null',
            disabilityType: 'Array<DisabilityType> | null',
            accommodationsRequired: 'boolean | null',

            // Language
            primaryLanguage: 'string | null',
            englishProficiency: 'native | fluent | advanced | intermediate | basic | limited | null',
            otherLanguages: 'string[] | null',

            // Socioeconomic
            pellEligible: 'boolean | null',
            lowIncomeStatus: 'boolean | null',
            householdIncomeRange: 'IncomeRange | null',

            // Religion
            religiousAffiliation: 'string | null',
            religiousAccommodations: 'boolean | null',

            // Consent & Privacy
            allowReporting: 'boolean',
            allowResearch: 'boolean',
            lastUpdated: 'Date | null',
            collectedDate: 'Date | null'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 404, code: 'DEMOGRAPHICS_NOT_FOUND', message: 'Demographics data not found' }
      ]
    },

    example: {
      request: {},
      response: {
        success: true,
        data: {
          // Gender & Identity
          legalGender: 'female',
          genderIdentity: 'Woman',
          pronouns: 'she/her',

          // Race & Ethnicity
          isHispanicLatino: false,
          race: ['asian', 'white'],
          tribalAffiliation: null,

          // Citizenship
          citizenship: 'us-citizen',
          countryOfCitizenship: 'US',
          countryOfBirth: 'US',
          visaType: null,
          visaExpirationDate: null,
          alienRegistrationNumber: null,

          // Personal Status
          maritalStatus: 'single',
          numberOfDependents: 0,

          // Veteran & Military
          veteranStatus: 'not-veteran',
          militaryBranch: null,
          yearsOfService: null,
          dischargeType: null,

          // First Generation
          firstGenerationStudent: false,
          parent1EducationLevel: 'bachelors',
          parent2EducationLevel: 'masters',

          // Disability
          hasDisability: false,
          disabilityType: null,
          accommodationsRequired: false,

          // Language
          primaryLanguage: 'en',
          englishProficiency: 'native',
          otherLanguages: ['es'],

          // Socioeconomic
          pellEligible: false,
          lowIncomeStatus: false,
          householdIncomeRange: '75k-100k',

          // Religion
          religiousAffiliation: null,
          religiousAccommodations: false,

          // Consent & Privacy
          allowReporting: true,
          allowResearch: true,
          lastUpdated: '2025-09-01T00:00:00.000Z',
          collectedDate: '2025-09-01T00:00:00.000Z'
        }
      }
    },

    permissions: ['authenticated'],

    notes: `
      - All demographic fields are optional (user privacy first)
      - Same structure for both staff and learners
      - Used for IPEDS reporting, Title IX compliance, ADA compliance
      - Race/ethnicity follows IPEDS categories:
        * american-indian-alaska-native
        * asian
        * black-african-american
        * native-hawaiian-pacific-islander
        * white
        * two-or-more-races
        * other
        * prefer-not-to-say
      - isHispanicLatino is separate from race (IPEDS requirement)
      - Citizenship categories:
        * us-citizen, us-national
        * permanent-resident, refugee-asylee
        * temporary-resident, visa-holder
        * other, prefer-not-to-say
      - Veteran status categories:
        * not-veteran, active-duty, veteran
        * reserve, dependent, prefer-not-to-say
      - allowReporting: Consent to use data for institutional reporting
      - allowResearch: Consent to use data for research
      - CRITICAL: Never display demographics without explicit consent
      - Use this for compliance reporting, research, institutional planning
      - This is the "Demographics" layer of three-layer architecture
    `
  },

  /**
   * PUT /users/me/demographics - Update Current User's Demographics Data
   *
   * Allows authenticated users to update their demographic information.
   * Partial updates supported - only send fields to change.
   * Requires explicit consent checkboxes in UI.
   */
  updateMyDemographics: {
    endpoint: '/api/v2/users/me/demographics',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update demographics data for current authenticated user',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        // All fields optional (partial updates)
        legalGender: {
          type: 'string',
          required: false,
          enum: ['male', 'female', 'non-binary', 'other', 'prefer-not-to-say'],
          description: 'Legal gender'
        },
        genderIdentity: {
          type: 'string',
          required: false,
          description: 'Self-identified gender'
        },
        pronouns: {
          type: 'string',
          required: false,
          description: 'Preferred pronouns'
        },
        isHispanicLatino: {
          type: 'boolean',
          required: false,
          description: 'Hispanic or Latino ethnicity (separate from race)'
        },
        race: {
          type: 'array',
          required: false,
          description: 'Race categories (IPEDS-compliant, can select multiple)'
        },
        citizenship: {
          type: 'string',
          required: false,
          enum: ['us-citizen', 'us-national', 'permanent-resident', 'refugee-asylee', 'temporary-resident', 'visa-holder', 'other', 'prefer-not-to-say'],
          description: 'Citizenship status'
        },
        countryOfCitizenship: {
          type: 'string',
          required: false,
          pattern: '^[A-Z]{2}$',
          description: 'Country of citizenship (ISO 3166-1 alpha-2)'
        },
        visaType: {
          type: 'string',
          required: false,
          enum: ['f1', 'j1', 'h1b', 'm1', 'h4', 'other'],
          description: 'Visa type (if non-citizen)'
        },
        veteranStatus: {
          type: 'string',
          required: false,
          enum: ['not-veteran', 'active-duty', 'veteran', 'reserve', 'dependent', 'prefer-not-to-say'],
          description: 'Military/veteran status'
        },
        firstGenerationStudent: {
          type: 'boolean',
          required: false,
          description: 'Is first-generation college student'
        },
        hasDisability: {
          type: 'boolean',
          required: false,
          description: 'Has a disability (ADA)'
        },
        disabilityType: {
          type: 'array',
          required: false,
          description: 'Type(s) of disability'
        },
        primaryLanguage: {
          type: 'string',
          required: false,
          pattern: '^[a-z]{2}$',
          description: 'Primary language (ISO 639-1 code)'
        },
        englishProficiency: {
          type: 'string',
          required: false,
          enum: ['native', 'fluent', 'advanced', 'intermediate', 'basic', 'limited'],
          description: 'English proficiency level'
        },
        householdIncomeRange: {
          type: 'string',
          required: false,
          enum: ['under-25k', '25k-50k', '50k-75k', '75k-100k', '100k-150k', 'over-150k', 'prefer-not-to-say'],
          description: 'Household income range'
        },
        allowReporting: {
          type: 'boolean',
          required: false,
          description: 'Consent to use data for institutional reporting'
        },
        allowResearch: {
          type: 'boolean',
          required: false,
          description: 'Consent to use data for research'
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
            /* Same structure as GET /users/me/demographics */
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data', errors: '[{ field, message }]' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 404, code: 'DEMOGRAPHICS_NOT_FOUND', message: 'Demographics data not found' }
      ]
    },

    example: {
      request: {
        isHispanicLatino: false,
        race: ['asian', 'white'],
        citizenship: 'us-citizen',
        firstGenerationStudent: false,
        hasDisability: false,
        primaryLanguage: 'en',
        englishProficiency: 'native',
        allowReporting: true,
        allowResearch: true
      },
      response: {
        success: true,
        message: 'Demographics data updated successfully',
        data: {
          /* Complete demographics object with updates applied */
        }
      }
    },

    permissions: ['authenticated'],

    notes: `
      - Users can only update their own demographics data
      - Partial updates supported (only send fields to change)
      - All fields optional - respect user privacy
      - UI MUST include clear consent checkboxes for:
        * allowReporting: "I consent to use this data for institutional reporting"
        * allowResearch: "I consent to use this data for research"
      - UI MUST explain:
        * Why demographics are collected (compliance, research)
        * Who can access the data (authorized staff only)
        * How data is protected (encrypted, access-controlled)
        * That providing data is optional
      - Validation rules:
        * race: Can select multiple categories
        * countryOfCitizenship: 2-letter ISO code
        * primaryLanguage: 2-letter ISO code
        * visaType: Only if citizenship is visa-holder
      - lastUpdated timestamp updated automatically
      - Returns complete updated demographics data on success
      - BREAKING CHANGE: New endpoint for demographics management
      - Critical for Title IX, ADA, IPEDS compliance
    `
  }
};

// Type exports for consumers
export type DemographicsContractType = typeof DemographicsContract;
export type DemographicsDataResponse = typeof DemographicsContract.getMyDemographics.example.response;
export type DemographicsUpdateRequest = typeof DemographicsContract.updateMyDemographics.example.request;

// Enum types for frontend use
export type RaceCategory =
  | 'american-indian-alaska-native'
  | 'asian'
  | 'black-african-american'
  | 'native-hawaiian-pacific-islander'
  | 'white'
  | 'two-or-more-races'
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
