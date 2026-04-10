import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.whereismymoney.app',
  appName: 'Where Is My Money',
  webDir: 'dist',
  android: {
    backgroundColor: '#f9fafb',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#f9fafb',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
};

export default config;
