import { groqChat } from '../utils/groqClient.js';
import logger from '../utils/logger.js';

const interviewAgent = async (scholarshipName, userProfile) => {
  logger.info('Interview agent started');

  const result = await groqChat('llama-3.1-8b-instant', [
    {
      role: 'system',
      content: `You are an expert scholarship interview coach. Return ONLY valid JSON, no markdown.`,
    },
    {
      role: 'user',
      content: `Generate interview preparation material for:
Scholarship: ${scholarshipName}
Student Profile: ${JSON.stringify(userProfile)}

Return JSON:
{
  "overview": "What to expect in this interview",
  "commonQuestions": [
    {
      "category": "Motivation",
      "question": "Why do you want this scholarship?",
      "tips": "Focus on specific goals and how this scholarship aligns",
      "sampleAnswer": "Brief sample answer structure"
    }
  ],
  "dosList": ["Do tip 1", "Do tip 2", "Do tip 3"],
  "dontsList": ["Don't tip 1", "Don't tip 2"],
  "dresscode": "Professional business attire recommended",
  "preparationTimeline": "2-3 weeks before interview"
}

Include 10 questions across these categories:
- Motivation (why this scholarship)
- Academic background
- Career goals
- Leadership experience
- Research interests
- Challenges overcome
- Community impact
- Why this country/university
- Future plans
- Personal strengths`,
    },
  ]);

  let parsed;
  try {
    parsed = JSON.parse(result.replace(/```json|```/g, '').trim());
  } catch {
    parsed = { commonQuestions: [], dosList: [], dontsList: [], overview: result };
  }

  logger.info('Interview agent completed');
  return parsed;
};

export default interviewAgent;