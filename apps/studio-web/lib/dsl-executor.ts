/**
 * Executes Babulus DSL code in the browser to generate CompositionSpec.
 *
 * This allows instant preview of DSL files without requiring server-side execution.
 *
 * Note: This uses a minimal browser-safe implementation of the DSL API.
 * The full DSL implementation in babulus/dsl includes Node.js dependencies (fs, crypto)
 * that cannot be used in the browser.
 */

/**
 * Executes .babulus.ts code in the browser.
 *
 * This approach strips the import statement and provides minimal DSL function
 * implementations directly in the execution context.
 *
 * @param code - The DSL code to execute
 * @returns Promise<any> - The result of executing the DSL (VideoFileSpec)
 * @throws Error if execution fails or module doesn't export default
 */
export async function executeDslFile(code: string): Promise<any> {
  try {
    // Remove import statements (we'll provide the functions directly)
    const codeWithoutImports = code.replace(/import\s+.*?from\s+['"].*?['"];?\s*/g, '');

    // Remove export default and capture the expression
    const codeWithoutExport = codeWithoutImports.replace(/export\s+default\s+/, 'return ');

    // Create a function that has access to DSL functions
    // We provide minimal browser-safe implementations
    const fn = new Function(
      'defineVideo',
      'defineDefaults',
      'defineEnv',
      'pause',
      codeWithoutExport
    );

    // Execute the function with minimal DSL function implementations
    const result = fn(
      createDefineVideo(),
      createDefineDefaults(),
      createDefineEnv(),
      createPause()
    );

    if (!result) {
      throw new Error('DSL file must export a default value');
    }

    // Handle async defineVideo (in case DSL has async setup)
    if (typeof result === 'object' && result !== null && 'then' in result) {
      return await result;
    }

    return result;
  } catch (error) {
    // Provide helpful error message
    if (error instanceof Error) {
      throw new Error(`Failed to execute DSL: ${error.message}`);
    }
    throw new Error('Failed to execute DSL: Unknown error');
  }
}

/**
 * Browser-safe implementation of defineVideo.
 * Simplified version that captures the builder calls.
 */
function createDefineVideo() {
  return function defineVideo(
    titleOrFn: string | Function,
    configOrFn?: any | Function,
    fnMaybe?: Function
  ): any {
    // Determine which signature was used
    let title: string;
    let config: any = {};
    let fn: Function;

    if (typeof titleOrFn === 'string' && typeof configOrFn === 'object' && fnMaybe) {
      // defineVideo(title, config, fn)
      title = titleOrFn;
      config = configOrFn;
      fn = fnMaybe;
    } else if (typeof titleOrFn === 'string' && typeof configOrFn === 'function') {
      // defineVideo(title, fn)
      title = titleOrFn;
      fn = configOrFn;
    } else {
      throw new Error('defineVideo requires at least a title and function: defineVideo(title, fn) or defineVideo(title, config, fn)');
    }

    const builder = createCompositionBuilder(title, config);
    const result = fn(builder);

    // Handle async
    if (result && typeof result.then === 'function') {
      return result.then(() => ({
        compositions: [builder._getSpec()]
      }));
    }

    return {
      compositions: [builder._getSpec()]
    };
  };
}

/**
 * Browser-safe implementation of defineDefaults.
 */
function createDefineDefaults() {
  return function defineDefaults(defaults: any) {
    return defaults;
  };
}

/**
 * Browser-safe implementation of defineEnv.
 */
function createDefineEnv() {
  return function defineEnv(config: any) {
    return config;
  };
}

/**
 * Browser-safe implementation of pause helper.
 */
function createPause() {
  return function pause(seconds: number) {
    return { kind: 'pause' as const, seconds };
  };
}

/**
 * Minimal CompositionBuilder for browser execution.
 * Captures the scene/cue structure without full validation.
 */
function createCompositionBuilder(name: string, opts: any) {
  const scenes: any[] = [];
  let voiceoverConfig: any = null;

  const builder = {
    voiceover(config: any) {
      voiceoverConfig = config;
    },

    scene(title: string, fn: Function) {
      const sceneBuilder = createSceneBuilder(title);
      fn(sceneBuilder);
      scenes.push(sceneBuilder._getSpec());
    },

    _getSpec() {
      return {
        id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name,
        title: name,
        scenes,
        meta: opts.meta || opts,
        voiceoverConfig,
        items: []
      };
    }
  };

  return builder;
}

/**
 * Minimal SceneBuilder for browser execution.
 */
function createSceneBuilder(title: string) {
  const items: any[] = [];
  const cues: any[] = [];
  const layers: any[] = [];
  let sceneStyles: any = {};

  const builder = {
    styles(styles: any) {
      sceneStyles = styles;
    },

    layer(name: string, configOrFn: any, fnMaybe?: Function) {
      let config: any = {};
      let fn: Function;

      if (typeof configOrFn === 'function') {
        fn = configOrFn;
      } else {
        config = configOrFn;
        fn = fnMaybe!;
      }

      const layerBuilder = createLayerBuilder(name, config);
      fn(layerBuilder);
      layers.push(layerBuilder._getSpec());
    },

    cue(id: string, fn: Function) {
      const cueBuilder = createCueBuilder(id);
      fn(cueBuilder);
      const cueSpec = cueBuilder._getSpec();
      items.push(cueSpec);
      cues.push(cueSpec);
    },

    pause(seconds: number) {
      items.push({ kind: 'pause', seconds });
    },

    _getSpec() {
      return {
        id: title.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        title,
        items,
        cues,
        layers,
        styles: sceneStyles
      };
    }
  };

  return builder;
}

/**
 * Minimal LayerBuilder for browser execution.
 */
function createLayerBuilder(name: string, config: any) {
  const components: any[] = [];

  const builder = {
    rectangle(props: any) {
      components.push({
        id: `rectangle-${components.length}`,
        type: 'Rectangle',
        props
      });
    },

    title(props: any) {
      components.push({
        id: `title-${components.length}`,
        type: 'Title',
        props
      });
    },

    subtitle(props: any) {
      components.push({
        id: `subtitle-${components.length}`,
        type: 'Subtitle',
        props
      });
    },

    progressBar(props: any) {
      components.push({
        id: `progressBar-${components.length}`,
        type: 'ProgressBar',
        props
      });
    },

    _getSpec() {
      return {
        id: `layer-${name}`,
        name,
        zIndex: config.zIndex || 0,
        styles: config.styles || {},
        components
      };
    }
  };

  return builder;
}

/**
 * Minimal CueBuilder for browser execution.
 */
function createCueBuilder(id: string) {
  const segments: any[] = [];

  const builder = {
    voice(fn: Function) {
      const voiceBuilder = createVoiceBuilder();
      fn(voiceBuilder);
      segments.push(...voiceBuilder._getSegments());
    },

    _getSpec() {
      return {
        kind: 'cue' as const,
        id,
        label: id,
        segments
      };
    }
  };

  return builder;
}

/**
 * Minimal VoiceBuilder for browser execution.
 */
function createVoiceBuilder() {
  const segments: any[] = [];

  const builder = {
    say(text: string) {
      segments.push({
        kind: 'text' as const,
        text
      });
    },

    pause(seconds: number) {
      segments.push({
        kind: 'pause' as const,
        seconds
      });
    },

    _getSegments() {
      return segments;
    }
  };

  return builder;
}

