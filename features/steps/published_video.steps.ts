import { Given, When, Then, Before } from '@cucumber/cucumber';
import { strict as assert } from 'assert';
import {
  createControlPlaneStore,
  createOrg,
  createProject,
  createVideo,
  createGenerationRun,
  createRenderRun,
  createPublishedVideo,
  getPublishedVideo,
  updatePublishedVideo,
  listPublishedVideos,
  type ControlPlaneStore,
  type PublishedVideo,
} from '@babulus/shared';

interface TestContext {
  store: ControlPlaneStore;
  activeOrgId: string;
  publishedVideo: PublishedVideo | null;
  publishedVideos: PublishedVideo[];
  error: Error | null;
}

let testContext: TestContext;

Before(function () {
  testContext = {
    store: createControlPlaneStore(),
    activeOrgId: '',
    publishedVideo: null,
    publishedVideos: [],
    error: null,
  };
});

Given('a control plane store initialized', function () {
  assert.ok(testContext.store);
});

Given('an organization {string} exists', function (orgId: string) {
  testContext.activeOrgId = orgId;
  createOrg(testContext.store, {
    id: orgId,
    name: 'Test Org',
    ownerId: 'user-123',
  });
});

Given('a video {string} exists for organization {string}', function (videoId: string, orgId: string) {
  // Create project first
  createProject(testContext.store, {
    orgId,
    name: 'Test Project',
  }, orgId);

  const project = testContext.store.projects.find(p => p.orgId === orgId);

  createVideo(
    testContext.store,
    {
      orgId,
      projectId: project!.id,
      id: videoId,
      title: 'Test Video',
    },
    orgId,
    { id: () => videoId }
  );
});

Given('a render run {string} exists for video {string}', function (renderRunId: string, videoId: string) {
  const video = testContext.store.videos.find(v => v.id === videoId);

  if (!video) {
    throw new Error(`Video ${videoId} not found in store`);
  }

  // Create a GenerationRun first (required by createRenderRun)
  const storyboardVersion = testContext.store.storyboardVersions.find(sv => sv.videoId === videoId);

  createGenerationRun(testContext.store, {
    orgId: video.orgId,
    videoId,
    storyboardVersionId: storyboardVersion?.id || 'storyboard-123',
    status: 'succeeded',
    scriptArtifactKey: `org/${video.orgId}/videos/${videoId}/runs/gen-123/script.json`,
  }, video.orgId);

  createRenderRun(testContext.store, {
    orgId: video.orgId,
    videoId,
    generationRunId: testContext.store.generationRuns[testContext.store.generationRuns.length - 1].id,
    id: renderRunId,
    status: 'succeeded',
    mp4ArtifactKey: `org/${video.orgId}/videos/${videoId}/renders/${renderRunId}.mp4`,
  }, video.orgId, { id: () => renderRunId });
});

When('I create a published video with slug {string}', function (slug: string) {
  const video = testContext.store.videos[0];
  const renderRun = testContext.store.renderRuns[0];

  testContext.publishedVideo = createPublishedVideo(
    testContext.store,
    {
      videoId: video.id,
      renderRunId: renderRun.id,
      slug,
      accessPolicy: 'public',
      viewCount: 0,
    },
    testContext.activeOrgId
  );
});

When('access policy {string}', function (accessPolicy: string) {
  // This modifies the last creation - store for next step
  if (testContext.publishedVideo) {
    testContext.publishedVideo = {
      ...testContext.publishedVideo,
      accessPolicy: accessPolicy as any,
    };
    // Re-create with correct access policy
    testContext.store.publishedVideos.pop();
    const video = testContext.store.videos[0];
    const renderRun = testContext.store.renderRuns[0];
    testContext.publishedVideo = createPublishedVideo(
      testContext.store,
      {
        videoId: video.id,
        renderRunId: renderRun.id,
        slug: testContext.publishedVideo.slug,
        accessPolicy: accessPolicy as any,
        viewCount: 0,
      },
      testContext.activeOrgId
    );
  }
});

When('password hash {string}', function (passwordHash: string) {
  if (testContext.publishedVideo) {
    testContext.store.publishedVideos.pop();
    const video = testContext.store.videos[0];
    const renderRun = testContext.store.renderRuns[0];
    testContext.publishedVideo = createPublishedVideo(
      testContext.store,
      {
        videoId: video.id,
        renderRunId: renderRun.id,
        slug: testContext.publishedVideo.slug,
        accessPolicy: testContext.publishedVideo.accessPolicy,
        passwordHash,
        viewCount: 0,
      },
      testContext.activeOrgId
    );
  }
});

