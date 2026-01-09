/**
 * System API Contracts
 * Version: 1.0.0
 *
 * These contracts define the system health, monitoring, and administrative endpoints
 * for the LMS API. Includes health checks, metrics, version information, and
 * maintenance mode management.
 *
 * Public endpoints (no auth):
 * - GET /api/v2/system/health - Basic health check
 * - GET /api/v2/system/version - API version info
 *
 * Admin-only endpoints:
 * - GET /api/v2/system/status - Detailed system status
 * - GET /api/v2/system/metrics - System metrics and KPIs
 * - GET /api/v2/system/stats - Platform statistics
 * - POST /api/v2/system/maintenance - Toggle maintenance mode
 */

export const SystemContracts = {
  /**
   * System Health Check (Public)
   * No authentication required - used for monitoring/load balancers
   */
  health: {
    endpoint: '/api/v2/system/health',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Basic health check for monitoring systems and load balancers',

    request: {
      headers: {},
      query: {}
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          status: 'healthy | degraded | unhealthy',
          timestamp: 'Date',
          uptime: 'number', // seconds
          version: 'string'
        }
      },
      errors: [
        {
          status: 503,
          code: 'SERVICE_UNAVAILABLE',
          message: 'System is unhealthy or in maintenance mode',
          body: {
            success: false,
            status: 'unhealthy',
            timestamp: 'Date',
            reason: 'string'
          }
        }
      ]
    },

    example: {
      request: {},
      response: {
        success: true,
        status: 'healthy',
        timestamp: '2026-01-08T12:00:00.000Z',
        uptime: 3600,
        version: '2.0.0'
      }
    },

    permissions: [],

    notes: `
      - Public endpoint - no authentication required
      - Used by load balancers and monitoring systems
      - Returns 200 if system is healthy
      - Returns 503 if system is unhealthy or in maintenance mode
      - Status values:
        * healthy: All systems operational
        * degraded: Some non-critical systems have issues
        * unhealthy: Critical systems are failing
      - Uptime is in seconds since server start
    `
  },

  /**
   * Detailed System Status (Admin Only)
   * Comprehensive health check of all system components
   */
  status: {
    endpoint: '/api/v2/system/status',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Detailed system status including all component health checks',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {}
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            overall: {
              status: 'healthy | degraded | unhealthy',
              timestamp: 'Date',
              uptime: 'number',
              maintenanceMode: 'boolean'
            },
            components: {
              database: {
                status: 'healthy | degraded | unhealthy',
                responseTime: 'number', // milliseconds
                connections: {
                  active: 'number',
                  available: 'number',
                  max: 'number'
                },
                message: 'string | null'
              },
              cache: {
                status: 'healthy | degraded | unhealthy',
                responseTime: 'number',
                hitRate: 'number', // percentage
                memory: {
                  used: 'number', // bytes
                  max: 'number'
                },
                message: 'string | null'
              },
              storage: {
                status: 'healthy | degraded | unhealthy',
                disk: {
                  used: 'number', // bytes
                  available: 'number',
                  total: 'number',
                  percentUsed: 'number'
                },
                message: 'string | null'
              },
              email: {
                status: 'healthy | degraded | unhealthy',
                provider: 'string',
                lastSent: 'Date | null',
                queueSize: 'number',
                message: 'string | null'
              },
              scorm: {
                status: 'healthy | degraded | unhealthy',
                packagesCount: 'number',
                activeSessions: 'number',
                message: 'string | null'
              },
              api: {
                status: 'healthy | degraded | unhealthy',
                version: 'string',
                environment: 'development | staging | production',
                avgResponseTime: 'number', // milliseconds
                errorRate: 'number' // percentage
              }
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 403, code: 'FORBIDDEN', message: 'Admin access required' }
      ]
    },

    example: {
      request: {},
      response: {
        success: true,
        data: {
          overall: {
            status: 'healthy',
            timestamp: '2026-01-08T12:00:00.000Z',
            uptime: 86400,
            maintenanceMode: false
          },
          components: {
            database: {
              status: 'healthy',
              responseTime: 15,
              connections: {
                active: 10,
                available: 90,
                max: 100
              },
              message: null
            },
            cache: {
              status: 'healthy',
              responseTime: 2,
              hitRate: 95.5,
              memory: {
                used: 536870912,
                max: 1073741824
              },
              message: null
            },
            storage: {
              status: 'healthy',
              disk: {
                used: 53687091200,
                available: 160061374400,
                total: 214748364800,
                percentUsed: 25
              },
              message: null
            },
            email: {
              status: 'healthy',
              provider: 'SendGrid',
              lastSent: '2026-01-08T11:58:32.000Z',
              queueSize: 0,
              message: null
            },
            scorm: {
              status: 'healthy',
              packagesCount: 125,
              activeSessions: 42,
              message: null
            },
            api: {
              status: 'healthy',
              version: '2.0.0',
              environment: 'production',
              avgResponseTime: 150,
              errorRate: 0.5
            }
          }
        }
      }
    },

    permissions: ['system:admin', 'global-admin'],

    notes: `
      - Admin-only endpoint
      - Returns detailed health information for all system components
      - Component status values:
        * healthy: Component is functioning normally
        * degraded: Component has issues but is still operational
        * unhealthy: Component is failing and may cause system issues
      - Response times in milliseconds
      - Storage sizes in bytes
      - Useful for system monitoring dashboards
      - Should be cached for 10-30 seconds to avoid performance impact
    `
  },

  /**
   * System Metrics (Admin Only)
   * Performance metrics and KPIs
   */
  metrics: {
    endpoint: '/api/v2/system/metrics',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'System performance metrics and key performance indicators',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
        period: {
          type: 'string',
          required: false,
          enum: ['1h', '24h', '7d', '30d'],
          default: '24h',
          description: 'Time period for metrics'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            period: 'string',
            timestamp: 'Date',
            performance: {
              avgResponseTime: 'number', // milliseconds
              p50ResponseTime: 'number',
              p95ResponseTime: 'number',
              p99ResponseTime: 'number',
              requestsPerSecond: 'number',
              totalRequests: 'number'
            },
            errors: {
              errorRate: 'number', // percentage
              totalErrors: 'number',
              errorsByType: {
                '4xx': 'number',
                '5xx': 'number'
              },
              topErrors: [
                {
                  code: 'string',
                  count: 'number',
                  percentage: 'number'
                }
              ]
            },
            resources: {
              cpu: {
                usage: 'number', // percentage
                loadAverage: 'number[]' // 1, 5, 15 minute averages
              },
              memory: {
                used: 'number', // bytes
                free: 'number',
                total: 'number',
                percentage: 'number'
              },
              disk: {
                used: 'number',
                free: 'number',
                total: 'number',
                percentage: 'number',
                iops: 'number' // operations per second
              },
              network: {
                bytesIn: 'number',
                bytesOut: 'number',
                packetsIn: 'number',
                packetsOut: 'number'
              }
            },
            database: {
              queries: {
                total: 'number',
                slow: 'number', // queries > 1000ms
                avgDuration: 'number',
                p95Duration: 'number'
              },
              connections: {
                current: 'number',
                peak: 'number',
                max: 'number'
              }
            },
            cache: {
              hitRate: 'number', // percentage
              hits: 'number',
              misses: 'number',
              evictions: 'number'
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 403, code: 'FORBIDDEN', message: 'Admin access required' }
      ]
    },

    example: {
      request: {
        period: '24h'
      },
      response: {
        success: true,
        data: {
          period: '24h',
          timestamp: '2026-01-08T12:00:00.000Z',
          performance: {
            avgResponseTime: 145,
            p50ResponseTime: 120,
            p95ResponseTime: 280,
            p99ResponseTime: 450,
            requestsPerSecond: 125.5,
            totalRequests: 10843200
          },
          errors: {
            errorRate: 0.8,
            totalErrors: 86746,
            errorsByType: {
              '4xx': 72456,
              '5xx': 14290
            },
            topErrors: [
              {
                code: 'NOT_FOUND',
                count: 45230,
                percentage: 52.1
              },
              {
                code: 'VALIDATION_ERROR',
                count: 15678,
                percentage: 18.1
              },
              {
                code: 'INTERNAL_ERROR',
                count: 8945,
                percentage: 10.3
              }
            ]
          },
          resources: {
            cpu: {
              usage: 45.2,
              loadAverage: [2.5, 2.3, 2.1]
            },
            memory: {
              used: 8589934592,
              free: 7516192768,
              total: 16106127360,
              percentage: 53.3
            },
            disk: {
              used: 107374182400,
              free: 107374182400,
              total: 214748364800,
              percentage: 50,
              iops: 1250
            },
            network: {
              bytesIn: 536870912000,
              bytesOut: 1073741824000,
              packetsIn: 125000000,
              packetsOut: 150000000
            }
          },
          database: {
            queries: {
              total: 5421600,
              slow: 124,
              avgDuration: 25,
              p95Duration: 85
            },
            connections: {
              current: 45,
              peak: 78,
              max: 100
            }
          },
          cache: {
            hitRate: 94.5,
            hits: 9523456,
            misses: 553210,
            evictions: 12345
          }
        }
      }
    },

    permissions: ['system:admin', 'global-admin'],

    notes: `
      - Admin-only endpoint
      - Returns performance metrics for specified time period
      - Periods: 1h, 24h, 7d, 30d
      - All byte values are in bytes
      - Response times in milliseconds
      - Useful for performance monitoring and capacity planning
      - Should be cached for at least 1 minute
      - Load averages are 1, 5, and 15 minute averages
      - p50/p95/p99 are percentile response times
    `
  },

  /**
   * API Version Information (Public)
   * Version and build information about the API
   */
  version: {
    endpoint: '/api/v2/system/version',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'API version and build information',

    request: {
      headers: {},
      query: {}
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            version: 'string',
            apiVersion: 'string',
            buildNumber: 'string',
            buildDate: 'Date',
            environment: 'development | staging | production',
            nodeVersion: 'string',
            features: {
              scormSupport: 'boolean',
              exerciseBuilder: 'boolean',
              advancedReporting: 'boolean',
              ssoIntegration: 'boolean',
              mobileApp: 'boolean'
            },
            deprecations: [
              {
                endpoint: 'string',
                deprecatedIn: 'string',
                removalIn: 'string',
                message: 'string'
              }
            ]
          }
        }
      },
      errors: []
    },

    example: {
      request: {},
      response: {
        success: true,
        data: {
          version: '2.0.0',
          apiVersion: 'v2',
          buildNumber: '2026.01.08.1234',
          buildDate: '2026-01-08T10:00:00.000Z',
          environment: 'production',
          nodeVersion: '20.11.0',
          features: {
            scormSupport: true,
            exerciseBuilder: true,
            advancedReporting: true,
            ssoIntegration: false,
            mobileApp: false
          },
          deprecations: []
        }
      }
    },

    permissions: [],

    notes: `
      - Public endpoint - no authentication required
      - Returns version information and feature flags
      - Useful for client apps to check compatibility
      - Features object indicates which capabilities are enabled
      - Deprecations array warns about endpoints that will be removed
      - Build number format: YYYY.MM.DD.BUILD
      - Environment indicates deployment target
    `
  },

  /**
   * Platform Statistics (Admin Only)
   * High-level statistics about platform usage
   */
  stats: {
    endpoint: '/api/v2/system/stats',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Platform usage statistics and counts',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
        period: {
          type: 'string',
          required: false,
          enum: ['today', 'week', 'month', 'year', 'all'],
          default: 'all',
          description: 'Time period for activity stats'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            timestamp: 'Date',
            period: 'string',
            users: {
              total: 'number',
              active: 'number', // active in period
              byRole: {
                'global-admin': 'number',
                'staff': 'number',
                'learner': 'number'
              },
              newInPeriod: 'number',
              loginCount: 'number'
            },
            departments: {
              total: 'number',
              active: 'number'
            },
            programs: {
              total: 'number',
              published: 'number',
              draft: 'number'
            },
            courses: {
              total: 'number',
              published: 'number',
              draft: 'number',
              archived: 'number',
              avgModulesPerCourse: 'number'
            },
            classes: {
              total: 'number',
              active: 'number',
              upcoming: 'number',
              completed: 'number'
            },
            content: {
              total: 'number',
              scorm: 'number',
              exercises: 'number',
              custom: 'number',
              totalSizeMB: 'number'
            },
            enrollments: {
              total: 'number',
              active: 'number',
              completed: 'number',
              withdrawn: 'number',
              programEnrollments: 'number',
              courseEnrollments: 'number'
            },
            activity: {
              activeLearners: 'number', // active in period
              contentAttempts: 'number',
              completions: 'number',
              avgProgressPercentage: 'number',
              totalLearningHours: 'number'
            },
            assessments: {
              exercisesCreated: 'number',
              assessmentsTaken: 'number',
              avgScore: 'number',
              passRate: 'number' // percentage
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 403, code: 'FORBIDDEN', message: 'Admin access required' }
      ]
    },

    example: {
      request: {
        period: 'month'
      },
      response: {
        success: true,
        data: {
          timestamp: '2026-01-08T12:00:00.000Z',
          period: 'month',
          users: {
            total: 15420,
            active: 8942,
            byRole: {
              'global-admin': 5,
              'staff': 145,
              'learner': 15270
            },
            newInPeriod: 342,
            loginCount: 42156
          },
          departments: {
            total: 25,
            active: 23
          },
          programs: {
            total: 48,
            published: 42,
            draft: 6
          },
          courses: {
            total: 326,
            published: 278,
            draft: 35,
            archived: 13,
            avgModulesPerCourse: 8.5
          },
          classes: {
            total: 156,
            active: 89,
            upcoming: 42,
            completed: 25
          },
          content: {
            total: 1248,
            scorm: 452,
            exercises: 356,
            custom: 440,
            totalSizeMB: 15360
          },
          enrollments: {
            total: 23456,
            active: 18920,
            completed: 3890,
            withdrawn: 646,
            programEnrollments: 8450,
            courseEnrollments: 15006
          },
          activity: {
            activeLearners: 8942,
            contentAttempts: 125678,
            completions: 12456,
            avgProgressPercentage: 62.5,
            totalLearningHours: 45678
          },
          assessments: {
            exercisesCreated: 356,
            assessmentsTaken: 45678,
            avgScore: 78.5,
            passRate: 82.3
          }
        }
      }
    },

    permissions: ['system:admin', 'global-admin'],

    notes: `
      - Admin-only endpoint
      - Returns high-level platform statistics
      - Period affects activity-related stats (active users, new users, etc.)
      - Totals (like total users, total courses) are always cumulative
      - Active users = users with login in the specified period
      - Active learners = learners with content activity in period
      - totalLearningHours is estimated from content attempts
      - Pass rate is percentage of assessments with passing score
      - Content size is in megabytes
      - Useful for executive dashboards and reporting
      - Should be cached for 5-15 minutes
    `
  },

  /**
   * Toggle Maintenance Mode (Admin Only)
   * Enable or disable system maintenance mode
   */
  maintenance: {
    endpoint: '/api/v2/system/maintenance',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Enable or disable system maintenance mode',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        enabled: {
          type: 'boolean',
          required: true,
          description: 'Enable or disable maintenance mode'
        },
        message: {
          type: 'string',
          required: false,
          maxLength: 500,
          description: 'Message to display to users'
        },
        allowedIPs: {
          type: 'string[]',
          required: false,
          description: 'IP addresses that can still access the system'
        },
        scheduledEnd: {
          type: 'Date',
          required: false,
          description: 'When maintenance is expected to end'
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
            maintenanceMode: 'boolean',
            message: 'string | null',
            allowedIPs: 'string[]',
            scheduledEnd: 'Date | null',
            enabledAt: 'Date | null',
            enabledBy: 'string | null'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 403, code: 'FORBIDDEN', message: 'Admin access required' },
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' }
      ]
    },

    example: {
      request: {
        enabled: true,
        message: 'System maintenance in progress. Expected completion: 2:00 PM EST.',
        allowedIPs: ['192.168.1.100', '10.0.0.50'],
        scheduledEnd: '2026-01-08T19:00:00.000Z'
      },
      response: {
        success: true,
        message: 'Maintenance mode enabled',
        data: {
          maintenanceMode: true,
          message: 'System maintenance in progress. Expected completion: 2:00 PM EST.',
          allowedIPs: ['192.168.1.100', '10.0.0.50'],
          scheduledEnd: '2026-01-08T19:00:00.000Z',
          enabledAt: '2026-01-08T12:00:00.000Z',
          enabledBy: '507f1f77bcf86cd799439011'
        }
      }
    },

    permissions: ['system:admin', 'global-admin'],

    notes: `
      - Admin-only endpoint
      - When maintenance mode is enabled:
        * All non-admin API requests return 503 Service Unavailable
        * Health check endpoint returns status: 'unhealthy'
        * Only IPs in allowedIPs list can access the system
        * Custom message is shown to users
      - To disable maintenance mode, send enabled: false
      - allowedIPs allows admin access during maintenance
      - scheduledEnd is informational only (doesn't auto-disable)
      - enabledBy stores the user ID who enabled maintenance
      - This should trigger notifications to all active users
      - Frontend should poll this endpoint or subscribe to websocket updates
      - Maintenance mode state is stored in database and persists across restarts
    `
  }
};

// Type exports for consumers
export type SystemContractType = typeof SystemContracts;
export type HealthResponse = typeof SystemContracts.health.example.response;
export type StatusResponse = typeof SystemContracts.status.example.response;
export type MetricsResponse = typeof SystemContracts.metrics.example.response;
export type VersionResponse = typeof SystemContracts.version.example.response;
export type StatsResponse = typeof SystemContracts.stats.example.response;
export type MaintenanceRequest = typeof SystemContracts.maintenance.example.request;
export type MaintenanceResponse = typeof SystemContracts.maintenance.example.response;
