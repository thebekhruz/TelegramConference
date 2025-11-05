/**
 * PayMe Direct Payment Integration
 * Generates payment links and handles payment verification
 */

const crypto = require('crypto');

class PayMePayment {
  constructor(config) {
    this.merchantId = config.merchantId;
    this.secretKey = config.secretKey;
    this.endpoint = config.endpoint || 'https://checkout.paycom.uz';
  }

  /**
   * Generate PayMe payment link
   * @param {Object} params - Payment parameters
   * @returns {string} Payment URL
   */
  generatePaymentLink(params) {
    const {
      amount,        // Amount in tyiyn (smallest unit)
      orderId,       // Unique order ID
      description,   // Payment description
      returnUrl,     // URL to return after payment (optional)
      callbackUrl    // Webhook URL for payment notification (optional)
    } = params;

    // Create base64 encoded merchant data
    const merchantData = {
      merchant_id: this.merchantId,
      amount: amount,
      account: {
        order_id: orderId
      }
    };

    // Add optional fields
    if (description) {
      merchantData.description = description;
    }
    if (returnUrl) {
      merchantData.return_url = returnUrl;
    }
    if (callbackUrl) {
      merchantData.callback_url = callbackUrl;
    }

    // Encode merchant data
    const encodedData = Buffer.from(JSON.stringify(merchantData)).toString('base64');

    // Generate payment URL
    const paymentUrl = `${this.endpoint}/${encodedData}`;

    return paymentUrl;
  }

  /**
   * Generate simple PayMe deep link (opens PayMe app)
   * @param {Object} params - Payment parameters
   * @returns {string} Deep link URL
   */
  generateDeepLink(params) {
    const {
      amount,
      orderId,
      description
    } = params;

    // PayMe deep link format
    // This will open PayMe app if installed, or web version
    const deepLink = `payme://pay?merchant=${this.merchantId}&amount=${amount}&order=${orderId}`;

    return deepLink;
  }

  /**
   * Verify payment signature from PayMe callback
   * @param {Object} callbackData - Data from PayMe webhook
   * @returns {boolean} True if signature is valid
   */
  verifyCallback(callbackData) {
    // PayMe sends callbacks with signature
    // Verify the signature to ensure it's from PayMe
    const { signature, ...data } = callbackData;

    const expectedSignature = this.generateSignature(data);
    return signature === expectedSignature;
  }

  /**
   * Generate signature for verification
   * @param {Object} data - Data to sign
   * @returns {string} Signature
   */
  generateSignature(data) {
    const sortedData = this.sortObject(data);
    const dataString = JSON.stringify(sortedData);

    return crypto
      .createHmac('sha256', this.secretKey)
      .update(dataString)
      .digest('hex');
  }

  /**
   * Sort object keys alphabetically
   * @param {Object} obj - Object to sort
   * @returns {Object} Sorted object
   */
  sortObject(obj) {
    return Object.keys(obj)
      .sort()
      .reduce((result, key) => {
        result[key] = obj[key];
        return result;
      }, {});
  }

  /**
   * Check payment status via PayMe API
   * @param {string} transactionId - PayMe transaction ID
   * @returns {Promise<Object>} Payment status
   */
  async checkPaymentStatus(transactionId) {
    // This would require PayMe API integration
    // For now, return a mock response
    // You'll need to implement actual API call based on PayMe docs

    return {
      success: false,
      message: 'Payment verification requires PayMe API integration'
    };
  }

  /**
   * Generate payment button data for Telegram
   * @param {Object} params - Payment parameters
   * @returns {Object} Telegram inline keyboard button
   */
  generatePaymentButton(params) {
    const paymentUrl = this.generatePaymentLink(params);

    return {
      text: '💳 Pay with PayMe',
      url: paymentUrl
    };
  }

  /**
   * Generate QR code data for payment
   * @param {Object} params - Payment parameters
   * @returns {string} QR code data (payment URL)
   */
  generateQRCodeData(params) {
    return this.generatePaymentLink(params);
  }
}

module.exports = PayMePayment;
