import { groqChat } from '../utils/groqClient.js';
import logger from '../utils/logger.js';

const resumeAgent = async (resumeData) => {
  const { sections } = resumeData;
  logger.info('Resume agent started');

  const result = await groqChat('llama-3.1-8b-instant', [
    {
      role: 'system',
      content: `You are an expert resume coach and ATS optimization specialist. Return ONLY valid JSON, no markdown.`,
    },
    {
      role: 'user',
      content: `Analyze and enhance this resume:
${JSON.stringify(sections)}

Return JSON:
{
  "summary": "Enhanced professional summary (2-3 impactful sentences)",
  "bullets": [
    {
      "original": "Original bullet point",
      "enhanced": "Enhanced STAR-method bullet with metrics"
    }
  ],
  "missing": ["Missing section 1", "Missing section 2"],
  "keywords": ["ATS keyword 1", "ATS keyword 2", "ATS keyword 3"],
  "overallScore": 75,
  "improvements": ["Key improvement 1", "Key improvement 2"]
}`,
    },
  ]);

  let enhanced;
  try {
    enhanced = JSON.parse(result.replace(/```json|```/g, '').trim());
  } catch {
    enhanced = { summary: result, bullets: [], missing: [], keywords: [], overallScore: 70, improvements: [] };
  }

  logger.info('Resume agent completed');
  return enhanced;
};

export default resumeAgent;