import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new Schema(
  {
    name:         { type: String, required: true, trim: true },
    email:        { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role:         { type: String, enum: ['admin', 'user'], default: 'user' },
  },
  { timestamps: true }
);



// Instance helper — verify a plain password against the hash
UserSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

export const User = mongoose.model('User', UserSchema);
