import express from 'express';
import { protect } from '../middleware/auth.js';
import { LOR } from '../models/Documents.js';
import User from '../models/User.js';
import lorAgent from '../agents/lorAgent.js';
import { groqChat } from '../utils/groqClient.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.post('/generate', protect, async (req, res, next) => {
  try {
    const { recommenderName, recommenderTitle, recommenderEmail, relationship, achievements, targetProgram, duration } = req.body;
    const user = await User.findById(req.user._id);
    const result = await lorAgent({ recommenderName, recommenderTitle, relationship, achievements, targetProgram, duration, userProfile: user.profile });
    const lor = await LOR.create({
      userId: req.user._id,
      recommenderName, recommenderTitle, relationship,
      content: result.polished,
      professorEmail: recommenderEmail,
    });
    logger.info(`LOR generated for: ${req.user.email}`);
    res.status(201).json({ success: true, data: { ...lor.toObject(), polished: result.polished, draft: result.draft, themes: result.themes } });
  } catch (error) { next(error); }
});

router.get('/', protect, async (req, res, next) => {
  try {
    const lors = await LOR.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: { lors } });
  } catch (error) { next(error); }
});

router.get('/:id', protect, async (req, res, next) => {
  try {
    const lor = await LOR.findOne({ _id: req.params.id, userId: req.user._id });
    if (!lor) return res.status(404).json({ success: false, message: 'LOR not found' });
    res.status(200).json({ success: true, data: { lor } });
  } catch (error) { next(error); }
});

router.post('/:id/request-email', protect, async (req, res, next) => {
  try {
    const lor = await LOR.findOne({ _id: req.params.id, userId: req.user._id });
    if (!lor) return res.status(404).json({ success: false, message: 'LOR not found' });
    const user = await User.findById(req.user._id);
    const email = await groqChat('llama-3.1-8b-instant', [
      { role: 'system', content: 'You are an expert at writing professional request emails. Write a polite, concise request email.' },
      { role: 'user', content: `Write a professional email from ${user.name} to ${lor.recommenderName} requesting a letter of recommendation.\n\nStudent: ${user.name}\nRecommender: ${lor.recommenderName}, ${lor.recommenderTitle}\nRelationship: ${lor.relationship}\nPurpose: Graduate school application\n\nWrite a complete email with subject line, greeting, body, and closing. Keep it under 200 words.` },
    ]);
    res.status(200).json({ success: true, data: { email } });
  } catch (error) { next(error); }
});

export default router;
