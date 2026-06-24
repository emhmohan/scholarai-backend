import express from 'express';
import { protect } from '../middleware/auth.js';
import { sendEmail } from '../utils/emailService.js';
import Scholarship from '../models/Scholarship.js';
import { Checklist } from '../models/Documents.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

const router = express.Router();

// POST /api/notifications/test
router.post('/test', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const sent = await sendEmail(user.email, 'welcome', [user.name]);
    res.status(200).json({
      success: true,
      data: { sent, message: sent ? 'Test email sent! Check your inbox.' : 'RESEND_API_KEY not configured' },
    });
  } catch (error) { next(error); }
});

// POST /api/notifications/deadline-check
router.post('/deadline-check', protect, async (req, res, next) => {
  try {
    const user         = await User.findById(req.user._id);
    const scholarships = await Scholarship.find({ userId: req.user._id });

    const upcoming = scholarships.filter((s) => {
      if (!s.deadline) return false;
      const days = Math.ceil((new Date(s.deadline) - new Date()) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 7;
    });

    if (upcoming.length === 0) {
      return res.status(200).json({
        success: true,
        data: { sent: false, message: 'No scholarships due in next 7 days' },
      });
    }

    const sent = await sendEmail(user.email, 'deadlineReminder', [user.name, upcoming]);
    res.status(200).json({
      success: true,
      data: { sent, count: upcoming.length, message: sent ? `Reminder sent for ${upcoming.length} scholarship(s)!` : 'Email failed' },
    });
  } catch (error) { next(error); }
});

// POST /api/notifications/checklist-reminder
router.post('/checklist-reminder', protect, async (req, res, next) => {
  try {
    const user      = await User.findById(req.user._id);
    const checklist = await Checklist.findOne({ userId: req.user._id });

    if (!checklist) {
      return res.status(200).json({ success: true, data: { sent: false, message: 'No checklist found — generate one first' } });
    }

    const pendingCount = checklist.tasks.filter((t) => !t.completed).length;
    if (pendingCount === 0) {
      return res.status(200).json({ success: true, data: { sent: false, message: 'All tasks completed — great job!' } });
    }

    const sent = await sendEmail(user.email, 'checklistReminder', [user.name, pendingCount]);
    res.status(200).json({
      success: true,
      data: { sent, pendingCount, message: sent ? 'Checklist reminder sent!' : 'Email failed' },
    });
  } catch (error) { next(error); }
});

// GET /api/notifications/settings
router.get('/settings', protect, async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        emailConfigured: !!process.env.RESEND_API_KEY,
        userEmail:       req.user.email,
        provider:        'Resend',
      },
    });
  } catch (error) { next(error); }
});

export default router;