/**
 * OpenAI API Service
 * Handles all communication with the OpenAI Chat Completions API
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini'; // Fast, affordable, and capable

/**
 * Build the system prompt for the AI assistant, with optional project context
 * @param {Object|null} project - Current project context
 * @returns {string} System prompt
 */
export function buildSystemPrompt(project = null) {
  let prompt = `You are an AI Project Management Assistant for ProjectHub, a platform for academic, corporate, and EU-funded projects.

You help users with:
- Breaking down projects into clear, actionable tasks
- Analyzing project risks and suggesting mitigations
- Recommending realistic timelines and milestones
- Writing professional project descriptions
- Answering project management best-practice questions
- EU funding compliance and reporting guidance

Response style:
- Be concise and actionable
- Use markdown formatting (bold, bullet points) for clarity
- Keep responses under 400 words unless detail is specifically requested
- Always end with a helpful follow-up offer`;

  if (project) {
    prompt += `

Current Project Context:
- Title: ${project.title}
- Type: ${(project.project_type || '').replace(/_/g, ' ')}
- Status: ${project.status || 'unknown'}
- Progress: ${project.progress_percentage || 0}%
- Description: ${project.description || 'No description provided'}
- Timeline: ${project.start_date || 'TBD'} → ${project.end_date || 'TBD'}
${project.budget ? `- Budget: ${project.budget}` : ''}

Use this context to give tailored, specific advice.`;
  }

  return prompt;
}

/**
 * Send a message to OpenAI and return the response
 * @param {string} userMessage - The user's message
 * @param {Array} conversationHistory - Array of {role, content} objects
 * @param {Object|null} project - Current project context
 * @returns {Promise<string>} AI response text
 */
export async function sendMessageToOpenAI(userMessage, conversationHistory = [], project = null) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    throw new Error('OpenAI API key is not configured');
  }

  const messages = [
    { role: 'system', content: buildSystemPrompt(project) },
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ];

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: 1000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData?.error?.message || `API request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Check if the OpenAI API key is configured and valid-looking
 * @returns {boolean}
 */
export function isOpenAIConfigured() {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  return !!(apiKey && apiKey !== 'your_openai_api_key_here' && apiKey.startsWith('sk-'));
}
