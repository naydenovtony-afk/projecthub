import supabase from '../services/supabase.js';
import { getCurrentUser } from './auth.js';
import { isDemoMode } from '../utils/demoMode.js';
import { getRelativeTime } from '../utils/helpers.js';

// Demo messages for demo mode
const DEMO_MESSAGES = [
  {
    id: 'msg-1',
    user_id: 'demo-user-123',
    user_name: 'Demo User',
    message: 'Hey team! Just updated the project timeline.',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    project_id: 'proj-1'
  },
  {
    id: 'msg-2',
    user_id: 'demo-admin-456',
    user_name: 'Admin User',
    message: 'Great! Can you also review the budget?',
    created_at: new Date(Date.now() - 1800000).toISOString(),
    project_id: 'proj-1'
  },
  {
    id: 'msg-3',
    user_id: 'demo-user-123',
    user_name: 'Demo User',
    message: 'Sure, I\'ll check it now.',
    created_at: new Date(Date.now() - 900000).toISOString(),
    project_id: 'proj-1'
  }
];

let localMessages = [...DEMO_MESSAGES];
let currentProjectId = null;
let messageSubscription = null;

// Check if Supabase is configured
function isSupabaseConfigured() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  return url && url !== 'your_supabase_url_here' && url.startsWith('http');
}

/**
 * Initialize Team Chat
 */
export function initTeamChat(projectId) {
  console.log('💬 Initializing Team Chat for project:', projectId);
  currentProjectId = projectId;
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      createChatUI();
      setupEventListeners();
      loadMessages();
      
      if (!isDemoMode() && isSupabaseConfigured()) {
        subscribeToMessages();
      }
    });
  } else {
    createChatUI();
    setupEventListeners();
    loadMessages();
    
    if (!isDemoMode() && isSupabaseConfigured()) {
      subscribeToMessages();
    }
  }
}

/**
 * Create Chat UI
 */
