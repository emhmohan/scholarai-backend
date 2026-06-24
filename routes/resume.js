import express from 'express';
import { protect } from '../middleware/auth.js';
import { Resume } from '../models/Documents.js';
import resumeAgent from '../agents/resumeAgent.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.post('/', protect, async (req, res, next) => {
  try {
    const { sections } = req.body;
    const resume = await Resume.create({
      userId: req.user._id,
      sections: {
        summary:    sections.summary || '',
        experience: JSON.stringify(sections.experience || []),
        education:  JSON.stringify(sections.education  || []),
        projects:   JSON.stringify(sections.projects   || []),
        skills:     JSON.stringify(sections.skills     || []),
      }
    });
    logger.info(`Resume saved for: ${req.user.email}`);
    res.status(201).json({ success: true, data: resume });
  } catch (error) { next(error); }
});

router.get('/', protect, async (req, res, next) => {
  try {
    const resumes = await Resume.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: { resumes } });
  } catch (error) { next(error); }
});

router.get('/:id', protect, async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, userId: req.user._id });
    if (!resume) return res.status(404).json({ success: false, message: 'Resume not found' });
    res.status(200).json({ success: true, data: { resume } });
  } catch (error) { next(error); }
});

router.post('/:id/enhance', protect, async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, userId: req.user._id });
    if (!resume) return res.status(404).json({ success: false, message: 'Resume not found' });

    const sections = {
      summary:    resume.sections.summary,
      experience: JSON.parse(resume.sections.experience || '[]'),
      education:  JSON.parse(resume.sections.education  || '[]'),
      projects:   JSON.parse(resume.sections.projects   || '[]'),
      skills:     JSON.parse(resume.sections.skills     || '[]'),
    };

    const enhanced = await resumeAgent({ sections });
    resume.enhancedContent = enhanced;
    resume.keywords = enhanced.keywords || [];
    await resume.save();

    logger.info(`Resume enhanced for: ${req.user.email}`);
    res.status(200).json({ success: true, data: enhanced });
  } catch (error) { next(error); }
});

export default router;
