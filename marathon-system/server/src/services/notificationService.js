import { smsService } from './smsService.js';
import { mailService, mailTemplates } from './mailService.js';

function formatAmount(value) {
  return `¥${Number(value || 0).toFixed(2)}`;
}

/**
 * 通知编排：报名成功、审核结果等业务事件统一走这里，
 * 后续接入真实短信/邮件服务时无需改动业务代码。
 */
export const notificationService = {
  async registrationSubmitted(registration, event) {
    const groupName = registration.groupSnapshot.name;
    const amount = formatAmount(registration.payment?.amount);
    const needsPayment = registration.status === 'pending_payment';

    const smsText = needsPayment
      ? `【马拉松报名系统】你已成功报名「${event.title}」${groupName}，报名单号 ${registration.orderNo}，应付 ${amount}，请尽快完成支付。`
      : `【马拉松报名系统】你已成功报名「${event.title}」${groupName}，报名单号 ${registration.orderNo}，请等待组委会审核。`;

    await Promise.allSettled([
      registration.participant?.phone
        ? smsService.sendText({ phone: registration.participant.phone, text: smsText })
        : null,
      registration.participant?.email
        ? mailService.send({
            to: registration.participant.email,
            subject: `【${event.title}】报名已提交`,
            html: `<p>你的报名订单 <strong>${registration.orderNo}</strong> 已创建${needsPayment ? '，请尽快完成支付' : '，请等待审核'}。</p>`,
          })
        : null,
    ]);
  },

  async reviewFinished(registration, event, approved) {
    const template = approved
      ? mailTemplates.registrationApproved(event.title, registration.groupSnapshot.name)
      : mailTemplates.registrationRejected(
          event.title,
          registration.groupSnapshot.name,
          registration.review?.comment,
        );

    const smsText = approved
      ? `【马拉松报名系统】你在「${event.title}」${registration.groupSnapshot.name}的报名已审核通过，参赛号码 ${registration.bibNumber || '待分配'}。`
      : `【马拉松报名系统】你在「${event.title}」${registration.groupSnapshot.name}的报名未通过审核，费用将原路退回。`;

    await Promise.allSettled([
      registration.participant?.email
        ? mailService.send({ to: registration.participant.email, ...template })
        : null,
      registration.participant?.phone
        ? smsService.sendText({ phone: registration.participant.phone, text: smsText })
        : null,
    ]);
  },
};
