import express from 'express';
import { protect } from '../middleware/auth.js';
import { LOR } from '../models/Documents.js';
import { sendEmail } from '../utils/emailService.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const router = express.Router();

const recommenderSchema = new mongoose.Schema({
  lorId:            { type: mongoose.Schema.Types.ObjectId, ref: 'LOR', required: true },
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token:            { type: String, required: true, unique: true },
  recommenderName:  { type: String },
  recommenderEmail: { type: String },
  studentName:      { type: String },
  targetProgram:    { type: String },
  draftContent:     { type: String },
  status:           { type: String, enum: ['pending','viewed','submitted'], default: 'pending' },
  submittedContent: { type: String },
  recommenderNotes: { type: String },
  submittedAt:      { type: Date },
  expiresAt:        { type: Date },
}, { timestamps: true });

const RecommenderPortal = mongoose.models.RecommenderPortal ||
  mongoose.model('RecommenderPortal', recommenderSchema);

// POST /api/recommender/create — create portal link
router.post('/create', protect, async (req, res, next) => {
  try {
    const { lorId, recommenderEmail, targetProgram } = req.body;

    const lor  = await LOR.findOne({ _id: lorId, userId: req.user._id });
    if (!lor) return res.status(404).json({ success: false, message: 'LOR not found' });

    const user  = await User.findById(req.user._id);
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);

    const portal = await RecommenderPortal.create({
      lorId:            lor._id,
      userId:           req.user._id,
      token,
      recommenderName:  lor.recommenderName,
      recommenderEmail: recommenderEmail || lor.professorEmail,
      studentName:      user.name,
      targetProgram:    targetProgram || '',
      draftContent:     lor.content,
      expiresAt:        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    const portalUrl = `${process.env.FRONTEND_URL}/recommender/${token}`;

    // Send email to recommender if email provided
    if (recommenderEmail || lor.professorEmail) {
      const email = recommenderEmail || lor.professorEmail;
      await sendEmail(email, 'recommenderInvite', [
        lor.recommenderName,
        user.name,
        targetProgram || 'graduate program',
        portalUrl,
      ]);
    }

    logger.info(`Recommender portal created by: ${req.user.email}`);
    res.status(201).json({ success: true, data: { portalUrl, token, portal } });
  } catch (error) { next(error); }
});

// GET /api/recommender/:token — public access
router.get('/:token', async (req, res, next) => {
  try {
    const portal = await RecommenderPortal.findOne({ token: req.params.token });
    if (!portal) return res.status(404).json({ success: false, message: 'Portal not found' });

    if (portal.expiresAt && portal.expiresAt < new Date()) {
      return res.status(410).json({ success: false, message: 'This portal link has expired' });
    }

    if (portal.status === 'pending') {
      portal.status = 'viewed';
      await portal.save();
    }

    res.status(200).json({
      success: true,
      data: {
        recommenderName:  portal.recommenderName,
        studentName:      portal.studentName,
        targetProgram:    portal.targetProgram,
        draftContent:     portal.draftContent,
        status:           portal.status,
        submittedContent: portal.submittedContent,
        submittedAt:      portal.submittedAt,
      },
    });
  } catch (error) { next(error); }
});

// POST /api/recommender/:token/submit — recommender submits LOR
router.post('/:token/submit', async (req, res, next) => {
  try {
    const { content, notes } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ success: false, message: 'LOR content is required' });
    }

    const portal = await RecommenderPortal.findOne({ token: req.params.token });
    if (!portal) return res.status(404).json({ success: false, message: 'Portal not found' });
    if (portal.status === 'submitted') {
      return res.status(400).json({ success: false, message: 'LOR already submitted' });
    }

    portal.submittedContent = content;
    portal.recommenderNotes = notes || '';
    portal.status           = 'submitted';
    portal.submittedAt      = new Date();
    await portal.save();

    // Update the LOR in DB with submitted content
    await LOR.findByIdAndUpdate(portal.lorId, { content });

    // Notify student
    const user = await User.findById(portal.userId);
    if (user) {
      await sendEmail(user.email, 'lorSubmitted', [
        user.name,
        portal.recommenderName,
        portal.targetProgram,
      ]);
    }

    logger.info(`LOR submitted via recommender portal`);
    res.status(200).json({ success: true, data: { message: 'LOR submitted successfully!' } });
  } catch (error) { next(error); }
});

// GET /api/recommender/my/portals — student sees all their portals
router.get('/my/portals', protect, async (req, res, next) => {
  try {
    const portals = await RecommenderPortal.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: { portals } });
  } catch (error) { next(error); }
});

export default router;