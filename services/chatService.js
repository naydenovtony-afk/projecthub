/**
 * Chat Service - Team collaboration and messaging
 * Handles chat rooms, messages, and real-time communication
 */

import supabase from './supabase.js';
import { getCurrentUser } from '../scripts/auth.js';
import { isDemoMode } from '../utils/demoMode.js';

// Demo data for demo mode
const DEMO_ROOMS = [
  {
    id: 'room-1',
    name: 'Website Redesign Team',
    room_type: 'project',
    project_id: 'proj-1',
    created_by: 'demo-user-123',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    last_message_at: new Date(Date.now() - 3600000).toISOString(),
    participant_count: 4,
    unread_count: 2
  },
  {
    id: 'room-2',
    name: 'Marketing Campaign',
    room_type: 'project',
    project_id: 'proj-2',
    created_by: 'demo-user-123',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    last_message_at: new Date(Date.now() - 7200000).toISOString(),
    participant_count: 3,
    unread_count: 0
  }
];

const DEMO_MESSAGES = {
  'room-1': [
    {
      id: 'msg-1',
      user_id: 'demo-user-123',
      user_name: 'Demo User',
      message: 'Hey team! Just updated the project timeline.',
      created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'msg-2',
      user_id: 'demo-admin-456',
      user_name: 'Admin User',
      message: 'Great! Can you also review the budget?',
      created_at: new Date(Date.now() - 1800000).toISOString()
    }
  ],
  'room-2': [
    {
      id: 'msg-3',
      user_id: 'demo-user-123',
      user_name: 'Demo User',
      message: 'Starting work on the marketing materials.',
      created_at: new Date(Date.now() - 7200000).toISOString()
    }
  ]
};

/**
 * Get all chat rooms for current user
 * @returns {Promise<Array>} List of chat rooms
 */
export async function getChatRooms() {
  if (isDemoMode()) {
    return DEMO_ROOMS;
  }

  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('chat_rooms')
      .select(`
        *,
        chat_participants!inner(user_id, last_read_at),
        creator:profiles!chat_rooms_created_by_fkey(full_name, avatar_url)
      `)
      .eq('chat_participants.user_id', user.id)
      .eq('is_archived', false)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) throw error;

    // Get unread counts
    const roomsWithUnread = await Promise.all(
      data.map(async (room) => {
        const unreadCount = await getUnreadCount(room.id);
        return { ...room, unread_count: unreadCount };
      })
    );

    return roomsWithUnread;
  } catch (error) {
    console.error('Error fetching chat rooms:', error);
    return [];
  }
}

/**
 * Get messages for a chat room
 * @param {string} roomId - Room ID
 * @param {number} limit - Number of messages to fetch
 * @returns {Promise<Array>} List of messages
 */
export async function getRoomMessages(roomId, limit = 50) {
  if (isDemoMode()) {
    return DEMO_MESSAGES[roomId] || [];
  }

  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        user:profiles!chat_messages_user_id_fkey(id, full_name, avatar_url),
        reply_to:chat_messages!chat_messages_reply_to_id_fkey(id, message, user_id)
      `)
      .eq('room_id', roomId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

/**
 * Send a message to a chat room
 * @param {string} roomId - Room ID
 * @param {string} message - Message text
 * @param {string} replyToId - Optional message ID to reply to
 * @returns {Promise<Object>} Created message
 */
export async function sendMessage(roomId, message, replyToId = null) {
  if (isDemoMode()) {
    const user = await getCurrentUser();
    const newMessage = {
      id: `msg-${Date.now()}`,
      user_id: user.id,
      user_name: user.user_metadata?.full_name || 'Demo User',
      message,
      reply_to_id: replyToId,
      created_at: new Date().toISOString()
    };
    
    if (!DEMO_MESSAGES[roomId]) {
      DEMO_MESSAGES[roomId] = [];
    }
    DEMO_MESSAGES[roomId].push(newMessage);
    
    return newMessage;
  }

  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        user_id: user.id,
        message,
        reply_to_id: replyToId,
        message_type: 'text'
      })
      .select(`
        *,
        user:profiles!chat_messages_user_id_fkey(id, full_name, avatar_url)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

/**
 * Create a new chat room
 * @param {Object} roomData - Room data
 * @returns {Promise<Object>} Created room
 */
export async function createChatRoom(roomData) {
  if (isDemoMode()) {
    const newRoom = {
      id: `room-${Date.now()}`,
      ...roomData,
      created_at: new Date().toISOString(),
      last_message_at: null,
      unread_count: 0
    };
    DEMO_ROOMS.push(newRoom);
    return newRoom;
  }

  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const { data: room, error: roomError } = await supabase
      .from('chat_rooms')
      .insert({
        name: roomData.name,
        description: roomData.description,
        room_type: roomData.room_type || 'group',
        project_id: roomData.project_id,
        created_by: user.id
      })
      .select()
      .single();

    if (roomError) throw roomError;

    // Add creator as participant
    const { error: participantError } = await supabase
      .from('chat_participants')
      .insert({
        room_id: room.id,
        user_id: user.id,
        is_admin: true
      });

    if (participantError) throw participantError;

    // Add additional participants if provided
    if (roomData.participants && roomData.participants.length > 0) {
      const participants = roomData.participants.map(userId => ({
        room_id: room.id,
        user_id: userId,
        is_admin: false
      }));

      await supabase.from('chat_participants').insert(participants);
    }

    return room;
  } catch (error) {
    console.error('Error creating chat room:', error);
    throw error;
  }
}

