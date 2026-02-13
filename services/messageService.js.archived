/**
 * Message Service
 * Handles all message-related database operations
 */

import { supabase } from './supabase.js';

/**
 * Get all messages for the current user (inbox)
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of received messages with sender details
 */
export async function getInboxMessages(userId) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching inbox messages:', error);
    throw error;
  }
}

/**
 * Get sent messages for the current user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of sent messages with recipient details
 */
export async function getSentMessages(userId) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        recipient:recipient_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('sender_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching sent messages:', error);
    throw error;
  }
}

/**
 * Get a single message by ID
 * @param {string} messageId - Message ID
 * @returns {Promise<Object>} Message with sender and recipient details
 */
export async function getMessageById(messageId) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id (
          id,
          full_name,
          email,
          avatar_url
        ),
        recipient:recipient_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('id', messageId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching message:', error);
    throw error;
  }
}

/**
 * Send a new message
 * @param {Object} messageData - Message data
 * @param {string} messageData.recipient_id - Recipient user ID
 * @param {string} messageData.subject - Message subject
 * @param {string} messageData.body - Message body
 * @param {string} messageData.sender_id - Sender user ID
 * @param {string} [messageData.parent_message_id] - Parent message ID for replies
 * @returns {Promise<Object>} Created message
 */
export async function sendMessage(messageData) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert([{
        sender_id: messageData.sender_id,
        recipient_id: messageData.recipient_id,
        subject: messageData.subject,
        body: messageData.body,
        parent_message_id: messageData.parent_message_id || null,
        is_read: false
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

/**
 * Mark a message as read
 * @param {string} messageId - Message ID
 * @returns {Promise<Object>} Updated message
 */
export async function markAsRead(messageId) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .update({ 
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }
}

/**
 * Mark a message as unread
 * @param {string} messageId - Message ID
 * @returns {Promise<Object>} Updated message
 */
export async function markAsUnread(messageId) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .update({ 
        is_read: false,
        read_at: null
      })
      .eq('id', messageId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error marking message as unread:', error);
    throw error;
  }
}

/**
 * Delete a message
 * @param {string} messageId - Message ID
 * @returns {Promise<void>}
 */
export async function deleteMessage(messageId) {
  try {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
}

/**
 * Get unread message count for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Count of unread messages
 */
export async function getUnreadCount(userId) {
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }
}

/**
 * Search messages by subject or body
 * @param {string} userId - User ID
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of matching messages
 */
export async function searchMessages(userId, query) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id (
          id,
          full_name,
          email,
          avatar_url
        ),
        recipient:recipient_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .or(`recipient_id.eq.${userId},sender_id.eq.${userId}`)
      .or(`subject.ilike.%${query}%,body.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching messages:', error);
    throw error;
  }
}

/**
 * Get all users (for recipient selection)
 * @param {string} currentUserId - Current user ID (to exclude from results)
 * @returns {Promise<Array>} Array of users
 */
export async function getUsers(currentUserId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .neq('id', currentUserId)
      .order('full_name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

/**
 * Get message thread (parent and replies)
 * @param {string} messageId - Message ID
 * @returns {Promise<Array>} Array of messages in thread
 */
export async function getMessageThread(messageId) {
  try {
    // First get the message to find the parent
    const message = await getMessageById(messageId);
    const parentId = message.parent_message_id || messageId;

    // Get all messages in thread
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id (
          id,
          full_name,
          email,
          avatar_url
        ),
        recipient:recipient_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .or(`id.eq.${parentId},parent_message_id.eq.${parentId}`)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching message thread:', error);
    throw error;
  }
}
