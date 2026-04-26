import mongoose, { Schema } from 'mongoose';

const RefreshTokenSchema = new Schema(
  {
    token:     { type: String, required: true, unique: true },
    userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

RefreshTokenSchema.index({ userId: 1 }); // for deleteMany on logout
// TTL index — MongoDB auto-deletes expired documents
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.model('RefreshToken', RefreshTokenSchema);