function createChatUI() {
  // Check if already exists
  if (document.getElementById('team-chat-widget')) {
    console.log('Team chat widget already exists');
    return;
  }
  
  const widget = document.createElement('div');
  widget.id = 'team-chat-widget';
  widget.innerHTML = `
    <!-- Floating Button -->
    <button class="team-chat-fab" id="teamChatToggle" title="Team Chat">
      <i class="bi bi-chat-dots-fill"></i>
      <span class="chat-badge" id="chatBadge" style="display: none;">0</span>
    </button>
    
    <!-- Chat Panel -->
    <div class="team-chat-panel" id="teamChatPanel">
      <div class="team-chat-header">
        <div class="d-flex align-items-center">
          <div class="chat-avatar">
            <i class="bi bi-people-fill"></i>
          </div>
          <div class="ms-2">
            <h6 class="mb-0">Team Chat</h6>
            <small class="text-muted" id="chatStatus">
              <i class="bi bi-circle-fill text-success me-1" style="font-size: 0.5rem;"></i>
              ${isDemoMode() ? 'Demo Mode' : 'Online'}
            </small>
          </div>
        </div>
        <button class="btn btn-sm btn-icon" id="teamChatClose">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
      
      <div class="team-chat-body" id="teamChatMessages">
        <!-- Messages will be loaded here -->
      </div>
      
      <div class="team-chat-footer">
        <form id="teamChatForm" class="chat-input-form">
          <input 
            type="text" 
            class="form-control" 
            id="teamChatInput" 
            placeholder="Type a message..."
            autocomplete="off"
            maxlength="500"
          >
          <button type="submit" class="btn btn-primary chat-send-btn">
            <i class="bi bi-send-fill"></i>
          </button>
        </form>
        <div class="chat-typing-indicator" id="typingIndicator" style="display: none;">
          <small class="text-muted">Someone is typing...</small>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(widget);
  console.log('✅ Team chat widget created');
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
  const toggleBtn = document.getElementById('teamChatToggle');
  const closeBtn = document.getElementById('teamChatClose');
  const form = document.getElementById('teamChatForm');
  const input = document.getElementById('teamChatInput');
  
  if (!toggleBtn || !closeBtn || !form || !input) {
    console.error('Team chat elements not found');
    return;
  }
  
  // Toggle button
  toggleBtn.addEventListener('click', toggleChat);
  
  // Close button
  closeBtn.addEventListener('click', toggleChat);
  
  // Form submit
  form.addEventListener('submit', handleSendMessage);
  
  // Input typing indicator
  let typingTimeout;
  input.addEventListener('input', () => {
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      // Stop typing indicator
    }, 1000);
  });
  
  console.log('✅ Team chat event listeners setup');
}

/**
 * Toggle Chat Panel
 */
function toggleChat() {
  const panel = document.getElementById('teamChatPanel');
  const fab = document.getElementById('teamChatToggle');
  const badge = document.getElementById('chatBadge');
  
  const isOpen = panel.classList.contains('open');
  
  if (!isOpen) {
    panel.classList.add('open');
    fab.style.display = 'none';
    badge.style.display = 'none';
    badge.textContent = '0';
  } else {
    panel.classList.remove('open');
    fab.style.display = 'flex';
  }
}

/**
 * Load Messages
 */
async function loadMessages() {
  const messagesContainer = document.getElementById('teamChatMessages');
  if (!messagesContainer) return;
  
  messagesContainer.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary" role="status"></div></div>';
  
  try {
    let messages = [];
    
    if (isDemoMode()) {
      // Demo mode - use local messages
      messages = localMessages.filter(m => m.project_id === currentProjectId);
    } else if (isSupabaseConfigured()) {
      // Real mode - fetch from Supabase
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('project_id', currentProjectId)
        .order('created_at', { ascending: true })
        .limit(50);
      
      if (error) throw error;
      messages = data || [];
    } else {
      // No configuration - show demo messages
      messages = localMessages.filter(m => m.project_id === currentProjectId);
    }
    
    displayMessages(messages);
    
  } catch (error) {
    console.error('Error loading messages:', error);
    messagesContainer.innerHTML = `
      <div class="text-center py-4 text-muted">
        <i class="bi bi-exclamation-circle fs-3 d-block mb-2"></i>
        <p class="mb-0">Unable to load messages</p>
      </div>
    `;
  }
}

/**
 * Display Messages
 */
function displayMessages(messages) {
  const messagesContainer = document.getElementById('teamChatMessages');
  if (!messagesContainer) return;
  
  const currentUser = getCurrentUser();
  
  if (messages.length === 0) {
    messagesContainer.innerHTML = `
      <div class="text-center py-5 text-muted">
        <i class="bi bi-chat-dots fs-1 d-block mb-3"></i>
        <p class="mb-0">No messages yet</p>
        <small>Start the conversation!</small>
      </div>
    `;
    return;
  }
  
  messagesContainer.innerHTML = '';
  
  messages.forEach((message, index) => {
    const isCurrentUser = message.user_id === currentUser?.id;
    const showAvatar = index === 0 || messages[index - 1].user_id !== message.user_id;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isCurrentUser ? 'chat-message-own' : ''}`;
    
    messageDiv.innerHTML = `
      ${!isCurrentUser && showAvatar ? `
        <div class="chat-message-avatar">
          <i class="bi bi-person-circle"></i>
        </div>
      ` : '<div class="chat-message-avatar-spacer"></div>'}
      
      <div class="chat-message-content">
        ${!isCurrentUser && showAvatar ? `
          <div class="chat-message-name">${escapeHtml(message.user_name || 'Unknown User')}</div>
        ` : ''}
        <div class="chat-message-bubble ${isCurrentUser ? 'own-message' : ''}">
          ${escapeHtml(message.message)}
        </div>
        <div class="chat-message-time">${getRelativeTime(message.created_at)}</div>
      </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
  });
  
  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Handle Send Message
 */
async function handleSendMessage(e) {
  e.preventDefault();
  
  const input = document.getElementById('teamChatInput');
  const message = input.value.trim();
  
  if (!message) return;
  
  const currentUser = getCurrentUser();
  if (!currentUser) {
    alert('Please log in to send messages');
    return;
  }
  
  // Clear input
  input.value = '';
  
  try {
    const newMessage = {
      id: 'msg-' + Date.now(),
      user_id: currentUser.id,
      user_name: currentUser.full_name || currentUser.email,
      message: message,
      created_at: new Date().toISOString(),
      project_id: currentProjectId
    };
    
    if (isDemoMode() || !isSupabaseConfigured()) {
      // Demo mode - add to local messages
      localMessages.push(newMessage);
      displayMessages(localMessages.filter(m => m.project_id === currentProjectId));
    } else {
      // Real mode - send to Supabase
      const { error } = await supabase
        .from('messages')
        .insert([{
          user_id: currentUser.id,
          user_name: currentUser.full_name || currentUser.email,
          message: message,
          project_id: currentProjectId
        }]);
      
      if (error) throw error;
    }
    
  } catch (error) {
    console.error('Error sending message:', error);
    alert('Failed to send message');
    input.value = message; // Restore message
  }
}

/**
 * Subscribe to Real-time Messages
 */
function subscribeToMessages() {
  if (!supabase || !supabase.channel) {
    console.warn('Supabase realtime not available');
    return;
  }
  
  // Unsubscribe from previous subscription
  if (messageSubscription) {
    messageSubscription.unsubscribe();
  }
  
  // Subscribe to new messages
  messageSubscription = supabase
    .channel(`project-${currentProjectId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `project_id=eq.${currentProjectId}`
    }, (payload) => {
      addNewMessage(payload.new);
    })
    .subscribe();
  
  console.log('✅ Subscribed to real-time messages');
}

/**
 * Add New Message (from real-time subscription)
 */
function addNewMessage(message) {
  const messagesContainer = document.getElementById('teamChatMessages');
  if (!messagesContainer) return;
  
  const currentUser = getCurrentUser();
  const isCurrentUser = message.user_id === currentUser?.id;
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${isCurrentUser ? 'chat-message-own' : ''}`;
  messageDiv.style.animation = 'slideInUp 0.3s ease';
  
  messageDiv.innerHTML = `
    ${!isCurrentUser ? `
      <div class="chat-message-avatar">
        <i class="bi bi-person-circle"></i>
      </div>
    ` : '<div class="chat-message-avatar-spacer"></div>'}
    
    <div class="chat-message-content">
      ${!isCurrentUser ? `
        <div class="chat-message-name">${escapeHtml(message.user_name || 'Unknown User')}</div>
      ` : ''}
      <div class="chat-message-bubble ${isCurrentUser ? 'own-message' : ''}">
        ${escapeHtml(message.message)}
      </div>
      <div class="chat-message-time">${getRelativeTime(message.created_at)}</div>
    </div>
  `;
  
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  
  // Show badge if chat is closed
  const panel = document.getElementById('teamChatPanel');
  if (!panel.classList.contains('open') && !isCurrentUser) {
    const badge = document.getElementById('chatBadge');
    const currentCount = parseInt(badge.textContent) || 0;
    badge.textContent = currentCount + 1;
    badge.style.display = 'flex';
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (messageSubscription) {
    messageSubscription.unsubscribe();
  }
});

export { initTeamChat, toggleChat };
