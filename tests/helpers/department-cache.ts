/**
 * Department Cache Test Helper
 *
 * Helper for initializing/refreshing the DepartmentCacheService in tests.
 * Tests that use authorization features need to call refreshDepartmentCache()
 * after creating their test departments.
 */

import { departmentCacheService } from '@/services/auth/department-cache.service';

/**
 * Refresh the department cache to pick up test departments
 *
 * Call this after creating departments in your test's beforeAll hook:
 *
 * @example
 * beforeAll(async () => {
 *   mongoServer = await MongoMemoryServer.create();
 *   await mongoose.connect(mongoServer.getUri());
 *
 *   // Create test departments
 *   await Department.create({ name: 'Test Dept', ... });
 *
 *   // Refresh cache to pick up new departments
 *   await refreshDepartmentCache();
 * });
 */
export async function refreshDepartmentCache(): Promise<void> {
  // Shutdown first to reset the initialized state
  departmentCacheService.shutdown();
  // Then initialize to load fresh data and set isInitialized flag
  await departmentCacheService.initialize();
}

/**
 * Initialize the department cache service
 *
 * Use this if the cache hasn't been initialized yet.
 * For most test scenarios, use refreshDepartmentCache() instead.
 */
export async function initializeDepartmentCache(): Promise<void> {
  await departmentCacheService.initialize();
}
