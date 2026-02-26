/**
 * PayPal Service - Integration with PayPal APIs
 * Handles PayPal payment processing and transaction management
 */

export interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  mode: "sandbox" | "live"; // sandbox for testing, live for production
}

export interface PayPalPaymentRequest {
  amount: number; // סכום בשקלים
  currency: string; // מטבע (ILS)
  description: string; // תיאור התשלום
  returnUrl: string; // URL להחזרה לאחר תשלום מוצלח
  cancelUrl: string; // URL להחזרה במקרה של ביטול
}

export interface PayPalPaymentResponse {
  success: boolean;
  transactionId?: string;
  approvalUrl?: string;
  status?: string;
  error?: any;
}

export interface PayPalTransactionDetails {
  transactionId: string;
  status: "completed" | "pending" | "failed" | "refunded";
  amount: number;
  currency: string;
  payerEmail?: string;
  payeeEmail?: string;
  createdAt?: string;
  completedAt?: string;
}

class PayPalService {
  private clientId: string;
  private clientSecret: string;
  private mode: "sandbox" | "live";
  private baseUrl: string;

  constructor(config: PayPalConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.mode = config.mode;
    this.baseUrl =
      this.mode === "sandbox"
        ? "https://api.sandbox.paypal.com"
        : "https://api.paypal.com";
  }

  /**
   * קבלת Access Token מ-PayPal
   */
  private async getAccessToken(): Promise<string | null> {
    try {
      const auth = Buffer.from(
        `${this.clientId}:${this.clientSecret}`
      ).toString("base64");

      const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });

      if (!response.ok) {
        console.error("Failed to get PayPal access token");
        return null;
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.error("Error getting PayPal access token:", error);
      return null;
    }
  }

  /**
   * יצירת תשלום PayPal
   */
  async createPayment(paymentRequest: PayPalPaymentRequest): Promise<PayPalPaymentResponse> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        return {
          success: false,
          error: "Failed to obtain PayPal access token",
        };
      }

      const payload = {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: paymentRequest.currency || "ILS",
              value: paymentRequest.amount.toString(),
            },
            description: paymentRequest.description,
          },
        ],
        application_context: {
          return_url: paymentRequest.returnUrl,
          cancel_url: paymentRequest.cancelUrl,
          user_action: "PAY_NOW",
        },
      };

      const response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error,
        };
      }

      const data = await response.json();

      // חיפוש ה-approve link
      const approveUrl = data.links?.find(
        (link: any) => link.rel === "approve"
      )?.href;

      return {
        success: true,
        transactionId: data.id,
        approvalUrl: approveUrl,
        status: data.status,
      };
    } catch (error) {
      console.error("Error creating PayPal payment:", error);
      return {
        success: false,
        error,
      };
    }
  }

  /**
   * אישור תשלום PayPal (לאחר שהמשתמש לחץ Approve)
   */
  async capturePayment(orderId: string): Promise<PayPalPaymentResponse> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        return {
          success: false,
          error: "Failed to obtain PayPal access token",
        };
      }

      const response = await fetch(
        `${this.baseUrl}/v2/checkout/orders/${orderId}/capture`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error,
        };
      }

      const data = await response.json();

      return {
        success: data.status === "COMPLETED",
        transactionId: orderId,
        status: data.status,
      };
    } catch (error) {
      console.error("Error capturing PayPal payment:", error);
      return {
        success: false,
        error,
      };
    }
  }

  /**
   * ביטול תשלום PayPal
   */
  async cancelPayment(orderId: string): Promise<PayPalPaymentResponse> {
    try {
      // ב-PayPal לא צריך ביטול מפורש של order שלא captured
      // אבל אנחנו יכולים לעדכן את הסטטוס שלנו
      return {
        success: true,
        transactionId: orderId,
        status: "CANCELLED",
      };
    } catch (error) {
      console.error("Error cancelling PayPal payment:", error);
      return {
        success: false,
        error,
      };
    }
  }

  /**
   * החזרת כספים (Refund)
   */
  async refundPayment(captureId: string): Promise<PayPalPaymentResponse> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        return {
          success: false,
          error: "Failed to obtain PayPal access token",
        };
      }

      const response = await fetch(
        `${this.baseUrl}/v2/payments/captures/${captureId}/refund`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error,
        };
      }

      const data = await response.json();

      return {
        success: true,
        transactionId: captureId,
        status: "REFUNDED",
      };
    } catch (error) {
      console.error("Error refunding PayPal payment:", error);
      return {
        success: false,
        error,
      };
    }
  }

  /**
   * קבלת פרטי תשלום
   */
  async getTransactionDetails(
    orderId: string
  ): Promise<{ success: boolean; transaction?: PayPalTransactionDetails; error?: any }> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        return {
          success: false,
          error: "Failed to obtain PayPal access token",
        };
      }

      const response = await fetch(
        `${this.baseUrl}/v2/checkout/orders/${orderId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error,
        };
      }

      const data = await response.json();
      const amount = data.purchase_units?.[0]?.amount?.value || 0;

      const transaction: PayPalTransactionDetails = {
        transactionId: data.id,
        status:
          data.status === "COMPLETED"
            ? "completed"
            : data.status === "APPROVED"
              ? "pending"
              : "failed",
        amount: parseFloat(amount),
        currency: data.purchase_units?.[0]?.amount?.currency_code || "ILS",
        payerEmail: data.payer?.email_address,
        createdAt: data.create_time,
        completedAt: data.update_time,
      };

      return {
        success: true,
        transaction,
      };
    } catch (error) {
      console.error("Error fetching transaction details:", error);
      return {
        success: false,
        error,
      };
    }
  }
}

// Export a singleton instance
let paypalInstance: PayPalService | null = null;

export const initializePayPal = (config: PayPalConfig): PayPalService => {
  paypalInstance = new PayPalService(config);
  return paypalInstance;
};

export const getPayPalService = (): PayPalService => {
  if (!paypalInstance) {
    throw new Error(
      "PayPal service not initialized. Call initializePayPal first."
    );
  }
  return paypalInstance;
};

export default PayPalService;
