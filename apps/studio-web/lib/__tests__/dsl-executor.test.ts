/**
 * Tests for browser-based DSL executor
 */

import { executeDslFile, executeVomXml, applyVomPatchesInBrowser } from '../dsl-executor';

describe('executeDslFile', () => {
  it('executes simple defineVideo with title and config', async () => {
    const code = `
      import { defineVideo } from 'babulus/dsl';

      export default defineVideo(
        'Test Video',
        { fps: 30, width: 1280, height: 720, durationSeconds: 10 },
        (video) => {
          video.scene('Test Scene', (scene) => {
            scene.cue('test-cue', (cue) => {
              cue.voice((v) => {
                v.say('Hello world');
              });
            });
          });
        }
      );
    `;

    const result = await executeDslFile(code);

    expect(result).toBeDefined();
    expect(result.compositions).toBeDefined();
    expect(result.compositions.length).toBe(1);
    expect(result.compositions[0].title).toBe('Test Video');
    expect(result.compositions[0].scenes.length).toBe(1);
    expect(result.compositions[0].scenes[0].title).toBe('Test Scene');
  });

  it('handles voiceover config', async () => {
    const code = `
      import { defineVideo } from 'babulus/dsl';

      export default defineVideo(
        'Test Video',
        { fps: 30 },
        (video) => {
          video.voiceover({ provider: 'dry-run', leadInSeconds: 0.5 });
          video.scene('Test Scene', (scene) => {
            scene.cue('test', (cue) => {
              cue.voice((v) => v.say('Test'));
            });
          });
        }
      );
    `;

    const result = await executeDslFile(code);
    expect(result.compositions[0].voiceoverConfig).toEqual({
      provider: 'dry-run',
      leadInSeconds: 0.5,
    });
  });

  it('handles scene pauses', async () => {
    const code = `
      import { defineVideo } from 'babulus/dsl';

      export default defineVideo('Test', (video) => {
        video.scene('Scene', (scene) => {
          scene.cue('cue1', (cue) => {
            cue.voice((v) => v.say('First'));
          });
          scene.pause(0.5);
          scene.cue('cue2', (cue) => {
            cue.voice((v) => v.say('Second'));
          });
        });
      });
    `;

    const result = await executeDslFile(code);
    const items = result.compositions[0].scenes[0].items;

    expect(items.length).toBe(3); // cue, pause, cue
    expect(items[0].kind).toBe('cue');
    expect(items[1].kind).toBe('pause');
    expect(items[1].seconds).toBe(0.5);
    expect(items[2].kind).toBe('cue');
  });

  it('handles voice pauses', async () => {
    const code = `
      import { defineVideo } from 'babulus/dsl';

      export default defineVideo('Test', (video) => {
        video.scene('Scene', (scene) => {
          scene.cue('test', (cue) => {
            cue.voice((v) => {
              v.say('First part');
              v.pause(0.3);
              v.say('Second part');
            });
          });
        });
      });
    `;

    const result = await executeDslFile(code);
    const segments = result.compositions[0].scenes[0].items[0].segments;

    expect(segments.length).toBe(3);
    expect(segments[0].kind).toBe('text');
    expect(segments[0].text).toBe('First part');
    expect(segments[1].kind).toBe('pause');
    expect(segments[1].seconds).toBe(0.3);
    expect(segments[2].kind).toBe('text');
    expect(segments[2].text).toBe('Second part');
  });

  it('throws error for invalid DSL', async () => {
    const code = `
      import { defineVideo } from 'babulus/dsl';
      // Missing export default
    `;

    await expect(executeDslFile(code)).rejects.toThrow('DSL file must export a default value');
  });

  it('strips imports correctly', async () => {
    const code = `
      import { defineVideo, pause } from 'babulus/dsl';
      import type { Something } from 'somewhere';

      export default defineVideo('Test', (video) => {
        video.scene('Scene', (scene) => {
          scene.cue('test', (cue) => {
            cue.voice((v) => v.say('Test'));
          });
        });
      });
    `;

    const result = await executeDslFile(code);
    expect(result.compositions[0].title).toBe('Test');
  });
});

describe('executeVomXml', () => {
  it('parses a minimal VML document', () => {
    const xml = `
      <vml id="demo" title="Demo" fps="30" width="1280" height="720">
        <scene id="scene-1">
          <cue id="cue-1"><voice>Hello</voice></cue>
        </scene>
      </vml>
    `;
    const result = executeVomXml(xml);
    expect(result).toBeDefined();
    expect(result.compositions?.length).toBe(1);
    expect(result.compositions[0].id).toBe('demo');
    expect(result.compositions[0].meta?.fps).toBe(30);
  });

  it('rejects invalid roots', () => {
    const xml = `<not-vml></not-vml>`;
    expect(() => executeVomXml(xml)).toThrow(/XML root must be/);
  });
});

describe('applyVomPatchesInBrowser', () => {
  const baseXml = `
    <vml id="demo" title="Demo" fps="30" width="1280" height="720">
      <scene id="scene-1">
        <cue id="cue-1"><voice>Hello</voice></cue>
      </scene>
    </vml>
  `;

  it('appends and removes nodes', () => {
    const appended = applyVomPatchesInBrowser(baseXml, [
      { op: "appendNode", parentId: "scene-1", nodeXml: `<cue id="cue-2"><voice>World</voice></cue>` },
    ]);
    expect(appended).toContain('cue-2');

    const removed = applyVomPatchesInBrowser(appended, [
      { op: "removeNode", nodeId: "cue-1" },
    ]);
    expect(removed).not.toContain('cue-1');
  });

  it('sets attributes and text', () => {
    const patched = applyVomPatchesInBrowser(baseXml, [
      { op: "setAttr", nodeId: "scene-1", name: "title", value: "Intro" },
      { op: "setText", nodeId: "cue-1", textContent: "Updated" },
    ]);
    expect(patched).toContain('title="Intro"');
    expect(patched).toContain('Updated');
  });
});
