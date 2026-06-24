import express from 'express';
import { protect } from '../middleware/auth.js';
import { Checklist } from '../models/Documents.js';
import User from '../models/User.js';
import checklistAgent from '../agents/checklistAgent.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.post('/generate', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const result = await checklistAgent(user.profile || {});
    let checklist = await Checklist.findOne({ userId: req.user._id });
    if (checklist) {
      checklist.tasks = result.tasks.map((t) => ({ ...t, completed: false }));
      await checklist.save();
    } else {
      checklist = await Checklist.create({ userId: req.user._id, tasks: result.tasks });
    }
    logger.info(`Checklist generated for: ${req.user.email}`);
    res.status(201).json({ success: true, data: checklist });
  } catch (error) { next(error); }
});

router.get('/', protect, async (req, res, next) => {
  try {
    const checklist = await Checklist.findOne({ userId: req.user._id });
    if (!checklist) return res.status(200).json({ success: true, data: { tasks: [] } });
    res.status(200).json({ success: true, data: checklist });
  } catch (error) { next(error); }
});

router.patch('/:id/toggle', protect, async (req, res, next) => {
  try {
    const checklist = await Checklist.findOne({ userId: req.user._id });
    if (!checklist) return res.status(404).json({ success: false, message: 'Checklist not found' });
    const task = checklist.tasks.id(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    task.completed = !task.completed;
    const total = checklist.tasks.length;
    const completed = checklist.tasks.filter((t) => t.completed).length;
    checklist.completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
    await checklist.save();
    res.status(200).json({ success: true, data: { task, completionPercent: checklist.completionPercent } });
  } catch (error) { next(error); }
});

router.post('/suggest', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const result = await checklistAgent(user.profile || {});
    const newTasks = result.tasks.slice(0, 5);
    const checklist = await Checklist.findOne({ userId: req.user._id });
    if (checklist) {
      checklist.tasks.push(...newTasks);
      await checklist.save();
    }
    res.status(200).json({ success: true, data: { tasks: newTasks } });
  } catch (error) { next(error); }
});

export default router;
