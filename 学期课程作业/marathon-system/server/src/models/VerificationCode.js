import mongoose from 'mongoose';

const verificationCodeSchema = new mongoose.Schema(
  {
    target: { type: String, required: true, index: true },
    channel: { type: String, enum: ['sms', 'email'], required: true },
    scene: { type: String, enum: ['register', 'login', 'reset'], required: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    attempts: { type: Number, default: 0 },
    consumedAt: { type: Date },
  },
  { timestamps: true },
);

export const VerificationCode = mongoose.model('VerificationCode', verificationCodeSchema);
