import express from 'express';
import { protect } from '../middleware/auth.js';
import User from '../models/User.js';
import collegeAgent from '../agents/collegeAgent.js';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';

const router = express.Router();

// Simple College schema (inline to avoid Documents.js complexity)
const collegeSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:        String,
  location:    String,
  country:     String,
  ranking:     String,
  program:     String,
  category:    { type: String, enum: ['safe', 'match', 'reach'] },
  minGPA:      String,
  minCGPA:     String,
  fees:        String,
  deadline:    String,
  description: String,
  highlights:  [String],
  url:         String,
  status:      { type: String, enum: ['saved','applying','applied','accepted','rejected'], default: 'saved' },
  notes:       String,
}, { timestamps: true });

const College = mongoose.models.College || mongoose.model('College', collegeSchema);

// POST /api/colleges/suggest
router.post('/suggest', protect, async (req, res, next) => {
  try {
    const user   = await User.findById(req.user._id);
    const result = await collegeAgent(user.profile || {});

    const saved = await Promise.all(
      result.colleges.map((c) =>
        College.create({ userId: req.user._id, ...c })
      )
    );

    logger.info(`Colleges saved for: ${req.user.email}`);
    res.status(201).json({
      success: true,
      data: { colleges: saved, eligibility: result.eligibility },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/colleges
router.get('/', protect, async (req, res, next) => {
  try {
    const colleges = await College.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: { colleges } });
  } catch (error) {
    next(error);
  }
});

// PUT /api/colleges/:id
router.put('/:id', protect, async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const college = await College.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: { ...(status && { status }), ...(notes !== undefined && { notes }) } },
      { returnDocument: 'after' }
    );
    if (!college) return res.status(404).json({ success: false, message: 'College not found' });
    res.status(200).json({ success: true, data: { college } });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/colleges/:id
router.delete('/:id', protect, async (req, res, next) => {
  try {
    await College.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.status(200).json({ success: true, data: { message: 'College deleted' } });
  } catch (error) {
    next(error);
  }
});

export default router;
