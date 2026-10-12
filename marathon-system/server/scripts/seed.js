import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Event } from '../src/models/Event.js';
import { Registration } from '../src/models/Registration.js';
import { ROLES } from '../src/middleware/auth.js';
import { generateOrderNo } from '../src/utils/codes.js';
import { parseIdCard } from '../src/utils/idCard.js';
import { makeDemoIdCard } from './lib/demoIdCard.js';

async function upsertUser({ name, phone, email, password, role, idCard }) {
  let user = await User.findOne({ phone });
  if (!user) {
    user = new User({ name, phone, email, role });
    await user.setPassword(password);
  } else {
    user.name = name;
    user.email = email;
    user.role = role;
  }
  if (idCard) {
    const parsed = parseIdCard(idCard);
    user.idCard = parsed.idCard;
    user.gender = parsed.gender;
    user.birthDate = parsed.birthDate;
  }
  user.status = 'active';
  user.phoneVerifiedAt = new Date();
  await user.save();
  return user;
}

async function main() {
  await connectDatabase();
  console.info('[seed] 已连接数据库，开始写入演示数据...');

  const superAdmin = await upsertUser({
    name: '超级管理员',
    phone: env.seedAdmin.phone,
    email: env.seedAdmin.email,
    password: env.seedAdmin.password,
    role: ROLES.SUPER_ADMIN,
  });

  const operator = await upsertUser({
    name: '运营小王',
    phone: '13800000001',
    email: 'operator@marathon.local',
    password: 'Operator123456',
    role: ROLES.OPERATOR,
  });

  const editor = await upsertUser({
    name: '赛事编辑小李',
    phone: '13800000002',
    email: 'editor@marathon.local',
    password: 'Editor123456',
    role: ROLES.EVENT_EDITOR,
  });

  const participant = await upsertUser({
    name: '张跑跑',
    phone: '13900000001',
    email: 'runner@marathon.local',
    password: 'Runner123456',
    role: ROLES.PARTICIPANT,
    idCard: makeDemoIdCard({ areaCode: '110101', birthDate: '1992-04-18', sequence: '001', gender: 'male' }),
  });

  const now = new Date();
  const day = 24 * 60 * 60 * 1000;

  const eventSeed = [
    {
      title: '2026 城市国际马拉松',
      city: '杭州',
      venue: '杭州奥体中心体育场',
      description: '穿越西湖与钱塘江的最美赛道，欢迎全国跑友参赛。',
      rules: '参赛选手须在赛前 7 日内完成体检，并在领物现场签署参赛声明。',
      startDate: new Date(now.getTime() + 60 * day),
      endDate: new Date(now.getTime() + 60 * day + 6 * 60 * 60 * 1000),
      registrationStart: new Date(now.getTime() - 7 * day),
      registrationEnd: new Date(now.getTime() + 30 * day),
      status: 'published',
      groups: [
        {
          code: 'FULL',
          name: '全程马拉松',
          distanceKm: 42.195,
          price: 200,
          quota: 500,
          minAge: 20,
          maxAge: 70,
        },
        {
          code: 'HALF',
          name: '半程马拉松',
          distanceKm: 21.0975,
          price: 150,
          quota: 800,
          minAge: 18,
          maxAge: 70,
        },
        {
          code: 'FUN',
          name: '欢乐跑',
          distanceKm: 5,
          price: 80,
          quota: 1000,
          minAge: 12,
          maxAge: 75,
          requiresMedicalCertificate: false,
        },
      ],
    },
    {
      title: '2026 湖畔半程马拉松',
      city: '苏州',
      venue: '金鸡湖环湖步道',
      description: '环湖平路赛道，适合冲击个人最好成绩。',
      startDate: new Date(now.getTime() + 90 * day),
      registrationStart: new Date(now.getTime() + 3 * day),
      registrationEnd: new Date(now.getTime() + 45 * day),
      status: 'published',
      groups: [
        {
          code: 'HALF',
          name: '半程马拉松',
          distanceKm: 21.0975,
          price: 160,
          quota: 600,
          minAge: 18,
          maxAge: 70,
        },
      ],
    },
  ];

  for (const seed of eventSeed) {
    const existing = await Event.findOne({ title: seed.title });
    if (!existing) {
      await Event.create({ ...seed, createdBy: superAdmin._id, organizers: [editor._id] });
      console.info(`[seed] 赛事已创建：${seed.title}`);
    }
  }

  const managedEvents = await Event.find({}).select('_id');
  editor.managedEvents = managedEvents.map((item) => item._id);
  await editor.save();

  const primaryEvent = await Event.findOne({ title: '2026 城市国际马拉松' });
  if (primaryEvent && participant.idCard) {
    const existsRegistration = await Registration.findOne({
      event: primaryEvent._id,
      'participant.idCard': participant.idCard,
    });

    if (!existsRegistration) {
      const group = primaryEvent.groups.find((item) => item.code === 'HALF');
      const parsed = parseIdCard(participant.idCard);
      const orderNo = generateOrderNo();

      await Registration.create({
        orderNo,
        event: primaryEvent._id,
        group: group._id,
        groupSnapshot: {
          code: group.code,
          name: group.name,
          distanceKm: group.distanceKm,
          price: group.price,
        },
        user: participant._id,
        duplicateGuard: Registration.buildDuplicateGuard(primaryEvent._id, participant.idCard),
        participant: {
          name: participant.name,
          idCard: participant.idCard,
          gender: parsed.gender,
          birthDate: parsed.birthDate,
          age: parsed.age,
          phone: participant.phone,
          email: participant.email,
          city: '杭州',
          tshirtSize: 'L',
          emergencyContact: { name: '张小明', phone: '13900000002', relation: '家属' },
        },
        status: 'pending_review',
        payment: { orderNo, method: 'wechat', status: 'paid', amount: group.price, paidAt: new Date() },
      });

      group.approvedCount += 1;
      await primaryEvent.save();
      console.info('[seed] 演示报名已创建');
    }
  }

  console.info('\n[seed] 完成。演示账号：');
  console.table([
    { 角色: '超级管理员', 账号: env.seedAdmin.phone, 密码: env.seedAdmin.password },
    { 角色: '运营人员', 账号: operator.phone, 密码: 'Operator123456' },
    { 角色: '赛事编辑员', 账号: editor.phone, 密码: 'Editor123456' },
    { 角色: '选手', 账号: participant.phone, 密码: 'Runner123456' },
  ]);

  await disconnectDatabase();
}

main().catch(async (error) => {
  console.error('[seed] 失败', error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
