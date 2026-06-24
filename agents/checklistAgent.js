import { groqChat } from '../utils/groqClient.js';
import logger from '../utils/logger.js';

const checklistAgent = async (userProfile) => {
  logger.info('Checklist agent started');

  const result = await groqChat('llama-3.1-8b-instant', [
    {
      role: 'system',
      content: `You are an expert scholarship application coach. Return ONLY valid JSON arrays, no markdown, no explanation.`,
    },
    {
      role: 'user',
      content: `Generate a personalized application checklist for this student:
Profile: ${JSON.stringify(userProfile)}

Return a JSON array of 25 tasks:
[
  {
    "title": "Request official transcripts from university",
    "category": "documents",
    "priority": "critical",
    "dueDate": null
  }
]

Categories: documents, tests, applications, financial, interviews, other
Priorities: critical, high, medium, low

Make tasks specific to the student's profile, target countries, and degree level.
Include tasks for: transcripts, test scores, SOP, LOR requests, application fees, visa, financial documents, interviews prep, deadlines tracking.`,
    },
  ]);

  let tasks;
  try {
    const cleaned = result.replace(/```json|```/g, '').trim();
    const match = cleaned.match(/\[[\s\S]*\]/);
    tasks = JSON.parse(match ? match[0] : cleaned);
  } catch {
    tasks = [
      { title: 'Complete your academic profile', category: 'documents', priority: 'critical', dueDate: null },
      { title: 'Request official transcripts', category: 'documents', priority: 'critical', dueDate: null },
      { title: 'Request letters of recommendation', category: 'documents', priority: 'critical', dueDate: null },
      { title: 'Write Statement of Purpose', category: 'documents', priority: 'high', dueDate: null },
      { title: 'Prepare for GRE/TOEFL/IELTS', category: 'tests', priority: 'high', dueDate: null },
      { title: 'Research target scholarships', category: 'applications', priority: 'high', dueDate: null },
      { title: 'Set up scholarship application accounts', category: 'applications', priority: 'medium', dueDate: null },
      { title: 'Prepare financial documents', category: 'financial', priority: 'medium', dueDate: null },
    ];
  }

  logger.info('Checklist agent completed');
  return { tasks };
};

export default checklistAgent;