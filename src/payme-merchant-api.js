/**
 * PayMe Merchant API Implementation
 * Implements JSON-RPC 2.0 protocol for PayMe payment callbacks
 *
 * PayMe calls these methods when processing payments:
 * 1. CheckPerformTransaction - Verify order can be paid
 * 2. CreateTransaction - Create transaction in merchant system
 * 3. PerformTransaction - Complete transaction
 * 4. CheckTransaction - Check transaction status
 * 5. CancelTransaction - Cancel transaction
 *
 * Documentation: https://developer.help.paycom.uz/metody-merchant-api
 */

const express = require('express');
const crypto = require('crypto');

class PayMeMerchantAPI {
  constructor(config, db, bot, adminId) {
    this.merchantId = config.merchantId;
    this.secretKey = config.secretKey;
    this.db = db;
    this.bot = bot;
    this.adminId = adminId;
    this.endpoint = config.endpoint || 'https://checkout.paycom.uz';

    // Transaction states
    this.STATE_CREATED = 1;
    this.STATE_COMPLETED = 2;
    this.STATE_CANCELLED = -1;
    this.STATE_CANCELLED_AFTER_COMPLETE = -2;

    // Cancellation reasons
    this.REASON_RECEIVERS_NOT_FOUND = 1;
    this.REASON_PROCESSING_EXECUTION_FAILED = 2;
    this.REASON_EXECUTION_FAILED = 3;
    this.REASON_CANCELLED_BY_TIMEOUT = 4;
    this.REASON_FUND_RETURNED = 5;
    this.REASON_UNKNOWN = 10;

    // Store transactions in memory (in production, use database)
    this.transactions = new Map();
  }

  /**
   * Generate payment link for user
   */
  generatePaymentLink(params) {
    const {
      amount,        // Amount in tyiyn (smallest unit)
      orderId,       // Unique order ID
      description,   // Payment description
      returnUrl      // URL to return after payment (optional)
    } = params;

    const merchantData = {
      merchant_id: this.merchantId,
      amount: amount,
      account: {
        order_id: orderId
      }
    };

    if (description) {
      merchantData.description = description;
    }
    if (returnUrl) {
      merchantData.return_url = returnUrl;
    }

    const encodedData = Buffer.from(JSON.stringify(merchantData)).toString('base64');
    return `${this.endpoint}/${encodedData}`;
  }

  /**
   * Verify Basic Auth header
   */
  verifyAuth(authHeader) {
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return false;
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
    const [username, password] = credentials.split(':');

    return username === 'Paycom' && password === this.secretKey;
  }

  /**
   * Method 1: CheckPerformTransaction
   * Verify that transaction can be performed (order exists and valid)
   */
  async checkPerformTransaction(params) {
    const { amount, account } = params;
    const orderId = account.order_id;

    console.log(`[PayMe] CheckPerformTransaction for order: ${orderId}, amount: ${amount}`);

    // Check if order exists in database
    const registration = this.db.getRegistrationByOrderId(orderId);

    if (!registration) {
      return {
        error: {
          code: -31050,
          message: {
            ru: 'Заказ не найден',
            uz: 'Buyurtma topilmadi',
            en: 'Order not found'
          },
          data: 'order_id'
        }
      };
    }

    // Check if already paid
    if (registration.payment_completed) {
      return {
        error: {
          code: -31051,
          message: {
            ru: 'Заказ уже оплачен',
            uz: 'Buyurtma allaqachon to\'langan',
            en: 'Order already paid'
          },
          data: 'order_id'
        }
      };
    }

    // Check amount matches
    if (amount !== registration.amount) {
      return {
        error: {
          code: -31001,
          message: {
            ru: 'Неверная сумма',
            uz: 'Noto\'g\'ri summa',
            en: 'Incorrect amount'
          },
          data: 'amount'
        }
      };
    }

    // Everything is OK, allow transaction
    return { result: { allow: true } };
  }

