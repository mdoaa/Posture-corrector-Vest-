import mongoose from 'mongoose';

const EmailVerificationSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  otpHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  verified: { type: Boolean, default: false }
});

export default mongoose.model('EmailVerification', EmailVerificationSchema);
