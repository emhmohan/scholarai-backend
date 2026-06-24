import { groqChat } from '../utils/groqClient.js';
import logger from '../utils/logger.js';

const sopAgent = async (data) => {
  const { program, university, wordCount = 1000, goals, achievements, userProfile } = data;
  logger.info('SOP agent started');

  // STEP 1 — Outline Creation
  logger.info('Step 1: Creating outline...');
  const step1 = await groqChat('llama-3.1-8b-instant', [
    {
      role: 'system',
      content: `You are an expert academic writing coach specializing in statements of purpose. Return ONLY valid JSON, no markdown.`,
    },
    {
      role: 'user',
      content: `Create a detailed SOP outline for:
Program: ${program}
University: ${university}
Word Count: ${wordCount}
Goals: ${goals}
Achievements: ${achievements}
Profile: ${JSON.stringify(userProfile || {})}

Return JSON:
{
  "sections": [
    {
      "name": "Opening Hook",
      "wordAllocation": 100,
      "keyPoints": ["Point 1", "Point 2"],
      "narrative": "What to write here"
    }
  ],
  "centralTheme": "The main narrative thread",
  "tone": "Professional yet personal"
}`,
    },
  ]);

  let outline;
  try {
    outline = JSON.parse(step1.replace(/```json|```/g, '').trim());
  } catch {
    outline = { sections: [], centralTheme: '', tone: 'Professional' };
  }

  // STEP 2 — Full Draft
  logger.info('Step 2: Writing full draft...');
  const step2 = await groqChat('llama-3.3-70b-versatile', [
    {
      role: 'system',
      content: `You are an elite SOP writer. Write compelling, authentic statements of purpose.
Rules:
- Use STAR method (Situation, Task, Action, Result) for experiences
- NO clichés: "ever since I was a child", "passion for", "dream of"
- Strong opening hook — do NOT start with "I"
- Specific details, numbers, and outcomes
- Connect past experience to future goals
- Show why THIS program at THIS university specifically
- Write exactly the requested word count`,
    },
    {
      role: 'user',
      content: `Write a complete ${wordCount}-word SOP for:
Program: ${program}
University: ${university}
Goals: ${goals || 'Not specified'}
Achievements: ${achievements || 'Not specified'}
Profile: ${JSON.stringify(userProfile || {})}
Outline: ${JSON.stringify(outline)}

Write the full SOP now. Make it specific, compelling, and authentic. Target exactly ${wordCount} words.`,
    },
  ]);

  const draft = step2;

  // STEP 3 — Polish
  logger.info('Step 3: Polishing...');
  const step3 = await groqChat('llama-3.3-70b-versatile', [
    {
      role: 'system',
      content: `You are an expert SOP editor. Polish and perfect statements of purpose.
Rules:
- Remove ALL generic phrases and clichés
- Strengthen the opening sentence — must grab attention immediately
- Ensure smooth transitions between paragraphs
- Make the closing paragraph memorable and forward-looking
- Verify word count matches target
- Keep the authentic voice intact`,
    },
    {
      role: 'user',
      content: `Polish this SOP draft to perfection. Target: ${wordCount} words.

DRAFT:
${draft}

Return ONLY the polished SOP text, nothing else.`,
    },
  ]);

  const polished = step3;
  const wordCountActual = polished.split(/\s+/).filter(Boolean).length;

  logger.info('SOP agent completed');
  return { outline, draft, polished, wordCount: wordCountActual };
};

export default sopAgent;
