import express from 'express';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// GET /api/profile
router.get('/', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
});

// PUT /api/profile
router.put('/', protect, async (req, res, next) => {
  try {
    const {
      name, GPA, degree, fieldOfStudy, university, state,
      experience, targetCountries, researchInterests, bio, testScores,
    } = req.body;

    const updateFields = {};
    if (name) updateFields.name = name;

    const profileUpdate = {};
    if (GPA !== undefined)        profileUpdate['profile.GPA']               = GPA;
    if (degree)                   profileUpdate['profile.degree']             = degree;
    if (fieldOfStudy)             profileUpdate['profile.fieldOfStudy']       = fieldOfStudy;
    if (university)               profileUpdate['profile.university']         = university;
    if (req.body.country) profileUpdate['profile.country'] = req.body.country;
    if (state)                    profileUpdate['profile.state']              = state;
    if (experience !== undefined) profileUpdate['profile.experience']         = experience;
    if (targetCountries)          profileUpdate['profile.targetCountries']    = targetCountries;
    if (req.body.targetStatesByCountry) profileUpdate['profile.targetStatesByCountry'] = req.body.targetStatesByCountry;
    if (researchInterests)        profileUpdate['profile.researchInterests']  = researchInterests;
    if (bio)                      profileUpdate['profile.bio']                = bio;
    if (testScores) {
      if (testScores.GRE   !== undefined) profileUpdate['profile.testScores.GRE']   = testScores.GRE;
      if (testScores.GMAT  !== undefined) profileUpdate['profile.testScores.GMAT']  = testScores.GMAT;
      if (testScores.TOEFL !== undefined) profileUpdate['profile.testScores.TOEFL'] = testScores.TOEFL;
      if (testScores.IELTS !== undefined) profileUpdate['profile.testScores.IELTS'] = testScores.IELTS;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { ...updateFields, ...profileUpdate } },
      { returnDocument: 'after', runValidators: true }
    ).select('-password');

    logger.info(`Profile updated for: ${req.user.email}`);
    res.status(200).json({ success: true, data: { user: updatedUser } });
  } catch (error) {
    next(error);
  }
});

export default router;
