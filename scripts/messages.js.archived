/**
 * Messages Page Script
 * Handles internal messaging functionality
 */

import { isDemoMode, demoServices } from '../utils/demoMode.js';
import { supabase } from '../services/supabase.js';
import { 
  getInboxMessages, 
  getSentMessages, 
  sendMessage, 
  markAsRead,
  deleteMessage,
  getUsers,
  getUnreadCount
} from '../services/messageService.js';
import { showSuccess, showError } from '../utils/notifications.js';
import { formatDate, getInitials } from '../utils/helpers.js';

let currentUser = null;
let currentMessage = null;
let currentView = 'inbox'; // 'inbox' or 'sent'
let inboxMessages = [];
let sentMessages = [];
let replyToMessage = null;
let isDemo = false;

/**
 * Initialize messages page
 */
async function init() {
  try {
    // Check demo mode
    isDemo = isDemoMode();
    
    if (isDemo) {
      console.log('🎭 Running in DEMO MODE');
      currentUser = await demoServices.auth.getCurrentUser();
      showDemoBadge();
      loadDemoMessages();
    } else {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = './login.html';
        return;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      currentUser = profile;
      
      // Load messages
      await loadInboxMessages();
      await loadSentMessages();
      await updateUnreadBadge();
      
      // Load users for compose dropdown
      await loadUsers();
    }
    
    // Update UI with user info
    updateUserUI();
    
    // Setup event listeners
    setupEventListeners();
    
  } catch (error) {
    console.error('Error initializing messages page:', error);
    showError('Failed to load messages');
  }
}

/**
 * Show demo mode badge
 */
function showDemoBadge() {
  const demoBanner = document.createElement('div');
  demoBanner.className = 'alert alert-warning alert-dismissible fade show mb-0';
  demoBanner.style.borderRadius = '0';
  demoBanner.innerHTML = `
    <div class="container-fluid">
      <div class="d-flex align-items-center justify-content-between">
        <div>
          <i class="bi bi-info-circle-fill me-2"></i>
          <strong>Demo Mode:</strong> Viewing sample messages. Changes won't be saved.
          <a href="../pages/register.html" class="alert-link ms-2 fw-bold">Create Real Account</a>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>
    </div>
  `;
  document.querySelector('nav').after(demoBanner);
}

/**
 * Load demo messages
 */
function loadDemoMessages() {
  // Demo inbox messages
  inboxMessages = [
    {
      id: 'demo-msg-1',
      sender_id: 'demo-user-2',
      recipient_id: currentUser.id,
      subject: 'Welcome to ProjectHub!',
      body: 'Hi there! Welcome to the messaging system. Feel free to explore and test out the features. This is a demo message.',
      is_read: false,
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      sender: {
        id: 'demo-user-2',
        full_name: 'Sarah Johnson',
        email: 'sarah.johnson@demo.com',
        avatar_url: null
      }
    },
    {
      id: 'demo-msg-2',
      sender_id: 'demo-user-3',
      recipient_id: currentUser.id,
      subject: 'Project Update Request',
      body: 'Could you please send me an update on the current status of the Website Redesign project? Thanks!',
      is_read: true,
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      sender: {
        id: 'demo-user-3',
        full_name: 'Michael Chen',
        email: 'michael.chen@demo.com',
        avatar_url: null
      }
    }
  ];

  // Demo sent messages
  sentMessages = [
    {
      id: 'demo-msg-sent-1',
      sender_id: currentUser.id,
      recipient_id: 'demo-user-3',
      subject: 'Re: Project Update Request',
      body: 'Hi Michael, the project is progressing well. We are currently 75% complete and on track to finish by the end of the month.',
      is_read: true,
      created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      recipient: {
        id: 'demo-user-3',
        full_name: 'Michael Chen',
        email: 'michael.chen@demo.com',
        avatar_url: null
      }
    }
  ];

  renderInboxMessages();
  renderSentMessages();
  
  // Update badge
  const badge = document.getElementById('unreadBadge');
  if (badge) {
    const unreadCount = inboxMessages.filter(m => !m.is_read).length;
    badge.textContent = unreadCount;
    badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
  }
  
  // Load demo users
  loadDemoUsers();
}

/**
 * Update user UI elements
 */
