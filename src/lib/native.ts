import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

export type AppTheme = 'light' | 'dark';

export function isNativePlatform() {
  return Capacitor.isNativePlatform();
}

export function isNativeAndroid() {
  return Capacitor.getPlatform() === 'android';
}

export async function configureNativeShell(theme: AppTheme) {
  if (!isNativePlatform()) {
    return;
  }

  const backgroundColor = theme === 'dark' ? '#111827' : '#f9fafb';
  const statusBarStyle = theme === 'dark' ? Style.Light : Style.Dark;

  await Promise.allSettled([
    StatusBar.setOverlaysWebView({ overlay: false }),
    StatusBar.setBackgroundColor({ color: backgroundColor }),
    StatusBar.setStyle({ style: statusBarStyle }),
    Keyboard.setResizeMode({ mode: KeyboardResize.Body }),
    SplashScreen.hide(),
  ]);
}

export async function registerAndroidBackButton(handler: () => boolean | Promise<boolean>) {
  if (!isNativeAndroid()) {
    return () => undefined;
  }

  const listener = await CapacitorApp.addListener('backButton', async () => {
    const handled = await handler();

    if (!handled) {
      CapacitorApp.exitApp();
    }
  });

  return () => {
    void listener.remove();
  };
}
