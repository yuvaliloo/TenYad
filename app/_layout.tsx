import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="new-request" options={{ presentation: 'modal', title: 'משימה חדשה' }} />
        <Stack.Screen name="task-details" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false ,gestureEnabled:false}}/>
        <Stack.Screen name="forgot-password" options={{ headerShown: false ,gestureEnabled:false}}/>
        <Stack.Screen name="reset-password" options={{ headerShown: false ,gestureEnabled:false}}/>
        <Stack.Screen name="signup" options={{ presentation: 'modal',headerShown: false }}/>
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
