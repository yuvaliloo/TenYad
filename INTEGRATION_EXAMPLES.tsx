/**
 * Integration Example - How to Use Payment & Review Services
 * This file demonstrates the practical implementation of the new services and components
 */

import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth } from '../app/services/firebase';
import {
    createPayment,
    getPendingPayments,
    updatePaymentStatus
} from '../app/services/payment';
import {
    getPayPalService,
    initializePayPal
} from '../app/services/paypal';
import PaymentModal from '../components/PaymentModal';
import ReviewWindow from '../components/ReviewWindow';

/**
 * EXAMPLE 1: Simple Task Completion with Payment
 */
export function TaskCompletionExample() {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReviewWindow, setShowReviewWindow] = useState(false);

  const taskData = {
    taskId: 'task-001',
    taskTitle: 'תיקיית דירה',
    taskerId: 'tasker-123',
    taskerName: 'דוד כהן',
  };

  const handlePaymentSuccess = async () => {
    // Optional: Update your local state or navigation after payment
    console.log('Payment processed successfully!');
    setShowPaymentModal(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => setShowPaymentModal(true)}
      >
        <Text style={styles.buttonText}>שלם למבצע</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.button}
        onPress={() => setShowReviewWindow(true)}
      >
        <Text style={styles.buttonText}>צפה בביקורות</Text>
      </TouchableOpacity>

      <PaymentModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        taskerName={taskData.taskerName}
        taskerId={taskData.taskerId}
        taskId={taskData.taskId}
        taskTitle={taskData.taskTitle}
        onSuccess={handlePaymentSuccess}
      />

      <ReviewWindow
        visible={showReviewWindow}
        onClose={() => setShowReviewWindow(false)}
        userId={taskData.taskerId}
        userName={taskData.taskerName}
      />
    </View>
  );
}

/**
 * EXAMPLE 2: Advanced Payment Processing with PayPal
 */
