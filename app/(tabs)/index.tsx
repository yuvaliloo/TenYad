import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Ionicons } from '@expo/vector-icons'; // Standard in Expo
import { StyleSheet, TouchableOpacity, useColorScheme, View } from 'react-native';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#ffffff' : '#ffffff';

  return (
    <ParallaxScrollView
      // Changed to a "Trust" Blue palette suitable for an app named TenYad
      headerBackgroundColor={{ light: '#4A90E2', dark: '#1C3E6E' }}
      headerImage={
        <Ionicons
          size={180}
          name="hand-left-outline"
          style={styles.headerIcon}
          color={iconColor}
        />
      }>
      
      {/* Header Section */}
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome to TenYad</ThemedText>
        <ThemedText type="subtitle" style={styles.tagline}>
          Lending a helping hand.
        </ThemedText>
      </ThemedView>

      {/* Main Action Grid */}
      <ThemedView style={styles.actionContainer}>
        <TouchableOpacity style={styles.card}>
          <Ionicons name="search" size={32} color="#4A90E2" />
          <ThemedText type="defaultSemiBold">Find Help</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card}>
          <Ionicons name="add-circle" size={32} color="#4A90E2" />
          <ThemedText type="defaultSemiBold">Offer Help</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {/* Status / Info Section */}
      <ThemedView style={styles.sectionContainer}>
        <ThemedText type="subtitle">Your Activity</ThemedText>
        
        <View style={styles.statusItem}>
            <Ionicons name="time-outline" size={24} color="gray" />
            <View style={{marginLeft: 10}}>
                <ThemedText type="defaultSemiBold">No active requests</ThemedText>
                <ThemedText style={{fontSize: 12, color: 'gray'}}>Create a request to get started</ThemedText>
            </View>
        </View>
      </ThemedView>

    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  tagline: {
    marginTop: 5,
    fontSize: 16,
    opacity: 0.7,
  },
  headerIcon: {
    bottom: -30,
    left: -20,
    position: 'absolute',
    opacity: 0.5, 
    transform: [{ rotate: '-15deg' }]
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
    marginBottom: 24,
  },
  card: {
    flex: 1,
    backgroundColor: '#f0f0f0', // You might want to theme this based on light/dark mode
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    gap: 10,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Elevation for Android
    elevation: 3,
  },
  sectionContainer: {
    gap: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  }
});