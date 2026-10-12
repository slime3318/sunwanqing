import mongoose from 'mongoose';

export const REGISTRATION_STATUS = {
  PENDING_PAYMENT: 'pending_payment',
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
};

export const ACTIVE_STATUSES = [
  REGISTRATION_STATUS.PENDING_PAYMENT,
  REGISTRATION_STATUS.PENDING_REVIEW,
  REGISTRATION_STATUS.APPROVED,
];

const paymentSchema = new mongoose.Schema(
  {
    orderNo: { type: String, trim: true },
    method: { type: String, enum: ['wechat', 'alipay', 'mock'], default: 'mock' },
    status: { type: String, enum: ['unpaid', 'paid', 'refunded', 'failed'], default: 'unpaid' },
    amount: { type: Number, default: 0, min: 0 },
    transactionId: { type: String, trim: true },
    paidAt: { type: Date },
    refundedAt: { type: Date },
  },
  { _id: false },
);

const reviewSchema = new mongoose.Schema(
  {
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    comment: { type: String, trim: true, maxlength: 300 },
    medicalCertificateUrl: { type: String, trim: true },
  },
  { _id: false },
);

const participantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    idCard: { type: String, required: true, trim: true, uppercase: true },
    gender: { type: String, enum: ['male', 'female'], required: true },
    birthDate: { type: Date, required: true },
    age: { type: Number, min: 0, max: 120 },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^1[3-9]\d{9}$/, '手机号格式不正确'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, '邮箱格式不正确'],
    },
    city: { type: String, trim: true, maxlength: 40 },
    club: { type: String, trim: true, maxlength: 60 },
    tshirtSize: { type: String, enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'], default: 'M' },
    bloodType: { type: String, enum: ['A', 'B', 'AB', 'O', 'unknown'], default: 'unknown' },
    emergencyContact: {
      name: { type: String, required: true, trim: true, maxlength: 40 },
      phone: {
        type: String,
        required: true,
        trim: true,
        match: [/^1[3-9]\d{9}$/, '紧急联系人手机号格式不正确'],
      },
      relation: { type: String, trim: true, maxlength: 20 },
    },
  },
  { _id: false },
);

const registrationSchema = new mongoose.Schema(
  {
    orderNo: { type: String, required: true, unique: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    group: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    groupSnapshot: {
      code: { type: String, required: true },
      name: { type: String, required: true },
      distanceKm: { type: Number, required: true },
      price: { type: Number, required: true },
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    // 有效报名期间写入 `${eventId}:${idCard}`，用稀疏唯一索引阻止重复报名；
    // 报名取消/驳回后置空，释放该身份证再次报名的能力。
    duplicateGuard: { type: String },
    participant: { type: participantSchema, required: true },
    bibNumber: { type: String, trim: true },
    status: {
      type: String,
      enum: Object.values(REGISTRATION_STATUS),
      default: REGISTRATION_STATUS.PENDING_PAYMENT,
      index: true,
    },
    payment: { type: paymentSchema, default: () => ({}) },
    review: { type: reviewSchema, default: () => ({}) },
    remark: { type: String, trim: true, maxlength: 300 },
    cancelledAt: { type: Date },
    cancelReason: { type: String, trim: true, maxlength: 200 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

// 同一赛事下同一身份证只能有一条有效报名
registrationSchema.index({ duplicateGuard: 1 }, { unique: true, sparse: true });

registrationSchema.statics.buildDuplicateGuard = function buildDuplicateGuard(eventId, idCard) {
  return `${String(eventId)}:${String(idCard).trim().toUpperCase()}`;
};

export const Registration = mongoose.model('Registration', registrationSchema);
