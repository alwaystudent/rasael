/**
 * Security Rules Specification Verification Tests (Dirty Dozen)
 * Documents expected ALLOW / PERMISSION_DENIED outcomes for firestore.rules.
 */

export interface RuleTestCase {
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email?: string; email_verified?: boolean } | null;
  expected: 'ALLOW' | 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: RuleTestCase[] = [
  {
    name: '1. Unauthenticated write to appearance config',
    operation: 'update',
    path: '/platform_config/appearance',
    auth: null,
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '2. Unverified email admin spoof attempt',
    operation: 'create',
    path: '/materials/mat-spoof',
    auth: { uid: 'u1', email: 'noor.mohamed.hachimi@gmail.com', email_verified: false },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '3. Shadow field injection on create',
    operation: 'create',
    path: '/materials/mat-shadow',
    auth: { uid: 'admin1', email: 'noor.mohamed.hachimi@gmail.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '4. Shadow field injection on update',
    operation: 'update',
    path: '/materials/aqeedah-qa-25',
    auth: { uid: 'admin1', email: 'noor.mohamed.hachimi@gmail.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '5. Document ID poisoning with invalid characters',
    operation: 'create',
    path: '/materials/bad id!',
    auth: { uid: 'admin1', email: 'noor.mohamed.hachimi@gmail.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '6. Document ID mismatch between path and payload.id',
    operation: 'create',
    path: '/materials/mat-1',
    auth: { uid: 'admin1', email: 'noor.mohamed.hachimi@gmail.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '7. OwnerId spoofing on create',
    operation: 'create',
    path: '/materials/mat-owner-spoof',
    auth: { uid: 'admin1', email: 'noor.mohamed.hachimi@gmail.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '8. Immutable createdAt or ownerId mutation on update',
    operation: 'update',
    path: '/materials/aqeedah-qa-25',
    auth: { uid: 'admin1', email: 'noor.mohamed.hachimi@gmail.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '9. Client timestamp forgery instead of request.time',
    operation: 'create',
    path: '/materials/mat-time-forge',
    auth: { uid: 'admin1', email: 'noor.mohamed.hachimi@gmail.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '10. Value poisoning on accentColor or columns',
    operation: 'update',
    path: '/platform_config/appearance',
    auth: { uid: 'admin1', email: 'noor.mohamed.hachimi@gmail.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '11. Oversized string exhaustion (>300 chars title)',
    operation: 'create',
    path: '/materials/mat-oversize',
    auth: { uid: 'admin1', email: 'noor.mohamed.hachimi@gmail.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '12. Public user reading unpublished draft material',
    operation: 'get',
    path: '/materials/hidden-draft-1',
    auth: null,
    expected: 'PERMISSION_DENIED',
  },
];
