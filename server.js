// ── Step 1: DNS fix — must be absolute first ──
import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

// ── Step 2: Load env vars before ANYTHING else ──
import dotenv from 'dotenv';
dotenv.config();

// ── Step 3: All other imports ──
import express    from 'express';
import cors       from 'cors';
import helmet     from 'helmet';
import session    from 'express-session';
import { rateLimit } from 'express-rate-limit';
import connectDB  from './utils/database.js';
import logger     from './utils/logger.js';
import errorHandler from './middleware/errorHandler.js';
import passport   from './utils/passport.js';
import { initPassport } from './utils/passport.js';

// ── Step 4: Route imports ──
import authRoutes         from './routes/auth.js';
import profileRoutes      from './routes/profile.js';
import scholarshipRoutes  from './routes/scholarships.js';
import sopRoutes          from './routes/sop.js';
import lorRoutes          from './routes/lor.js';
import resumeRoutes       from './routes/resume.js';
import checklistRoutes    from './routes/checklist.js';
import agentRoutes        from './routes/agent.js';
import collegeRoutes      from './routes/colleges.js';
import interviewRoutes    from './routes/interview.js';
import essayRoutes        from './routes/essays.js';
import notificationRoutes from './routes/notifications.js';
import shareRoutes        from './routes/share.js';
import recommenderRoutes  from './routes/recommender.js';
import comparisonRoutes   from './routes/comparison.js';

// ── Step 5: Init passport AFTER dotenv ──
initPassport();

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5174',
  ],
  credentials: true,
}));

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret:            process.env.SESSION_SECRET || 'scholarai_session_secret',
  resave:            false,
  saveUninitialized: false,
  cookie:            { secure: false, maxAge: 24 * 60 * 60 * 1000 },
}));

app.use(passport.initialize());
app.use(passport.session());

// ── Connect DB ──
connectDB();

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ── Routes ──
app.use('/api/auth',          authRoutes);
app.use('/api/profile',       profileRoutes);
app.use('/api/scholarships',  scholarshipRoutes);
app.use('/api/sop',           sopRoutes);
app.use('/api/lor',           lorRoutes);
app.use('/api/resume',        resumeRoutes);
app.use('/api/checklist',     checklistRoutes);
app.use('/api/agent',         agentRoutes);
app.use('/api/colleges',      collegeRoutes);
app.use('/api/interview',     interviewRoutes);
app.use('/api/essays',        essayRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/share',         shareRoutes);
app.use('/api/recommender',   recommenderRoutes);
app.use('/api/comparison',    comparisonRoutes);

// ── Error handler (must be last) ──
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

export default app;