export async function processPaymentWithPayPal(
  payerId: string,
  payerName: string,
  recipientId: string,
  recipientName: string,
  amount: number,
  taskId: string,
  taskTitle: string
) {
  try {
    // Step 1: Create payment record in Firestore
    const paymentRecord = await createPayment({
      payerId,
      payerName,
      recipientId,
      recipientName,
      amount,
      currency: 'ILS',
      taskId,
      taskTitle,
      paymentMethod: 'paypal',
      status: 'pending',
      description: `תשלום עבור: ${taskTitle}`,
    });

    if (!paymentRecord.success) {
      throw new Error('Failed to create payment record');
    }

    // Step 2: Create PayPal order
    const paypal = getPayPalService();
    const paypalResponse = await paypal.createPayment({
      amount,
      currency: 'ILS',
      description: `TenYad - ${taskTitle}`,
      returnUrl: 'https://yourapp.com/payment-success',
      cancelUrl: 'https://yourapp.com/payment-cancel',
    });

    if (!paypalResponse.success) {
      throw new Error('Failed to create PayPal order');
    }

    // Step 3: Update payment record with PayPal transaction ID
    await updatePaymentStatus(
      paymentRecord.id || '',
      'pending',
      paypalResponse.transactionId
    );

    return {
      success: true,
      paymentId: paymentRecord.id,
      approvalUrl: paypalResponse.approvalUrl,
      transactionId: paypalResponse.transactionId,
    };
  } catch (error) {
    console.error('Payment processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * EXAMPLE 3: Check Pending Payments for Tasker
 */
export async function checkPendingPayments(taskerId: string) {
  try {
    const result = await getPendingPayments(taskerId);

    if (!result.success) {
      console.error('Failed to fetch pending payments');
      return { success: false };
    }

    // Calculate total pending amount
    const totalPending = result.payments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

    return {
      success: true,
      payments: result.payments,
      totalPending,
      count: result.payments.length,
    };
  } catch (error) {
    console.error('Error checking pending payments:', error);
    return { success: false };
  }
}

/**
 * EXAMPLE 4: Initialize PayPal at App Startup
 * Call this function once when your app starts
 */
export function initializePayPalService() {
  // Make sure environment variables are set
  const clientId = process.env.EXPO_PUBLIC_PAYPAL_CLIENT_ID;
  const clientSecret = process.env.EXPO_PUBLIC_PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('PayPal credentials not set in environment variables');
    return false;
  }

  try {
    initializePayPal({
      clientId,
      clientSecret,
      mode: __DEV__ ? 'sandbox' : 'live',
    });

    console.log('PayPal service initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize PayPal service:', error);
    return false;
  }
}

/**
 * EXAMPLE 5: Handle Payment Completion (after PayPal approval)
 */
export async function completePayPalPayment(
  transactionId: string,
  paymentId: string
) {
  try {
    const paypal = getPayPalService();

    // Capture the payment
    const captureResult = await paypal.capturePayment(transactionId);

    if (!captureResult.success) {
      throw new Error('Failed to capture payment');
    }

    // Update payment status in Firestore
    await updatePaymentStatus(paymentId, 'completed', transactionId);

    return {
      success: true,
      message: 'Payment completed successfully',
    };
  } catch (error) {
    console.error('Error completing payment:', error);

    // Update payment status to failed
    await updatePaymentStatus(paymentId, 'failed', transactionId);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * EXAMPLE 6: Refund a Payment
 */
export async function refundPayment(
  transactionId: string,
  paymentId: string
) {
  try {
    const paypal = getPayPalService();

    const refundResult = await paypal.refundPayment(transactionId);

    if (!refundResult.success) {
      throw new Error('Failed to refund payment');
    }

    // Update payment status in Firestore
    await updatePaymentStatus(paymentId, 'refunded', transactionId);

    return {
      success: true,
      message: 'Refund processed successfully',
    };
  } catch (error) {
    console.error('Error refunding payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * EXAMPLE 7: Complete App Integration in a Screen Component
 */
export function TaskDetailsScreenExample() {
  const [showPayment, setShowPayment] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Mock data - replace with actual data
  const task = {
    id: 'task-001',
    title: 'תיקיית דירה',
    description: 'סידור ותיקיית דירה בעפולה',
    amount: 500,
    tasker: {
      id: 'user-456',
      name: 'דוד כהן',
      rating: 4.8,
    },
  };

  const handleInitiatePayment = async () => {
    setPaymentLoading(true);
    try {
      // This would be called after user fills PaymentModal
      const result = await processPaymentWithPayPal(
        auth.currentUser?.uid || '',
        auth.currentUser?.displayName || 'משתמש',
        task.tasker.id,
        task.tasker.name,
        task.amount,
        task.id,
        task.title
      );

      if (result.success && result.approvalUrl) {
        // Navigate to PayPal approval URL
        console.log('Open PayPal approval:', result.approvalUrl);
      }
    } catch (error) {
      console.error('Payment initiation error:', error);
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <View style={styles.screenContainer}>
      {/* Task Details */}
      <View style={styles.detailsSection}>
        <Text style={styles.taskTitle}>{task.title}</Text>
        <Text style={styles.taskDescription}>{task.description}</Text>

        {/* Tasker Info */}
        <View style={styles.taskerCard}>
          <View>
            <Text style={styles.taskerName}>{task.tasker.name}</Text>
            <Text style={styles.taskerRating}>⭐ {task.tasker.rating}</Text>
          </View>
        </View>

        {/* Amount */}
        <Text style={styles.amount}>₪{task.amount}</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => setShowPayment(true)}
          disabled={paymentLoading}
        >
          <Text style={styles.buttonText}>בצע תשלום</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setShowReviews(true)}
        >
          <Text style={styles.secondaryButtonText}>צפה בביקורות</Text>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <PaymentModal
        visible={showPayment}
        onClose={() => setShowPayment(false)}
        taskerName={task.tasker.name}
        taskerId={task.tasker.id}
        taskId={task.id}
        taskTitle={task.title}
        onSuccess={handleInitiatePayment}
      />

      <ReviewWindow
        visible={showReviews}
        onClose={() => setShowReviews(false)}
        userId={task.tasker.id}
        userName={task.tasker.name}
      />
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  screenContainer: {
    flex: 1,
    padding: 16,
  },
  button: {
    backgroundColor: '#588157',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  detailsSection: {
    flex: 1,
    paddingBottom: 20,
  },
  taskTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  taskerCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  taskerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  taskerRating: {
    fontSize: 14,
    color: '#588157',
    marginTop: 4,
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#588157',
    marginBottom: 20,
  },
  actionsSection: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#588157',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: '#588157',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#588157',
    fontWeight: '600',
    fontSize: 16,
  },
});
