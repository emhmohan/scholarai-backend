import express from 'express';
import { protect } from '../middleware/auth.js';
import { SOP } from '../models/Documents.js';
import { groqChat } from '../utils/groqClient.js';
import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const router = express.Router();

const shareSchema = new mongoose.Schema({
  sopId:      { type: mongoose.Schema.Types.ObjectId, ref: 'SOP', required: true },
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token:      { type: String, required: true, unique: true },
  title:      { type: String },
  content:    { type: String },
  isActive:   { type: Boolean, default: true },
  viewCount:  { type: Number, default: 0 },
  comments:   [{
    name:      { type: String, default: 'Anonymous' },
    comment:   { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  }],
  expiresAt:  { type: Date },
}, { timestamps: true });

const Share = mongoose.models.Share || mongoose.model('Share', shareSchema);

// POST /api/share/sop/:id — create shareable link
router.post('/sop/:id', protect, async (req, res, next) => {
  try {
    const { expiryDays = 7 } = req.body;
    const sop = await SOP.findOne({ _id: req.params.id, userId: req.user._id });
    if (!sop) return res.status(404).json({ success: false, message: 'SOP not found' });

    // Check if already shared
    let share = await Share.findOne({ sopId: sop._id, userId: req.user._id, isActive: true });

    if (!share) {
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      share = await Share.create({
        sopId:     sop._id,
        userId:    req.user._id,
        token,
        title:     sop.title,
        content:   sop.content,
        expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
      });
    }

    const shareUrl = `${process.env.FRONTEND_URL}/review/${share.token}`;
    logger.info(`SOP shared by: ${req.user.email}`);

    res.status(200).json({ success: true, data: { shareUrl, token: share.token, expiresAt: share.expiresAt } });
  } catch (error) { next(error); }
});

// GET /api/share/:token — public access (no auth)
router.get('/:token', async (req, res, next) => {
  try {
    const share = await Share.findOne({ token: req.params.token, isActive: true });
    if (!share) return res.status(404).json({ success: false, message: 'Link not found or expired' });

    if (share.expiresAt && share.expiresAt < new Date()) {
      share.isActive = false;
      await share.save();
      return res.status(410).json({ success: false, message: 'This link has expired' });
    }

    share.viewCount += 1;
    await share.save();

    res.status(200).json({ success: true, data: { title: share.title, content: share.content, comments: share.comments, viewCount: share.viewCount, createdAt: share.createdAt } });
  } catch (error) { next(error); }
});

// POST /api/share/:token/comment — public comment (no auth)
router.post('/:token/comment', async (req, res, next) => {
  try {
    const { name, comment } = req.body;
    if (!comment?.trim()) return res.status(400).json({ success: false, message: 'Comment is required' });

    const share = await Share.findOne({ token: req.params.token, isActive: true });
    if (!share) return res.status(404).json({ success: false, message: 'Link not found' });

    share.comments.push({ name: name || 'Anonymous', comment: comment.trim() });
    await share.save();

    res.status(201).json({ success: true, data: { comments: share.comments } });
  } catch (error) { next(error); }
});

// POST /api/share/:token/ai-review — AI reviews the SOP
router.post('/:token/ai-review', async (req, res, next) => {
  try {
    const share = await Share.findOne({ token: req.params.token, isActive: true });
    if (!share) return res.status(404).json({ success: false, message: 'Link not found' });

    const review = await groqChat('llama-3.1-8b-instant', [
      { role: 'system', content: 'You are an expert SOP reviewer. Return ONLY valid JSON, no markdown.' },
      { role: 'user',   content: `Review this SOP and give detailed feedback:\n\n${share.content}\n\nReturn JSON:\n{\n  "overallScore": 8,\n  "summary": "Brief overall assessment",\n  "strengths": ["Strength 1", "Strength 2"],\n  "improvements": ["Improvement 1", "Improvement 2"],\n  "scores": { "opening": 8, "clarity": 7, "motivation": 9, "fit": 8, "closing": 7 }\n}` },
    ]);

    let parsed;
    try { parsed = JSON.parse(review.replace(/```json|```/g, '').trim()); }
    catch { parsed = { overallScore: 7, summary: review, strengths: [], improvements: [] }; }

    res.status(200).json({ success: true, data: parsed });
  } catch (error) { next(error); }
});

// DELETE /api/share/sop/:id — deactivate share
router.delete('/sop/:id', protect, async (req, res, next) => {
  try {
    await Share.updateMany({ sopId: req.params.id, userId: req.user._id }, { isActive: false });
    res.status(200).json({ success: true, data: { message: 'Share link deactivated' } });
  } catch (error) { next(error); }
});

// GET /api/share/my/links — get all my shared links
router.get('/my/links', protect, async (req, res, next) => {
  try {
    const shares = await Share.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: { shares } });
  } catch (error) { next(error); }
});

export default router;