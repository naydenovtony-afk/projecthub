/**
 * Chats Page - Team collaboration interface
 * Handles multiple chat windows, real-time messaging, and user management
 */

import {
  getChatRooms,
  getRoomMessages,
  sendMessage,
  createChatRoom,
  searchUsers,
  subscribeToRoom,
  markAsRead,
  getRoomParticipants
} from '../services/chatService.js';
import { getAllProjects } from '../services/projectService.js';
import { getCurrentUser } from './auth.js';
import { showError, showSuccess } from '../utils/ui.js';
import { getRelativeTime } from '../utils/helpers.js';

let currentRoomId = null;
let currentSubscription = null;
let selectedUserIds = [];
let allProjects = [];

/**
 * Initialize chats page
 */
export async function initChatsPage() {
  console.log('Initializing chats page...');
  
  await loadChatRooms();
  await loadProjects();
  setupEventListeners();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Search chats
  const searchInput = document.getElementById('searchChats');
  if (searchInput) {
    searchInput.addEventListener('input', handleSearchChats);
  }

  // Chat type change
  const chatTypeSelect = document.getElementById('chatType');
  if (chatTypeSelect) {
    chatTypeSelect.addEventListener('change', handleChatTypeChange);
  }

  // Search users
  const searchUsersInput = document.getElementById('searchUsers');
  if (searchUsersInput) {
    let searchTimeout;
    searchUsersInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => handleSearchUsers(e.target.value), 300);
    });
  }

  // Create chat button
  const createChatBtn = document.getElementById('createChatBtn');
  if (createChatBtn) {
    createChatBtn.addEventListener('click', handleCreateChat);
  }
}

/**
 * Load all chat rooms
 */
async function loadChatRooms() {
  try {
    const rooms = await getChatRooms();
    displayChatRooms(rooms);
  } catch (error) {
    console.error('Error loading chat rooms:', error);
    showError('Failed to load chats');
  }
}

/**
 * Display chat rooms in sidebar
 */
function displayChatRooms(rooms) {
  const chatsList = document.getElementById('chatsList');
  
  if (!rooms || rooms.length === 0) {
    chatsList.innerHTML = `
      <div class="empty-state p-4">
        <i class="bi bi-chat-dots"></i>
        <p class="mb-0">No conversations yet</p>
        <small>Start a new chat to get started</small>
      </div>
    `;
    return;
  }

  chatsList.innerHTML = rooms.map(room => {
    const initial = room.name ? room.name.charAt(0).toUpperCase() : '?';
    const unreadBadge = room.unread_count > 0 
      ? `<span class="chat-unread">${room.unread_count}</span>` 
      : '';
    
    return `
      <div class="chat-item" data-room-id="${room.id}">
        <div class="chat-avatar">${initial}</div>
        <div class="chat-info">
          <div class="chat-name">
            <span>${room.name || 'Unnamed Chat'}</span>
            ${unreadBadge}
          </div>
          <div class="chat-meta">
            <i class="bi bi-${getRoomIcon(room.room_type)}"></i>
            <span>${room.room_type}</span>
            ${room.last_message_at ? `<span>• ${getRelativeTime(room.last_message_at)}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Add click handlers
  document.querySelectorAll('.chat-item').forEach(item => {
    item.addEventListener('click', () => {
      const roomId = item.dataset.roomId;
      openChat(roomId);
    });
  });
}

/**
 * Get icon for room type
 */
function getRoomIcon(roomType) {
  switch (roomType) {
    case 'project': return 'folder';
    case 'direct': return 'person';
    case 'group': return 'people';
    default: return 'chat-dots';
  }
}

/**
 * Open a chat room
 */
async function openChat(roomId) {
  console.log('Opening chat:', roomId);
  
  // Unsubscribe from previous room
  if (currentSubscription) {
    currentSubscription.unsubscribe();
  }

  currentRoomId = roomId;

  // Mark active in sidebar
  document.querySelectorAll('.chat-item').forEach(item => {
    item.classList.toggle('active', item.dataset.roomId === roomId);
  });

  // Load chat UI
  await loadChatUI(roomId);
  
  // Load messages
  await loadMessages(roomId);
  
  // Mark as read
  await markAsRead(roomId);
  
  // Subscribe to new messages
  currentSubscription = subscribeToRoom(roomId, handleNewMessage);
}

/**
 * Load chat UI
 */
async function loadChatUI(roomId) {
  const chatMain = document.getElementById('chatMain');
  const rooms = await getChatRooms();
  const room = rooms.find(r => r.id === roomId);
  
  if (!room) return;

  const initial = room.name ? room.name.charAt(0).toUpperCase() : '?';
  
  chatMain.innerHTML = `
    <!-- Chat Header -->
    <div class="chat-header">
      <div class="chat-header-info">
        <div class="chat-avatar">${initial}</div>
        <div>
          <h6 class="mb-0">${room.name || 'Unnamed Chat'}</h6>
          <small class="text-muted">
            <i class="bi bi-${getRoomIcon(room.room_type)}"></i>
            ${room.room_type}
          </small>
        </div>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-ghost" onclick="viewParticipants('${roomId}')" title="Participants">
          <i class="bi bi-people"></i>
        </button>
        <button class="btn btn-sm btn-ghost" title="More options">
          <i class="bi bi-three-dots-vertical"></i>
        </button>
      </div>
    </div>

    <!-- Messages Area -->
    <div class="chat-messages" id="chatMessages">
      <div class="text-center text-muted">
        <div class="spinner-border spinner-border-sm" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
    </div>

    <!-- Input Area -->
    <div class="chat-input-area">
      <div class="chat-input-wrapper">
        <button class="btn btn-ghost" title="Attach file">
          <i class="bi bi-paperclip"></i>
        </button>
        <textarea 
          class="chat-input" 
          id="messageInput" 
          placeholder="Type a message..." 
          rows="1"
        ></textarea>
        <button class="btn btn-primary" id="sendMessageBtn">
          <i class="bi bi-send-fill"></i>
        </button>
      </div>
    </div>
  `;

  // Setup input handlers
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendMessageBtn');

  if (messageInput) {
    // Auto-resize textarea
    messageInput.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });

    // Send on Enter (Shift+Enter for new line)
    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', handleSendMessage);
  }
}

