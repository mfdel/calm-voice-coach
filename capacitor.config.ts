import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mfdel.parentpilot',
  appName: 'ParentPilot',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
