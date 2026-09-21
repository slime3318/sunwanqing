import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID 格式不正确');

const groupSchema = z.object({
  code: z
    .string()
    .min(1, '请填写组别代码')
    .max(20)
    .regex(/^[A-Za-z0-9_-]+$/, '组别代码只能包含字母、数字、- 和 _'),
  name: z.string().min(2, '组别名称至少 2 个字').max(40),
  distanceKm: z.coerce.number().min(0.5, '距离至少 0.5 公里').max(200),
  price: z.coerce.number().min(0, '价格不能为负').max(100000),
  quota: z.coerce.number().int().min(1, '名额至少 1 人').max(1000000),
  minAge: z.coerce.number().int().min(0).max(100).optional(),
  maxAge: z.coerce.number().int().min(0).max(120).optional(),
  startTime: z.coerce.date().optional(),
  requiresMedicalCertificate: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

export const createEventSchema = z
  .object({
    title: z.string().min(4, '赛事名称至少 4 个字').max(120),
    city: z.string().min(2, '请填写城市').max(40),
    venue: z.string().min(2, '请填写具体地点').max(120),
    coverImage: z.string().max(500).optional(),
    description: z.string().max(4000).optional(),
    rules: z.string().max(4000).optional(),
    startDate: z.coerce.date({ invalid_type_error: '请选择赛事开始时间' }),
    endDate: z.coerce.date().optional(),
    registrationStart: z.coerce.date({ invalid_type_error: '请选择报名开始时间' }),
    registrationEnd: z.coerce.date({ invalid_type_error: '请选择报名截止时间' }),
    status: z.enum(['draft', 'published', 'closed']).optional(),
    groups: z.array(groupSchema).min(1, '至少需要配置一个赛事组别').max(20, '组别数量过多'),
  })
  .superRefine((value, ctx) => {
    if (value.registrationEnd <= value.registrationStart) {
      ctx.addIssue({
        code: 'custom',
        path: ['registrationEnd'],
        message: '报名截止时间必须晚于报名开始时间',
      });
    }
    if (value.endDate && value.endDate < value.startDate) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: '赛事结束时间不能早于开始时间' });
    }
    const codes = value.groups.map((group) => group.code.toUpperCase());
    if (new Set(codes).size !== codes.length) {
      ctx.addIssue({ code: 'custom', path: ['groups'], message: '组别代码不能重复' });
    }
    value.groups.forEach((group, index) => {
      if (group.minAge != null && group.maxAge != null && group.maxAge < group.minAge) {
        ctx.addIssue({
          code: 'custom',
          path: ['groups', index, 'maxAge'],
          message: '最大年龄不能小于最小年龄',
        });
      }
    });
  });

export const updateEventSchema = z.object({
  title: z.string().min(4).max(120).optional(),
  city: z.string().min(2).max(40).optional(),
  venue: z.string().min(2).max(120).optional(),
  coverImage: z.string().max(500).optional(),
  description: z.string().max(4000).optional(),
  rules: z.string().max(4000).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  registrationStart: z.coerce.date().optional(),
  registrationEnd: z.coerce.date().optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['draft', 'published', 'closed']),
});

export const createGroupSchema = groupSchema;
export const updateGroupSchema = groupSchema.partial();

export const listEventsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(['draft', 'published', 'closed']).optional(),
  city: z.string().trim().max(40).optional(),
  keyword: z.string().trim().max(60).optional(),
  scope: z.enum(['public', 'admin']).optional(),
});

export const idParamSchema = z.object({ id: objectId });
