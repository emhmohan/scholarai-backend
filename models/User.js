import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  googleId: { type: String },
  githubId: { type: String },
  avatar:   { type: String },
  isVerified: { type: Boolean, default: false },
  profile: {
    bio:               { type: String },
    GPA:               { type: Number },
    degree:            { type: String },
    fieldOfStudy:      { type: String },
    university:        { type: String },
    experience:        { type: Number, default: 0 },
    testScores: {
      GRE:   { type: Number },
      GMAT:  { type: Number },
      TOEFL: { type: Number },
      IELTS: { type: Number },
    },
    targetCountries:   [{ type: String }],
    researchInterests: [{ type: String }],
  },
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

const User = mongoose.model('User', userSchema);
export default User;