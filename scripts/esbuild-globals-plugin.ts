// esbuild plugin to replace external modules with global variables
import type * as esbuild from 'esbuild';

export const globalsPlugin: esbuild.Plugin = {
  name: 'globals',
  setup(build) {
    build.onResolve({ filter: /^react$/ }, () => {
      return { path: 'react', namespace: 'globals' };
    });
    build.onResolve({ filter: /^react-dom$/ }, () => {
      return { path: 'react-dom', namespace: 'globals' };
    });
    build.onResolve({ filter: /^react-dom\/client$/ }, () => {
      return { path: 'react-dom/client', namespace: 'globals' };
    });

    build.onLoad({ filter: /.*/, namespace: 'globals' }, (args) => {
      if (args.path === 'react') {
        return {
          contents: 'module.exports = window.React',
          loader: 'js',
        };
      }
      if (args.path === 'react-dom') {
        return {
          contents: 'module.exports = window.ReactDOM',
          loader: 'js',
        };
      }
      if (args.path === 'react-dom/client') {
        return {
          contents: 'module.exports = window.ReactDOM',
          loader: 'js',
        };
      }
      return null;
    });
  },
};
