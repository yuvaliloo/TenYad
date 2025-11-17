import { Redirect } from 'expo-router';

export default function RootIndex() {
  // This will redirect the user from the root '/'
  // to your default tab screen, which is app/(tabs)/index.tsx
  return <Redirect href="../(tabs)/" />;
}