Then('the published video should be created successfully', function () {
  assert.ok(testContext.publishedVideo);
  assert.ok(testContext.publishedVideo.id);
});

Then('the video should reference render run {string}', function (renderRunId: string) {
  assert.strictEqual(testContext.publishedVideo!.renderRunId, renderRunId);
});

Then('the access policy should be {string}', function (accessPolicy: string) {
  assert.strictEqual(testContext.publishedVideo!.accessPolicy, accessPolicy);
});

Then('the video slug should be {string}', function (slug: string) {
  assert.strictEqual(testContext.publishedVideo!.slug, slug);
});

Then('the password hash should be {string}', function (passwordHash: string) {
  assert.strictEqual(testContext.publishedVideo!.passwordHash, passwordHash);
});

Given('a published video exists with id {string}', function (pubId: string) {
  const video = testContext.store.videos[0];
  const renderRun = testContext.store.renderRuns[0];

  testContext.publishedVideo = createPublishedVideo(
    testContext.store,
    {
      id: pubId,
      videoId: video.id,
      renderRunId: renderRun.id,
      slug: 'test-video',
      accessPolicy: 'public',
      viewCount: 0,
    },
    testContext.activeOrgId,
    { id: () => pubId }
  );
});

When('I get the published video {string}', function (pubId: string) {
  testContext.publishedVideo = getPublishedVideo(
    testContext.store,
    pubId,
    testContext.activeOrgId
  );
});

Then('the published video should be returned', function () {
  assert.ok(testContext.publishedVideo);
});

Then('it should have the correct organization ID', function () {
  assert.strictEqual(testContext.publishedVideo!.orgId, testContext.activeOrgId);
});

Given('the view count is {int}', function (count: number) {
  if (testContext.publishedVideo) {
    testContext.publishedVideo.viewCount = count;
  }
});

When('I update the view count to {int}', function (newCount: number) {
  testContext.publishedVideo = updatePublishedVideo(
    testContext.store,
    testContext.publishedVideo!.id,
    { viewCount: newCount },
    testContext.activeOrgId
  );
});

Then('the view count should be {int}', function (expectedCount: number) {
  assert.strictEqual(testContext.publishedVideo!.viewCount, expectedCount);
});

When('I update the access policy to {string}', function (newPolicy: string) {
  testContext.publishedVideo = updatePublishedVideo(
    testContext.store,
    testContext.publishedVideo!.id,
    { accessPolicy: newPolicy as any },
    testContext.activeOrgId
  );
});

Given('{int} published videos exist for organization {string}', function (count: number, orgId: string) {
  const video = testContext.store.videos.find(v => v.orgId === orgId);
  const renderRun = testContext.store.renderRuns.find(r => r.videoId === video!.id);

  for (let i = 0; i < count; i++) {
    createPublishedVideo(
      testContext.store,
      {
        videoId: video!.id,
        renderRunId: renderRun!.id,
        slug: `test-video-${i}`,
        accessPolicy: 'public',
        viewCount: 0,
      },
      orgId
    );
  }
});

When('I list published videos for organization {string}', function (orgId: string) {
  testContext.publishedVideos = listPublishedVideos(testContext.store, orgId);
});

Then('I should get {int} published videos', function (expectedCount: number) {
  assert.strictEqual(testContext.publishedVideos.length, expectedCount);
});

Then('all should belong to organization {string}', function (orgId: string) {
  testContext.publishedVideos.forEach(pv => {
    assert.strictEqual(pv.orgId, orgId);
  });
});

Given('{int} published videos exist for video {string}', function (count: number, videoId: string) {
  const video = testContext.store.videos.find(v => v.id === videoId);
  const renderRun = testContext.store.renderRuns.find(r => r.videoId === videoId);

  for (let i = 0; i < count; i++) {
    createPublishedVideo(
      testContext.store,
      {
        videoId,
        renderRunId: renderRun!.id,
        slug: `video-${videoId}-${i}`,
        accessPolicy: 'public',
        viewCount: 0,
      },
      video!.orgId
    );
  }
});