/**
 * Add participant to chat room
 * @param {string} roomId - Room ID
 * @param {string} userId - User ID to add
 * @returns {Promise<Object>} Created participant
 */
export async function addParticipant(roomId, userId) {
  if (isDemoMode()) {
    return { room_id: roomId, user_id: userId };
  }

  try {
    const { data, error } = await supabase
      .from('chat_participants')
      .insert({
        room_id: roomId,
        user_id: userId
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding participant:', error);
    throw error;
  }
}

/**
 * Remove participant from chat room
 * @param {string} roomId - Room ID
 * @param {string} userId - User ID to remove
 * @returns {Promise<void>}
 */
export async function removeParticipant(roomId, userId) {
  if (isDemoMode()) {
    return;
  }

  try {
    const { error } = await supabase
      .from('chat_participants')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error removing participant:', error);
    throw error;
  }
}

/**
 * Mark messages as read in a room
 * @param {string} roomId - Room ID
 * @returns {Promise<void>}
 */
export async function markAsRead(roomId) {
  if (isDemoMode()) {
    return;
  }

  try {
    const user = await getCurrentUser();
    if (!user) return;

    const { error } = await supabase
      .from('chat_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('user_id', user.id);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking as read:', error);
  }
}

/**
 * Get unread message count for a room
 * @param {string} roomId - Room ID
 * @returns {Promise<number>} Unread count
 */
export async function getUnreadCount(roomId) {
  if (isDemoMode()) {
    const room = DEMO_ROOMS.find(r => r.id === roomId);
    return room?.unread_count || 0;
  }

  try {
    const user = await getCurrentUser();
    if (!user) return 0;

    const { data, error } = await supabase.rpc('get_unread_count', {
      p_room_id: roomId,
      p_user_id: user.id
    });

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}

/**
 * Search for users to add to chat
 * @param {string} query - Search query
 * @returns {Promise<Array>} List of users
 */
export async function searchUsers(query) {
  if (isDemoMode()) {
    return [
      { id: 'user-1', full_name: 'John Doe', email: 'john@example.com', avatar_url: null },
      { id: 'user-2', full_name: 'Jane Smith', email: 'jane@example.com', avatar_url: null }
    ];
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
}

/**
 * Subscribe to new messages in a room
 * @param {string} roomId - Room ID
 * @param {Function} callback - Callback function for new messages
 * @returns {Object} Subscription object
 */
export function subscribeToRoom(roomId, callback) {
  if (isDemoMode()) {
    return { unsubscribe: () => {} };
  }

  const subscription = supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`
      },
      async (payload) => {
        // Fetch complete message with user data
        const { data } = await supabase
          .from('chat_messages')
          .select(`
            *,
            user:profiles!chat_messages_user_id_fkey(id, full_name, avatar_url)
          `)
          .eq('id', payload.new.id)
          .single();

        if (data) {
          callback(data);
        }
      }
    )
    .subscribe();

  return subscription;
}

/**
 * Get chat room participants
 * @param {string} roomId - Room ID
 * @returns {Promise<Array>} List of participants
 */
export async function getRoomParticipants(roomId) {
  if (isDemoMode()) {
    return [
      { user_id: 'user-1', full_name: 'Demo User', avatar_url: null, is_admin: true },
      { user_id: 'user-2', full_name: 'Team Member', avatar_url: null, is_admin: false }
    ];
  }

  try {
    const { data, error } = await supabase
      .from('chat_participants')
      .select(`
        user_id,
        is_admin,
        joined_at,
        user:profiles!chat_participants_user_id_fkey(id, full_name, email, avatar_url)
      `)
      .eq('room_id', roomId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching participants:', error);
    return [];
  }
}

export default {
  getChatRooms,
  getRoomMessages,
  sendMessage,
  createChatRoom,
  addParticipant,
  removeParticipant,
  markAsRead,
  getUnreadCount,
  searchUsers,
  subscribeToRoom,
  getRoomParticipants
};
