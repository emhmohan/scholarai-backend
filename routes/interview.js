import express from 'express';
import { protect } from '../middleware/auth.js';
import { groqChat } from '../utils/groqClient.js';
import User from '../models/User.js';
import interviewAgent from '../agents/interviewAgent.js';
import logger from '../utils/logger.js';

const router = express.Router();

// POST /api/interview/prepare
router.post('/prepare', protect, async (req, res, next) => {
  try {
    const { scholarshipName } = req.body;
    if (!scholarshipName) {
      return res.status(400).json({ success: false, message: 'Scholarship name is required' });
    }
    const user   = await User.findById(req.user._id);
    const result = await interviewAgent(scholarshipName, user.profile || {});
    logger.info(`Interview prep for: ${req.user.email}`);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/interview/feedback
router.post('/feedback', protect, async (req, res, next) => {
  try {
    const { question, answer } = req.body;
    const feedback = await groqChat('llama-3.1-8b-instant', [
      {
        role: 'system',
        content: `You are an expert scholarship interview coach. Give specific, actionable feedback on interview answers. Return ONLY valid JSON, no markdown.`,
      },
      {
        role: 'user',
        content: `Evaluate this interview answer:
Question: ${question}
Answer: ${answer}

Return JSON:
{
  "score": 7,
  "strengths": ["What was good"],
  "improvements": ["What to improve"],
  "improvedAnswer": "A better version of the answer",
  "keyPoints": ["Key point to remember"]
}`,
      },
    ]);

    let parsed;
    try {
      parsed = JSON.parse(feedback.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { score: 7, strengths: [], improvements: [feedback], improvedAnswer: '' };
    }

    res.status(200).json({ success: true, data: parsed });
  } catch (error) {
    next(error);
  }
});

export default router;