Given('{int} published video exists for video {string}', function (count: number, videoId: string) {
  // Create a new video first
  const org = testContext.store.orgs[0];
  const project = createProject(
    testContext.store,
    {
      orgId: org.id,
      name: 'Video Project',
    },
    org.id
  );

  createVideo(
    testContext.store,
    {
      orgId: org.id,
      projectId: project.id,
      id: videoId,
      title: 'Another Video',
    },
    org.id,
    { id: () => videoId }
  );

  createGenerationRun(
    testContext.store,
    {
      orgId: org.id,
      videoId,
      storyboardVersionId: 'storyboard-456',
      status: 'succeeded',
      scriptArtifactKey: `org/${org.id}/videos/${videoId}/runs/gen-456/script.json`,
    },
    org.id,
    { id: () => 'gen-456' }
  );

  createRenderRun(testContext.store, {
    orgId: org.id,
    videoId,
    generationRunId: 'gen-456',
    status: 'succeeded',
    mp4ArtifactKey: `org/${org.id}/videos/${videoId}/renders/render-456.mp4`,
  }, org.id, { id: () => 'render-456' });

  const renderRun = testContext.store.renderRuns.find(r => r.videoId === videoId);

  createPublishedVideo(
    testContext.store,
    {
      videoId,
      renderRunId: renderRun!.id,
      slug: `video-${videoId}`,
      accessPolicy: 'public',
      viewCount: 0,
    },
    org.id
  );
});

When('I list published videos for video {string}', function (videoId: string) {
  testContext.publishedVideos = listPublishedVideos(
    testContext.store,
    testContext.activeOrgId,
    videoId
  );
});

Given('a published video exists with id {string} in organization {string}', function (pubId: string, orgId: string) {
  // Create org, video, render run for different org
  createOrg(testContext.store, {
    id: orgId,
    name: 'Other Org',
    ownerId: 'user-456',
  });

  const project = createProject(
    testContext.store,
    {
      orgId,
      name: 'Other Project',
    },
    orgId
  );

  createVideo(
    testContext.store,
    {
      orgId,
      projectId: project.id,
      id: 'video-other',
      title: 'Other Video',
    },
    orgId,
    { id: () => 'video-other' }
  );

  createGenerationRun(
    testContext.store,
    {
      orgId,
      videoId: 'video-other',
      storyboardVersionId: 'storyboard-other',
      status: 'succeeded',
      scriptArtifactKey: `org/${orgId}/videos/video-other/runs/gen-other/script.json`,
    },
    orgId,
    { id: () => 'gen-other' }
  );

  createRenderRun(testContext.store, {
    orgId,
    videoId: 'video-other',
    generationRunId: 'gen-other',
    status: 'succeeded',
    mp4ArtifactKey: `org/${orgId}/videos/video-other/renders/render-other.mp4`,
  }, orgId, { id: () => 'render-other' });

  const video = testContext.store.videos.find(v => v.orgId === orgId);
  const renderRun = testContext.store.renderRuns.find(r => r.videoId === video!.id);

  createPublishedVideo(
    testContext.store,
    {
      id: pubId,
      videoId: video!.id,
      renderRunId: renderRun!.id,
      slug: 'other-video',
      accessPolicy: 'public',
      viewCount: 0,
    },
    orgId,
    { id: () => pubId }
  );
});

When('I attempt to get published video {string} as organization {string}', function (pubId: string, orgId: string) {
  testContext.publishedVideo = getPublishedVideo(testContext.store, pubId, orgId);
});

Then('the published video should not be found', function () {
  assert.strictEqual(testContext.publishedVideo, null);
});

When('I attempt to update published video {string} as organization {string}', function (pubId: string, orgId: string) {
  try {
    updatePublishedVideo(
      testContext.store,
      pubId,
      { viewCount: 999 },
      orgId
    );
  } catch (error) {
    testContext.error = error as Error;
  }
});

Then('the update should fail with access denied', function () {
  assert.ok(testContext.error);
  assert.ok(testContext.error.message.includes('not found') || testContext.error.message.includes('access denied'));
});

Given("the access policy is {string}", function (accessPolicy: string) {
  // Used in conjunction with published video setup
  if (testContext.publishedVideo) {
    assert.strictEqual(testContext.publishedVideo.accessPolicy, accessPolicy);
  }
});
