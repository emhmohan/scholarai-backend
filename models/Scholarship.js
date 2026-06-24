import mongoose from 'mongoose';

const scholarshipSchema = new mongoose.Schema({
  // Links scholarship to the logged-in user
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Core scholarship info
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  provider: {
    type: String,        // e.g. "Fulbright Commission", "DAAD"
    trim: true
  },
  amount: {
    type: String,        // e.g. "$50,000/year" — string to handle varied formats
    trim: true
  },
  deadline: {
    type: Date
  },
  url: {
    type: String,        // official scholarship application link
    trim: true
  },

  // AI-generated matching data
  matchScore: {
    type: Number,        // 0-100 score based on student profile fit
    min: 0,
    max: 100,
    default: 0
  },
  requirements: [{
    type: String         // e.g. ["Min GPA 3.5", "TOEFL 100+", "US Citizen"]
  }],
  aiAnalysis: {
    strengths: [String], // why this student is a good fit
    weaknesses: [String],// gaps or concerns
    tips: [String]       // specific action items to improve chances
  },

  // Application tracking
  status: {
    type: String,
    enum: ['saved', 'applying', 'applied', 'accepted', 'rejected'],
    default: 'saved'
  },
  notes: {
    type: String,        // personal notes the student adds
    maxlength: 1000
  }
}, {
  timestamps: true
});

// Index for fast queries by user and score
scholarshipSchema.index({ userId: 1, matchScore: -1 });
scholarshipSchema.index({ userId: 1, status: 1 });

const Scholarship = mongoose.model('Scholarship', scholarshipSchema);
export default Scholarship;