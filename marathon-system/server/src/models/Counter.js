import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: Number, default: 0 },
});

counterSchema.statics.next = async function next(key) {
  const doc = await this.findOneAndUpdate(
    { key },
    { $inc: { value: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return doc.value;
};

export const Counter = mongoose.model('Counter', counterSchema);
