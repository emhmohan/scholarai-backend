import express from 'express';
import { protect } from '../middleware/auth.js';
import { groqChat } from '../utils/groqClient.js';
import Scholarship from '../models/Scholarship.js';
import { SOP, LOR, Resume, Checklist } from '../models/Documents.js';
import logger from '../utils/logger.js';

const router = express.Router();

// POST /api/agent/chat
router.post('/chat', protect, async (req, res, next) => {
  try {
    const { message, history = [] } = req.body;
    const messages = [
      {
        role: 'system',
        content: `You are ScholarAI, an expert scholarship and academic application assistant. 
Help students with scholarship applications, SOP writing, LOR requests, resume building, and application strategy.
Be specific, actionable, and encouraging. Keep responses concise and helpful.`,
      },
      ...history,
      { role: 'user', content: message },
    ];
    const reply = await groqChat('llama-3.1-8b-instant', messages);
    logger.info(`Agent chat for: ${req.user.email}`);
    res.status(200).json({ success: true, data: { reply } });
  } catch (error) {
    next(error);
  }
});

// GET /api/agent/dashboard-summary
router.get('/dashboard-summary', protect, async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [scholarships, sops, lors, resumes, checklist] = await Promise.all([
      Scholarship.find({ userId }),
      SOP.find({ userId }),
      LOR.find({ userId }),
      Resume.find({ userId }),
      Checklist.findOne({ userId }),
    ]);

    const avgMatchScore = scholarships.length > 0
      ? Math.round(scholarships.reduce((sum, s) => sum + (s.matchScore || 0), 0) / scholarships.length)
      : 0;

    const completedTasks = checklist?.tasks?.filter((t) => t.completed).length || 0;
    const totalTasks     = checklist?.tasks?.length || 0;

    res.status(200).json({
      success: true,
      data: {
        scholarshipsFound:  scholarships.length,
        documentsCreated:   sops.length + lors.length + resumes.length,
        tasksCompleted:     completedTasks,
        totalTasks,
        avgMatchScore,
        completionPercent:  checklist?.completionPercent || 0,
        recentScholarships: scholarships.slice(0, 3),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;