/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies are forbidden across the codebase.',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'cinema-engine-isolation',
      severity: 'error',
      comment: 'packages/cinema-engine must never import from apps, store, UI packages, or DOM.',
      from: {
        path: '^packages/cinema-engine',
      },
      to: {
        path: '^(apps/|packages/cinema-renderer-pixi|packages/cinema-react|packages/store|packages/source-resolver)',
      },
    },
    {
      name: 'trace-model-pure',
      severity: 'error',
      comment:
        'packages/trace-model must be leaf-level pure without dependencies on other internal packages.',
      from: {
        path: '^packages/trace-model',
      },
      to: {
        path: '^(apps/|packages/(?!trace-model|config))',
      },
    },
    {
      name: 'no-deep-cross-package-imports',
      severity: 'error',
      comment: 'Packages must only import from the public entrypoint (index.ts) of other packages.',
      from: {
        path: '^packages/([^/]+)/',
      },
      to: {
        path: '^packages/[^/]+/src/',
        pathNot: '^packages/$1/',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
  },
};
