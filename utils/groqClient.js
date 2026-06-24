import Groq from 'groq-sdk';
import logger from './logger.js';

// Lazy initialization — runs when first called, not at import time
const getGroq = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

const groqChat = async (model, messages, retries = 3) => {
  const groq = getGroq();
  for (let i = 0; i < retries; i++) {
    try {
      const response = await groq.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 4096,
      });
      return response.choices[0].message.content;
    } catch (error) {
      logger.error(`Groq API error (attempt ${i + 1}): ${error.message}`);
      if (i === retries - 1) throw error;
      await new Promise((res) => setTimeout(res, 1000 * (i + 1)));
    }
  }
};

export { getGroq as groq, groqChat };