import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>הפרופיל שלי</Text>
      <Text style={styles.subtitle}>כאן תוכל לראות את הפרטים האישיים שלך</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF8EF',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#6f411d',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#444',
  },
});