/**
 * Load messages for a room
 */
async function loadMessages(roomId) {
  try {
    const messages = await getRoomMessages(roomId);
    displayMessages(messages);
  } catch (error) {
    console.error('Error loading messages:', error);
    showError('Failed to load messages');
  }
}

/**
 * Display messages
 */
function displayMessages(messages) {
  const chatMessages = document.getElementById('chatMessages');
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  
  if (!messages || messages.length === 0) {
    chatMessages.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-chat-quote"></i>
        <p>No messages yet</p>
        <small>Start the conversation!</small>
      </div>
    `;
    return;
  }

  chatMessages.innerHTML = messages.map(msg => {
    const isOwn = msg.user_id === currentUser?.id;
    const userName = msg.user?.full_name || 'Unknown User';
    const initial = userName.charAt(0).toUpperCase();
    
    return `
      <div class="message-group ${isOwn ? 'own' : ''}">
        ${!isOwn ? `<div class="message-avatar">${initial}</div>` : ''}
        <div class="message-content">
          ${!isOwn ? `<div class="message-sender">${userName}</div>` : ''}
          <div class="message-bubble">
            ${msg.message}
          </div>
          <div class="message-time">${getRelativeTime(msg.created_at)}</div>
        </div>
        ${isOwn ? `<div class="message-avatar">${initial}</div>` : ''}
      </div>
    `;
  }).join('');

  // Scroll to bottom
  scrollToBottom();
}

/**
 * Handle sending a message
 */
async function handleSendMessage() {
  const input = document.getElementById('messageInput');
  const message = input.value.trim();
  
  if (!message || !currentRoomId) return;

  try {
    input.value = '';
    input.style.height = 'auto';
    
    await sendMessage(currentRoomId, message);
    
    // Message will appear via real-time subscription
  } catch (error) {
    console.error('Error sending message:', error);
    showError('Failed to send message');
    input.value = message; // Restore message
  }
}

/**
 * Handle new message from subscription
 */
function handleNewMessage(message) {
  console.log('New message:', message);
  
  const chatMessages = document.getElementById('chatMessages');
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const isOwn = message.user_id === currentUser?.id;
  const userName = message.user?.full_name || 'Unknown User';
  const initial = userName.charAt(0).toUpperCase();
  
  // Remove empty state if present
  const emptyState = chatMessages.querySelector('.empty-state');
  if (emptyState) {
    emptyState.remove();
  }
  
  const messageHTML = `
    <div class="message-group ${isOwn ? 'own' : ''}">
      ${!isOwn ? `<div class="message-avatar">${initial}</div>` : ''}
      <div class="message-content">
        ${!isOwn ? `<div class="message-sender">${userName}</div>` : ''}
        <div class="message-bubble">
          ${message.message}
        </div>
        <div class="message-time">${getRelativeTime(message.created_at)}</div>
      </div>
      ${isOwn ? `<div class="message-avatar">${initial}</div>` : ''}
    </div>
  `;
  
  chatMessages.insertAdjacentHTML('beforeend', messageHTML);
  scrollToBottom();
}

/**
 * Scroll messages to bottom
 */
function scrollToBottom() {
  const chatMessages = document.getElementById('chatMessages');
  if (chatMessages) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

/**
 * Handle search chats
 */
function handleSearchChats(e) {
  const query = e.target.value.toLowerCase();
  const chatItems = document.querySelectorAll('.chat-item');
  
  chatItems.forEach(item => {
    const name = item.querySelector('.chat-name span').textContent.toLowerCase();
    item.style.display = name.includes(query) ? 'flex' : 'none';
  });
}

/**
 * Handle chat type change in modal
 */
function handleChatTypeChange(e) {
  const chatType = e.target.value;
  const chatNameGroup = document.getElementById('chatNameGroup');
  const projectSelectGroup = document.getElementById('projectSelectGroup');
  
  if (chatType === 'project') {
    chatNameGroup.style.display = 'none';
    projectSelectGroup.style.display = 'block';
  } else {
    chatNameGroup.style.display = 'block';
    projectSelectGroup.style.display = chatType === 'project' ? 'block' : 'none';
  }
}

/**
 * Load projects for project chat
 */
async function loadProjects() {
  try {
    const user = await getCurrentUser();
    if (user) {
      allProjects = await getAllProjects(user.id);
    }
    const projectSelect = document.getElementById('projectSelect');
    
    if (projectSelect && allProjects.length > 0) {
      projectSelect.innerHTML = '<option value="">Choose a project...</option>' +
        allProjects.map(p => `<option value="${p.id}">${p.title}</option>`).join('');
    }
  } catch (error) {
    console.error('Error loading projects:', error);
  }
}

/**
 * Handle search users
 */
async function handleSearchUsers(query) {
  if (!query || query.length < 2) {
    document.getElementById('userSearchResults').innerHTML = '';
    return;
  }

  try {
    const users = await searchUsers(query);
    displayUserSearchResults(users);
  } catch (error) {
    console.error('Error searching users:', error);
  }
}

/**
 * Display user search results
 */
function displayUserSearchResults(users) {
  const resultsContainer = document.getElementById('userSearchResults');
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  
  resultsContainer.innerHTML = users
    .filter(u => u.id !== currentUser?.id && !selectedUserIds.includes(u.id))
    .map(user => `
      <div class="d-flex align-items-center gap-2 p-2 border rounded mb-2" style="cursor: pointer;" data-user-id="${user.id}">
        <div class="avatar-sm">
          ${user.avatar_url ? `<img src="${user.avatar_url}" alt="${user.full_name}">` : user.full_name.charAt(0)}
        </div>
        <div class="flex-grow-1">
          <div class="fw-medium">${user.full_name}</div>
          <small class="text-muted">${user.email}</small>
        </div>
        <button class="btn btn-sm btn-outline-primary add-user-btn">
          <i class="bi bi-plus-lg"></i>
        </button>
      </div>
    `).join('');

  // Add click handlers
  resultsContainer.querySelectorAll('.add-user-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const userId = e.target.closest('[data-user-id]').dataset.userId;
      const user = users.find(u => u.id === userId);
      addSelectedUser(user);
    });
  });
}

/**
 * Add selected user
 */
function addSelectedUser(user) {
  if (selectedUserIds.includes(user.id)) return;
  
  selectedUserIds.push(user.id);
  
  const selectedContainer = document.getElementById('selectedUsers');
  selectedContainer.insertAdjacentHTML('beforeend', `
    <span class="badge bg-primary" data-user-id="${user.id}">
      ${user.full_name}
      <i class="bi bi-x ms-1" style="cursor: pointer;"></i>
    </span>
  `);

  // Add remove handler
  selectedContainer.querySelector(`[data-user-id="${user.id}"] i`).addEventListener('click', () => {
    selectedUserIds = selectedUserIds.filter(id => id !== user.id);
    selectedContainer.querySelector(`[data-user-id="${user.id}"]`).remove();
  });

  // Clear search
  document.getElementById('searchUsers').value = '';
  document.getElementById('userSearchResults').innerHTML = '';
}

/**
 * Handle create chat
 */
async function handleCreateChat() {
  const chatType = document.getElementById('chatType').value;
  const chatName = document.getElementById('chatName').value.trim();
  const projectId = document.getElementById('projectSelect').value;
  
  let name = chatName;
  let projectIdToUse = null;

  if (chatType === 'project') {
    if (!projectId) {
      showError('Please select a project');
      return;
    }
    const project = allProjects.find(p => p.id === projectId);
    name = project ? `${project.title} Team` : 'Project Chat';
    projectIdToUse = projectId;
  } else if (!name) {
    showError('Please enter a chat name');
    return;
  }

  if (selectedUserIds.length === 0) {
    showError('Please add at least one participant');
    return;
  }

  try {
    const roomData = {
      name,
      room_type: chatType,
      project_id: projectIdToUse,
      participants: selectedUserIds
    };

    await createChatRoom(roomData);
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('newChatModal'));
    modal.hide();
    
    // Reset form
    document.getElementById('chatName').value = '';
    document.getElementById('projectSelect').value = '';
    selectedUserIds = [];
    document.getElementById('selectedUsers').innerHTML = '';
    
    showSuccess('Chat created successfully!');
    
    // Reload chats
    await loadChatRooms();
  } catch (error) {
    console.error('Error creating chat:', error);
    showError('Failed to create chat');
  }
}

export { openChat };
