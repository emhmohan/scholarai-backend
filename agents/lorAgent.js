import { groqChat } from '../utils/groqClient.js';
import logger from '../utils/logger.js';

const lorAgent = async (data) => {
  const { recommenderName, recommenderTitle, relationship, achievements, targetProgram, userProfile } = data;
  logger.info('LOR agent started');

  // STEP 1 — Theme Analysis
  logger.info('Step 1: Analyzing themes...');
  const step1 = await groqChat('llama-3.3-70b-versatile', [
    {
      role: 'system',
      content: `You are an expert at crafting letters of recommendation. Return ONLY valid JSON, no markdown.`,
    },
    {
      role: 'user',
      content: `Analyze the relationship and identify key themes for a LOR:
Recommender: ${recommenderName} (${recommenderTitle})
Relationship: ${relationship}
Achievements: ${achievements}
Target Program: ${targetProgram}
Student Profile: ${JSON.stringify(userProfile || {})}

Return JSON:
{
  "keyThemes": ["Theme 1", "Theme 2", "Theme 3"],
  "strongestQualities": ["Quality 1", "Quality 2"],
  "suggestedAnecdotes": ["Anecdote idea 1", "Anecdote idea 2"],
  "recommendationStrength": "Strong/Very Strong/Exceptional",
  "narrativeAngle": "How to frame the letter"
}`,
    },
  ]);

  let themes;
  try {
    themes = JSON.parse(step1.replace(/```json|```/g, '').trim());
  } catch {
    themes = { keyThemes: [], strongestQualities: [], suggestedAnecdotes: [], recommendationStrength: 'Strong' };
  }

  // STEP 2 — Draft
  logger.info('Step 2: Drafting LOR...');
  const step2 = await groqChat('llama-3.3-70b-versatile', [
    {
      role: 'system',
      content: `You are writing a letter of recommendation FROM the recommender's perspective.
Rules:
- Write in first person as ${recommenderName}
- Include specific anecdotes and examples
- Professional academic tone
- 400-500 words
- Structure: Introduction → Academic/Professional qualities → Specific example → Character → Strong closing recommendation
- Do NOT use template phrases like "It is my pleasure" or "I highly recommend without reservation"`,
    },
    {
      role: 'user',
      content: `Write a complete LOR from ${recommenderName}'s perspective:
Recommender: ${recommenderName}, ${recommenderTitle}
Student relationship: ${relationship}
Key achievements: ${achievements}
Target program: ${targetProgram}
Themes to highlight: ${JSON.stringify(themes)}

Write the full letter now.`,
    },
  ]);

  const draft = step2;

  // STEP 3 — Polish
  logger.info('Step 3: Polishing LOR...');
  const step3 = await groqChat('llama-3.3-70b-versatile', [
    {
      role: 'system',
      content: `You are an expert editor for letters of recommendation.
Rules:
- Remove all template/generic phrases
- Ensure the recommender's voice sounds authentic and senior
- Strengthen specific examples with concrete outcomes
- Make the closing paragraph a strong, unambiguous endorsement
- Return ONLY the polished letter text`,
    },
    {
      role: 'user',
      content: `Polish this LOR to make it exceptional:

${draft}

Return ONLY the polished letter.`,
    },
  ]);

  logger.info('LOR agent completed');
  return { themes, draft, polished: step3 };
};

export default lorAgent;
