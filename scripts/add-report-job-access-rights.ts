#!/usr/bin/env ts-node
/**
 * Add report job access rights to existing databases.
 *
 * - Upserts AccessRight docs for reports:jobs:read/create/cancel
 * - Adds those rights to the system-admin role definition
 *
 * Usage:
 *   npx ts-node scripts/add-report-job-access-rights.ts
 */

import mongoose from 'mongoose';
import { loadEnv } from './utils/load-env';

import { AccessRight } from '../src/models/AccessRight.model';
import { RoleDefinition, GLOBAL_ADMIN_ROLES } from '../src/models/RoleDefinition.model';

loadEnv();

const DB_URI =
  process.env.DB_URI ||
  process.env.MONGODB_URI ||
  'mongodb://localhost:27017/lms_v2_dev';

const REPORT_JOB_RIGHTS = [
  {
    domain: 'reports',
    resource: 'jobs',
    action: 'read',
    description: 'View report jobs'
  },
  {
    domain: 'reports',
    resource: 'jobs',
    action: 'create',
    description: 'Create report jobs'
  },
  {
    domain: 'reports',
    resource: 'jobs',
    action: 'cancel',
    description: 'Cancel report jobs'
  }
];

const ROLE_NAMES = [...GLOBAL_ADMIN_ROLES];

function rightName(right: { domain: string; resource: string; action: string }): string {
  return `${right.domain}:${right.resource}:${right.action}`;
}

async function upsertAccessRights(): Promise<string[]> {
  const names: string[] = [];

  for (const right of REPORT_JOB_RIGHTS) {
    const name = rightName(right);
    names.push(name);

    await AccessRight.updateOne(
      { name },
      {
        $set: {
          name,
          domain: right.domain,
          resource: right.resource,
          action: right.action,
          description: right.description,
          isSensitive: false,
          isActive: true
        }
      },
      { upsert: true }
    );
  }

  return names;
}

async function addRightsToRoles(rightNames: string[]): Promise<void> {
  if (rightNames.length === 0) {
    return;
  }

  await RoleDefinition.updateMany(
    { name: { $in: ROLE_NAMES } },
    { $addToSet: { accessRights: { $each: rightNames } } }
  );
}

async function run(): Promise<void> {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(DB_URI);
  console.log(`Connected to ${mongoose.connection.name}`);

  const rightNames = await upsertAccessRights();
  await addRightsToRoles(rightNames);

  console.log(`Upserted access rights: ${rightNames.join(', ')}`);
  console.log(`Updated roles: ${ROLE_NAMES.join(', ')}`);
}

run()
  .then(async () => {
    await mongoose.disconnect();
    console.log('Done.');
  })
  .catch(async (error) => {
    console.error('Failed to add report job access rights:', error);
    await mongoose.disconnect();
    process.exit(1);
  });
