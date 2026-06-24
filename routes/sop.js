import express from 'express';
import { protect } from '../middleware/auth.js';
import { SOP } from '../models/Documents.js';
import User from '../models/User.js';
import sopAgent from '../agents/sopAgent.js';
import { groqChat } from '../utils/groqClient.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.post('/generate', protect, async (req, res, next) => {
  try {
    const { program, university, wordCount, goals, achievements } = req.body;
    const user   = await User.findById(req.user._id);
    const result = await sopAgent({ program, university, wordCount, goals, achievements, userProfile: user.profile });

    const firstVersion = { content: result.polished, label: 'Version 1 - Initial Draft', createdAt: new Date() };

    const sop = await SOP.create({
      userId: req.user._id,
      title:  `SOP - ${program} at ${university}`,
      program, university,
      content:   result.polished,
      outline:   JSON.stringify(result.outline),
      wordCount: result.wordCount,
      versions:  [firstVersion],
    });

    logger.info(`SOP generated for: ${req.user.email}`);
    res.status(201).json({ success: true, data: { ...sop.toObject(), polished: result.polished, draft: result.draft } });
  } catch (error) { next(error); }
});

router.get('/', protect, async (req, res, next) => {
  try {
    const sops = await SOP.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: { sops } });
  } catch (error) { next(error); }
});

router.get('/:id', protect, async (req, res, next) => {
  try {
    const sop = await SOP.findOne({ _id: req.params.id, userId: req.user._id });
    if (!sop) return res.status(404).json({ success: false, message: 'SOP not found' });
    res.status(200).json({ success: true, data: { sop } });
  } catch (error) { next(error); }
});

router.post('/:id/refine', protect, async (req, res, next) => {
  try {
    const { feedback } = req.body;
    const sop = await SOP.findOne({ _id: req.params.id, userId: req.user._id });
    if (!sop) return res.status(404).json({ success: false, message: 'SOP not found' });

    const refined = await groqChat('llama-3.3-70b-versatile', [
      { role: 'system', content: 'You are an expert SOP editor. Return only the refined SOP text.' },
      { role: 'user',   content: `Refine this SOP based on feedback:\nFeedback: ${feedback}\n\nSOP:\n${sop.content}\n\nReturn only the refined SOP.` },
    ]);

    const versionNum = (sop.versions?.length || 0) + 1;
    sop.versions = [...(sop.versions || []), { content: refined, createdAt: new Date(), label: `Version ${versionNum} - Refined` }];
    sop.content = refined;
    await sop.save();

    res.status(200).json({ success: true, data: { sop, polished: refined } });
  } catch (error) { next(error); }
});

router.post('/:id/analyze', protect, async (req, res, next) => {
  try {
    const sop = await SOP.findOne({ _id: req.params.id, userId: req.user._id });
    if (!sop) return res.status(404).json({ success: false, message: 'SOP not found' });

    const analysis = await groqChat('llama-3.1-8b-instant', [
      { role: 'system', content: 'You are an SOP evaluator. Return ONLY valid JSON, no markdown.' },
      { role: 'user',   content: `Analyze this SOP:\n${sop.content}\n\nReturn:\n{\n  "scores": { "clarity": 8, "specificity": 7, "motivation": 9, "fit": 8 },\n  "feedback": ["Feedback 1"],\n  "overallScore": 80,\n  "strengths": ["Strength 1"],\n  "improvements": ["Improvement 1"]\n}` },
    ]);

    let parsed;
    try { parsed = JSON.parse(analysis.replace(/` + '```' + `json|` + '```' + `/g, '').trim()); }
    catch { parsed = { scores: {}, feedback: [analysis], overallScore: 75 }; }

    res.status(200).json({ success: true, data: parsed });
  } catch (error) { next(error); }
});

router.post('/:id/version', protect, async (req, res, next) => {
  try {
    const { label } = req.body;
    const sop = await SOP.findOne({ _id: req.params.id, userId: req.user._id });
    if (!sop) return res.status(404).json({ success: false, message: 'SOP not found' });

    const versionNum = (sop.versions?.length || 0) + 1;
    sop.versions = [...(sop.versions || []), {
      content:   sop.content,
      createdAt: new Date(),
      label:     label || `Version ${versionNum}`,
    }];
    await sop.save();

    res.status(200).json({ success: true, data: { sop } });
  } catch (error) { next(error); }
});

router.post('/:id/restore', protect, async (req, res, next) => {
  try {
    const { versionIndex } = req.body;
    const sop = await SOP.findOne({ _id: req.params.id, userId: req.user._id });
    if (!sop) return res.status(404).json({ success: false, message: 'SOP not found' });

    const version = sop.versions?.[versionIndex];
    if (!version) return res.status(404).json({ success: false, message: 'Version not found' });

    const versionNum = (sop.versions?.length || 0) + 1;
    sop.versions = [...sop.versions, { content: sop.content, createdAt: new Date(), label: `Version ${versionNum} - Before Restore` }];
    sop.content = version.content;
    await sop.save();

    res.status(200).json({ success: true, data: { sop, restored: version.content } });
  } catch (error) { next(error); }
});

export default router;
