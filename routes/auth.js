import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { sendEmail } from '../utils/emailService.js';
import passport from '../utils/passport.js';
import logger from '../utils/logger.js';

const router = express.Router();

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    const user  = await User.create({ name, email: email.toLowerCase(), password });
    const token = signToken(user._id);

    // Send welcome email
    await sendEmail(user.email, 'welcome', [user.name]);

    logger.info(`New user registered: ${email}`);
    res.status(201).json({
      success: true,
      data: { token, user: { _id: user._id, name: user.name, email: user.email, avatar: user.avatar } },
    });
  } catch (error) {
    logger.error(`Register error: ${error.message}`);
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const token = signToken(user._id);
    logger.info(`User logged in: ${email}`);
    res.status(200).json({
      success: true,
      data: { token, user: { _id: user._id, name: user.name, email: user.email, avatar: user.avatar } },
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res, next) => {
  try {
    res.status(200).json({ success: true, data: { user: req.user } });
  } catch (error) { next(error); }
});

// ── Google OAuth ──
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_failed` }),
  (req, res) => {
    const token = signToken(req.user._id);
    const user  = { _id: req.user._id, name: req.user.name, email: req.user.email, avatar: req.user.avatar };
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`);
  }
);

// ── GitHub OAuth ──
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get('/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=github_failed` }),
  (req, res) => {
    const token = signToken(req.user._id);
    const user  = { _id: req.user._id, name: req.user.name, email: req.user.email, avatar: req.user.avatar };
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`);
  }
);

export default router;