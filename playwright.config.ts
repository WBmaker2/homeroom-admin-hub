import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:4173',
  },
  webServer: {
    command:
      'VITE_FIREBASE_API_KEY=demo-api-key VITE_FIREBASE_AUTH_DOMAIN=demo.firebaseapp.com VITE_FIREBASE_PROJECT_ID=homeroom-admin-hub-demo VITE_FIREBASE_APP_ID=1:000000000000:web:demo VITE_DEMO_AUTH_USER=demo-user npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 120000,
  },
})
