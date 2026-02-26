# TenYad Services & Components Documentation

## Created Services

### 1. PaymentService (`app/services/payment.ts`)
A comprehensive payment management service for handling payments between seekers and taskers.

**Key Features:**
- Create and manage payment records in Firestore
- Track payment status (pending, completed, failed, refunded)
- Support multiple payment methods (PayPal, Credit Card, Apple Pay, Google Pay)
- Retrieve payment history for users
- Calculate total received and pending payments
- Get payment history between specific users

**Main Exports:**
```typescript
- Payment interface (with id, payer, recipient, amount, status, etc.)
- createPayment()
- getUserPayments()
- getPendingPayments()
- updatePaymentStatus()
- calculateTotalReceivedPayments()
- calculateTotalPendingPayments()
- getPaymentById()
- getPaymentHistoryBetweenUsers()
```

---

### 2. PayPalService (`app/services/paypal.ts`)
Complete PayPal integration for processing payments through the PayPal API.

**Key Features:**
- OAuth2 token authentication with PayPal
- Create orders with PayPal checkout
- Capture payments after user approval
- Refund transactions
- Get transaction details
- Support for Sandbox and Live modes
- Singleton pattern for service management

**Main Exports:**
```typescript
- PayPalConfig interface
- PayPalPaymentRequest interface
- PayPalPaymentResponse interface
- PayPalTransactionDetails interface
- PayPalService class with methods:
  - createPayment()
  - capturePayment()
  - cancelPayment()
  - refundPayment()
  - getTransactionDetails()
- initializePayPal()
- getPayPalService()
```

**Setup Instructions:**
1. Set environment variables for PayPal:
   - PAYPAL_CLIENT_ID
   - PAYPAL_CLIENT_SECRET

2. Initialize in your app:
```typescript
import { initializePayPal } from '../app/services/paypal';

const paypalConfig = {
  clientId: process.env.PAYPAL_CLIENT_ID,
  clientSecret: process.env.PAYPAL_CLIENT_SECRET,
  mode: 'sandbox', // or 'live' for production
};

initializePayPal(paypalConfig);
```

---

## Created Components

### 1. PaymentModal (Enhanced) (`components/PaymentModal.tsx`)
An improved payment modal with enhanced functionality.

**Props:**
```typescript
interface PaymentModalProps {
  visible: boolean;              // Show/hide modal
  onClose: () => void;           // Close callback
  taskerName: string;            // Name of the tasker receiving payment
  taskerId: string;              // ID of the tasker
  taskId: string;                // ID of the task
  taskTitle: string;             // Title of the task
  onSuccess?: () => void;        // Success callback
}
```

**Features:**
- Amount input with Hebrew currency symbol (₪)
- Multiple payment method selection:
  - PayPal
  - Credit Card
  - Apple Pay
  - Google Pay
- Optional description/notes field
- Keyboard-aware scrolling for better UX
- Loading state during payment processing
- Integration with Firebase payment service
- RTL (Right-to-Left) Hebrew support

**Usage Example:**
```tsx
<PaymentModal
  visible={showPayment}
  onClose={() => setShowPayment(false)}
  taskerName="דוד כהן"
  taskerId="user123"
  taskId="task456"
  taskTitle="תיקיית דירה"
  onSuccess={() => {
    console.log('Payment processed successfully');
  }}
/>
```

---

### 2. ReviewWindow (`components/ReviewWindow.tsx`)
A beautiful bottom-sheet component for displaying user reviews and ratings.

**Props:**
```typescript
interface ReviewWindowProps {
  visible: boolean;           // Show/hide component
  onClose: () => void;        // Close callback
  userId: string;             // ID of user whose reviews to display
  userName?: string;          // Name of the user (default: 'משתמש')
}
```

**Features:**
- Displays all reviews for a user
- Shows average rating with star visualization
- Review count display
- Individual review cards with:
  - Reviewer name and date
  - 5-star rating
  - Associated task information
  - Review comment/text
- Loading state while fetching reviews
- Empty state message when no reviews exist
- Bottom-sheet slide-up animation
- RTL Hebrew support
- Responsive design

**Usage Example:**
```tsx
<ReviewWindow
  visible={showReviews}
  onClose={() => setShowReviews(false)}
  userId="tasker123"
  userName="דוד כהן"
/>
```

---

## Database Schema

### Payments Collection (Firestore)
```
payments/
├── paymentId
│   ├── payerId: string
│   ├── payerName: string
│   ├── recipientId: string
│   ├── recipientName: string
│   ├── amount: number
│   ├── currency: string
│   ├── taskId: string
│   ├── taskTitle: string
│   ├── paymentMethod: 'paypal' | 'credit_card' | 'apple_pay' | 'google_pay'
│   ├── status: 'pending' | 'completed' | 'failed' | 'refunded'
│   ├── transactionId?: string
│   ├── description?: string
│   ├── createdAt: timestamp
│   └── completedAt?: timestamp
```

---

## Integration Tips

### 1. Using Both Services Together
```tsx
import { createPayment } from '../app/services/payment';
import { getPayPalService } from '../app/services/paypal';

// Step 1: Create PayPal order
const paypal = getPayPalService();
const paymentResponse = await paypal.createPayment({
  amount: 150,
  currency: 'ILS',
  description: 'Payment for task',
  returnUrl: 'app://payment-success',
  cancelUrl: 'app://payment-cancel',
});

// Step 2: If PayPal order created, save to database
if (paymentResponse.success) {
  const dbResult = await createPayment({
    payerId: currentUserId,
    payerName: currentUserName,
    recipientId: taskerId,
    recipientName: taskerName,
    amount: 150,
    currency: 'ILS',
    taskId,
    taskTitle,
    paymentMethod: 'paypal',
    status: 'pending',
    transactionId: paymentResponse.transactionId,
  });
}
```

### 2. User Flow
1. User opens PaymentModal
2. Selects amount and payment method
3. Modal integrates with PaymentService to create DB record
4. PayPal integration can be triggered separately for actual payment processing
5. After successful payment, status is updated in database
6. ReviewWindow can display reviews of the tasker post-payment

---

## Language Support
All components are fully localized for Hebrew with:
- RTL (Right-to-Left) text alignment
- Hebrew date formatting
- Hebrew UI labels and messages
- Currency symbol (₪) support
