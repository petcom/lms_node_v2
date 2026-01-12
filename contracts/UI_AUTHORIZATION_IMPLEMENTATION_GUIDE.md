# UI Authorization Implementation Guide
**Version:** 2.0.0
**Date:** 2026-01-11
**Status:** Ready for Implementation
**Audience:** Frontend Development Team

---

## Table of Contents

1. [Overview](#overview)
2. [Authorization Architecture](#authorization-architecture)
3. [Component Patterns](#component-patterns)
4. [Route Protection](#route-protection)
5. [UI Element Visibility](#ui-element-visibility)
6. [Data Masking on Frontend](#data-masking-on-frontend)
7. [API Request Authorization](#api-request-authorization)
8. [Error Handling](#error-handling)
9. [Security Best Practices](#security-best-practices)
10. [Testing Authorization](#testing-authorization)
11. [Common Patterns & Examples](#common-patterns--examples)

---

## Overview

This guide provides frontend developers with everything needed to implement authorization in the LMS UI. The system uses a multi-layered authorization approach:

- **Authentication**: JWT tokens verify user identity
- **Access Rights**: Fine-grained permissions (`domain:resource:action`)
- **Department Context**: Roles and rights are department-scoped
- **Admin Escalation**: Elevated privileges require separate authentication

### Key Principles

1. **Client-side authorization is for UX only** - Never trust the client
2. **Always validate on the backend** - UI checks are convenience, not security
3. **Fail closed** - If unsure, hide the feature
4. **Progressive disclosure** - Show only what users can access

---

## Authorization Architecture

### Three-Layer Authorization Stack

```
┌─────────────────────────────────────┐
│  FRONTEND (UI Layer)                │
│  - Hide/show UI elements            │
│  - Client-side routing guards       │
│  - Display warnings for sensitive   │
│  ✗ NOT security boundary            │
└─────────────────────────────────────┘
           ↓ HTTP Request
┌─────────────────────────────────────┐
│  MIDDLEWARE (Route Layer)           │
│  - Authenticate JWT token           │
│  - Check required access rights     │
│  - Check required roles             │
│  ✓ SECURITY BOUNDARY                │
└─────────────────────────────────────┘
           ↓ Authorized Request
┌─────────────────────────────────────┐
│  CONTROLLER (Business Logic Layer)  │
│  - Validate user context            │
│  - Apply authorization scoping      │
│  - Apply data masking               │
│  ✓ SECURITY BOUNDARY                │
└─────────────────────────────────────┘
           ↓ Scoped Data
┌─────────────────────────────────────┐
│  SERVICE (Data Access Layer)        │
│  - Execute scoped queries           │
│  - Return filtered results          │
│  ✓ SECURITY BOUNDARY                │
└─────────────────────────────────────┘
```

### Frontend Responsibilities

**What the UI SHOULD do:**
- ✅ Hide UI elements users don't have access to
- ✅ Provide better UX by not showing unusable features
- ✅ Display warnings when accessing sensitive data
- ✅ Show appropriate error messages for 403 responses
- ✅ Track user context (department, roles, access rights)

**What the UI SHOULD NOT do:**
- ❌ Make security decisions
- ❌ Assume hidden features are inaccessible
- ❌ Skip API calls based on client-side checks
- ❌ Trust data from the backend without masking checks

---

## Component Patterns

### 1. Protected Component Wrapper

Use this to conditionally render components based on access rights.

```tsx
// components/auth/ProtectedComponent.tsx
import React from 'react';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedComponentProps {
  /** Required access rights (OR logic - user needs ANY of these) */
  requiredRights?: string[];

  /** Required access rights (AND logic - user needs ALL of these) */
  requireAllRights?: string[];

  /** Required roles */
  requiredRoles?: string[];

  /** Fallback to show if no access */
  fallback?: React.ReactNode;

  /** Children to render if authorized */
  children: React.ReactNode;

  /** Show loading state while checking */
  showLoading?: boolean;
}

export function ProtectedComponent({
  requiredRights = [],
  requireAllRights = [],
  requiredRoles = [],
  fallback = null,
  children,
  showLoading = false
}: ProtectedComponentProps) {
  const { currentDepartmentAccessRights, currentDepartmentRoles, isLoading } = useAuth();

  if (isLoading && showLoading) {
    return <div>Loading...</div>;
  }

  // Check required rights (OR logic)
  if (requiredRights.length > 0) {
    const hasAnyRight = requiredRights.some(right =>
      hasAccessRight(currentDepartmentAccessRights, right)
    );
    if (!hasAnyRight) return <>{fallback}</>;
  }

  // Check required rights (AND logic)
  if (requireAllRights.length > 0) {
    const hasAllRights = requireAllRights.every(right =>
      hasAccessRight(currentDepartmentAccessRights, right)
    );
    if (!hasAllRights) return <>{fallback}</>;
  }

  // Check required roles
  if (requiredRoles.length > 0) {
    const hasAnyRole = requiredRoles.some(role =>
      currentDepartmentRoles.includes(role)
    );
    if (!hasAnyRole) return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Helper function
function hasAccessRight(userRights: string[], required: string): boolean {
  if (userRights.includes(required)) return true;

  // Check wildcard (e.g., 'system:*' grants all system rights)
  const [domain] = required.split(':');
  if (userRights.includes(`${domain}:*`)) return true;

  return false;
}
```

**Usage:**

```tsx
// Show "Create Course" button only to content admins
<ProtectedComponent requiredRights={['content:courses:manage']}>
  <Button onClick={handleCreateCourse}>Create Course</Button>
</ProtectedComponent>

// Show gradebook to instructors
<ProtectedComponent requiredRoles={['instructor']}>
  <GradebookLink />
</ProtectedComponent>

// Show admin panel only to system admins
<ProtectedComponent
  requireAllRights={['system:settings:manage']}
  fallback={<AccessDeniedMessage />}
>
  <AdminPanel />
</ProtectedComponent>
```

### 2. Protected Navigation Link

```tsx
// components/nav/ProtectedNavLink.tsx
import { NavLink } from 'react-router-dom';
import { ProtectedComponent } from '@/components/auth/ProtectedComponent';

interface ProtectedNavLinkProps {
  to: string;
  requiredRights?: string[];
  requireAllRights?: string[];
  requiredRoles?: string[];
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
}

export function ProtectedNavLink({
  to,
  requiredRights,
  requireAllRights,
  requiredRoles,
  children,
  className,
  activeClassName
}: ProtectedNavLinkProps) {
  return (
    <ProtectedComponent
      requiredRights={requiredRights}
      requireAllRights={requireAllRights}
      requiredRoles={requiredRoles}
    >
      <NavLink
        to={to}
        className={className}
        activeClassName={activeClassName}
      >
        {children}
      </NavLink>
    </ProtectedComponent>
  );
}
```

**Usage:**

```tsx
// Sidebar navigation
<nav>
  <ProtectedNavLink
    to="/courses"
    requiredRights={['content:courses:read']}
  >
    Course Library
  </ProtectedNavLink>

  <ProtectedNavLink
    to="/courses/create"
    requiredRights={['content:courses:manage']}
  >
    Create Course
  </ProtectedNavLink>

  <ProtectedNavLink
    to="/gradebook"
    requiredRoles={['instructor']}
  >
    Gradebook
  </ProtectedNavLink>
</nav>
```

### 3. Sensitive Data Warning

Show warnings when users access FERPA-protected or financial data.

```tsx
// components/auth/SensitiveDataWarning.tsx
import React, { useState } from 'react';

interface SensitiveDataWarningProps {
  /** Type of sensitive data being accessed */
  dataType: 'ferpa' | 'billing' | 'pii' | 'audit';

  /** Callback when user acknowledges warning */
  onAcknowledge: () => void;

  /** Children to render after acknowledgment */
  children: React.ReactNode;
}

export function SensitiveDataWarning({
  dataType,
  onAcknowledge,
  children
}: SensitiveDataWarningProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  if (acknowledged) {
    return <>{children}</>;
  }

  const warnings = {
    ferpa: {
      title: 'FERPA-Protected Student Data',
      message: 'You are about to access student education records protected by FERPA. Access is logged for audit purposes. Only access this data if you have a legitimate educational interest.',
      color: 'red'
    },
    billing: {
      title: 'Financial Data Access',
      message: 'You are about to access financial information. All access is logged and monitored. Ensure you have proper authorization.',
      color: 'yellow'
    },
    pii: {
      title: 'Personally Identifiable Information',
      message: 'You are accessing PII. Handle this data in compliance with privacy policies and regulations.',
      color: 'orange'
    },
    audit: {
      title: 'Audit Log Access',
      message: 'You are accessing system audit logs. This access is itself logged. Use responsibly.',
      color: 'blue'
    }
  };

  const warning = warnings[dataType];

  const handleAcknowledge = () => {
    setAcknowledged(true);
    onAcknowledge();
  };

  return (
    <div className={`sensitive-warning sensitive-warning--${warning.color}`}>
      <div className="sensitive-warning__icon">⚠️</div>
      <div className="sensitive-warning__content">
        <h3>{warning.title}</h3>
        <p>{warning.message}</p>
        <div className="sensitive-warning__actions">
          <button onClick={handleAcknowledge} className="btn btn-primary">
            I Understand - Continue
          </button>
          <button onClick={() => window.history.back()} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Usage:**

```tsx
// Transcript page
function TranscriptPage() {
  const [showWarning, setShowWarning] = useState(true);

  if (showWarning) {
    return (
      <SensitiveDataWarning
        dataType="ferpa"
        onAcknowledge={() => setShowWarning(false)}
      >
        <TranscriptContent />
      </SensitiveDataWarning>
    );
  }

  return <TranscriptContent />;
}
```

---

## Route Protection

### React Router Protected Routes

```tsx
// components/routing/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  requiredRights?: string[];
  requireAllRights?: string[];
  requiredRoles?: string[];
  redirectTo?: string;
}

export function ProtectedRoute({
  requiredRights = [],
  requireAllRights = [],
  requiredRoles = [],
  redirectTo = '/unauthorized'
}: ProtectedRouteProps) {
  const {
    isAuthenticated,
    currentDepartmentAccessRights,
    currentDepartmentRoles,
    isLoading
  } = useAuth();

  // Show loading while checking auth
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check access rights (OR logic)
  if (requiredRights.length > 0) {
    const hasAnyRight = requiredRights.some(right =>
      hasAccessRight(currentDepartmentAccessRights, right)
    );
    if (!hasAnyRight) {
      return <Navigate to={redirectTo} replace />;
    }
  }

  // Check access rights (AND logic)
  if (requireAllRights.length > 0) {
    const hasAllRights = requireAllRights.every(right =>
      hasAccessRight(currentDepartmentAccessRights, right)
    );
    if (!hasAllRights) {
      return <Navigate to={redirectTo} replace />;
    }
  }

  // Check roles
  if (requiredRoles.length > 0) {
    const hasAnyRole = requiredRoles.some(role =>
      currentDepartmentRoles.includes(role)
    );
    if (!hasAnyRole) {
      return <Navigate to={redirectTo} replace />;
    }
  }

  return <Outlet />;
}
```

**Usage in Route Configuration:**

```tsx
// App.tsx or routes.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/routing/ProtectedRoute';

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes - any authenticated user */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* Protected routes - specific access rights */}
        <Route element={<ProtectedRoute requiredRights={['content:courses:read']} />}>
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:id" element={<CourseDetailPage />} />
        </Route>

        {/* Protected routes - course management */}
        <Route element={<ProtectedRoute requiredRights={['content:courses:manage']} />}>
          <Route path="/courses/create" element={<CreateCoursePage />} />
          <Route path="/courses/:id/edit" element={<EditCoursePage />} />
        </Route>

        {/* Protected routes - instructor only */}
        <Route element={<ProtectedRoute requiredRoles={['instructor']} />}>
          <Route path="/gradebook" element={<GradebookPage />} />
          <Route path="/my-classes" element={<MyClassesPage />} />
        </Route>

        {/* Protected routes - admin only */}
        <Route element={<ProtectedRoute requireAllRights={['system:settings:manage']} />}>
          <Route path="/admin/*" element={<AdminRoutes />} />
        </Route>

        {/* Error routes */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

---

## UI Element Visibility

### Conditional Rendering Best Practices

#### 1. Two-Tier Navigation (Department-Scoped)

Some features only make sense after a department is selected:

```tsx
// components/nav/StaffSidebar.tsx
function StaffSidebar() {
  const { currentDepartmentId, currentDepartmentAccessRights } = useAuth();

  return (
    <nav className="sidebar">
      {/* ALWAYS VISIBLE - No department needed */}
      <section className="sidebar__section">
        <h3>General</h3>
        <NavLink to="/dashboard">Dashboard Home</NavLink>
        <NavLink to="/profile">My Profile</NavLink>
        <NavLink to="/reports/global">Global Reports</NavLink>
      </section>

      {/* DEPARTMENT-SCOPED - Only visible after department selected */}
      {currentDepartmentId && (
        <section className="sidebar__section">
          <h3>Department</h3>

          <ProtectedNavLink
            to="/courses"
            requiredRights={['content:courses:read']}
          >
            Course Library
          </ProtectedNavLink>

          <ProtectedNavLink
            to="/courses/create"
            requiredRights={['content:courses:manage']}
          >
            Create Course
          </ProtectedNavLink>

          <ProtectedNavLink
            to="/gradebook"
            requiredRights={['grades:own-classes:manage']}
          >
            Gradebook
          </ProtectedNavLink>

          <ProtectedNavLink
            to="/settings/department"
            requiredRights={['settings:department:manage']}
          >
            Department Settings
          </ProtectedNavLink>
        </section>
      )}

      {/* PROMPT - If no department selected */}
      {!currentDepartmentId && (
        <div className="sidebar__prompt">
          <p>Select a department to see more options</p>
          <DepartmentSelector />
        </div>
      )}
    </nav>
  );
}
```

#### 2. Conditional Button Actions

```tsx
// pages/courses/CourseDetailPage.tsx
function CourseDetailPage() {
  const { courseId } = useParams();
  const { currentDepartmentAccessRights, user } = useAuth();
  const { data: course } = useCourse(courseId);

  const canEdit = hasAccessRight(
    currentDepartmentAccessRights,
    'content:courses:manage'
  );

  const canDelete = hasAccessRight(
    currentDepartmentAccessRights,
    'content:courses:manage'
  ) && course?.status !== 'archived';

  return (
    <div>
      <h1>{course?.name}</h1>
      <p>{course?.description}</p>

      <div className="actions">
        <Button onClick={handleView}>View Content</Button>

        {canEdit && (
          <Button onClick={handleEdit} variant="primary">
            Edit Course
          </Button>
        )}

        {canDelete && (
          <Button onClick={handleDelete} variant="danger">
            Delete Course
          </Button>
        )}
      </div>
    </div>
  );
}
```

#### 3. Feature Flags Based on Access Rights

```tsx
// hooks/useFeatureAccess.ts
export function useFeatureAccess() {
  const { currentDepartmentAccessRights, userTypes, isAdminSessionActive } = useAuth();

  return {
    // Course features
    canViewCourses: hasAccessRight(currentDepartmentAccessRights, 'content:courses:read'),
    canManageCourses: hasAccessRight(currentDepartmentAccessRights, 'content:courses:manage'),

    // Grading features
    canGradeOwnClasses: hasAccessRight(currentDepartmentAccessRights, 'grades:own-classes:manage'),
    canViewAllGrades: hasAccessRight(currentDepartmentAccessRights, 'learner:grades:read'),

    // Reporting features
    canViewDepartmentReports: hasAccessRight(currentDepartmentAccessRights, 'reports:department:read'),
    canViewOwnClassReports: hasAccessRight(currentDepartmentAccessRights, 'reports:own-classes:read'),

    // FERPA-protected
    canViewTranscripts: hasAccessRight(currentDepartmentAccessRights, 'learner:transcripts:read'),
    canViewPII: hasAccessRight(currentDepartmentAccessRights, 'learner:pii:read'),

    // Admin features
    canAccessAdminDashboard: userTypes.includes('global-admin') && isAdminSessionActive,
    canManageSystem: hasAccessRight(currentDepartmentAccessRights, 'system:settings:manage'),
  };
}

// Usage in components
function MyComponent() {
  const features = useFeatureAccess();

  return (
    <div>
      {features.canManageCourses && <CreateCourseButton />}
      {features.canGradeOwnClasses && <GradebookLink />}
      {features.canViewTranscripts && <TranscriptsSection />}
    </div>
  );
}
```

---

## Data Masking on Frontend

### When to Apply Frontend Masking

The backend applies data masking, but the frontend should:
1. **Verify masking was applied** - Don't trust the backend blindly
2. **Apply consistent display** - Use utility functions for masked data
3. **Show indicators** - Make it clear when data is masked

### Detecting Masked Data

```tsx
// utils/dataMasking.ts

/**
 * Check if a name appears to be masked (FirstName L. format)
 */
export function isMaskedName(name: string): boolean {
  // Matches pattern: "FirstName L." or "FirstName L"
  const maskedPattern = /^[A-Z][a-z]+\s[A-Z]\.?$/;
  return maskedPattern.test(name);
}

/**
 * Check if learner details object is masked
 */
export function isLearnerMasked(learner: any): boolean {
  if (!learner) return false;

  // Check if lastName is single letter
  if (learner.lastName && learner.lastName.length === 1) return true;

  // Check if name field follows masked pattern
  if (learner.name && isMaskedName(learner.name)) return true;

  // Check if email is hidden
  if (learner.email === '(hidden)' || !learner.email) return true;

  return false;
}

/**
 * Format learner name consistently
 */
export function formatLearnerName(learner: any): string {
  if (!learner) return '(Unknown)';

  // If name field exists, use it
  if (learner.name) return learner.name;

  // If firstName and lastName exist, combine them
  if (learner.firstName && learner.lastName) {
    return `${learner.firstName} ${learner.lastName}`;
  }

  return '(Unknown)';
}
```

### Display Masked Data

```tsx
// components/data/LearnerName.tsx
import { isLearnerMasked, formatLearnerName } from '@/utils/dataMasking';

interface LearnerNameProps {
  learner: any;
  showMaskedIndicator?: boolean;
}

export function LearnerName({ learner, showMaskedIndicator = true }: LearnerNameProps) {
  const name = formatLearnerName(learner);
  const masked = isLearnerMasked(learner);

  return (
    <span className="learner-name">
      {name}
      {masked && showMaskedIndicator && (
        <span
          className="learner-name__masked-indicator"
          title="Full name hidden for privacy"
        >
          🔒
        </span>
      )}
    </span>
  );
}
```

**Usage:**

```tsx
// pages/reports/ClassRoster.tsx
function ClassRoster() {
  const { data: roster } = useClassRoster();

  return (
    <table>
      <thead>
        <tr>
          <th>Learner</th>
          <th>Email</th>
          <th>Progress</th>
        </tr>
      </thead>
      <tbody>
        {roster.map(learner => (
          <tr key={learner.id}>
            <td>
              <LearnerName learner={learner} />
            </td>
            <td>
              {learner.email !== '(hidden)' ? learner.email : '(Privacy Protected)'}
            </td>
            <td>{learner.progress}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## API Request Authorization

### Adding Authorization Headers

```tsx
// api/client.ts
import axios from 'axios';
import { getAccessToken, getAdminToken, isAdminSessionActive } from '@/store/auth';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v2',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Use admin token if admin session is active
    if (isAdminSessionActive()) {
      const adminToken = getAdminToken();
      if (adminToken) {
        config.headers.Authorization = `Bearer ${adminToken}`;
        return config;
      }
    }

    // Otherwise use regular access token
    const accessToken = getAccessToken();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401/403
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 - Token expired, try refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { data } = await refreshAccessToken();
        updateAuthState({ accessToken: data.accessToken });

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle 403 - Forbidden, show error
    if (error.response?.status === 403) {
      // Could show toast notification here
      console.error('Access denied:', error.response.data.message);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

### Making Authorized Requests

```tsx
// api/courses.ts
import apiClient from './client';

export const coursesAPI = {
  /**
   * List courses - requires content:courses:read
   */
  async listCourses(params: {
    page?: number;
    limit?: number;
    departmentId?: string;
  }) {
    const { data } = await apiClient.get('/courses', { params });
    return data;
  },

  /**
   * Create course - requires content:courses:manage
   */
  async createCourse(courseData: any) {
    const { data } = await apiClient.post('/courses', courseData);
    return data;
  },

  /**
   * Update course - requires content:courses:manage
   */
  async updateCourse(id: string, updates: any) {
    const { data } = await apiClient.put(`/courses/${id}`, updates);
    return data;
  },

  /**
   * Delete course - requires content:courses:manage
   */
  async deleteCourse(id: string) {
    const { data } = await apiClient.delete(`/courses/${id}`);
    return data;
  }
};
```

### React Query with Authorization

```tsx
// hooks/api/useCourses.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesAPI } from '@/api/courses';
import { useAuth } from '@/hooks/useAuth';

export function useCourses(params?: { departmentId?: string }) {
  const { currentDepartmentAccessRights } = useAuth();

  return useQuery({
    queryKey: ['courses', params],
    queryFn: () => coursesAPI.listCourses(params),
    // Only enable query if user has read access
    enabled: hasAccessRight(currentDepartmentAccessRights, 'content:courses:read'),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();
  const { currentDepartmentAccessRights } = useAuth();

  return useMutation({
    mutationFn: coursesAPI.createCourse,
    onSuccess: () => {
      // Invalidate courses list
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
    // Check permission before attempting (still validated on backend)
    onMutate: () => {
      if (!hasAccessRight(currentDepartmentAccessRights, 'content:courses:manage')) {
        throw new Error('You do not have permission to create courses');
      }
    }
  });
}
```

---

## Error Handling

### Authorization Error Component

```tsx
// components/errors/AuthorizationError.tsx
interface AuthorizationErrorProps {
  error: {
    status: number;
    code: string;
    message: string;
  };
  onRetry?: () => void;
  onGoBack?: () => void;
}

export function AuthorizationError({ error, onRetry, onGoBack }: AuthorizationErrorProps) {
  const errorMessages = {
    401: {
      title: 'Authentication Required',
      description: 'Your session has expired. Please log in again.',
      action: 'Log In'
    },
    403: {
      title: 'Access Denied',
      description: 'You do not have permission to access this resource.',
      action: 'Go Back'
    }
  };

  const errorInfo = errorMessages[error.status as keyof typeof errorMessages] || {
    title: 'Error',
    description: error.message,
    action: 'Retry'
  };

  return (
    <div className="authorization-error">
      <div className="authorization-error__icon">🔒</div>
      <h2 className="authorization-error__title">{errorInfo.title}</h2>
      <p className="authorization-error__description">{errorInfo.description}</p>

      {error.code && (
        <p className="authorization-error__code">Error Code: {error.code}</p>
      )}

      <div className="authorization-error__actions">
        {error.status === 401 ? (
          <Button onClick={() => window.location.href = '/login'}>
            {errorInfo.action}
          </Button>
        ) : (
          <>
            {onGoBack && (
              <Button onClick={onGoBack} variant="secondary">
                Go Back
              </Button>
            )}
            {onRetry && (
              <Button onClick={onRetry} variant="primary">
                Retry
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

### Error Boundary for Authorization

```tsx
// components/errors/AuthorizationErrorBoundary.tsx
import React from 'react';
import { AuthorizationError } from './AuthorizationError';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: any;
}

export class AuthorizationErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    // Log to error reporting service
    console.error('Authorization error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoBack = () => {
    window.history.back();
  };

  render() {
    if (this.state.hasError) {
      const error = this.state.error?.response?.data || this.state.error;

      // Only show custom error for auth issues
      if (error?.status === 401 || error?.status === 403) {
        return (
          <AuthorizationError
            error={error}
            onRetry={this.handleRetry}
            onGoBack={this.handleGoBack}
          />
        );
      }
    }

    return this.props.children;
  }
}
```

---

## Security Best Practices

### 1. Never Trust Client-Side Checks

❌ **BAD:**
```tsx
// Don't assume hiding UI means feature is secure
function BadExample() {
  const { userRole } = useAuth();

  // User can bypass this by editing JS in browser!
  if (userRole !== 'admin') {
    return <div>Access denied</div>;
  }

  // Directly call admin API without backend validation
  return <AdminPanel />;
}
```

✅ **GOOD:**
```tsx
// Always let backend validate, UI is just UX
function GoodExample() {
  const { currentDepartmentAccessRights } = useAuth();

  // Hide UI for better UX
  if (!hasAccessRight(currentDepartmentAccessRights, 'system:settings:manage')) {
    return <div>Access denied</div>;
  }

  // Backend will validate again - this is fine!
  return <AdminPanel />;
}
```

### 2. Admin Token Security

```tsx
// store/auth.ts

// ❌ BAD - Don't store admin token in localStorage
const storeAdminToken = (token: string) => {
  localStorage.setItem('adminToken', token); // XSS can steal this!
};

// ✅ GOOD - Store in memory only
let adminToken: string | null = null;
let adminTokenExpiry: Date | null = null;

export const setAdminToken = (token: string, expiresIn: number) => {
  adminToken = token;
  adminTokenExpiry = new Date(Date.now() + expiresIn * 1000);

  // Set timeout to clear token
  setTimeout(() => {
    clearAdminToken();
  }, expiresIn * 1000);
};

export const getAdminToken = (): string | null => {
  // Check expiry
  if (adminTokenExpiry && new Date() > adminTokenExpiry) {
    clearAdminToken();
    return null;
  }
  return adminToken;
};

export const clearAdminToken = () => {
  adminToken = null;
  adminTokenExpiry = null;
};

// Admin token is lost on page refresh - user must re-escalate
// This is acceptable security tradeoff
```

### 3. FERPA Compliance

```tsx
// When displaying student data
function StudentTranscript({ studentId }: { studentId: string }) {
  const { currentDepartmentAccessRights } = useAuth();
  const [acknowledged, setAcknowledged] = useState(false);

  // Check if user has FERPA access
  const hasFERPAAccess = hasAccessRight(
    currentDepartmentAccessRights,
    'learner:transcripts:read'
  );

  if (!hasFERPAAccess) {
    return <AccessDenied />;
  }

  // Show FERPA warning before displaying data
  if (!acknowledged) {
    return (
      <SensitiveDataWarning
        dataType="ferpa"
        onAcknowledge={() => setAcknowledged(true)}
      >
        <TranscriptContent studentId={studentId} />
      </SensitiveDataWarning>
    );
  }

  return <TranscriptContent studentId={studentId} />;
}
```

### 4. Logging Access to Sensitive Data

```tsx
// utils/auditLog.ts
import apiClient from '@/api/client';

export async function logSensitiveDataAccess(params: {
  action: string;
  resourceType: string;
  resourceId: string;
  sensitiveCategory: 'ferpa' | 'billing' | 'pii';
}) {
  try {
    await apiClient.post('/audit-logs', {
      ...params,
      timestamp: new Date().toISOString(),
      source: 'ui'
    });
  } catch (error) {
    // Log locally if API fails
    console.error('Failed to log sensitive data access:', error);
  }
}

// Usage in components
function TranscriptPage({ studentId }: { studentId: string }) {
  useEffect(() => {
    logSensitiveDataAccess({
      action: 'view_transcript',
      resourceType: 'transcript',
      resourceId: studentId,
      sensitiveCategory: 'ferpa'
    });
  }, [studentId]);

  return <TranscriptContent studentId={studentId} />;
}
```

---

## Testing Authorization

### Unit Testing Protected Components

```tsx
// components/__tests__/ProtectedComponent.test.tsx
import { render, screen } from '@testing-library/react';
import { ProtectedComponent } from '@/components/auth/ProtectedComponent';
import { AuthProvider } from '@/contexts/AuthContext';

describe('ProtectedComponent', () => {
  it('should render children when user has required access right', () => {
    const mockAuth = {
      currentDepartmentAccessRights: ['content:courses:read'],
      currentDepartmentRoles: ['instructor'],
      isLoading: false
    };

    render(
      <AuthProvider value={mockAuth}>
        <ProtectedComponent requiredRights={['content:courses:read']}>
          <div>Protected Content</div>
        </ProtectedComponent>
      </AuthProvider>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should not render children when user lacks required access right', () => {
    const mockAuth = {
      currentDepartmentAccessRights: ['content:courses:read'],
      currentDepartmentRoles: ['instructor'],
      isLoading: false
    };

    render(
      <AuthProvider value={mockAuth}>
        <ProtectedComponent requiredRights={['content:courses:manage']}>
          <div>Protected Content</div>
        </ProtectedComponent>
      </AuthProvider>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should render fallback when user lacks access', () => {
    const mockAuth = {
      currentDepartmentAccessRights: [],
      currentDepartmentRoles: [],
      isLoading: false
    };

    render(
      <AuthProvider value={mockAuth}>
        <ProtectedComponent
          requiredRights={['content:courses:manage']}
          fallback={<div>Access Denied</div>}
        >
          <div>Protected Content</div>
        </ProtectedComponent>
      </AuthProvider>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
```

### Integration Testing with Mock API

```tsx
// pages/__tests__/CoursesPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { CoursesPage } from '@/pages/CoursesPage';

const server = setupServer(
  rest.get('/api/v2/courses', (req, res, ctx) => {
    const authHeader = req.headers.get('Authorization');

    // Simulate 401 if no token
    if (!authHeader) {
      return res(ctx.status(401), ctx.json({
        success: false,
        message: 'Unauthorized'
      }));
    }

    // Simulate 403 if insufficient permissions
    // (In real scenario, check JWT payload)
    return res(ctx.status(200), ctx.json({
      success: true,
      data: { courses: [] }
    }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('CoursesPage Authorization', () => {
  it('should redirect to login when not authenticated', async () => {
    const mockAuth = {
      isAuthenticated: false,
      currentDepartmentAccessRights: [],
      isLoading: false
    };

    render(
      <AuthProvider value={mockAuth}>
        <CoursesPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(window.location.pathname).toBe('/login');
    });
  });

  it('should show access denied when user lacks permissions', async () => {
    const mockAuth = {
      isAuthenticated: true,
      currentDepartmentAccessRights: [], // No course read access
      isLoading: false
    };

    render(
      <AuthProvider value={mockAuth}>
        <CoursesPage />
      </AuthProvider>
    );

    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
  });
});
```

---

## Common Patterns & Examples

### Pattern 1: Progressive Disclosure

Show basic info to everyone, detailed info only to authorized users:

```tsx
function CourseCard({ course }: { course: Course }) {
  const { currentDepartmentAccessRights } = useAuth();
  const canViewDetails = hasAccessRight(currentDepartmentAccessRights, 'content:courses:read');
  const canEdit = hasAccessRight(currentDepartmentAccessRights, 'content:courses:manage');

  return (
    <div className="course-card">
      {/* Basic info - visible to all */}
      <h3>{course.name}</h3>
      <p>{course.description}</p>

      {/* Detailed stats - only for those with read access */}
      {canViewDetails && (
        <div className="course-card__stats">
          <p>Enrolled: {course.enrollmentCount}</p>
          <p>Completion Rate: {course.completionRate}%</p>
          <p>Average Score: {course.averageScore}%</p>
        </div>
      )}

      {/* Actions - only for those with manage access */}
      {canEdit && (
        <div className="course-card__actions">
          <Button onClick={() => editCourse(course.id)}>Edit</Button>
          <Button onClick={() => deleteCourse(course.id)}>Delete</Button>
        </div>
      )}
    </div>
  );
}
```

### Pattern 2: Contextual Access Rights

Access rights may differ based on context (own vs others):

```tsx
function GradebookRow({ assignment, learnerId }: { assignment: Assignment, learnerId: string }) {
  const { user, currentDepartmentAccessRights } = useAuth();

  // Check if this is the learner's own grade
  const isOwnGrade = user.id === learnerId;

  // Check permissions
  const canViewOwnGrade = hasAccessRight(currentDepartmentAccessRights, 'grades:own:read');
  const canViewAllGrades = hasAccessRight(currentDepartmentAccessRights, 'learner:grades:read');
  const canEditGrades = hasAccessRight(currentDepartmentAccessRights, 'grades:own-classes:manage');

  // Determine visibility
  const canView = isOwnGrade ? canViewOwnGrade : canViewAllGrades;
  const canEdit = !isOwnGrade && canEditGrades; // Can't edit own grade

  if (!canView) {
    return <td>-</td>;
  }

  return (
    <td>
      <span>{assignment.grade || 'Not graded'}</span>
      {canEdit && (
        <Button onClick={() => openGradeEditor(assignment.id)}>Edit</Button>
      )}
    </td>
  );
}
```

### Pattern 3: Department-Scoped Features

Features that require department context:

```tsx
function CreateCourseButton() {
  const { currentDepartmentId, currentDepartmentAccessRights } = useAuth();
  const navigate = useNavigate();

  const canCreate = hasAccessRight(
    currentDepartmentAccessRights,
    'content:courses:manage'
  );

  const handleClick = () => {
    if (!currentDepartmentId) {
      // Prompt user to select department
      toast.error('Please select a department first');
      return;
    }

    navigate(`/courses/create?departmentId=${currentDepartmentId}`);
  };

  // Hide button if no permission
  if (!canCreate) {
    return null;
  }

  return (
    <Button
      onClick={handleClick}
      disabled={!currentDepartmentId}
      title={!currentDepartmentId ? 'Select a department first' : undefined}
    >
      Create Course
    </Button>
  );
}
```

---

## Summary

### Key Takeaways

1. **Client-side authorization is UX, not security** - Always validate on backend
2. **Use access rights, not role names** - More flexible and granular
3. **Fail closed** - When in doubt, hide the feature
4. **Progressive disclosure** - Show appropriate level of detail based on permissions
5. **Department context matters** - Many features require department selection first
6. **Admin tokens in memory only** - Never persist admin tokens
7. **FERPA compliance** - Show warnings and log access to student data
8. **Trust but verify** - Even backend-masked data should be handled carefully

### Implementation Checklist

- [ ] Set up `useAuth()` hook with department context
- [ ] Implement `ProtectedComponent` wrapper
- [ ] Implement `ProtectedRoute` for React Router
- [ ] Add authorization headers to API client
- [ ] Create `hasAccessRight()` utility function
- [ ] Implement admin token memory storage
- [ ] Add FERPA warning components
- [ ] Implement data masking detection
- [ ] Set up error handling for 401/403
- [ ] Add audit logging for sensitive data access
- [ ] Write tests for authorization logic
- [ ] Document department-scoped features

---

## Additional Resources

- **API Contracts**: `contracts/api/auth.contract.ts`, `contracts/api/roles.contract.ts`
- **UI Role System**: `contracts/UI_ROLE_SYSTEM_CONTRACTS.md`
- **Backend Authorization**: `devdocs/Endpoint_Role_Authorization.md`
- **Implementation Plan**: `devdocs/Role_System_V2_Phased_Implementation.md`

---

**Questions or Issues?**
- For API contract questions: Check `contracts/README.md`
- For backend authorization: Check `devdocs/authorization/`
- For role system questions: Check `devdocs/Role_System_Clarification_Questions.md`
