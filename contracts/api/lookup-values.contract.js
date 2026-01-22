"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LookupValuesContract = exports.ROLES_BY_USER_TYPE = exports.ROLE_DISPLAY = exports.USER_TYPE_DISPLAY = exports.GLOBAL_ADMIN_ROLES = exports.LEARNER_ROLES = exports.STAFF_ROLES = exports.USER_TYPES = void 0;
exports.isValidRoleForUserType = isValidRoleForUserType;
exports.getUserTypeDisplay = getUserTypeDisplay;
exports.getRoleDisplay = getRoleDisplay;
exports.toUserTypeObjects = toUserTypeObjects;
exports.toUserTypeStrings = toUserTypeStrings;
exports.USER_TYPES = ['learner', 'staff', 'global-admin'];
exports.STAFF_ROLES = ['instructor', 'department-admin', 'content-admin', 'billing-admin'];
exports.LEARNER_ROLES = ['course-taker', 'auditor', 'learner-supervisor'];
exports.GLOBAL_ADMIN_ROLES = ['system-admin', 'enrollment-admin', 'course-admin', 'theme-admin', 'financial-admin'];
exports.USER_TYPE_DISPLAY = {
    'learner': 'Learner',
    'staff': 'Staff',
    'global-admin': 'System Admin',
};
exports.ROLE_DISPLAY = {
    'instructor': 'Instructor',
    'department-admin': 'Department Admin',
    'content-admin': 'Content Admin',
    'billing-admin': 'Billing Admin',
    'course-taker': 'Course Taker',
    'auditor': 'Auditor',
    'learner-supervisor': 'Learner Supervisor',
    'system-admin': 'System Admin',
    'enrollment-admin': 'Enrollment Admin',
    'course-admin': 'Course Admin',
    'theme-admin': 'Theme Admin',
    'financial-admin': 'Financial Admin',
};
exports.ROLES_BY_USER_TYPE = {
    'learner': exports.LEARNER_ROLES,
    'staff': exports.STAFF_ROLES,
    'global-admin': exports.GLOBAL_ADMIN_ROLES,
};
exports.LookupValuesContract = {
    resource: 'lookup-values',
    version: '1.0.0',
    basePath: '/api/v2/lookup-values',
    list: {
        endpoint: '/api/v2/lookup-values',
        method: 'GET',
        version: '1.0.0',
        description: 'List lookup values with optional filtering',
        auth: 'required',
        request: {
            query: {
                category: { type: 'string', required: false, description: 'Filter by category' },
                parentLookupId: { type: 'string', required: false, description: 'Filter by parent lookup' },
                isActive: { type: 'boolean', required: false, default: true, description: 'Filter by active status' },
            }
        },
        response: {
            success: {
                status: 200,
                body: {
                    success: 'boolean',
                    data: 'LookupValue[]',
                    count: 'number'
                }
            }
        },
        examples: {
            getAllUserTypes: {
                request: { query: { category: 'userType' } },
                response: {
                    success: true,
                    data: [
                        { _id: '...', lookupId: 'userType.learner', category: 'userType', key: 'learner', parentLookupId: null, displayAs: 'Learner', sortOrder: 1, isActive: true },
                        { _id: '...', lookupId: 'userType.staff', category: 'userType', key: 'staff', parentLookupId: null, displayAs: 'Staff', sortOrder: 2, isActive: true },
                        { _id: '...', lookupId: 'userType.global-admin', category: 'userType', key: 'global-admin', parentLookupId: null, displayAs: 'System Admin', sortOrder: 3, isActive: true },
                    ],
                    count: 3
                }
            },
            getStaffRoles: {
                request: { query: { parentLookupId: 'userType.staff' } },
                response: {
                    success: true,
                    data: [
                        { _id: '...', lookupId: 'role.instructor', category: 'role', key: 'instructor', parentLookupId: 'userType.staff', displayAs: 'Instructor', sortOrder: 1, isActive: true },
                        { _id: '...', lookupId: 'role.department-admin', category: 'role', key: 'department-admin', parentLookupId: 'userType.staff', displayAs: 'Department Admin', sortOrder: 2, isActive: true },
                        { _id: '...', lookupId: 'role.content-admin', category: 'role', key: 'content-admin', parentLookupId: 'userType.staff', displayAs: 'Content Admin', sortOrder: 3, isActive: true },
                        { _id: '...', lookupId: 'role.billing-admin', category: 'role', key: 'billing-admin', parentLookupId: 'userType.staff', displayAs: 'Billing Admin', sortOrder: 4, isActive: true },
                    ],
                    count: 4
                }
            }
        }
    },
    getByLookupId: {
        endpoint: '/api/v2/lookup-values/:lookupId',
        method: 'GET',
        version: '1.0.0',
        description: 'Get a single lookup value by its lookupId',
        auth: 'required',
        request: {
            params: {
                lookupId: { type: 'string', required: true, description: 'The unique lookupId' }
            }
        },
        response: {
            success: {
                status: 200,
                body: {
                    success: 'boolean',
                    data: 'LookupValue'
                }
            },
            errors: [
                { status: 404, code: 'NOT_FOUND', message: 'Lookup value not found' }
            ]
        }
    },
    listUserTypes: {
        endpoint: '/api/v2/lists/user-types',
        method: 'GET',
        version: '1.0.0',
        description: 'Get all active user types as UserTypeObject[]',
        auth: 'optional',
        response: {
            success: {
                status: 200,
                body: {
                    success: 'boolean',
                    data: 'UserTypeObject[]'
                }
            }
        },
        example: {
            response: {
                success: true,
                data: [
                    { _id: 'learner', displayAs: 'Learner' },
                    { _id: 'staff', displayAs: 'Staff' },
                    { _id: 'global-admin', displayAs: 'System Admin' },
                ]
            }
        }
    },
    listRolesForUserType: {
        endpoint: '/api/v2/lists/roles/:userType',
        method: 'GET',
        version: '1.0.0',
        description: 'Get all valid roles for a specific user type',
        auth: 'required',
        request: {
            params: {
                userType: { type: 'string', required: true, enum: ['learner', 'staff', 'global-admin'] }
            }
        },
        response: {
            success: {
                status: 200,
                body: {
                    success: 'boolean',
                    data: 'RoleObject[]'
                }
            },
            errors: [
                { status: 400, code: 'INVALID_USER_TYPE', message: 'Invalid user type' }
            ]
        },
        examples: {
            staffRoles: {
                request: { params: { userType: 'staff' } },
                response: {
                    success: true,
                    data: [
                        { _id: 'instructor', displayAs: 'Instructor' },
                        { _id: 'department-admin', displayAs: 'Department Admin' },
                        { _id: 'content-admin', displayAs: 'Content Admin' },
                        { _id: 'billing-admin', displayAs: 'Billing Admin' },
                    ]
                }
            }
        }
    }
};
function isValidRoleForUserType(userType, role) {
    const validRoles = exports.ROLES_BY_USER_TYPE[userType];
    return validRoles?.includes(role) ?? false;
}
function getUserTypeDisplay(userType) {
    return exports.USER_TYPE_DISPLAY[userType] ?? userType;
}
function getRoleDisplay(role) {
    return exports.ROLE_DISPLAY[role] ?? role;
}
function toUserTypeObjects(userTypes) {
    return userTypes.map(ut => ({
        _id: ut,
        displayAs: exports.USER_TYPE_DISPLAY[ut] ?? ut
    }));
}
function toUserTypeStrings(userTypeObjects) {
    return userTypeObjects.map(uto => uto._id);
}
