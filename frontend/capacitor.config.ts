import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.infinwork.mobile',
  appName: 'infinWORK',
  webDir: 'www',
  server: {
    url: 'https://infinwork.app',
    cleartext: false
  }
};

export default config;
