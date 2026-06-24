import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import User from '../models/User.js';
import { sendEmail } from './emailService.js';
import logger from './logger.js';

const CALLBACK_BASE = process.env.NODE_ENV === 'production'
  ? process.env.BACKEND_URL || 'https://scholarai-api.onrender.com'
  : 'http://localhost:5000';

export const initPassport = () => {

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  `${CALLBACK_BASE}/api/auth/google/callback`,
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        let user  = await User.findOne({ email: profile.emails[0].value });
        let isNew = false;
        if (!user) {
          user = await User.create({
            name:     profile.displayName,
            email:    profile.emails[0].value,
            password: Math.random().toString(36).slice(-16) + 'Aa1!',
            googleId: profile.id,
            avatar:   profile.photos[0]?.value,
          });
          isNew = true;
        } else if (!user.googleId) {
          user.googleId = profile.id;
          await user.save();
        }
        if (isNew) await sendEmail(user.email, 'welcome', [user.name]);
        return done(null, user);
      } catch (error) {
        logger.error(`Google OAuth error: ${error.message}`);
        return done(error, null);
      }
    }));
    logger.info('Google OAuth configured');
  } else {
    logger.warn('Google OAuth not configured — GOOGLE_CLIENT_ID missing');
  }

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
      clientID:     process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL:  `${CALLBACK_BASE}/api/auth/github/callback`,
      scope:        ['user:email'],
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value || `${profile.username}@github.com`;
        let user    = await User.findOne({ email });
        let isNew   = false;
        if (!user) {
          user = await User.create({
            name:     profile.displayName || profile.username,
            email,
            password: Math.random().toString(36).slice(-16) + 'Aa1!',
            githubId: profile.id,
            avatar:   profile.photos[0]?.value,
          });
          isNew = true;
        } else if (!user.githubId) {
          user.githubId = profile.id;
          await user.save();
        }
        if (isNew) await sendEmail(user.email, 'welcome', [user.name]);
        return done(null, user);
      } catch (error) {
        logger.error(`GitHub OAuth error: ${error.message}`);
        return done(error, null);
      }
    }));
    logger.info('GitHub OAuth configured');
  } else {
    logger.warn('GitHub OAuth not configured — GITHUB_CLIENT_ID missing');
  }

  passport.serializeUser((user, done) => done(null, user._id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id).select('-password');
      done(null, user);
    } catch (error) { done(error, null); }
  });

  return passport;
};

export default passport;