import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../config/roles.js';

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 40 },
    phone: { type: String, trim: true, match: [/^1[3-9]\d{9}$/, '紧急联系人手机号格式不正确'] },
    relation: { type: String, trim: true, maxlength: 20 },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      match: [/^1[3-9]\d{9}$/, '手机号格式不正确'],
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, '邮箱格式不正确'],
    },
    passwordHash: { type: String, select: false },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.PARTICIPANT,
      index: true,
    },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
    idCard: { type: String, trim: true, uppercase: true },
    gender: { type: String, enum: ['male', 'female', 'unknown'], default: 'unknown' },
    birthDate: { type: Date },
    avatar: { type: String, trim: true },
    city: { type: String, trim: true, maxlength: 40 },
    bloodType: { type: String, enum: ['A', 'B', 'AB', 'O', 'unknown'], default: 'unknown' },
    club: { type: String, trim: true, maxlength: 60 },
    emergencyContact: { type: emergencyContactSchema, default: undefined },
    managedEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
    phoneVerifiedAt: { type: Date },
    emailVerifiedAt: { type: Date },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.virtual('profileCompleted').get(function profileCompleted() {
  return Boolean(this.name && this.phone && this.idCard);
});

userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 10);
};

userSchema.methods.comparePassword = function comparePassword(plain) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    name: this.name,
    phone: this.phone,
    email: this.email,
    role: this.role,
    status: this.status,
    gender: this.gender,
    city: this.city,
    club: this.club,
    avatar: this.avatar,
    managedEvents: this.managedEvents,
    createdAt: this.createdAt,
    profileCompleted: this.profileCompleted,
  };
};

export const User = mongoose.model('User', userSchema);
