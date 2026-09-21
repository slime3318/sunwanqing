import { env } from '../config/env.js';

/**
 * 邮件发送抽象层。MAIL_PROVIDER=mock 时仅写日志。
 * 接入真实邮件服务（SES / 阿里云邮件推送 / SMTP）时替换 send 实现。
 */
export const mailService = {
  async send({ to, subject, html }) {
    if (env.mailProvider === 'mock') {
      console.info(`[mail:mock] -> ${to} | ${subject}`);
      return { delivered: true, provider: 'mock' };
    }

    throw new Error(`未实现的邮件服务商: ${env.mailProvider}`);
  },
};

export const mailTemplates = {
  verificationCode(code) {
    return {
      subject: '【马拉松报名系统】邮箱验证码',
      html: `<p>你的验证码是 <strong>${code}</strong>，5 分钟内有效。</p>`,
    };
  },
  registrationApproved(eventTitle, groupName) {
    return {
      subject: `【${eventTitle}】报名审核通过`,
      html: `<p>恭喜，你在 <strong>${eventTitle}</strong> 的 <strong>${groupName}</strong> 报名已审核通过，请按时参赛。</p>`,
    };
  },
  registrationRejected(eventTitle, groupName, comment) {
    return {
      subject: `【${eventTitle}】报名未通过`,
      html: `<p>很遗憾，你在 <strong>${eventTitle}</strong> 的 <strong>${groupName}</strong> 报名未通过审核。</p><p>原因：${comment || '未填写'}</p>`,
    };
  },
};
