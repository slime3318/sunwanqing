import crypto from 'node:crypto';
import { env } from '../config/env.js';

/**
 * 支付渠道抽象层。
 * PAYMENT_PROVIDER=mock 时创建订单后立即返回支付成功，便于完整跑通报名闭环。
 * 接入微信支付/支付宝时，createPayment 返回渠道下单参数，
 * 并在 handleCallback 中校验渠道异步通知签名后更新报名状态。
 */
export const paymentService = {
  async createPayment({ orderNo, amount, method, subject }) {
    if (env.paymentProvider === 'mock') {
      return {
        provider: 'mock',
        orderNo,
        amount,
        method: method || 'mock',
        subject,
        payUrl: `/mock-pay/${orderNo}`,
        prepayId: `mock_${crypto.randomBytes(8).toString('hex')}`,
      };
    }

    throw new Error(`未实现的支付渠道: ${env.paymentProvider}`);
  },

  async refund({ orderNo, amount }) {
    if (env.paymentProvider === 'mock') {
      return {
        provider: 'mock',
        orderNo,
        amount,
        refundId: `mock_refund_${crypto.randomBytes(8).toString('hex')}`,
        status: 'refunded',
      };
    }

    throw new Error(`未实现的支付渠道: ${env.paymentProvider}`);
  },
};