function updateUserUI() {
  const userName = document.getElementById('userName');
  const userAvatar = document.getElementById('userAvatar');
  
  if (currentUser) {
    userName.textContent = currentUser.full_name || 'User';
    
    if (currentUser.avatar_url) {
      userAvatar.innerHTML = `<img src="${currentUser.avatar_url}" alt="Avatar" class="w-100 h-100 rounded-circle">`;
    } else {
      userAvatar.textContent = getInitials(currentUser.full_name || currentUser.email);
    }
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Compose button
  document.getElementById('composeBtn').addEventListener('click', showComposeView);
  
  // Compose form
  document.getElementById('composeForm').addEventListener('submit', handleSendMessage);
  
  // Cancel buttons
  document.getElementById('cancelComposeBtn').addEventListener('click', hideComposeView);
  document.getElementById('cancelBtn').addEventListener('click', hideComposeView);
  
  // Reply button
  document.getElementById('replyBtn').addEventListener('click', handleReply);
  
  // Delete button
  document.getElementById('deleteBtn').addEventListener('click', showDeleteModal);
  
  // Confirm delete
  document.getElementById('confirmDeleteBtn').addEventListener('click', handleDelete);
  
  // Tab change
  document.getElementById('inbox-tab').addEventListener('click', () => {
    currentView = 'inbox';
    hideMessageDetail();
  });
  
  document.getElementById('sent-tab').addEventListener('click', () => {
    currentView = 'sent';
    hideMessageDetail();
  });
  
  // Logout
  document.querySelector('[data-logout]').addEventListener('click', handleLogout);
}

/**
 * Load inbox messages
 */
async function loadInboxMessages() {
  try {
    inboxMessages = await getInboxMessages(currentUser.id);
    renderInboxMessages();
  } catch (error) {
    console.error('Error loading inbox:', error);
    showError('Failed to load inbox messages');
  }
}

/**
 * Load sent messages
 */
async function loadSentMessages() {
  try {
    sentMessages = await getSentMessages(currentUser.id);
    renderSentMessages();
  } catch (error) {
    console.error('Error loading sent messages:', error);
    showError('Failed to load sent messages');
  }
}

/**
 * Render inbox messages
 */
function renderInboxMessages() {
  const inboxList = document.getElementById('inboxList');
  
  if (inboxMessages.length === 0) {
    inboxList.innerHTML = `
      <div class="empty-state py-5">
        <i class="bi bi-inbox fs-1 mb-3"></i>
        <p>No messages in inbox</p>
      </div>
    `;
    return;
  }
  
  inboxList.innerHTML = inboxMessages.map(msg => `
    <div class="message-item ${msg.is_read ? '' : 'unread'}" data-message-id="${msg.id}">
      <div class="d-flex align-items-start">
        <div class="avatar-sm me-3 flex-shrink-0">
          ${msg.sender.avatar_url 
            ? `<img src="${msg.sender.avatar_url}" class="w-100 h-100 rounded-circle">` 
            : getInitials(msg.sender.full_name || msg.sender.email)}
        </div>
        <div class="flex-grow-1 overflow-hidden">
          <div class="d-flex justify-content-between align-items-start mb-1">
            <div class="fw-medium">${msg.sender.full_name || msg.sender.email}</div>
            <small class="text-muted">${formatDate(msg.created_at)}</small>
          </div>
          <div class="mb-1 ${msg.is_read ? '' : 'fw-semibold'}">${msg.subject}</div>
          <div class="text-muted small message-preview">${msg.body}</div>
        </div>
      </div>
    </div>
  `).join('');
  
  // Add click handlers
  inboxList.querySelectorAll('.message-item').forEach(item => {
    item.addEventListener('click', () => handleMessageClick(item.dataset.messageId, 'inbox'));
  });
}

/**
 * Render sent messages
 */
function renderSentMessages() {
  const sentList = document.getElementById('sentList');
  
  if (sentMessages.length === 0) {
    sentList.innerHTML = `
      <div class="empty-state py-5">
        <i class="bi bi-send fs-1 mb-3"></i>
        <p>No sent messages</p>
      </div>
    `;
    return;
  }
  
  sentList.innerHTML = sentMessages.map(msg => `
    <div class="message-item" data-message-id="${msg.id}">
      <div class="d-flex align-items-start">
        <div class="avatar-sm me-3 flex-shrink-0">
          ${msg.recipient.avatar_url 
            ? `<img src="${msg.recipient.avatar_url}" class="w-100 h-100 rounded-circle">` 
            : getInitials(msg.recipient.full_name || msg.recipient.email)}
        </div>
        <div class="flex-grow-1 overflow-hidden">
          <div class="d-flex justify-content-between align-items-start mb-1">
            <div class="fw-medium">To: ${msg.recipient.full_name || msg.recipient.email}</div>
            <small class="text-muted">${formatDate(msg.created_at)}</small>
          </div>
          <div class="mb-1">${msg.subject}</div>
          <div class="text-muted small message-preview">${msg.body}</div>
        </div>
      </div>
    </div>
  `).join('');
  
  // Add click handlers
  sentList.querySelectorAll('.message-item').forEach(item => {
    item.addEventListener('click', () => handleMessageClick(item.dataset.messageId, 'sent'));
  });
}

/**
 * Handle message click
 */
async function handleMessageClick(messageId, source) {
  const messages = source === 'inbox' ? inboxMessages : sentMessages;
  currentMessage = messages.find(m => m.id === messageId);
  
  if (!currentMessage) return;
  
  // Mark as read if it's an inbox message
  if (source === 'inbox' && !currentMessage.is_read) {
    if (!isDemo) {
      try {
        await markAsRead(messageId);
        await updateUnreadBadge();
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }
    currentMessage.is_read = true;
    await loadInboxMessages();
  }
  
  showMessageDetail();
  
  // Highlight selected message
  document.querySelectorAll('.message-item').forEach(item => {
    item.classList.remove('selected');
  });
  document.querySelector(`[data-message-id="${messageId}"]`)?.classList.add('selected');
}

/**
 * Show message detail
 */
function showMessageDetail() {
  if (!currentMessage) return;
  
  const sender = currentMessage.sender || currentMessage.recipient;
  const isSent = currentView === 'sent';
  
  document.getElementById('messageSubject').textContent = currentMessage.subject;
  document.getElementById('messageSenderName').textContent = 
    isSent 
      ? `To: ${currentMessage.recipient.full_name || currentMessage.recipient.email}`
      : currentMessage.sender.full_name || currentMessage.sender.email;
  document.getElementById('messageTime').textContent = formatDate(currentMessage.created_at);
  document.getElementById('messageBody').innerHTML = currentMessage.body.replace(/\n/g, '<br>');
  
  const avatar = document.getElementById('messageSenderAvatar');
  if (sender.avatar_url) {
    avatar.innerHTML = `<img src="${sender.avatar_url}" class="w-100 h-100 rounded-circle">`;
  } else {
    avatar.textContent = getInitials(sender.full_name || sender.email);
  }
  
  // Show/hide reply button based on view
  document.getElementById('replyBtn').style.display = isSent ? 'none' : 'inline-block';
  
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('composeView').style.display = 'none';
  document.getElementById('messageDetail').style.display = 'block';
}

/**
 * Hide message detail
 */
function hideMessageDetail() {
  document.getElementById('messageDetail').style.display = 'none';
  document.getElementById('emptyState').style.display = 'flex';
  currentMessage = null;
  
  // Remove selection
  document.querySelectorAll('.message-item').forEach(item => {
    item.classList.remove('selected');
  });
}

/**
 * Show compose view
 */
function showComposeView() {
  replyToMessage = null;
  document.getElementById('composeTitle').textContent = 'New Message';
  document.getElementById('recipientSelect').value = '';
  document.getElementById('subjectInput').value = '';
  document.getElementById('bodyTextarea').value = '';
  document.getElementById('recipientSelect').disabled = false;
  
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('messageDetail').style.display = 'none';
  document.getElementById('composeView').style.display = 'block';
}

/**
 * Hide compose view
 */
function hideComposeView() {
  document.getElementById('composeView').style.display = 'none';
  document.getElementById('emptyState').style.display = 'flex';
  replyToMessage = null;
}

/**
 * Handle reply
 */
function handleReply() {
  if (!currentMessage) return;
  
  replyToMessage = currentMessage;
  document.getElementById('composeTitle').textContent = 'Reply to Message';
  document.getElementById('recipientSelect').value = currentMessage.sender_id;
  document.getElementById('recipientSelect').disabled = true;
  document.getElementById('subjectInput').value = `Re: ${currentMessage.subject}`;
  document.getElementById('bodyTextarea').value = '';
  
  document.getElementById('messageDetail').style.display = 'none';
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('composeView').style.display = 'block';
}

/**
 * Handle send message
 */
async function handleSendMessage(e) {
  e.preventDefault();
  
  const sendBtn = document.getElementById('sendBtn');
  const originalText = sendBtn.innerHTML;
  
  try {
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending...';
    
    if (isDemo) {
      // Demo mode - just show success and update UI
      setTimeout(() => {
        showSuccess('Message sent successfully! (Demo mode - not actually saved)');
        hideComposeView();
        document.getElementById('composeForm').reset();
        replyToMessage = null;
        sendBtn.disabled = false;
        sendBtn.innerHTML = originalText;
      }, 500);
      return;
    }
    
    const messageData = {
      sender_id: currentUser.id,
      recipient_id: document.getElementById('recipientSelect').value,
      subject: document.getElementById('subjectInput').value,
      body: document.getElementById('bodyTextarea').value,
      parent_message_id: replyToMessage ? replyToMessage.id : null
    };
    
    await sendMessage(messageData);
    
    showSuccess('Message sent successfully!');
    hideComposeView();
    
    // Reload sent messages
    await loadSentMessages();
    
    // Clear form
    document.getElementById('composeForm').reset();
    replyToMessage = null;
    
  } catch (error) {
    console.error('Error sending message:', error);
    showError('Failed to send message');
  } finally {
    sendBtn.disabled = false;
    sendBtn.innerHTML = originalText;
  }
}

/**
 * Show delete modal
 */
function showDeleteModal() {
  const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
  modal.show();
}

/**
 * Handle delete message
 */
async function handleDelete() {
  if (!currentMessage) return;
  
  try {
    if (isDemo) {
      // Demo mode - just update UI
      const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
      modal.hide();
      
      showSuccess('Message deleted! (Demo mode - not actually saved)');
      
      // Remove from local array
      if (currentView === 'inbox') {
        inboxMessages = inboxMessages.filter(m => m.id !== currentMessage.id);
        renderInboxMessages();
      } else {
        sentMessages = sentMessages.filter(m => m.id !== currentMessage.id);
        renderSentMessages();
      }
      
      hideMessageDetail();
      return;
    }
    
    await deleteMessage(currentMessage.id);
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
    modal.hide();
    
    showSuccess('Message deleted successfully');
    
    // Reload messages
    if (currentView === 'inbox') {
      await loadInboxMessages();
    } else {
      await loadSentMessages();
    }
    
    await updateUnreadBadge();
    hideMessageDetail();
    
  } catch (error) {
    console.error('Error deleting message:', error);
    showError('Failed to delete message');
  }
}

/**
 * Load users for recipient dropdown
 */
async function loadUsers() {
  try {
    const users = await getUsers(currentUser.id);
    const select = document.getElementById('recipientSelect');
    
    select.innerHTML = '<option value="">Select recipient...</option>' + 
      users.map(user => `
        <option value="${user.id}">${user.full_name || user.email}</option>
      `).join('');
      
  } catch (error) {
    console.error('Error loading users:', error);
  }
}

/**
 * Load demo users for recipient dropdown
 */
function loadDemoUsers() {
  const demoUsers = [
    { id: 'demo-user-2', full_name: 'Sarah Johnson', email: 'sarah.johnson@demo.com' },
    { id: 'demo-user-3', full_name: 'Michael Chen', email: 'michael.chen@demo.com' },
    { id: 'demo-user-4', full_name: 'Emily Rodriguez', email: 'emily.rodriguez@demo.com' }
  ];
  
  const select = document.getElementById('recipientSelect');
  select.innerHTML = '<option value="">Select recipient...</option>' + 
    demoUsers.map(user => `
      <option value="${user.id}">${user.full_name}</option>
    `).join('');
}

/**
 * Update unread badge
 */
async function updateUnreadBadge() {
  try {
    const count = await getUnreadCount(currentUser.id);
    document.getElementById('unreadBadge').textContent = count;
    
    if (count > 0) {
      document.getElementById('unreadBadge').style.display = 'inline-block';
    } else {
      document.getElementById('unreadBadge').style.display = 'none';
    }
  } catch (error) {
    console.error('Error updating unread badge:', error);
  }
}

/**
 * Handle logout
 */
async function handleLogout(e) {
  e.preventDefault();
  try {
    if (isDemo) {
      await demoServices.auth.logout();
      window.location.href = '../index.html';
    } else {
      await supabase.auth.signOut();
      window.location.href = './login.html';
    }
  } catch (error) {
    console.error('Error logging out:', error);
    showError('Failed to logout');
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
