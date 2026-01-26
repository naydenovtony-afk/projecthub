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
 * Get AI Response from Claude or Demo Mode
 */
async function getAIResponse(userMessage) {
  try {
    // Show typing indicator
    const typingId = showTypingIndicator();
    
    // Check if API key is configured
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    const isValidKey = apiKey && apiKey !== 'demo-key' && apiKey !== 'your_anthropic_api_key_here';
    
    let aiMessage;
    
    if (!isValidKey) {
      // DEMO MODE: Use pre-written smart responses
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000)); // Simulate API delay
      aiMessage = getDemoResponse(userMessage);
    } else {
      // REAL API MODE: Call Claude
      const systemPrompt = buildSystemPrompt();
      
      conversationHistory.push({
        role: 'user',
        content: userMessage
      });
      
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: systemPrompt,
        messages: conversationHistory
      });
      
      aiMessage = response.content[0].text;
      
      conversationHistory.push({
        role: 'assistant',
        content: aiMessage
      });
    }
    
    // Remove typing indicator
    removeTypingIndicator(typingId);
    
    // Add AI message to chat
    addMessage(aiMessage, 'assistant');
    
  } catch (error) {
    console.error('AI Assistant error:', error);
    removeTypingIndicator();
    
    if (error.status === 401) {
      addMessage('⚠️ API key not configured. Switched to Demo Mode with pre-written responses.', 'system');
      // Try demo mode as fallback
      setTimeout(() => {
        const demoResponse = getDemoResponse(userMessage);
        addMessage(demoResponse, 'assistant');
      }, 500);
    } else {
      addMessage('Sorry, I encountered an error. Please try again.', 'system');
    }
  }
}

/**
 * Get Demo Mode Response (works without API key)
 */
function getDemoResponse(userMessage) {
  const message = userMessage.toLowerCase();
  
  // Quick action responses
  if (message.includes('suggest-tasks') || message.includes('suggest tasks')) {
    return getDemoTaskSuggestions();
  }
  
  if (message.includes('analyze-risks') || message.includes('analyze risks')) {
    return getDemoRiskAnalysis();
  }
  
  if (message.includes('improve-description') || message.includes('improve description')) {
    return getDemoDescriptionImprovement();
  }
  
  // General questions
  if (message.includes('task') || message.includes('to do') || message.includes('todo')) {
    return `**Task Management Tips:**

- Break large tasks into smaller, actionable steps
- Set clear deadlines and priorities
- Use the Kanban board to visualize progress
- Assign tasks to specific team members
- Review and update task status regularly

Would you like me to suggest specific tasks for your current project?`;
  }
  
  if (message.includes('timeline') || message.includes('schedule') || message.includes('deadline')) {
    return `**Project Timeline Best Practices:**

**Planning Phase (Week 1-2):**
- Define project scope and objectives
- Identify key stakeholders
- Create initial task breakdown
- Set major milestones

**Execution Phase:**
- Track progress weekly
- Adjust timeline as needed
- Communicate delays early
- Celebrate milestone achievements

**Review Phase:**
- Conduct post-project review
- Document lessons learned
- Archive deliverables

Use the Gantt view to visualize your project timeline!`;
  }
  
  if (message.includes('risk') || message.includes('problem') || message.includes('challenge')) {
    return `**Common Project Risks & Solutions:**

**Schedule Risks:**
- Risk: Delays due to dependencies
- Mitigation: Build buffer time, parallel tasks

**Resource Risks:**
- Risk: Team member unavailability
- Mitigation: Cross-train team, document processes

**Scope Risks:**
- Risk: Scope creep
- Mitigation: Clear requirements, change control

**Budget Risks:**
- Risk: Cost overruns
- Mitigation: Regular tracking, contingency fund

Need a detailed risk analysis for your specific project?`;
  }
  
  if (message.includes('team') || message.includes('collaborate') || message.includes('communication')) {
    return `**Team Collaboration Tips:**

**Communication:**
- Schedule regular check-ins
- Use project comments for async updates
- Create shared documentation
- Celebrate team wins

**Task Assignment:**
- Match tasks to team strengths
- Balance workload fairly
- Set clear expectations
- Provide necessary resources

**Best Practices:**
- Use @mentions for urgent items
- Keep status updates current
- Share project progress transparently
- Encourage feedback and ideas

Your team is your greatest asset!`;
  }
  
  if (message.includes('budget') || message.includes('cost') || message.includes('money')) {
    return `**Budget Management Guidelines:**

**Initial Planning:**
- Estimate all costs realistically
- Include 10-15% contingency
- Get stakeholder approval
- Document assumptions

**Tracking:**
- Monitor expenses weekly
- Compare actual vs planned
- Flag variances early
- Update forecasts regularly

**Tips:**
- Use cost tracking tools
- Keep receipts organized
- Review contracts carefully
- Build relationships with vendors

Good budget management prevents surprises!`;
  }
  
  if (message.includes('report') || message.includes('status') || message.includes('update')) {
    return `**Effective Project Reporting:**

**Weekly Status Report Should Include:**
- Progress since last update
- Completed tasks and milestones
- Upcoming work for next week
- Risks and issues
- Budget status
- Help needed

**Monthly Report Should Add:**
- Overall project health
- Key metrics and KPIs
- Lessons learned
- Stakeholder feedback

Use the dashboard charts to visualize progress in your reports!`;
  }
  
  // Default helpful response
  return `**I can help you with:**

**Project Planning:**
- Breaking down projects into tasks
- Creating realistic timelines
- Identifying potential risks
- Resource allocation

**Task Management:**
- Prioritization strategies
- Task dependencies
- Workload balancing

**Team Collaboration:**
- Communication best practices
- Conflict resolution
- Meeting effectiveness

**Reporting:**
- Status updates
- Progress tracking
- Stakeholder communication

What specific aspect would you like help with?`;
}

