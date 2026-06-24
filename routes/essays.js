import express from 'express';
import { protect } from '../middleware/auth.js';
import { groqChat } from '../utils/groqClient.js';
import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const router = express.Router();

const essaySchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:       { type: String, required: true },
  content:     { type: String, required: true },
  category:    { type: String, enum: ['motivation', 'research', 'leadership', 'personal', 'academic', 'career', 'other'], default: 'other' },
  tags:        [{ type: String }],
  wordCount:   { type: Number, default: 0 },
  usedFor:     [{ type: String }],
  aiSuggestions: [{ type: String }],
}, { timestamps: true });

const Essay = mongoose.models.Essay || mongoose.model('Essay', essaySchema);

// POST /api/essays — create
router.post('/', protect, async (req, res, next) => {
  try {
    const { title, content, category, tags, usedFor } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const essay = await Essay.create({
      userId: req.user._id,
      title, content, category,
      tags:     tags     || [],
      usedFor:  usedFor  || [],
      wordCount,
    });
    logger.info(`Essay saved for: ${req.user.email}`);
    res.status(201).json({ success: true, data: { essay } });
  } catch (error) { next(error); }
});

// GET /api/essays — list all
router.get('/', protect, async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const filter = { userId: req.user._id };
    if (category) filter.category = category;
    if (search) filter.$or = [
      { title:   { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
      { tags:    { $in: [new RegExp(search, 'i')] } },
    ];
    const essays = await Essay.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: { essays } });
  } catch (error) { next(error); }
});

// GET /api/essays/:id — single
router.get('/:id', protect, async (req, res, next) => {
  try {
    const essay = await Essay.findOne({ _id: req.params.id, userId: req.user._id });
    if (!essay) return res.status(404).json({ success: false, message: 'Essay not found' });
    res.status(200).json({ success: true, data: { essay } });
  } catch (error) { next(error); }
});

// PUT /api/essays/:id — update
router.put('/:id', protect, async (req, res, next) => {
  try {
    const { title, content, category, tags, usedFor } = req.body;
    const update = {};
    if (title)    update.title    = title;
    if (content)  { update.content = content; update.wordCount = content.split(/\s+/).filter(Boolean).length; }
    if (category) update.category = category;
    if (tags)     update.tags     = tags;
    if (usedFor)  update.usedFor  = usedFor;

    const essay = await Essay.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: update },
      { returnDocument: 'after' }
    );
    if (!essay) return res.status(404).json({ success: false, message: 'Essay not found' });
    res.status(200).json({ success: true, data: { essay } });
  } catch (error) { next(error); }
});

// DELETE /api/essays/:id
router.delete('/:id', protect, async (req, res, next) => {
  try {
    await Essay.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.status(200).json({ success: true, data: { message: 'Essay deleted' } });
  } catch (error) { next(error); }
});

// POST /api/essays/:id/suggest — AI suggests scholarships this essay fits
router.post('/:id/suggest', protect, async (req, res, next) => {
  try {
    const essay = await Essay.findOne({ _id: req.params.id, userId: req.user._id });
    if (!essay) return res.status(404).json({ success: false, message: 'Essay not found' });

    const result = await groqChat('llama-3.1-8b-instant', [
      {
        role: 'system',
        content: 'You are a scholarship application expert. Return ONLY valid JSON, no markdown.',
      },
      {
        role: 'user',
        content: `Analyze this essay and suggest which scholarships/applications it best fits:

Essay Title: ${essay.title}
Category: ${essay.category}
Content: ${essay.content.substring(0, 1000)}...

Return JSON:
{
  "bestFits": ["Scholarship 1", "Scholarship 2", "Scholarship 3"],
  "themes": ["Theme 1", "Theme 2"],
  "strengths": ["Strength 1", "Strength 2"],
  "improvements": ["Improvement 1", "Improvement 2"],
  "adaptationTips": ["How to adapt this essay for different scholarships"]
}`,
      },
    ]);

    let suggestions;
    try {
      suggestions = JSON.parse(result.replace(/```json|```/g, '').trim());
    } catch {
      suggestions = { bestFits: [], themes: [], strengths: [], improvements: [] };
    }

    essay.aiSuggestions = suggestions.bestFits || [];
    await essay.save();

    res.status(200).json({ success: true, data: suggestions });
  } catch (error) { next(error); }
});

// POST /api/essays/:id/adapt — AI adapts essay for a specific scholarship
router.post('/:id/adapt', protect, async (req, res, next) => {
  try {
    const { targetScholarship } = req.body;
    const essay = await Essay.findOne({ _id: req.params.id, userId: req.user._id });
    if (!essay) return res.status(404).json({ success: false, message: 'Essay not found' });

    const adapted = await groqChat('llama-3.3-70b-versatile', [
      {
        role: 'system',
        content: 'You are an expert scholarship essay writer. Adapt essays for specific scholarships while maintaining authenticity.',
      },
      {
        role: 'user',
        content: `Adapt this essay for the ${targetScholarship} scholarship:

Original Essay:
${essay.content}

Make it specifically tailored for ${targetScholarship} requirements.
Keep the core story but adjust the focus, tone, and specific references.
Return ONLY the adapted essay text, nothing else.`,
      },
    ]);

    res.status(200).json({ success: true, data: { adapted, original: essay.content } });
  } catch (error) { next(error); }
});

export default router;