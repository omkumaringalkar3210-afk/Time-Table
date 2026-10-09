import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { GlassColors } from '@/theme/glass-theme';

import { Watermark } from '@/components/Watermark';

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'campus-timetable-global-web-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-height: 100% !important;
            background-color: #060A17 !important;
            overflow-x: hidden !important;
            -webkit-overflow-scrolling: touch !important;
            touch-action: pan-y !important;
            color: #FFFFFF !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
          }
          #root {
            display: flex !important;
            flex-direction: column !important;
            width: 100% !important;
            min-height: 100vh !important;
            background-color: #060A17 !important;
            overflow-x: hidden !important;
          }
          * {
            box-sizing: border-box !important;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  return (
    <SafeAreaProvider style={{ backgroundColor: GlassColors.bgDark, flex: 1, width: '100%' }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: GlassColors.bgDark, width: '100%' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="setup" options={{ animation: 'fade' }} />
        <Stack.Screen name="timetable" options={{ animation: 'fade' }} />
        <Stack.Screen name="attendance" options={{ animation: 'fade' }} />
        <Stack.Screen name="attendance-setup" options={{ animation: 'fade' }} />
        <Stack.Screen name="mark-attendance" options={{ animation: 'fade' }} />
      </Stack>
      <Watermark />
    </SafeAreaProvider>
  );
}
