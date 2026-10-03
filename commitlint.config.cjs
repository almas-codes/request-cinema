module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'repo',
        'trace-model',
        'otlp',
        'engine',
        'renderer-pixi',
        'react',
        'source-resolver',
        'store',
        'sdk-node',
        'test-kit',
        'web',
        'server',
        'docs',
        'deps',
      ],
    ],
  },
};
