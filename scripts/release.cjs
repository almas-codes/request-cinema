const { execSync } = require('node:child_process');

if (!process.env.NPM_TOKEN) {
  console.log('Notice: NPM_TOKEN secret is not configured in repository. Skipping npm publish.');
  process.exit(0);
}

try {
  execSync('changeset publish', { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to publish packages via changeset:', error.message);
  process.exit(1);
}
