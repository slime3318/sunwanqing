import { z } from 'zod';
import { isValidChineseIdCard } from '../../utils/idCard.js';

const optionalEmail = z
  .union([z.string().email('邮箱格式不正确'), z.literal('')])
  .optional()
  .transform((value) => (value === '' ? undefined : value));

export const updateProfileSchema = z.object({
  name: z.string().min(2, '姓名至少 2 个字').max(40).optional(),
  email: optionalEmail,
  idCard: z
    .string()
    .optional()
    .refine((value) => !value || isValidChineseIdCard(value), '身份证号不合法'),
  city: z.string().max(40).optional(),
  club: z.string().max(60).optional(),
  avatar: z.string().max(500).optional(),
  bloodType: z.enum(['A', 'B', 'AB', 'O', 'unknown']).optional(),
  emergencyContact: z
    .object({
      name: z.string().min(1, '请填写紧急联系人姓名').max(40),
      phone: z.string().regex(/^1[3-9]\d{9}$/, '紧急联系人手机号格式不正确'),
      relation: z.string().max(20).optional(),
    })
    .optional(),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  role: z.enum(['super_admin', 'operator', 'event_editor', 'participant']).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  keyword: z.string().trim().max(60).optional(),
});

export const assignRoleSchema = z.object({
  role: z.enum(['super_admin', 'operator', 'event_editor', 'participant']),
  managedEvents: z.array(z.string()).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['active', 'disabled']),
  reason: z.string().max(200).optional(),
});
