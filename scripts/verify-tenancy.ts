
import { 
  createControlPlaneStore, 
  createOrg, 
  createProject, 
  listProjects, 
  createVideo, 
  listVideos 
} from '../packages/shared/src/control-plane.js';
import { assertOrgScope } from '../packages/shared/src/org-scope.js';

async function verifyTenancy() {
  console.log('Starting Multi-Tenancy Verification...');

  const store = createControlPlaneStore();

  // 1. Setup Tenant A
  const orgA = createOrg(store, { name: 'Tenant A' });
  const projectA = createProject(store, { name: 'Project A' }, orgA.id);
  const videoA = createVideo(store, { title: 'Video A', projectId: projectA.id }, orgA.id);

  console.log(`[Setup] Created Tenant A (${orgA.id}) with Project (${projectA.id}) and Video (${videoA.id})`);

  // 2. Setup Tenant B
  const orgB = createOrg(store, { name: 'Tenant B' });
  console.log(`[Setup] Created Tenant B (${orgB.id})`);

  // 3. Test: Tenant B listing Projects (should not see Project A)
  const projectsForB = listProjects(store, orgB.id);
  if (projectsForB.length !== 0) {
    console.error('❌ FAIL: Tenant B can see projects!', projectsForB);
    process.exit(1);
  } else {
    console.log('✅ PASS: Tenant B sees 0 projects.');
  }

  // 4. Test: Tenant B listing Videos (should not see Video A)
  const videosForB = listVideos(store, orgB.id);
  if (videosForB.length !== 0) {
    console.error('❌ FAIL: Tenant B can see videos!', videosForB);
    process.exit(1);
  } else {
    console.log('✅ PASS: Tenant B sees 0 videos.');
  }

  // 5. Test: Tenant B trying to access Video A directly (should fail scope check)
  try {
    assertOrgScope(videoA, orgB.id);
    console.error('❌ FAIL: assertOrgScope did not throw error for cross-tenant access');
    process.exit(1);
  } catch (error) {
    console.log('✅ PASS: assertOrgScope blocked cross-tenant access.');
  }

  console.log('Tenancy verification complete.');
}

verifyTenancy().catch(e => {
  console.error(e);
  process.exit(1);
});
