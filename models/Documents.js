import mongoose from 'mongoose';

// ─── SOP Schema ───────────────────────────────────────────────────────────────
const sopSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title:      { type: String, trim: true },
  program:    { type: String, trim: true },
  university: { type: String, trim: true },
  wordCount:  { type: Number, default: 1000 },
  outline:    { type: String },
  draft:      { type: String },
  content:    { type: String },
  scores: {
    overall:     Number,
    clarity:     Number,
    specificity: Number,
    impact:      Number,
    feedback:    String,
  },
  versions: [{
    content:   { type: String },
    label:     { type: String, default: 'Version' },
    createdAt: { type: Date,   default: Date.now   },
  }],
}, { timestamps: true });

// ─── LOR Schema ───────────────────────────────────────────────────────────────
const lorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recommenderName:  { type: String, trim: true },
  recommenderTitle: { type: String, trim: true },
  recommenderEmail: { type: String, trim: true },
  relationship:     { type: String },
  themes:           { type: String },
  draft:            { type: String },
  content:          { type: String },
  professorEmail:   { type: String },
}, { timestamps: true });

// ─── Resume Schema ────────────────────────────────────────────────────────────
const resumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: { type: String, trim: true },
  sections: {
    summary:      String,
    experience:   String,
    education:    String,
    skills:       String,
    projects:     String,
    publications: String,
    awards:       String,
  },
  enhancedContent: { type: mongoose.Schema.Types.Mixed, default: {} },
  keywords:        [{ type: String }],
}, { timestamps: true });

// ─── Checklist Task Sub-Schema ────────────────────────────────────────────────
const taskSchema = new mongoose.Schema({
  title: {
    type:     String,
    required: true,
  },
  category: {
    type:    String,
    enum:    ['documents','tests','applications','financial','interviews','other'],
    default: 'other',
  },
  priority: {
    type:    String,
    enum:    ['critical','high','medium','low'],
    default: 'medium',
  },
  completed: { type: Boolean, default: false },
  dueDate:   { type: Date },
}, { timestamps: true });

// ─── Checklist Schema ─────────────────────────────────────────────────────────
const checklistSchema = new mongoose.Schema({
  userId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
    unique:   true,
  },
  tasks:             [taskSchema],
  completionPercent: { type: Number, default: 0 },
}, { timestamps: true });

// ─── Models ───────────────────────────────────────────────────────────────────
export const SOP       = mongoose.model('SOP',       sopSchema);
export const LOR       = mongoose.model('LOR',       lorSchema);
export const Resume    = mongoose.model('Resume',    resumeSchema);
export const Checklist = mongoose.model('Checklist', checklistSchema);