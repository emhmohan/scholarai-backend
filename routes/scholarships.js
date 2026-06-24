import express from 'express';
import { protect } from '../middleware/auth.js';
import Scholarship from '../models/Scholarship.js';
import User from '../models/User.js';
import scholarshipAgent from '../agents/scholarshipAgent.js';
import logger from '../utils/logger.js';

const router = express.Router();

// POST /api/scholarships/suggest
router.post('/suggest', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const result = await scholarshipAgent(user.profile || {});

    const saved = await Promise.all(
      result.scholarships.map((s) =>
        Scholarship.create({
          userId:      req.user._id,
          title:       s.title,
          provider:    s.provider,
          amount:      s.amount,
          deadline:    s.deadline ? new Date(s.deadline) : null,
          matchScore:  s.matchScore || 70,
          status:      'saved',
          url:         s.url,
          requirements: s.requirements || [],
          aiAnalysis:  s.aiAnalysis || {},
        })
      )
    );

    logger.info(`Scholarships saved for user: ${req.user.email}`);
    res.status(201).json({
      success: true,
      data: { scholarships: saved, strategy: result.strategy, profileAnalysis: result.profileAnalysis },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/scholarships
router.get('/', protect, async (req, res, next) => {
  try {
    const { status, minScore } = req.query;
    const filter = { userId: req.user._id };
    if (status) filter.status = status;
    if (minScore) filter.matchScore = { $gte: parseInt(minScore) };

    const scholarships = await Scholarship.find(filter).sort({ matchScore: -1 });
    res.status(200).json({ success: true, data: { scholarships } });
  } catch (error) {
    next(error);
  }
});

// GET /api/scholarships/:id
router.get('/:id', protect, async (req, res, next) => {
  try {
    const scholarship = await Scholarship.findOne({ _id: req.params.id, userId: req.user._id });
    if (!scholarship) return res.status(404).json({ success: false, message: 'Scholarship not found' });
    res.status(200).json({ success: true, data: { scholarship } });
  } catch (error) {
    next(error);
  }
});

// PUT /api/scholarships/:id
router.put('/:id', protect, async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const scholarship = await Scholarship.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: { ...(status && { status }), ...(notes !== undefined && { notes }) } },
      { returnDocument: 'after' }
    );
    if (!scholarship) return res.status(404).json({ success: false, message: 'Scholarship not found' });
    res.status(200).json({ success: true, data: { scholarship } });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/scholarships/:id
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const scholarship = await Scholarship.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!scholarship) return res.status(404).json({ success: false, message: 'Scholarship not found' });
    res.status(200).json({ success: true, data: { message: 'Scholarship deleted' } });
  } catch (error) {
    next(error);
  }
});

export default router;