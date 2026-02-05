/**
 * Tests for PreviewPlayer component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PreviewPlayer } from '../preview-player';
import type { ScriptData } from '@babulus/shared';

// Mock the ComposableRenderer since it has complex rendering logic
jest.mock('@babulus/renderer', () => ({
  ComposableRenderer: ({ script }: { script: ScriptData }) => (
    <div data-testid="composable-renderer">
      Rendering {script.scenes?.length || 0} scenes
    </div>
  ),
  RendererProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="renderer-provider">{children}</div>
  ),
}));

describe('PreviewPlayer', () => {
  const mockScript: ScriptData = {
    scenes: [
      {
        id: 'scene-1',
        title: 'Test Scene',
        startSec: 0,
        endSec: 5,
        cues: [
          {
            id: 'cue-1',
            label: 'Test Cue',
            text: 'Hello world',
            startSec: 0,
            endSec: 5,
          },
        ],
      },
    ],
    fps: 30,
    meta: {
      fps: 30,
      width: 1280,
      height: 720,
      durationSeconds: 5,
    },
  };

  it('renders without crashing', () => {
    render(<PreviewPlayer script={mockScript} />);
    expect(screen.getByTestId('renderer-provider')).toBeInTheDocument();
    expect(screen.getByTestId('composable-renderer')).toBeInTheDocument();
  });

  it('renders play button', () => {
    render(<PreviewPlayer script={mockScript} />);
    expect(screen.getByLabelText('Play')).toBeInTheDocument();
  });

  it('renders reset button', () => {
    render(<PreviewPlayer script={mockScript} />);
    expect(screen.getByLabelText('Reset')).toBeInTheDocument();
  });

  it('displays correct duration', () => {
    render(<PreviewPlayer script={mockScript} />);
    expect(screen.getByText(/5\.00s/)).toBeInTheDocument();
  });

  it('uses RendererProvider wrapper', () => {
    render(<PreviewPlayer script={mockScript} />);
    // This ensures RendererProvider is in the tree
    expect(screen.getByTestId('renderer-provider')).toBeInTheDocument();
  });
});
