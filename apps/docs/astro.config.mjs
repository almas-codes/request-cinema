import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

export default defineConfig({
  integrations: [
    starlight({
      title: 'Request Cinema Docs',
      description:
        'Next-generation distributed OpenTelemetry trace visualizer that maps traces into an interactive metro transit cinema.',
      social: {
        github: 'https://github.com/request-cinema/request-cinema',
      },
      sidebar: [
        {
          label: 'Guides',
          items: [
            { label: 'Overview', slug: 'index' },
            { label: 'Quick Start', slug: 'guides/quickstart' },
          ],
        },
      ],
    }),
  ],
});
