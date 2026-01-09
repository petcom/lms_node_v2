/**
 * Settings Management API Contracts
 * Version: 1.0.0
 *
 * These contracts define the system settings and configuration endpoints for the LMS API.
 * Both backend and UI teams use these as the source of truth.
 *
 * Phase 6: System & Settings (Medium Priority)
 */

export const SettingsContract = {
  /**
   * Get All System Settings
   */
  getAll: {
    endpoint: '/api/v2/settings',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Retrieve all system settings (filtered by permissions and visibility)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
        category: {
          type: 'string',
          required: false,
          enum: ['general', 'authentication', 'enrollment', 'notifications', 'security', 'features', 'branding'],
          description: 'Filter settings by category'
        },
        includePrivate: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Include private settings (admin only)'
        },
        departmentId: {
          type: 'string',
          required: false,
          description: 'Get department-specific overrides'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            settings: [
              {
                key: 'string',
                value: 'any',
                type: 'string or number or boolean or json',
                category: 'general or authentication or enrollment or notifications or security or features or branding',
                description: 'string',
                isPublic: 'boolean',
                isEncrypted: 'boolean',
                isFeatureFlag: 'boolean',
                defaultValue: 'any',
                validationRules: {
                  required: 'boolean',
                  min: 'number or null',
                  max: 'number or null',
                  pattern: 'string or null',
                  enum: 'array or null',
                  customValidator: 'string or null'
                },
                departmentOverride: 'boolean',
                lastModifiedAt: 'Date',
                lastModifiedBy: 'object or null'
              }
            ],
            totalCount: 'number',
            categories: 'string[]'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view settings' }
      ]
    },

    example: {
      request: {
        query: {
          category: 'general',
          includePrivate: false
        }
      },
      response: {
        success: true,
        data: {
          settings: [
            {
              key: 'system.name',
              value: 'Learning Management System',
              type: 'string',
              category: 'general',
              description: 'System display name shown in header and emails',
              isPublic: true,
              isEncrypted: false,
              isFeatureFlag: false,
              defaultValue: 'LMS',
              validationRules: {
                required: true,
                min: 1,
                max: 100,
                pattern: null,
                enum: null,
                customValidator: null
              },
              departmentOverride: false,
              lastModifiedAt: '2026-01-08T10:00:00.000Z',
              lastModifiedBy: {
                id: '507f1f77bcf86cd799439011',
                name: 'Admin User'
              }
            },
            {
              key: 'system.timezone',
              value: 'America/New_York',
              type: 'string',
              category: 'general',
              description: 'Default system timezone',
              isPublic: true,
              isEncrypted: false,
              isFeatureFlag: false,
              defaultValue: 'UTC',
              validationRules: {
                required: true,
                min: null,
                max: null,
                pattern: null,
                enum: ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo'],
                customValidator: null
              },
              departmentOverride: false,
              lastModifiedAt: '2025-12-01T00:00:00.000Z',
              lastModifiedBy: {
                id: '507f1f77bcf86cd799439011',
                name: 'Admin User'
              }
            },
            {
              key: 'enrollment.autoApprove',
              value: true,
              type: 'boolean',
              category: 'enrollment',
              description: 'Automatically approve enrollment requests',
              isPublic: true,
              isEncrypted: false,
              isFeatureFlag: false,
              defaultValue: false,
              validationRules: {
                required: true,
                min: null,
                max: null,
                pattern: null,
                enum: null,
                customValidator: null
              },
              departmentOverride: true,
              lastModifiedAt: '2025-11-15T00:00:00.000Z',
              lastModifiedBy: null
            }
          ],
          totalCount: 3,
          categories: ['general', 'enrollment']
        }
      }
    },

    permissions: ['read:settings'],

    notes: `
      - Returns all settings the authenticated user has permission to view
      - includePrivate=false (default) returns only public settings
      - includePrivate=true requires admin permission and returns all settings
      - Encrypted settings show isEncrypted=true but value is decrypted for authorized users
      - departmentId parameter returns department-specific overrides merged with system defaults
      - Feature flags (isFeatureFlag=true) control feature availability
      - Public settings can be accessed by any authenticated user
      - Private settings require admin or specific permissions
      - Settings are grouped by category for easier organization
      - lastModifiedBy may be null for system-initialized settings
    `
  },

  /**
   * Get Specific Setting by Key
   */
  get: {
    endpoint: '/api/v2/settings/:key',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get a specific setting value by its key',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        key: {
          type: 'string',
          required: true,
          description: 'Setting key (dot notation, e.g., system.name)'
        }
      },
      query: {
        departmentId: {
          type: 'string',
          required: false,
          description: 'Get department-specific override value'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            key: 'string',
            value: 'any',
            type: 'string or number or boolean or json',
            category: 'general or authentication or enrollment or notifications or security or features or branding',
            description: 'string',
            isPublic: 'boolean',
            isEncrypted: 'boolean',
            isFeatureFlag: 'boolean',
            defaultValue: 'any',
            validationRules: {
              required: 'boolean',
              min: 'number or null',
              max: 'number or null',
              pattern: 'string or null',
              enum: 'array or null',
              customValidator: 'string or null'
            },
            departmentOverride: 'boolean',
            isDepartmentValue: 'boolean',
            lastModifiedAt: 'Date',
            lastModifiedBy: 'object or null',
            version: 'number'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No permission to view this setting' },
        { status: 404, code: 'NOT_FOUND', message: 'Setting not found' }
      ]
    },

    example: {
      request: {
        params: {
          key: 'authentication.sessionTimeout'
        }
      },
      response: {
        success: true,
        data: {
          key: 'authentication.sessionTimeout',
          value: 3600,
          type: 'number',
          category: 'authentication',
          description: 'Session timeout in seconds',
          isPublic: false,
          isEncrypted: false,
          isFeatureFlag: false,
          defaultValue: 1800,
          validationRules: {
            required: true,
            min: 300,
            max: 86400,
            pattern: null,
            enum: null,
            customValidator: null
          },
          departmentOverride: false,
          isDepartmentValue: false,
          lastModifiedAt: '2026-01-05T14:30:00.000Z',
          lastModifiedBy: {
            id: '507f1f77bcf86cd799439011',
            name: 'Admin User'
          },
          version: 3
        }
      }
    },

    permissions: ['read:settings'],

    notes: `
      - Returns single setting by exact key match
      - Key uses dot notation for hierarchical settings (e.g., authentication.mfa.enabled)
      - If departmentId provided, returns department override if exists, otherwise system default
      - isDepartmentValue=true indicates returned value is from department override
      - Version increments with each update for change tracking
      - Encrypted settings are automatically decrypted for authorized users
      - Returns 403 if setting is private and user lacks permission
      - Returns 404 if setting key doesn't exist
    `
  },

  /**
   * Update Specific Setting
   */
  update: {
    endpoint: '/api/v2/settings/:key',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update a specific setting value',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        key: {
          type: 'string',
          required: true,
          description: 'Setting key to update'
        }
      },
      body: {
        value: {
          type: 'any',
          required: true,
          description: 'New setting value (must match setting type)'
        },
        departmentId: {
          type: 'string',
          required: false,
          description: 'Create department-specific override'
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
            key: 'string',
            value: 'any',
            type: 'string',
            category: 'string',
            previousValue: 'any',
            isDepartmentValue: 'boolean',
            lastModifiedAt: 'Date',
            lastModifiedBy: 'object',
            version: 'number'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Value does not meet validation rules' },
        { status: 400, code: 'TYPE_MISMATCH', message: 'Value type does not match setting type' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to update setting' },
        { status: 403, code: 'READONLY_SETTING', message: 'This setting cannot be modified via API' },
        { status: 404, code: 'NOT_FOUND', message: 'Setting not found' },
        { status: 404, code: 'DEPARTMENT_NOT_FOUND', message: 'Department not found' }
      ]
    },

    example: {
      request: {
        params: {
          key: 'enrollment.maxConcurrentCourses'
        },
        body: {
          value: 5
        }
      },
      response: {
        success: true,
        message: 'Setting updated successfully',
        data: {
          key: 'enrollment.maxConcurrentCourses',
          value: 5,
          type: 'number',
          category: 'enrollment',
          previousValue: 3,
          isDepartmentValue: false,
          lastModifiedAt: '2026-01-08T11:45:00.000Z',
          lastModifiedBy: {
            id: '507f1f77bcf86cd799439011',
            name: 'Admin User'
          },
          version: 4
        }
      }
    },

    permissions: ['write:settings'],

    notes: `
      - Value must match the setting's defined type (string, number, boolean, json)
      - Value must pass all validation rules defined for the setting
      - Validation includes: required, min/max (for numbers/strings), pattern (regex), enum (allowed values)
      - Setting previousValue for audit trail
      - departmentId creates or updates department-specific override without changing system default
      - Department overrides only available for settings where departmentOverride=true
      - Some settings marked as read-only cannot be modified via API (require database update)
      - Version increments with each successful update
      - Audit log automatically created for all setting changes
      - Changes take effect immediately (no restart required)
      - Sensitive settings (isEncrypted=true) are automatically encrypted before storage
    `
  },

  /**
   * Get Settings by Category
   */
  getByCategory: {
    endpoint: '/api/v2/settings/categories/:category',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get all settings in a specific category',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        category: {
          type: 'string',
          required: true,
          enum: ['general', 'authentication', 'enrollment', 'notifications', 'security', 'features', 'branding'],
          description: 'Setting category'
        }
      },
      query: {
        includePrivate: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Include private settings (admin only)'
        },
        departmentId: {
          type: 'string',
          required: false,
          description: 'Include department-specific overrides'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            category: 'string',
            categoryDescription: 'string',
            settings: [
              {
                key: 'string',
                value: 'any',
                type: 'string',
                description: 'string',
                isPublic: 'boolean',
                isEncrypted: 'boolean',
                isFeatureFlag: 'boolean',
                defaultValue: 'any',
                validationRules: 'object',
                departmentOverride: 'boolean',
                isDepartmentValue: 'boolean',
                lastModifiedAt: 'Date'
              }
            ],
            count: 'number'
          }
        }
      },
      errors: [
        { status: 400, code: 'INVALID_CATEGORY', message: 'Invalid category specified' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view settings' }
      ]
    },

    example: {
      request: {
        params: {
          category: 'authentication'
        },
        query: {
          includePrivate: true
        }
      },
      response: {
        success: true,
        data: {
          category: 'authentication',
          categoryDescription: 'Authentication and security settings',
          settings: [
            {
              key: 'authentication.mfa.enabled',
              value: false,
              type: 'boolean',
              description: 'Enable multi-factor authentication',
              isPublic: false,
              isEncrypted: false,
              isFeatureFlag: true,
              defaultValue: false,
              validationRules: {
                required: true,
                min: null,
                max: null,
                pattern: null,
                enum: null,
                customValidator: null
              },
              departmentOverride: false,
              isDepartmentValue: false,
              lastModifiedAt: '2025-10-01T00:00:00.000Z'
            },
            {
              key: 'authentication.passwordMinLength',
              value: 8,
              type: 'number',
              description: 'Minimum password length',
              isPublic: false,
              isEncrypted: false,
              isFeatureFlag: false,
              defaultValue: 8,
              validationRules: {
                required: true,
                min: 6,
                max: 128,
                pattern: null,
                enum: null,
                customValidator: null
              },
              departmentOverride: false,
              isDepartmentValue: false,
              lastModifiedAt: '2025-09-15T00:00:00.000Z'
            },
            {
              key: 'authentication.sessionTimeout',
              value: 3600,
              type: 'number',
              description: 'Session timeout in seconds',
              isPublic: false,
              isEncrypted: false,
              isFeatureFlag: false,
              defaultValue: 1800,
              validationRules: {
                required: true,
                min: 300,
                max: 86400,
                pattern: null,
                enum: null,
                customValidator: null
              },
              departmentOverride: false,
              isDepartmentValue: false,
              lastModifiedAt: '2026-01-05T14:30:00.000Z'
            }
          ],
          count: 3
        }
      }
    },

    permissions: ['read:settings'],

    notes: `
      - Returns all settings within the specified category
      - Available categories:
        - general: System name, timezone, language, date formats
        - authentication: Login, passwords, MFA, session management
        - enrollment: Auto-approval, limits, prerequisites, waitlists
        - notifications: Email, SMS, in-app notifications, templates
        - security: CORS, rate limiting, IP restrictions, encryption
        - features: Feature flags for toggling functionality
        - branding: Logo, colors, themes, custom CSS
      - includePrivate=false filters to public settings only
      - departmentId returns merged view with department overrides
      - Settings within category returned in alphabetical order by key
      - Category descriptions help explain setting groups in UI
    `
  },

  /**
   * Bulk Update Settings
   */
  bulkUpdate: {
    endpoint: '/api/v2/settings/bulk',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Update multiple settings in a single request',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        settings: {
          type: 'array',
          required: true,
          description: 'Array of settings to update',
          items: {
            key: {
              type: 'string',
              required: true,
              description: 'Setting key'
            },
            value: {
              type: 'any',
              required: true,
              description: 'New value'
            },
            departmentId: {
              type: 'string',
              required: false,
              description: 'Department ID for override'
            }
          }
        },
        validateOnly: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Validate without applying changes'
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
            updated: [
              {
                key: 'string',
                value: 'any',
                previousValue: 'any',
                success: 'boolean'
              }
            ],
            failed: [
              {
                key: 'string',
                error: 'string',
                reason: 'string'
              }
            ],
            summary: {
              total: 'number',
              successful: 'number',
              failed: 'number'
            }
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'One or more settings failed validation' },
        { status: 400, code: 'EMPTY_REQUEST', message: 'Settings array cannot be empty' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to update settings' }
      ]
    },

    example: {
      request: {
        settings: [
          {
            key: 'system.name',
            value: 'Advanced LMS Platform'
          },
          {
            key: 'enrollment.maxConcurrentCourses',
            value: 10
          },
          {
            key: 'authentication.sessionTimeout',
            value: 7200
          }
        ],
        validateOnly: false
      },
      response: {
        success: true,
        message: 'Bulk update completed',
        data: {
          updated: [
            {
              key: 'system.name',
              value: 'Advanced LMS Platform',
              previousValue: 'Learning Management System',
              success: true
            },
            {
              key: 'enrollment.maxConcurrentCourses',
              value: 10,
              previousValue: 5,
              success: true
            },
            {
              key: 'authentication.sessionTimeout',
              value: 7200,
              previousValue: 3600,
              success: true
            }
          ],
          failed: [],
          summary: {
            total: 3,
            successful: 3,
            failed: 0
          }
        }
      }
    },

    permissions: ['write:settings'],

    notes: `
      - Updates multiple settings atomically within a transaction
      - If any setting fails validation, entire request can be rolled back (optional behavior)
      - validateOnly=true performs validation without applying changes (dry run)
      - Each setting validated independently according to its rules
      - Failed updates included in failed array with error details
      - Successful updates return previousValue for audit
      - All updates logged in audit trail with single bulk operation ID
      - Maximum 100 settings per bulk request
      - Department overrides can be mixed with system setting updates
      - Useful for importing configuration or resetting to defaults
      - Returns partial success if some settings update successfully
    `
  },

  /**
   * Reset Settings to Defaults
   */
  reset: {
    endpoint: '/api/v2/settings/reset',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Reset settings to their default values',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        keys: {
          type: 'array',
          required: false,
          description: 'Specific setting keys to reset (if empty, resets all)',
          items: 'string'
        },
        category: {
          type: 'string',
          required: false,
          enum: ['general', 'authentication', 'enrollment', 'notifications', 'security', 'features', 'branding'],
          description: 'Reset all settings in a category'
        },
        departmentId: {
          type: 'string',
          required: false,
          description: 'Reset department overrides only'
        },
        confirm: {
          type: 'boolean',
          required: true,
          description: 'Must be true to confirm reset operation'
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
            reset: [
              {
                key: 'string',
                previousValue: 'any',
                defaultValue: 'any'
              }
            ],
            count: 'number',
            affectedCategories: 'string[]'
          }
        }
      },
      errors: [
        { status: 400, code: 'CONFIRMATION_REQUIRED', message: 'confirm must be true to proceed' },
        { status: 400, code: 'NO_SETTINGS_SPECIFIED', message: 'Must specify keys, category, or departmentId' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to reset settings' },
        { status: 404, code: 'SETTINGS_NOT_FOUND', message: 'No settings found matching criteria' }
      ]
    },

    example: {
      request: {
        category: 'authentication',
        confirm: true
      },
      response: {
        success: true,
        message: '3 settings reset to defaults',
        data: {
          reset: [
            {
              key: 'authentication.mfa.enabled',
              previousValue: true,
              defaultValue: false
            },
            {
              key: 'authentication.passwordMinLength',
              previousValue: 12,
              defaultValue: 8
            },
            {
              key: 'authentication.sessionTimeout',
              previousValue: 7200,
              defaultValue: 1800
            }
          ],
          count: 3,
          affectedCategories: ['authentication']
        }
      }
    },

    permissions: ['admin:settings'],

    notes: `
      - DANGEROUS OPERATION: Requires explicit confirmation
      - confirm=true must be provided or request will fail
      - If keys array provided, resets only those specific settings
      - If category provided, resets all settings in that category
      - If departmentId provided, removes department overrides (system defaults take effect)
      - If no parameters provided (only confirm=true), resets ALL settings to defaults
      - Reset operation creates comprehensive audit log entry
      - Cannot be undone via API (backup/restore from database required)
      - Read-only settings are not affected by reset
      - Encrypted settings reset to encrypted default values
      - Feature flags reset to default state (usually disabled)
      - Requires admin:settings permission (higher than write:settings)
      - Recommend database backup before performing full reset
    `
  }
};

// Type exports for consumers
export type SettingsContractType = typeof SettingsContract;
export type SettingsListResponse = typeof SettingsContract.getAll.example.response;
export type SettingDetailsResponse = typeof SettingsContract.get.example.response;
export type SettingUpdateRequest = typeof SettingsContract.update.example.request;
export type SettingUpdateResponse = typeof SettingsContract.update.example.response;
export type SettingsByCategoryResponse = typeof SettingsContract.getByCategory.example.response;
export type BulkUpdateRequest = typeof SettingsContract.bulkUpdate.example.request;
export type BulkUpdateResponse = typeof SettingsContract.bulkUpdate.example.response;
export type ResetSettingsRequest = typeof SettingsContract.reset.example.request;
export type ResetSettingsResponse = typeof SettingsContract.reset.example.response;
