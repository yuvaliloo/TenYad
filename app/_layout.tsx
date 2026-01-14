import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack>
        {/* 1. The Login Screen (Root) */}
      <Stack.Screen 
        name="index" 
        options={{ 
          headerShown: false, // Hides the top bar "index"
          gestureEnabled: false // Prevents swiping back on iOS
        }} 
      />

      {/* 2. The Signup Screen */}
      <Stack.Screen 
        name="signup" 
        options={{ 
          headerShown: false, // We made a custom back button in the file
          presentation: 'modal', // Optional: Makes it slide up like a card
        }} 
      />

      {/* 3. The Main App (Tabs) */}
      <Stack.Screen 
        name="(tabs)" 
        options={{ 
          headerShown: false, // Hides the stack header so the Tab header can show
          gestureEnabled: false // Prevents swiping back to Login from the app
        }} 
      />
      <Stack.Screen name="login" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="new-request" options={{ presentation: 'modal', title: 'יצירת משימה חדשה' }} />
      <Stack.Screen name="task-details" options={{ presentation: 'modal', title: 'פרטי משימה' }} />
      {/* 4. Handle 404s */}
      <Stack.Screen name="+not-found" />
      <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
      <Stack.Screen name="reset-password" options={{ headerShown: false }} />
    </Stack>
    </>
  );
}