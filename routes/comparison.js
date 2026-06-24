import express from 'express';
import { protect } from '../middleware/auth.js';
import User from '../models/User.js';
import Scholarship from '../models/Scholarship.js';
import { Checklist } from '../models/Documents.js';
import logger from '../utils/logger.js';

const router = express.Router();

// GET /api/comparison/stats — anonymous peer stats
router.get('/stats', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    // Get all users for benchmarking
    const allUsers        = await User.find({}, 'profile createdAt');
    const allScholarships = await Scholarship.find({});
    const allChecklists   = await Checklist.find({});

    const totalUsers = allUsers.length;

    // GPA comparison
    const gpas = allUsers
      .map((u) => parseFloat(u.profile?.GPA))
      .filter((g) => !isNaN(g) && g > 0);
    const avgGPA    = gpas.length ? (gpas.reduce((a, b) => a + b, 0) / gpas.length).toFixed(2) : 0;
    const userGPA   = parseFloat(user.profile?.GPA) || 0;
    const gpaRank   = gpas.length ? Math.round((gpas.filter((g) => g < userGPA).length / gpas.length) * 100) : 0;

    // Scholarship counts per user
    const schCounts = await Scholarship.aggregate([
      { $group: { _id: '$userId', count: { $sum: 1 } } },
    ]);
    const avgScholarships = schCounts.length
      ? Math.round(schCounts.reduce((a, b) => a + b.count, 0) / schCounts.length)
      : 0;
    const userSchCount = schCounts.find((s) => s._id?.toString() === req.user._id.toString())?.count || 0;
    const schRank = schCounts.length
      ? Math.round((schCounts.filter((s) => s.count < userSchCount).length / schCounts.length) * 100)
      : 0;

    // Match score comparison
    const userScholarships = allScholarships.filter((s) => s.userId?.toString() === req.user._id.toString());
    const allMatchScores   = allScholarships.map((s) => s.matchScore || 0).filter((s) => s > 0);
    const avgMatchScore    = allMatchScores.length
      ? Math.round(allMatchScores.reduce((a, b) => a + b, 0) / allMatchScores.length)
      : 0;
    const userAvgMatch = userScholarships.length
      ? Math.round(userScholarships.reduce((a, b) => a + (b.matchScore || 0), 0) / userScholarships.length)
      : 0;
    const matchRank = allMatchScores.length
      ? Math.round((allMatchScores.filter((s) => s < userAvgMatch).length / allMatchScores.length) * 100)
      : 0;

    // Task completion comparison
    const completions     = allChecklists.map((c) => c.completionPercent || 0);
    const avgCompletion   = completions.length
      ? Math.round(completions.reduce((a, b) => a + b, 0) / completions.length)
      : 0;
    const userChecklist   = allChecklists.find((c) => c.userId?.toString() === req.user._id.toString());
    const userCompletion  = userChecklist?.completionPercent || 0;
    const completionRank  = completions.length
      ? Math.round((completions.filter((c) => c < userCompletion).length / completions.length) * 100)
      : 0;

    // Status breakdown across all users
    const statusCounts = ['saved','applying','applied','accepted','rejected'].map((status) => ({
      status,
      count: allScholarships.filter((s) => s.status === status).length,
      yours: userScholarships.filter((s) => s.status === status).length,
    }));

    // Scholarship categories popular among users
    const categoryCounts = allScholarships.reduce((acc, s) => {
      const cat = s.category || 'other';
      acc[cat]  = (acc[cat] || 0) + 1;
      return acc;
    }, {});

    logger.info(`Peer comparison fetched for: ${req.user.email}`);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        gpa: {
          yours:   userGPA,
          average: parseFloat(avgGPA),
          rank:    gpaRank,
          label:   `Better than ${gpaRank}% of users`,
        },
        scholarships: {
          yours:   userSchCount,
          average: avgScholarships,
          rank:    schRank,
          label:   `More than ${schRank}% of users`,
        },
        matchScore: {
          yours:   userAvgMatch,
          average: avgMatchScore,
          rank:    matchRank,
          label:   `Higher than ${matchRank}% of users`,
        },
        taskCompletion: {
          yours:   userCompletion,
          average: avgCompletion,
          rank:    completionRank,
          label:   `Ahead of ${completionRank}% of users`,
        },
        statusCounts,
        categoryCounts,
      },
    });
  } catch (error) { next(error); }
});

export default router;