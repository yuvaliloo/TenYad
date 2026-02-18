import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

export default function AuthCallback() {
  useEffect(() => {
    // 🟢 MAGICAL LINE: detects we are in the popup and closes it
    WebBrowser.maybeCompleteAuthSession();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator color="#588157" />
      <Text style={{ marginTop: 20 }}>Finishing Login...</Text>
    </View>
  );
}