/**
 * Demo: Task Suggestions
 */
function getDemoTaskSuggestions() {
  if (!currentProject) {
    return `**Sample Project Tasks:**

1. **Initial Setup**
   - Create project charter
   - Define success criteria
   - Identify stakeholders

2. **Planning**
   - Develop project plan
   - Create task breakdown
   - Allocate resources

3. **Execution**
   - Implement core features
   - Conduct regular reviews
   - Track progress

4. **Quality Assurance**
   - Test deliverables
   - Gather feedback
   - Make improvements

5. **Closure**
   - Final review
   - Documentation
   - Lessons learned

Open a specific project to get customized task suggestions!`;
  }
  
  return `**Suggested Tasks for "${currentProject.title}":**

1. **Requirements & Planning**
   - Finalize project requirements document
   - Create detailed timeline with milestones
   - Identify and assign team roles

2. **Design & Architecture**
   - Design system architecture
   - Create wireframes/mockups
   - Get stakeholder approval

3. **Implementation**
   - Set up development environment
   - Implement core functionality
   - Conduct code reviews

4. **Testing & QA**
   - Write test cases
   - Perform integration testing
   - Fix identified bugs

5. **Documentation**
   - Write user documentation
   - Create technical documentation
   - Prepare training materials

6. **Deployment**
   - Prepare deployment plan
   - Deploy to staging environment
   - Conduct final testing

7. **Review & Handoff**
   - Project retrospective
   - Knowledge transfer
   - Archive project assets

Would you like me to help prioritize these tasks?`;
}

/**
 * Demo: Risk Analysis
 */
function getDemoRiskAnalysis() {
  if (!currentProject) {
    return `**General Project Risk Assessment:**

**High Priority Risks:**
- Unclear requirements → Daily stakeholder communication
- Resource constraints → Early identification and planning
- Technical complexity → Proof of concepts and spikes

**Medium Priority Risks:**
- Team availability → Cross-training and documentation
- Dependency delays → Buffer time in schedule
- Scope creep → Change control process

**Low Priority Risks:**
- Tool/technology changes → Stay updated, plan transitions
- External factors → Monitoring and contingency plans

Open a specific project for a customized risk analysis!`;
  }
  
  return `**Risk Analysis for "${currentProject.title}":**

**Critical Risks:**

🔴 **Schedule Risk**
- Risk: Project timeline may be tight at ${currentProject.end_date}
- Impact: High
- Mitigation: Break tasks into weekly sprints, identify critical path

🟡 **Resource Risk**
- Risk: Key skills may be needed
- Impact: Medium  
- Mitigation: Identify skill gaps early, plan training or hiring

🟡 **Scope Risk**
- Risk: Requirements may evolve
- Impact: Medium
- Mitigation: Implement change control process, regular stakeholder check-ins

**Low Risks:**

🟢 **Technical Risk**
- Risk: Technology challenges
- Impact: Low
- Mitigation: Use proven technologies, have backup plans

**Recommendations:**
- Create a risk register
- Review risks weekly in team meetings
- Assign risk owners
- Track mitigation actions
- Celebrate successful risk avoidance

Would you like specific mitigation strategies for any risk?`;
}

/**
 * Demo: Description Improvement
 */
function getDemoDescriptionImprovement() {
  if (!currentProject) {
    return `**Tips for Better Project Descriptions:**

**Include These Elements:**
- Clear objective and goals
- Target audience/beneficiaries
- Key deliverables
- Success metrics
- Timeline and milestones
- Budget (if applicable)

**Writing Style:**
- Be specific and concrete
- Use active voice
- Quantify when possible
- Keep it concise
- Focus on outcomes

Open a specific project to get a customized description improvement!`;
  }
  
  return `**Improved Description for "${currentProject.title}":**

**Current:** ${currentProject.description}

**Enhanced Version:**

**Project Overview:**
${currentProject.title} is a ${currentProject.project_type.replace(/_/g, ' ')} initiative designed to deliver measurable value to stakeholders through structured planning and execution.

**Objectives:**
- Deliver high-quality results on time and within budget
- Ensure stakeholder satisfaction throughout the project lifecycle
- Implement best practices in project management
- Create sustainable, maintainable outcomes

**Key Deliverables:**
- Comprehensive project documentation
- Quality-assured deliverables
- Regular status reports and updates
- Final project review and lessons learned

**Success Criteria:**
- All milestones achieved on schedule
- Budget adherence within 5% variance
- Stakeholder approval ratings above 90%
- Smooth handoff and knowledge transfer

**Timeline:** ${currentProject.start_date} to ${currentProject.end_date}

**Current Progress:** ${currentProject.progress_percentage}% complete

This description provides clarity for all stakeholders and sets clear expectations.`;
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
