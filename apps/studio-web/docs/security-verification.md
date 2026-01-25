# Security Verification for Project Storage

This document outlines security tests to verify multi-tenant isolation in the project storage system.

## Architecture Overview

The project storage system has three layers of security:

1. **Application Layer (Primary)**: Server actions validate org membership before operations
2. **IAM Layer**: S3 bucket policies restrict access to authenticated Cognito users
3. **Edge Layer**: CloudFront Lambda@Edge validates JWT and org membership

## Test Scenarios

### 1. Cross-Org Access Prevention

**Objective**: Verify that users from Org A cannot access files from Org B.

**Test Steps**:
1. Create two test orgs (Org A and Org B)
2. Create a project in each org with test files
3. As user from Org A, attempt to:
   - Read file from Org B's project
   - Delete file from Org B's project
   - Upload file to Org B's project
4. All operations should fail with "Unauthorized" error

**Implementation**:
```typescript
// Test pseudo-code
const userA = await createTestUser('userA@test.com');
const userB = await createTestUser('userB@test.com');

const orgA = await createOrg('Org A', userA);
const orgB = await createOrg('Org B', userB);

const projectA = await createProject(orgA.id, 'Project A');
const projectB = await createProject(orgB.id, 'Project B');

// Upload file as user A
await authenticateAs(userA);
await uploadFile(projectA.id, 'test.ts', 'content');

// Try to access as user B
await authenticateAs(userB);
try {
  await readFile(projectA.id, 'test.ts');
  // Should throw "Unauthorized" error
  throw new Error('Security violation: Cross-org access succeeded');
} catch (error) {
  if (!error.message.includes('Unauthorized')) {
    throw error;
  }
  console.log('✅ Cross-org access correctly blocked');
}
```

### 2. Path Traversal Prevention

**Objective**: Verify that malicious paths cannot escape the org/project boundary.

**Test Steps**:
1. Attempt to upload file with path traversal: `../../other-org/file.ts`
2. Attempt to read file with path traversal: `../../../../../../etc/passwd`
3. Verify that all attempts are rejected

**Implementation**:
```typescript
const maliciousPaths = [
  '../../other-org/file.ts',
  '../../../secrets.txt',
  '../../../../../../etc/passwd',
  'org/other-org-id/projects/other-project/file.ts'
];

for (const path of maliciousPaths) {
  try {
    await uploadFile(projectId, path, 'malicious content');
    throw new Error(`Security violation: Path traversal allowed for ${path}`);
  } catch (error) {
    if (error.message.includes('Invalid path')) {
      console.log(`✅ Path traversal blocked: ${path}`);
    } else {
      throw error;
    }
  }
}
```

### 3. CloudFront Authentication

**Objective**: Verify that CloudFront URLs require valid JWT tokens.

**Test Steps**:
1. Upload a file and get its CloudFront URL
2. Attempt to access URL without authentication
3. Attempt to access URL with invalid/expired JWT
4. Attempt to access URL with JWT from different org
5. Verify only valid, org-matching JWT succeeds

**Implementation**:
```typescript
const file = await uploadFile(projectId, 'test.ts', 'content');
const url = getCloudFrontUrl(orgId, projectId, 'test.ts');

// Test 1: No auth
const response1 = await fetch(url);
expect(response1.status).toBe(401);

// Test 2: Invalid JWT
const response2 = await fetch(url, {
  headers: { 'Authorization': 'Bearer invalid-token' }
});
expect(response2.status).toBe(403);

// Test 3: Valid JWT from different org
const otherOrgToken = await getJWTForOrg(otherOrgId);
const response3 = await fetch(url, {
  headers: { 'Authorization': `Bearer ${otherOrgToken}` }
});
expect(response3.status).toBe(403);

// Test 4: Valid JWT from correct org
const validToken = await getJWTForOrg(orgId);
const response4 = await fetch(url, {
  headers: { 'Authorization': `Bearer ${validToken}` }
});
expect(response4.status).toBe(200);
```

### 4. GraphQL Isolation

**Objective**: Verify that GraphQL queries respect org boundaries.

**Test Steps**:
1. User A queries ProjectFile records for Project A (should succeed)
2. User A queries ProjectFile records for Project B (should return empty)
3. User A attempts direct query with Project B ID (should be blocked by filter)

**Implementation**:
```typescript
await authenticateAs(userA);

// Should see own files
const filesA = await listProjectFiles(projectA.id);
expect(filesA.length).toBeGreaterThan(0);

// Should NOT see other org's files
const filesB = await listProjectFiles(projectB.id);
expect(filesB.length).toBe(0); // Or should throw error

// Direct GraphQL query should be filtered
const { data } = await graphqlClient.models.ProjectFile.list({
  filter: { projectId: { eq: projectB.id } }
});
expect(data.length).toBe(0);
```

### 5. File Type Validation

**Objective**: Verify that file types are correctly classified and filtered.

**Test Steps**:
1. Upload files with different types: video, utility, asset
2. Verify each appears in correct list
3. Verify utilities (starting with `_`) are hidden from video list
4. Verify assets are only in asset browser

**Implementation**:
```typescript
await uploadFile(projectId, 'video.babulus.ts', 'content', 'video');
await uploadFile(projectId, '_helper.babulus.ts', 'content', 'utility');
await uploadFile(projectId, 'assets/logo.png', imageData, 'asset');

const videoFiles = await listProjectFiles(projectId, { fileType: 'video' });
expect(videoFiles.some(f => f.relativePath === 'video.babulus.ts')).toBe(true);
expect(videoFiles.some(f => f.relativePath === '_helper.babulus.ts')).toBe(false);

const utilityFiles = await listProjectFiles(projectId, { fileType: 'utility' });
expect(utilityFiles.some(f => f.relativePath === '_helper.babulus.ts')).toBe(true);

const assetFiles = await listProjectFiles(projectId, { fileType: 'asset' });
expect(assetFiles.some(f => f.relativePath === 'assets/logo.png')).toBe(true);
```

## Running Security Tests

### Manual Testing

1. Create two test accounts in different browsers (or use incognito)
2. Create an org and project in each
3. Upload files in one account
4. Try to access files from the other account (should fail)

### Automated Testing

Create integration test file: `tests/security.test.ts`

```bash
npm run test:security
```

## Security Checklist

- [ ] Cross-org file read blocked
- [ ] Cross-org file write blocked
- [ ] Cross-org file delete blocked
- [ ] Path traversal attempts rejected
- [ ] CloudFront requires valid JWT
- [ ] CloudFront validates org membership
- [ ] GraphQL queries filtered by org
- [ ] File type filtering works correctly
- [ ] Unauthorized access logs captured
- [ ] Error messages don't leak sensitive info

## Expected Behavior

### Success Cases
- ✅ User can read/write/delete files in their own org
- ✅ User can upload assets to their own project
- ✅ User can list files in their own project
- ✅ Valid JWT allows CloudFront access to own org's files

### Failure Cases
- ❌ User cannot read files from other org (401/403)
- ❌ User cannot write files to other org (401/403)
- ❌ User cannot delete files from other org (401/403)
- ❌ Path traversal attempts are rejected (400)
- ❌ Invalid JWT is rejected by CloudFront (403)
- ❌ JWT from wrong org is rejected (403)
- ❌ Unauthenticated requests are rejected (401)

## Notes

- All security errors should return generic messages to avoid information leakage
- Failed access attempts should be logged for monitoring
- Rate limiting should be considered for upload/delete operations
- Regular security audits should be performed
