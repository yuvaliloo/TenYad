import React from "react";
import { Modal, View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

interface PayPalModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  amount: number;
}

export default function PayPalModal({ visible, onClose, onSuccess, amount }: PayPalModalProps) {
  
  // 1. In a real app, this URL comes from your Backend (Firebase Function)
  // For the DEMO, we can simulate the "Success" URL interception
  
  // 2. This is a generic PayPal Sandbox checkout link for testing
  // (In production, you generate a specific token)
  const uri = "https://www.sandbox.paypal.com/checkoutnow?token=... (You would get this from backend)";

  const handleNavigationStateChange = (navState: any) => {
    const { url } = navState;

    // 3. Detect if PayPal redirected to your "Success" URL
    if (url.includes("https://example.com/success")) { 
      onSuccess();
      onClose();
    }
    
    // 4. Detect Cancel
    if (url.includes("https://example.com/cancel")) {
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={{flex: 1, marginTop: 50}}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
           <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
        
        {/* FOR THE DEMO:
           Since we don't have a backend generating tokens right now, 
           you can cheat for the presentation by loading a dummy page 
           or just explaining the flow.
           
           However, to really test, you'd use a library like 'react-native-paypal-js'
        */}
        <WebView 
           source={{ uri: "https://www.paypal.com/us/signin" }} // Placeholder for demo
           onNavigationStateChange={handleNavigationStateChange}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  closeButton: { padding: 15, alignItems: 'flex-end', backgroundColor: '#eee' },
  closeText: { fontSize: 16, color: 'blue' }
});