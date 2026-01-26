/**
 * Tests for VideoEditor empty state handling
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// Mock all the dependencies
jest.mock('@/lib/use-org-data', () => ({
  useVideos: () => ({ videos: [{ id: 'test-video', title: 'Test Video' }] }),
  useGenerationRuns: () => ({ runs: [], refetch: jest.fn() }),
  useJobs: () => ({ jobs: [], refetch: jest.fn() }),
  useOrgs: () => ({ orgs: [{ id: 'test-org', name: 'Test Org' }] }),
  useVideoRenderRuns: () => ({ runs: [], refetch: jest.fn() }),
}));

jest.mock('@/lib/settings-context', () => ({
  useSettings: () => ({
    layout: {
      chatPercent: 25,
      inputPercent: 50,
      chatPosition: 'left',
      inputPosition: 'first',
      mainAxis: 'horizontal',
    },
    updateLayout: jest.fn(),
  }),
}));

jest.mock('@/lib/amplify-config', () => ({
  configureAmplify: jest.fn(),
}));

jest.mock('@/app/actions', () => ({
  createJobAction: jest.fn(),
  createStoryboardVersionAction: jest.fn(),
  setActiveStoryboardVersionAction: jest.fn(),
  createPublishedVideoAction: jest.fn(),
}));

jest.mock('@/app/actions/project-files', () => ({
  uploadProjectFileAction: jest.fn(),
  readProjectFileAction: jest.fn().mockResolvedValue(null), // No file exists
}));

jest.mock('aws-amplify/storage', () => ({
  getUrl: jest.fn(),
  downloadData: jest.fn(),
}));

jest.mock('@monaco-editor/react', () => {
  return function MockEditor() {
    return <div data-testid="monaco-editor">Monaco Editor</div>;
  };
});

jest.mock('@/components/preview-player', () => ({
  PreviewPlayer: ({ script }: any) => (
    <div data-testid="preview-player">
      Preview: {script?.scenes?.length || 0} scenes
    </div>
  ),
}));

jest.mock('@/components/publish-modal', () => ({
  PublishModal: () => <div>Publish Modal</div>,
}));

jest.mock('@/components/asset-manager', () => ({
  AssetManager: () => <div>Asset Manager</div>,
}));

// Import after mocks
const { VideoEditor } = require('../video-editor');

describe('VideoEditor Empty State', () => {
  const defaultProps = {
    orgId: 'test-org',
    projectId: 'test-project',
    videoId: 'test-video',
  };

  it('renders empty editor when no DSL code is loaded', async () => {
    render(<VideoEditor {...defaultProps} />);

    // Editor should be present
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();

    // Preview should show empty state message
    await waitFor(() => {
      expect(screen.getByText('No preview available')).toBeInTheDocument();
    });

    expect(screen.getByText('Click Preview to see your video')).toBeInTheDocument();
  });

  it('shows Preview button in empty state', () => {
    render(<VideoEditor {...defaultProps} />);

    const previewButton = screen.getByRole('button', { name: /preview/i });
    expect(previewButton).toBeInTheDocument();
  });

  it('does not show preview player when script is null', () => {
    render(<VideoEditor {...defaultProps} />);

    expect(screen.queryByTestId('preview-player')).not.toBeInTheDocument();
  });

  it('shows other editor controls', () => {
    render(<VideoEditor {...defaultProps} />);

    // Should have Save, Generate, Render buttons
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /render/i })).toBeInTheDocument();
  });
});
