# UI Authorization Recommendations

## Document Purpose

This document provides recommendations for the UI team on implementing authorization in the LMS frontend application. It ensures consistency between frontend permission checks and backend API authorization.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Token Storage Strategy](#2-token-storage-strategy)
3. [Access Rights Structure](#3-access-rights-structure)
4. [Permission Checking](#4-permission-checking)
5. [Component Visibility](#5-component-visibility)
6. [API Integration](#6-api-integration)
7. [Session Management](#7-session-management)
8. [Security Considerations](#8-security-considerations)

---

## 1. Architecture Overview

### Authorization Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Login     │────▶│   Backend   │────▶│  Returns:   │
│   Request   │     │   Auth      │     │  - tokens   │
│             │     │   Endpoint  │     │  - access   │
│             │     │             │     │    rights   │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                    ┌──────────────────────────┘
                    ▼
         ┌─────────────────────┐
         │  Store in Context   │
         │  - accessToken      │
         │  - refreshToken     │
         │  - accessRights[]   │
         │  - userType         │
         └─────────────────────┘
                    │
      ┌─────────────┼─────────────┐
      ▼             ▼             ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│   UI     │  │   API    │  │ Session  │
│ Render   │  │ Requests │  │ Refresh  │
│ Control  │  │  Auth    │  │ Logic    │
└──────────┘  └──────────┘  └──────────┘
```

### Key Principle

**The backend is the source of truth.** The UI uses access rights for UX optimization (hiding inaccessible elements), but the backend always validates permissions on every request.

---

## 2. Token Storage Strategy

### Recommended Approach: Memory + HttpOnly Cookies

```typescript
// Token Storage Architecture
interface TokenStorage {
  // Access token: Store in memory (React context/state)
  // - Short-lived (15 minutes)
  // - Used for API Authorization header
  accessToken: string;
  
  // Refresh token: HttpOnly cookie (set by backend)
  // - Never accessible to JavaScript
  // - Automatically sent with requests to /auth/refresh
  // - Long-lived (7 days)
  
  // Access rights: Store in memory with access token
  accessRights: string[];
  
  // User metadata: Store in memory
  userType: 'learner' | 'staff' | 'global-admin';
  userId: string;
  departmentMemberships: DepartmentMembership[];
}
```

### Why This Approach?

| Storage Option | XSS Vulnerable | CSRF Vulnerable | Recommendation |
|----------------|----------------|-----------------|----------------|
| localStorage | ✅ Yes | ❌ No | ❌ Avoid |
| sessionStorage | ✅ Yes | ❌ No | ❌ Avoid |
| Memory only | ❌ No | ❌ No | ✅ Access token |
| HttpOnly cookie | ❌ No | ⚠️ Mitigatable | ✅ Refresh token |

### Implementation

```typescript
// AuthContext.tsx
interface AuthState {
  accessToken: string | null;
  accessRights: string[];
  user: {
    id: string;
    userType: 'learner' | 'staff' | 'global-admin';
    email: string;
    departmentMemberships: Array<{
      departmentId: string;
      departmentName: string;
      roles: string[];
    }>;
  } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthState & AuthActions>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    accessToken: null,
    accessRights: [],
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // On mount, try to refresh the session
  useEffect(() => {
    refreshSession();
  }, []);

  const refreshSession = async () => {
    try {
      // Refresh token sent automatically via HttpOnly cookie
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        credentials: 'include', // Important: sends cookies
      });
      
      if (response.ok) {
        const data = await response.json();
        setState({
          accessToken: data.accessToken,
          accessRights: data.accessRights,
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // ... rest of provider
}
```

### Backend Cookie Configuration

The backend should set cookies with these security options:

```typescript
// Backend sets this on login/refresh
res.cookie('refreshToken', token, {
  httpOnly: true,      // Not accessible to JavaScript
  secure: true,        // HTTPS only (in production)
  sameSite: 'strict',  // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/v1/auth', // Only sent to auth endpoints
});
```

---

## 3. Access Rights Structure

### Access Right Naming Convention

Access rights follow a consistent pattern:

```
{domain}:{resource}:{action}
```

Examples:
- `content:courses:read` - Can view courses
- `content:courses:create` - Can create courses
- `content:courses:update` - Can update courses
- `content:courses:delete` - Can delete courses
- `enrollment:manage` - Can manage enrollments
- `staff:view` - Can view staff members
- `reports:analytics:view` - Can view analytics reports
- `system:settings:manage` - Can manage system settings

### Access Rights Response from Backend

```typescript
// Login/Refresh Response
interface AuthResponse {
  accessToken: string;
  expiresIn: number; // seconds until expiry
  
  user: {
    id: string;
    email: string;
    userType: 'learner' | 'staff' | 'global-admin';
    firstName: string;
    lastName: string;
    departmentMemberships: DepartmentMembership[];
  };
  
  // Flattened list of all access rights for this user
  // Computed from roles across all department memberships
  accessRights: string[];
  
  // Department-specific rights (for multi-department users)
  departmentRights: {
    [departmentId: string]: string[];
  };
}

interface DepartmentMembership {
  departmentId: string;
  departmentName: string;
  roles: string[];      // Role names in this department
  isPrimary: boolean;   // User's primary department
}
```

---

## 4. Permission Checking

### usePermission Hook

```typescript
// hooks/usePermission.ts
import { useAuth } from './useAuth';

export function usePermission() {
  const { accessRights, user } = useAuth();
  
  /**
   * Check if user has a specific access right
   */
  const hasRight = (right: string): boolean => {
    return accessRights.includes(right);
  };
  
  /**
   * Check if user has ANY of the specified rights
   */
  const hasAnyRight = (rights: string[]): boolean => {
    return rights.some(right => accessRights.includes(right));
  };
  
  /**
   * Check if user has ALL of the specified rights
   */
  const hasAllRights = (rights: string[]): boolean => {
    return rights.every(right => accessRights.includes(right));
  };
  
  /**
   * Check if user has a right in a specific department
   */
  const hasRightInDepartment = (right: string, departmentId: string): boolean => {
    // Use departmentRights from auth state if available
    // Fallback: check if user has the global right
    return accessRights.includes(right);
  };
  
  /**
   * Check user type
   */
  const isUserType = (type: 'learner' | 'staff' | 'global-admin'): boolean => {
    return user?.userType === type;
  };
  
  /**
   * Check if user is admin (global-admin type)
   */
  const isAdmin = (): boolean => {
    return user?.userType === 'global-admin';
  };
  
  return {
    hasRight,
    hasAnyRight,
    hasAllRights,
    hasRightInDepartment,
    isUserType,
    isAdmin,
    accessRights,
  };
}
```

### Usage Examples

```tsx
function CourseManagement() {
  const { hasRight, hasAnyRight } = usePermission();
  
  const canCreate = hasRight('content:courses:create');
  const canEdit = hasRight('content:courses:update');
  const canDelete = hasRight('content:courses:delete');
  const canManage = hasAnyRight([
    'content:courses:create',
    'content:courses:update',
    'content:courses:delete'
  ]);
  
  return (
    <div>
      {canManage && <ManagementToolbar />}
      {canCreate && <CreateCourseButton />}
      <CourseList 
        showEditButton={canEdit}
        showDeleteButton={canDelete}
      />
    </div>
  );
}
```

---

## 5. Component Visibility

### PermissionGate Component

```tsx
// components/PermissionGate.tsx
interface PermissionGateProps {
  // Single right check
  right?: string;
  
  // Multiple rights - user needs ANY of these
  anyOf?: string[];
  
  // Multiple rights - user needs ALL of these
  allOf?: string[];
  
  // Fallback content when permission denied
  fallback?: React.ReactNode;
  
  // Children to render if permission granted
  children: React.ReactNode;
}

export function PermissionGate({
  right,
  anyOf,
  allOf,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasRight, hasAnyRight, hasAllRights } = usePermission();
  
  let hasPermission = true;
  
  if (right) {
    hasPermission = hasRight(right);
  } else if (anyOf) {
    hasPermission = hasAnyRight(anyOf);
  } else if (allOf) {
    hasPermission = hasAllRights(allOf);
  }
  
  return hasPermission ? <>{children}</> : <>{fallback}</>;
}
```

### Usage Examples

```tsx
// Simple single right check
<PermissionGate right="content:courses:create">
  <CreateCourseButton />
</PermissionGate>

// Any of multiple rights
<PermissionGate anyOf={['staff:view', 'staff:manage']}>
  <StaffDirectory />
</PermissionGate>

// All rights required
<PermissionGate allOf={['reports:view', 'reports:export']}>
  <ExportReportButton />
</PermissionGate>

// With fallback
<PermissionGate 
  right="content:courses:delete"
  fallback={<DisabledDeleteButton />}
>
  <DeleteCourseButton />
</PermissionGate>
```

### Sidebar/Navigation Configuration

```tsx
// config/navigation.ts
interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType;
  // Access rights required to see this nav item
  requiredRights?: string[];
  // User types that can see this item
  allowedUserTypes?: ('learner' | 'staff' | 'global-admin')[];
}

export const navigationConfig: NavItem[] = [
  // All users see dashboard
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: DashboardIcon,
  },
  
  // Learner items
  {
    label: 'My Courses',
    path: '/my-courses',
    icon: CoursesIcon,
    allowedUserTypes: ['learner'],
  },
  {
    label: 'My Progress',
    path: '/progress',
    icon: ProgressIcon,
    allowedUserTypes: ['learner'],
  },
  
  // Staff items
  {
    label: 'Course Management',
    path: '/courses/manage',
    icon: ManageIcon,
    requiredRights: ['content:courses:read'],
  },
  {
    label: 'Enrollments',
    path: '/enrollments',
    icon: EnrollmentIcon,
    requiredRights: ['enrollment:manage'],
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: ReportsIcon,
    requiredRights: ['reports:analytics:view'],
  },
  
  // Admin items
  {
    label: 'User Management',
    path: '/admin/users',
    icon: UsersIcon,
    allowedUserTypes: ['global-admin'],
  },
  {
    label: 'System Settings',
    path: '/admin/settings',
    icon: SettingsIcon,
    requiredRights: ['system:settings:manage'],
  },
];

// Navigation component
function Sidebar() {
  const { hasAnyRight, isUserType } = usePermission();
  
  const visibleItems = navigationConfig.filter(item => {
    // Check user type restriction
    if (item.allowedUserTypes) {
      const hasType = item.allowedUserTypes.some(type => isUserType(type));
      if (!hasType) return false;
    }
    
    // Check access rights
    if (item.requiredRights) {
      if (!hasAnyRight(item.requiredRights)) return false;
    }
    
    return true;
  });
  
  return (
    <nav>
      {visibleItems.map(item => (
        <NavLink key={item.path} to={item.path}>
          <item.icon />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
```

---

## 6. API Integration

### Authenticated Fetch Wrapper

```typescript
// lib/api.ts
import { useAuth } from '../hooks/useAuth';

class ApiClient {
  private accessToken: string | null = null;
  private refreshPromise: Promise<void> | null = null;
  
  setAccessToken(token: string | null) {
    this.accessToken = token;
  }
  
  async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `/api/v1${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Always include cookies for refresh
    });
    
    // Handle 401 - token expired
    if (response.status === 401) {
      await this.handleUnauthorized();
      // Retry the request
      return this.fetch(endpoint, options);
    }
    
    // Handle 403 - forbidden (insufficient permissions)
    if (response.status === 403) {
      const error = await response.json();
      throw new ForbiddenError(error.message, error.requiredRights);
    }
    
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(response.status, error.message);
    }
    
    return response.json();
  }
  
  private async handleUnauthorized(): Promise<void> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      await this.refreshPromise;
      return;
    }
    
    this.refreshPromise = this.refreshToken();
    await this.refreshPromise;
    this.refreshPromise = null;
  }
  
  private async refreshToken(): Promise<void> {
    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    
    if (!response.ok) {
      // Refresh failed - redirect to login
      window.location.href = '/login';
      throw new Error('Session expired');
    }
    
    const data = await response.json();
    this.accessToken = data.accessToken;
    
    // Notify auth context of new token
    window.dispatchEvent(new CustomEvent('token-refreshed', { 
      detail: data 
    }));
  }
}

export const api = new ApiClient();

// Custom error classes
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string, public requiredRights: string[]) {
    super(403, message);
    this.name = 'ForbiddenError';
  }
}
```

### React Query Integration

```typescript
// hooks/useApiQuery.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, ForbiddenError } from '../lib/api';
import { usePermission } from './usePermission';

export function useApiQuery<T>(
  key: string[],
  endpoint: string,
  requiredRight?: string
) {
  const { hasRight } = usePermission();
  
  // Pre-check permission before making request
  const hasPermission = requiredRight ? hasRight(requiredRight) : true;
  
  return useQuery({
    queryKey: key,
    queryFn: () => api.fetch<T>(endpoint),
    enabled: hasPermission,
    retry: (failureCount, error) => {
      // Don't retry on 403 Forbidden
      if (error instanceof ForbiddenError) return false;
      return failureCount < 3;
    },
  });
}

// Usage
function CourseList() {
  const { data: courses, isLoading, error } = useApiQuery<Course[]>(
    ['courses'],
    '/courses',
    'content:courses:read'
  );
  
  if (!isLoading && !courses) {
    return <NoPermissionMessage />;
  }
  
  // ... render courses
}
```

---

## 7. Session Management

### Token Refresh Strategy

```typescript
// hooks/useTokenRefresh.ts
import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';

export function useTokenRefresh() {
  const { accessToken, refreshSession } = useAuth();
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    if (!accessToken) return;
    
    // Decode token to get expiry (without verification)
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    const expiresAt = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    
    // Refresh 1 minute before expiry
    const refreshIn = expiresAt - now - 60000;
    
    if (refreshIn > 0) {
      refreshTimeoutRef.current = setTimeout(() => {
        refreshSession();
      }, refreshIn);
    } else {
      // Token already expired or about to expire
      refreshSession();
    }
    
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [accessToken, refreshSession]);
}
```

### Activity-Based Session Extension

```typescript
// hooks/useActivityTracker.ts
import { useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'];
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export function useActivityTracker() {
  const { logout, refreshSession } = useAuth();
  const lastActivityRef = useRef(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);
  
  useEffect(() => {
    // Add activity listeners
    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, handleActivity);
    });
    
    // Check for inactivity periodically
    const checkInactivity = () => {
      const now = Date.now();
      const inactiveTime = now - lastActivityRef.current;
      
      if (inactiveTime >= INACTIVITY_TIMEOUT) {
        logout('Session expired due to inactivity');
      }
    };
    
    timeoutRef.current = setInterval(checkInactivity, 60000); // Check every minute
    
    return () => {
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
      }
    };
  }, [handleActivity, logout]);
}
```

---

## 8. Security Considerations

### DO ✅

1. **Store access tokens in memory only** - Never localStorage/sessionStorage
2. **Use HttpOnly cookies for refresh tokens** - Set by backend, not accessible to JS
3. **Always validate on backend** - UI checks are for UX, not security
4. **Use short-lived access tokens** - 15 minutes recommended
5. **Refresh proactively** - Before token expires, not after
6. **Clear tokens on logout** - Both memory and invalidate refresh token
7. **Use HTTPS in production** - Required for secure cookies
8. **Implement CSRF protection** - SameSite cookies + CSRF tokens for mutations

### DON'T ❌

1. **Never trust client-side permission checks** - Always verify on server
2. **Never store sensitive tokens in localStorage** - XSS can steal them
3. **Never log tokens or access rights** - Security risk
4. **Never hardcode permission logic** - Always derive from access rights
5. **Never skip backend calls because of UI permission checks** - Backend is source of truth

### Error Handling

```tsx
// components/ErrorBoundary.tsx
function AuthErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ error }) => {
        if (error instanceof ForbiddenError) {
          return (
            <PermissionDeniedPage 
              message={error.message}
              requiredRights={error.requiredRights}
            />
          );
        }
        throw error; // Re-throw other errors
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
```

---

## Appendix: Access Rights Reference

### Content Domain
| Access Right | Description |
|--------------|-------------|
| `content:courses:read` | View courses |
| `content:courses:create` | Create new courses |
| `content:courses:update` | Edit existing courses |
| `content:courses:delete` | Delete courses |
| `content:programs:read` | View programs |
| `content:programs:manage` | Create/edit/delete programs |
| `content:scorm:upload` | Upload SCORM packages |
| `content:scorm:manage` | Manage SCORM content |

### Enrollment Domain
| Access Right | Description |
|--------------|-------------|
| `enrollment:view` | View enrollments |
| `enrollment:manage` | Create/modify enrollments |
| `enrollment:bulk` | Bulk enrollment operations |

### Staff Domain
| Access Right | Description |
|--------------|-------------|
| `staff:view` | View staff directory |
| `staff:manage` | Manage staff accounts |
| `staff:roles:assign` | Assign roles to staff |

### Reports Domain
| Access Right | Description |
|--------------|-------------|
| `reports:analytics:view` | View analytics dashboards |
| `reports:learner:view` | View learner progress reports |
| `reports:export` | Export reports to files |

### System Domain
| Access Right | Description |
|--------------|-------------|
| `system:settings:view` | View system settings |
| `system:settings:manage` | Modify system settings |
| `system:departments:manage` | Manage departments |
| `system:audit:view` | View audit logs |

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-10 | Backend Team | Initial document |

---

## Questions for UI Team

Please confirm or provide feedback on:

1. **Token refresh flow** - Is the automatic refresh approach acceptable, or do you prefer explicit refresh triggers?

2. **Access rights granularity** - Are the proposed access rights granular enough, or do you need more/fewer rights?

3. **Department context** - How should the UI handle users with roles in multiple departments? Department switcher? Default to primary?

4. **Offline handling** - Should we cache access rights for offline/slow network scenarios?

5. **Real-time updates** - Do you need WebSocket-based access rights updates, or is refresh-on-action sufficient?