  /**
   * Method 2: CreateTransaction
   * Create transaction in merchant system
   */
  async createTransaction(params) {
    const { id, time, amount, account } = params;
    const orderId = account.order_id;

    console.log(`[PayMe] CreateTransaction: ${id} for order: ${orderId}`);

    // Check if transaction already exists
    if (this.transactions.has(id)) {
      const existingTxn = this.transactions.get(id);

      // Return existing transaction if not cancelled
      if (existingTxn.state !== this.STATE_CANCELLED) {
        return {
          result: {
            create_time: existingTxn.create_time,
            transaction: existingTxn.transaction,
            state: existingTxn.state
          }
        };
      } else {
        // Cannot create cancelled transaction
        return {
          error: {
            code: -31008,
            message: {
              ru: 'Транзакция отменена',
              uz: 'Tranzaksiya bekor qilingan',
              en: 'Transaction cancelled'
            }
          }
        };
      }
    }

    // Verify order again
    const checkResult = await this.checkPerformTransaction(params);
    if (checkResult.error) {
      return checkResult;
    }

    // Create transaction
    const transaction = {
      id: id,
      order_id: orderId,
      create_time: time,
      perform_time: 0,
      cancel_time: 0,
      amount: amount,
      state: this.STATE_CREATED,
      reason: null,
      transaction: orderId // Merchant transaction ID
    };

    this.transactions.set(id, transaction);

    // Update database - mark as payment in progress
    this.db.updateRegistrationPaymentStatus(orderId, {
      payme_transaction_id: id,
      payment_in_progress: true
    });

    console.log(`[PayMe] Transaction created: ${id}`);

    return {
      result: {
        create_time: transaction.create_time,
        transaction: transaction.transaction,
        state: transaction.state
      }
    };
  }

  /**
   * Method 3: PerformTransaction
   * Complete the transaction (finalize payment)
   */
  async performTransaction(params) {
    const { id } = params;

    console.log(`[PayMe] PerformTransaction: ${id}`);

    // Check if transaction exists
    if (!this.transactions.has(id)) {
      return {
        error: {
          code: -31003,
          message: {
            ru: 'Транзакция не найдена',
            uz: 'Tranzaksiya topilmadi',
            en: 'Transaction not found'
          }
        }
      };
    }

    const transaction = this.transactions.get(id);

    // If already completed, return existing data
    if (transaction.state === this.STATE_COMPLETED) {
      return {
        result: {
          transaction: transaction.transaction,
          perform_time: transaction.perform_time,
          state: transaction.state
        }
      };
    }

    // Cannot perform cancelled transaction
    if (transaction.state === this.STATE_CANCELLED) {
      return {
        error: {
          code: -31008,
          message: {
            ru: 'Транзакция отменена',
            uz: 'Tranzaksiya bekor qilingan',
            en: 'Transaction cancelled'
          }
        }
      };
    }

    // Complete the transaction
    transaction.state = this.STATE_COMPLETED;
    transaction.perform_time = Date.now();
    this.transactions.set(id, transaction);

    // Update database - mark payment as completed
    const orderId = transaction.order_id;
    this.db.updateRegistrationPaymentStatus(orderId, {
      payment_completed: true,
      payment_completed_at: new Date().toISOString(),
      payme_transaction_id: id
    });

    console.log(`[PayMe] Transaction completed: ${id}`);

    // Get user info and send confirmation
    const registration = this.db.getRegistrationByOrderId(orderId);
    if (registration && this.bot) {
      // Send confirmation to user
      const userMessage = `
✅ <b>Оплата успешно завершена!</b>

🎫 Ваша регистрация на конференцию подтверждена!
💰 Сумма: ${(transaction.amount / 100).toLocaleString('ru-RU')} сум

📝 Детали регистрации:
• <b>Номер заказа:</b> <code>${orderId}</code>
• <b>ID транзакции:</b> <code>${id}</code>
• <b>Дата:</b> ${new Date().toLocaleString('ru-RU')}

До встречи на конференции! 🎉
      `.trim();

      try {
        await this.bot.sendMessage(registration.user_id, userMessage, { parse_mode: 'HTML' });
      } catch (error) {
        console.error(`Failed to send confirmation to user ${registration.user_id}:`, error.message);
      }

      // Send notification to admin
      if (this.adminId) {
        const adminMessage = `
🔔 <b>Оплата подтверждена PayMe!</b>

👤 <b>Пользователь:</b>
• ID: <code>${registration.user_id}</code>
• Имя: ${registration.first_name} ${registration.last_name || ''}
${registration.username ? `• Username: @${registration.username}` : ''}
${registration.phone_number ? `• Телефон: ${registration.phone_number}` : ''}

💰 <b>Платеж:</b>
• Сумма: ${(transaction.amount / 100).toLocaleString('ru-RU')} сум
• Заказ: <code>${orderId}</code>
• Транзакция PayMe: <code>${id}</code>
• Дата: ${new Date().toLocaleString('ru-RU')}

✅ Статус: ОПЛАЧЕНО И ПОДТВЕРЖДЕНО
        `.trim();

        try {
          await this.bot.sendMessage(this.adminId, adminMessage, { parse_mode: 'HTML' });
        } catch (error) {
          console.error(`Failed to send admin notification:`, error.message);
        }
      }
    }

    return {
      result: {
        transaction: transaction.transaction,
        perform_time: transaction.perform_time,
        state: transaction.state
      }
    };
  }

