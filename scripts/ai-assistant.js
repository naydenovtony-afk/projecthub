/**
 * AI Project Assistant - Powered by Anthropic Claude
 * Helps users with project planning, task breakdown, risk analysis, and more
 */

import Anthropic from '@anthropic-ai/sdk';
import { showError, showSuccess } from '../utils/ui.js';

// Initialize Anthropic client
// NOTE: In production, API key should be on backend
const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || 'demo-key',
  dangerouslyAllowBrowser: true // Only for demo - move to backend in production
});

let conversationHistory = [];

// AI Assistant state
let isAssistantOpen = false;
let currentProject = null;

/**
 * Initialize AI Assistant
 * @param {Object} project - Current project context (optional)
 */
export function initAIAssistant(project = null) {
  currentProject = project;
  createAssistantUI();
  setupEventListeners();
}

/**
 * Create Assistant UI
 */
function createAssistantUI() {
  // Check if already exists
  if (document.getElementById('ai-assistant-widget')) return;
  
  const widget = document.createElement('div');
  widget.id = 'ai-assistant-widget';
  widget.innerHTML = `
    <!-- Floating Button -->
    <button class="ai-assistant-fab" id="aiAssistantToggle" title="AI Assistant">
      <i class="bi bi-robot"></i>
      <span class="ai-pulse"></span>
    </button>
    
    <!-- Chat Panel -->
    <div class="ai-assistant-panel" id="aiAssistantPanel">
      <div class="ai-assistant-header">
        <div class="d-flex align-items-center">
          <div class="ai-avatar">
            <i class="bi bi-robot"></i>
          </div>
          <div class="ms-2">
            <h6 class="mb-0">AI Assistant</h6>
            <small class="text-muted">Powered by Claude</small>
          </div>
        </div>
        <button class="btn btn-sm btn-icon" id="aiAssistantClose">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
      
      <div class="ai-assistant-body" id="aiAssistantMessages">
        <div class="ai-message ai-message-assistant">
          <div class="ai-message-avatar">
            <i class="bi bi-robot"></i>
          </div>
          <div class="ai-message-content">
            <p class="mb-0">Hello! I'm your AI Project Assistant. I can help you with:</p>
            <ul class="mb-0 mt-2">
              <li>Breaking down projects into tasks</li>
              <li>Suggesting project timelines</li>
              <li>Analyzing project risks</li>
              <li>Writing descriptions and documentation</li>
              <li>Answering questions about project management</li>
            </ul>
            <p class="mb-0 mt-2">How can I help you today?</p>
          </div>
        </div>
      </div>
      
      <div class="ai-assistant-footer">
        <div class="ai-quick-actions mb-2" id="aiQuickActions">
          <button class="btn btn-sm btn-outline-primary ai-quick-btn" data-prompt="suggest-tasks">
            <i class="bi bi-list-check me-1"></i>Suggest Tasks
          </button>
          <button class="btn btn-sm btn-outline-primary ai-quick-btn" data-prompt="analyze-risks">
            <i class="bi bi-shield-exclamation me-1"></i>Analyze Risks
          </button>
          <button class="btn btn-sm btn-outline-primary ai-quick-btn" data-prompt="improve-description">
            <i class="bi bi-pencil me-1"></i>Improve Description
          </button>
        </div>
        <form id="aiAssistantForm" class="ai-input-form">
          <input 
            type="text" 
            class="form-control" 
            id="aiAssistantInput" 
            placeholder="Ask me anything..."
            autocomplete="off"
          >
          <button type="submit" class="btn btn-primary ai-send-btn">
            <i class="bi bi-send-fill"></i>
          </button>
        </form>
      </div>
    </div>
  `;
  
  document.body.appendChild(widget);
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
  // Toggle button
  const toggleBtn = document.getElementById('aiAssistantToggle');
  toggleBtn.addEventListener('click', toggleAssistant);
  
  // Close button
  const closeBtn = document.getElementById('aiAssistantClose');
  closeBtn.addEventListener('click', toggleAssistant);
  
  // Form submit
  const form = document.getElementById('aiAssistantForm');
  form.addEventListener('submit', handleUserMessage);
  
  // Quick action buttons
  document.querySelectorAll('.ai-quick-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const prompt = e.currentTarget.dataset.prompt;
      handleQuickAction(prompt);
    });
  });
}

/**
 * Toggle Assistant Panel
 */
export function toggleAssistant() {
  isAssistantOpen = !isAssistantOpen;
  const panel = document.getElementById('aiAssistantPanel');
  const fab = document.getElementById('aiAssistantToggle');
  
  if (isAssistantOpen) {
    panel.classList.add('open');
    fab.style.display = 'none';
  } else {
    panel.classList.remove('open');
    fab.style.display = 'flex';
  }
}

/**
 * Handle User Message
 */
async function handleUserMessage(e) {
  e.preventDefault();
  
  const input = document.getElementById('aiAssistantInput');
  const message = input.value.trim();
  
  if (!message) return;
  
  // Clear input
  input.value = '';
  
  // Add user message to chat
  addMessage(message, 'user');
  
  // Get AI response
  await getAIResponse(message);
}

/**
 * Handle Quick Actions
 */
