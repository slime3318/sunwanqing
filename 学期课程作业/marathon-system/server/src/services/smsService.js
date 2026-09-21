import { env } from '../config/env.js';

/**
 * 短信发送抽象层。
 * SMS_PROVIDER=mock 时仅打印到服务端日志，方便本地与演示环境验证流程。
 * 接入阿里云/腾讯云短信时，替换下方实现为真实 SDK 调用即可。
 */
export const smsService = {
  /** 发送验证码短信 */
  async sendVerificationCode({ phone, code, scene }) {
    const text = `【马拉松报名系统】验证码 ${code}，用于${sceneLabel(scene)}，5 分钟内有效。`;
    return send({ phone, text, kind: 'code' });
  },

  /** 发送业务通知短信 */
  async sendText({ phone, text }) {
    return send({ phone, text, kind: 'notice' });
  },
};

async function send({ phone, text, kind }) {
  if (env.smsProvider === 'mock') {
    console.info(`[sms:mock:${kind}] -> ${phone} | ${text}`);
    return { delivered: true, provider: 'mock', preview: text };
  }

  // TODO: 接入真实短信服务商
  throw new Error(`未实现的短信服务商: ${env.smsProvider}`);
}

function sceneLabel(scene) {
  return { register: '注册账号', login: '登录', reset: '重置密码' }[scene] || '身份验证';
}
