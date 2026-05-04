import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];

export default defineConfig(({ command }) => ({
  base: command === 'build' && process.env.GITHUB_ACTIONS && repositoryName ? `/${repositoryName}/` : '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    exclude: [...configDefaults.exclude, '**/.worktrees/**', '**/worktrees/**'],
    globals: true,
    passWithNoTests: true,
    setupFiles: './tests/setup.ts',
  },
}));
