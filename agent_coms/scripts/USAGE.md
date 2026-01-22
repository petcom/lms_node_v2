# Seed Scripts for LMS Database

This directory contains database seed scripts copied from the backend repository (`lms_node`). These scripts are maintained here for reference and can be used to populate the `lms_mock` or `lms_mock` database with test data.

## Important Note

**These scripts are designed to run against a MongoDB database and require the backend dependencies.** They cannot be run directly from this UI repository without the proper backend environment.

## How to Use

### Option 1: Run from Backend Repository

```bash
# Navigate to the backend repository
cd /home/adam/github/lms_node/1_LMS_Node_V2

# Seed the mock database
npm run seed:mock

# Or seed specific data
npm run seed:staff       # Staff members and courses
npm run seed:admin       # Admin user and basic setup
npm run seed:roles       # Role definitions
```

### Option 2: Copy Scripts to Backend

If the backend repository doesn't have the latest scripts, copy from here:

```bash
cp /home/adam/github/cadencelms_ui/scripts/seeds/*.ts /home/adam/github/lms_node/1_LMS_Node_V2/scripts/seeds/
```

## Available Seed Scripts

| Script | Description |
|--------|-------------|
| `seed-admin.ts` | Creates admin user and basic system setup |
| `seed-mock-data.ts` | Generates comprehensive mock data (users, courses, etc.) |
| `seed-staff-and-courses.ts` | Creates staff members with departments and courses |
| `seed-role-definitions.ts` | Sets up role definitions |
| `seed-role-system.ts` | Initializes the role system |
| `seed-access-rights.ts` | Sets up access rights and permissions |
| `seed-master-department.ts` | Creates the master department |
| `constants.seed.ts` | Shared constants for seeding |
| `run-seeds.ts` | Runner script to execute multiple seeds |

## Purge Scripts

| Script | Description |
|--------|-------------|
| `purge-mock-data.ts` | Removes all mock data |
| `purge-staff-and-courses.ts` | Removes staff and course data |

## Test Credentials

After seeding, you can log in with these credentials:

### System Admin
- **Email:** `admin@lms.com`
- **Password:** `Password123!`

### Staff Members (from seed-staff-and-courses)
- **Email:** `emily.carter@lms.edu`
- **Password:** `StaffPass123!`

- **Email:** `michael.rodriguez@lms.edu`
- **Password:** `StaffPass123!`

### Mock Data Users
- **Email:** `john.smith@lms.com` (Staff)
- **Email:** `emily.jones@lms.com` (Staff)
- **Email:** `alice.student@lms.com` (Learner)
- **Email:** `bob.learner@lms.com` (Learner)
- **Password (all):** `Password123!`

## Related Documentation

- [README.md](./README.md) - Original mock data documentation
- [SEED_STAFF_README.md](./SEED_STAFF_README.md) - Staff and courses seed details
- [README-seed-access-rights.md](./README-seed-access-rights.md) - Access rights setup
- [MockData_Use_Report.md](./MockData_Use_Report.md) - Mock data usage report
