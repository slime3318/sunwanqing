import mongoose from 'mongoose';

const eventGroupSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, uppercase: true, maxlength: 20 },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    distanceKm: { type: Number, required: true, min: 0.5, max: 200 },
    price: { type: Number, required: true, min: 0 },
    quota: { type: Number, required: true, min: 1 },
    approvedCount: { type: Number, default: 0, min: 0 },
    minAge: { type: Number, min: 0, max: 100, default: 16 },
    maxAge: { type: Number, min: 0, max: 120, default: 75 },
    startTime: { type: Date },
    requiresMedicalCertificate: { type: Boolean, default: true },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

eventGroupSchema.virtual('remainingQuota').get(function remainingQuota() {
  return Math.max(0, this.quota - this.approvedCount);
});

eventGroupSchema.set('toJSON', { virtuals: true });
eventGroupSchema.set('toObject', { virtuals: true });

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    city: { type: String, required: true, trim: true, maxlength: 40 },
    venue: { type: String, required: true, trim: true, maxlength: 120 },
    coverImage: { type: String, trim: true },
    description: { type: String, trim: true, maxlength: 4000 },
    rules: { type: String, trim: true, maxlength: 4000 },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    registrationStart: { type: Date, required: true },
    registrationEnd: { type: Date, required: true },
    status: { type: String, enum: ['draft', 'published', 'closed'], default: 'draft', index: true },
    groups: { type: [eventGroupSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    organizers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

eventSchema.index({ title: 'text', city: 'text' });

// groups 可能因 populate 字段裁剪而缺失，虚拟字段必须容忍这种情况
eventSchema.virtual('totalQuota').get(function totalQuota() {
  return (this.groups || []).reduce((total, group) => total + group.quota, 0);
});

eventSchema.virtual('totalApproved').get(function totalApproved() {
  return (this.groups || []).reduce((total, group) => total + group.approvedCount, 0);
});

eventSchema.methods.findGroup = function findGroup(groupId) {
  return this.groups.id(groupId);
};

export const Event = mongoose.model('Event', eventSchema);