  /**
   * Method 4: CheckTransaction
   * Check transaction status
   */
  async checkTransaction(params) {
    const { id } = params;

    console.log(`[PayMe] CheckTransaction: ${id}`);

    if (!this.transactions.has(id)) {
      return {
        error: {
          code: -31003,
          message: {
            ru: 'Транзакция не найдена',
            uz: 'Tranzaksiya topilmadi',
            en: 'Transaction not found'
          }
        }
      };
    }

    const transaction = this.transactions.get(id);

    return {
      result: {
        create_time: transaction.create_time,
        perform_time: transaction.perform_time,
        cancel_time: transaction.cancel_time,
        transaction: transaction.transaction,
        state: transaction.state,
        reason: transaction.reason
      }
    };
  }

  /**
   * Method 5: CancelTransaction
   * Cancel transaction
   */
  async cancelTransaction(params) {
    const { id, reason } = params;

    console.log(`[PayMe] CancelTransaction: ${id}, reason: ${reason}`);

    if (!this.transactions.has(id)) {
      return {
        error: {
          code: -31003,
          message: {
            ru: 'Транзакция не найдена',
            uz: 'Tranzaksiya topilmadi',
            en: 'Transaction not found'
          }
        }
      };
    }

    const transaction = this.transactions.get(id);

    // If already cancelled, return existing data
    if (transaction.state === this.STATE_CANCELLED ||
        transaction.state === this.STATE_CANCELLED_AFTER_COMPLETE) {
      return {
        result: {
          transaction: transaction.transaction,
          cancel_time: transaction.cancel_time,
          state: transaction.state
        }
      };
    }

    // Determine new state based on current state
    if (transaction.state === this.STATE_COMPLETED) {
      transaction.state = this.STATE_CANCELLED_AFTER_COMPLETE;
    } else {
      transaction.state = this.STATE_CANCELLED;
    }

    transaction.cancel_time = Date.now();
    transaction.reason = reason;
    this.transactions.set(id, transaction);

    // Update database
    const orderId = transaction.order_id;
    this.db.updateRegistrationPaymentStatus(orderId, {
      payment_completed: false,
      payment_cancelled: true,
      cancel_reason: reason
    });

    console.log(`[PayMe] Transaction cancelled: ${id}`);

    return {
      result: {
        transaction: transaction.transaction,
        cancel_time: transaction.cancel_time,
        state: transaction.state
      }
    };
  }

  /**
   * Handle incoming PayMe JSON-RPC request
   */
  async handleRequest(method, params, id) {
    console.log(`[PayMe] Incoming request: ${method}`);

    try {
      let result;

      switch (method) {
        case 'CheckPerformTransaction':
          result = await this.checkPerformTransaction(params);
          break;

        case 'CreateTransaction':
          result = await this.createTransaction(params);
          break;

        case 'PerformTransaction':
          result = await this.performTransaction(params);
          break;

        case 'CheckTransaction':
          result = await this.checkTransaction(params);
          break;

        case 'CancelTransaction':
          result = await this.cancelTransaction(params);
          break;

        default:
          return {
            jsonrpc: '2.0',
            id: id,
            error: {
              code: -32601,
              message: 'Method not found'
            }
          };
      }

      // If method returned an error, wrap it in JSON-RPC format
      if (result.error) {
        return {
          jsonrpc: '2.0',
          id: id,
          error: result.error
        };
      }

      // Return success response
      return {
        jsonrpc: '2.0',
        id: id,
        result: result.result
      };

    } catch (error) {
      console.error(`[PayMe] Error handling ${method}:`, error);

      return {
        jsonrpc: '2.0',
        id: id,
        error: {
          code: -32400,
          message: {
            ru: 'Внутренняя ошибка сервера',
            uz: 'Ichki server xatosi',
            en: 'Internal server error'
          }
        }
      };
    }
  }

  /**
   * Create Express middleware for webhook endpoint
   */
  createWebhookHandler() {
    return async (req, res) => {
      // Verify authentication
      const authHeader = req.headers.authorization;
      if (!this.verifyAuth(authHeader)) {
        return res.status(401).json({
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32504,
            message: 'Insufficient privilege to perform this operation'
          }
        });
      }

      // Parse JSON-RPC request
      const { method, params, id } = req.body;

      if (!method || !params) {
        return res.status(400).json({
          jsonrpc: '2.0',
          id: id || null,
          error: {
            code: -32600,
            message: 'Invalid Request'
          }
        });
      }

      // Handle request
      const response = await this.handleRequest(method, params, id);
      res.json(response);
    };
  }
}

module.exports = PayMeMerchantAPI;