async function handleQuickAction(action) {
  let prompt = '';
  
  if (!currentProject) {
    showError('Please open a project first to use quick actions');
    return;
  }
  
  switch(action) {
    case 'suggest-tasks':
      prompt = `Based on this project, suggest 5-7 specific tasks with descriptions:

Project: ${currentProject.title}
Type: ${currentProject.project_type}
Description: ${currentProject.description}
Timeline: ${currentProject.start_date} to ${currentProject.end_date}

Please provide actionable tasks with clear deliverables.`;
      break;
      
    case 'analyze-risks':
      prompt = `Analyze potential risks for this project:

Project: ${currentProject.title}
Type: ${currentProject.project_type}
Description: ${currentProject.description}
Budget: ${currentProject.budget || 'Not specified'}
Timeline: ${currentProject.start_date} to ${currentProject.end_date}

Identify 3-5 key risks and suggest mitigation strategies.`;
      break;
      
    case 'improve-description':
      prompt = `Improve this project description to be more professional and clear:

Current Description: ${currentProject.description}

Please rewrite it to be:
- More detailed and specific
- Professional tone
- Clear objectives
- Measurable outcomes`;
      break;
  }
  
  // Add user message
  addMessage(`Quick action: ${action}`, 'user');
  
  // Get AI response
  await getAIResponse(prompt);
}

/**
 * Get AI Response from Claude
 */
async function getAIResponse(userMessage) {
  try {
    // Show typing indicator
    const typingId = showTypingIndicator();
    
    // Build context
    const systemPrompt = buildSystemPrompt();
    
    // Add to conversation history
    conversationHistory.push({
      role: 'user',
      content: userMessage
    });
    
    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: conversationHistory
    });
    
    // Remove typing indicator
    removeTypingIndicator(typingId);
    
    // Get response text
    const aiMessage = response.content[0].text;
    
    // Add to conversation history
    conversationHistory.push({
      role: 'assistant',
      content: aiMessage
    });
    
    // Add AI message to chat
    addMessage(aiMessage, 'assistant');
    
  } catch (error) {
    console.error('AI Assistant error:', error);
    removeTypingIndicator();
    
    if (error.status === 401) {
      addMessage('⚠️ API key not configured. Please add VITE_ANTHROPIC_API_KEY to your .env file.', 'system');
    } else {
      addMessage('Sorry, I encountered an error. Please try again.', 'system');
    }
  }
}

/**
 * Build System Prompt with context
 */
function buildSystemPrompt() {
  let prompt = `You are an AI Project Management Assistant. You help users with:
- Breaking down projects into manageable tasks
- Analyzing project risks and challenges
- Suggesting timelines and milestones
- Writing professional project descriptions
- Answering project management questions

Be concise, actionable, and professional. Format responses clearly with bullet points when appropriate.`;

  if (currentProject) {
    prompt += `\n\nCurrent Project Context:
- Title: ${currentProject.title}
- Type: ${currentProject.project_type}
- Status: ${currentProject.status}
- Progress: ${currentProject.progress_percentage}%
- Description: ${currentProject.description}`;
  }
  
  return prompt;
}

/**
 * Add Message to Chat
 */
function addMessage(content, type) {
  const messagesContainer = document.getElementById('aiAssistantMessages');
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `ai-message ai-message-${type}`;
  
  if (type === 'user') {
    messageDiv.innerHTML = `
      <div class="ai-message-content user-message">
        ${escapeHtml(content)}
      </div>
      <div class="ai-message-avatar">
        <i class="bi bi-person-fill"></i>
      </div>
    `;
  } else if (type === 'system') {
    messageDiv.innerHTML = `
      <div class="ai-message-content system-message">
        ${escapeHtml(content)}
      </div>
    `;
  } else {
    messageDiv.innerHTML = `
      <div class="ai-message-avatar">
        <i class="bi bi-robot"></i>
      </div>
      <div class="ai-message-content">
        ${formatAIMessage(content)}
      </div>
    `;
  }
  
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Show Typing Indicator
 */
function showTypingIndicator() {
  const messagesContainer = document.getElementById('aiAssistantMessages');
  const typingId = 'typing-' + Date.now();
  
  const typingDiv = document.createElement('div');
  typingDiv.id = typingId;
  typingDiv.className = 'ai-message ai-message-assistant';
  typingDiv.innerHTML = `
    <div class="ai-message-avatar">
      <i class="bi bi-robot"></i>
    </div>
    <div class="ai-message-content">
      <div class="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;
  
  messagesContainer.appendChild(typingDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  
  return typingId;
}

/**
 * Remove Typing Indicator
 */
function removeTypingIndicator(typingId = null) {
  if (typingId) {
    const element = document.getElementById(typingId);
    if (element) element.remove();
  } else {
    document.querySelectorAll('.typing-indicator').forEach(el => {
      el.closest('.ai-message').remove();
    });
  }
}

/**
 * Format AI Message (convert markdown-like syntax)
 */
function formatAIMessage(content) {
  // Convert **bold** to <strong>
  content = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Convert bullet points
  content = content.replace(/^- (.+)$/gm, '<li>$1</li>');
  
  // Wrap lists
  content = content.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  
  // Convert line breaks
  content = content.replace(/\n\n/g, '</p><p>');
  content = '<p>' + content + '</p>';
  
  return content;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Clear conversation history
 */
export function clearConversation() {
  conversationHistory = [];
  const messagesContainer = document.getElementById('aiAssistantMessages');
  messagesContainer.innerHTML = `
    <div class="ai-message ai-message-assistant">
      <div class="ai-message-avatar">
        <i class="bi bi-robot"></i>
      </div>
      <div class="ai-message-content">
        <p class="mb-0">Conversation cleared. How can I help you?</p>
      </div>
    </div>
  `;
}

/**
 * Update project context
 */
export function setProjectContext(project) {
  currentProject = project;
}
