import { z } from 'zod';
import { isValidChineseIdCard } from '../../utils/idCard.js';
import { REGISTRATION_STATUS } from '../../models/Registration.js';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID 格式不正确');

const participantSchema = z.object({
  name: z.string().min(2, '姓名至少 2 个字').max(40),
  idCard: z.string().refine(isValidChineseIdCard, '身份证号不合法，请检查后重新输入'),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  email: z.union([z.string().email('邮箱格式不正确'), z.literal('')]).optional(),
  city: z.string().max(40).optional(),
  club: z.string().max(60).optional(),
  tshirtSize: z.enum(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']).optional(),
  bloodType: z.enum(['A', 'B', 'AB', 'O', 'unknown']).optional(),
  emergencyContact: z.object({
    name: z.string().min(1, '请填写紧急联系人姓名').max(40),
    phone: z.string().regex(/^1[3-9]\d{9}$/, '紧急联系人手机号格式不正确'),
    relation: z.string().max(20).optional(),
  }),
});

export const createRegistrationSchema = z.object({
  eventId: objectId,
  groupId: objectId,
  participant: participantSchema,
  paymentMethod: z.enum(['wechat', 'alipay', 'mock']).default('wechat'),
  remark: z.string().max(300).optional(),
});

export const paySchema = z.object({
  method: z.enum(['wechat', 'alipay', 'mock']).default('wechat'),
});

export const cancelSchema = z.object({
  reason: z.string().max(200).optional(),
});

export const reviewSchema = z.object({
  status: z.enum([REGISTRATION_STATUS.APPROVED, REGISTRATION_STATUS.REJECTED]),
  comment: z.string().max(300).optional(),
  medicalCertificateUrl: z.string().max(500).optional(),
});

export const batchReviewSchema = z.object({
  ids: z.array(objectId).min(1, '请至少选择一条报名记录').max(200, '单次最多处理 200 条'),
  status: z.enum([REGISTRATION_STATUS.APPROVED, REGISTRATION_STATUS.REJECTED]),
  comment: z.string().max(300).optional(),
});

export const listRegistrationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
  scope: z.enum(['mine', 'all']).optional(),
  status: z.enum(Object.values(REGISTRATION_STATUS)).optional(),
  eventId: objectId.optional(),
  groupId: objectId.optional(),
  keyword: z.string().trim().max(60).optional(),
});
