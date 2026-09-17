import mongoose from 'mongoose';
import { Event } from '../models/Event.js';

/**
 * 名额占用使用 MongoDB 原生驱动的聚合管道更新（单文档原子操作），
 * 保证「检查剩余名额」与「占用名额」不可分割，并发报名不会超额。
 */

function buildGroupsPipeline(groupObjectId, delta) {
  const shouldApply =
    delta > 0
      ? {
          $and: [
            { $eq: ['$$group._id', groupObjectId] },
            { $eq: ['$$group.enabled', true] },
            { $lt: ['$$group.approvedCount', '$$group.quota'] },
          ],
        }
      : {
          $and: [
            { $eq: ['$$group._id', groupObjectId] },
            { $gt: ['$$group.approvedCount', 0] },
          ],
        };

  const nextCount =
    delta > 0
      ? { $add: ['$$group.approvedCount', delta] }
      : { $subtract: ['$$group.approvedCount', Math.abs(delta)] };

  return [
    {
      $set: {
        groups: {
          $map: {
            input: '$groups',
            as: 'group',
            in: {
              $cond: [shouldApply, { $mergeObjects: ['$$group', { approvedCount: nextCount }] }, '$$group'],
            },
          },
        },
      },
    },
  ];
}

/**
 * 原子占用组别名额。
 * @returns {Promise<boolean>} 是否成功占用（false 表示名额已满或组别不可用）
 */
export async function reserveQuota(eventId, groupId) {
  const groupObjectId = new mongoose.Types.ObjectId(String(groupId));
  const result = await Event.collection.updateOne(
    { _id: new mongoose.Types.ObjectId(String(eventId)) },
    buildGroupsPipeline(groupObjectId, 1),
  );
  return result.modifiedCount === 1;
}

/**
 * 释放已占用的名额（取消报名 / 审核驳回 / 退款）。
 * @returns {Promise<boolean>} 是否实际释放
 */
export async function releaseQuota(eventId, groupId) {
  const groupObjectId = new mongoose.Types.ObjectId(String(groupId));
  const result = await Event.collection.updateOne(
    { _id: new mongoose.Types.ObjectId(String(eventId)) },
    buildGroupsPipeline(groupObjectId, -1),
  );
  return result.modifiedCount === 1;
}
