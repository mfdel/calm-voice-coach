import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mfdel.parentpilot',
  appName: 'ParentPilot',
  webDir: 'dist',
  ios: {
    contentInset: 'never',
    scrollEnabled: true,
    backgroundColor: '#f5f1ec',
    allowsLinkPreview: false,
  },
};

export default config;
