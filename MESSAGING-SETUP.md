# Internal Messaging System - Setup Instructions

## Overview

An internal messaging system has been added to ProjectHub. Users can now send messages to each other directly within the application.

## Features

✅ **Inbox & Sent Messages** - View received and sent messages in separate tabs  
✅ **Compose Messages** - Send messages to any user in the system  
✅ **Reply Functionality** - Reply to messages directly  
✅ **Unread Counter** - Badge showing unread message count in navbar  
✅ **Read/Unread Status** - Automatic marking of messages as read  
✅ **Delete Messages** - Remove unwanted messages  
✅ **User Selection** - Dropdown to select message recipients  
✅ **Responsive Design** - Works on mobile and desktop  

## Database Setup

To enable the messaging system, you need to apply the database migration to Supabase.

### Steps:

1. **Open Supabase Dashboard**
   - Go to https://supabase.com
   - Select your ProjectHub project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar

3. **Run Migration**
   - Copy the contents of `database/messages-schema.sql`
   - Paste into the SQL Editor
   - Click "Run" to execute

4. **Verify Tables**
   - Go to "Table Editor"
   - Confirm the `messages` table exists
   - Verify RLS policies are enabled

## Files Created

### Database
- `database/messages-schema.sql` - Database schema with RLS policies

### Services
- `services/messageService.js` - Message CRUD operations

### Pages
- `pages/messages.html` - Messages interface (inbox/sent/compose)

### Scripts
- `scripts/messages.js` - Message handling logic

### Integrations
- Updated `pages/dashboard.html` - Added messages icon with badge
- Updated `pages/projects.html` - Added messages icon with badge
- Updated `scripts/dashboard.js` - Added unread count function
- Updated `scripts/projects.js` - Added unread count function

## How to Use

### Send a Message

1. Navigate to any page (Dashboard or Projects)
2. Click the envelope icon (📧) in the navbar
3. Click "Compose" button
4. Select recipient from dropdown
5. Enter subject and message
6. Click "Send Message"

### Read Messages

1. Click the envelope icon in the navbar
2. Messages appear in the "Inbox" tab
3. Click any message to read it
4. Message is automatically marked as read

### Reply to a Message

1. Open a message in your inbox
2. Click the "Reply" button
3. Compose your reply
4. Click "Send Message"

### Delete Messages

1. Open the message you want to delete
2. Click the "Delete" button (🗑️)
3. Confirm deletion in the modal

## Security

- **Row Level Security (RLS)** enabled on messages table
- Users can only see messages they sent or received
- Admins can view all messages
- All queries use authenticated user IDs

## Navigation

The messages icon (📧) with an unread counter badge appears in the navbar on:
- Dashboard page
- Projects page
- Messages page

The counter updates automatically when new messages are received.

## Demo Mode

In demo mode, the messages feature shows sample data:
- Unread count shows "2" messages
- Full messaging functionality is available but changes won't persist

## Notes

- Messages are stored in the `public.messages` table
- Each message has a sender, recipient, subject, body, and read status
- Message threading is supported via `parent_message_id`
- Deleted messages are permanently removed (no soft delete)

## Troubleshooting

### Badge not showing
- Check that the database migration was applied
- Verify the user is logged in (not in demo mode)
- Check browser console for errors

### Can't send messages
- Verify recipient exists in the database
- Check that RLS policies are enabled
- Ensure user is authenticated

### Messages not loading
- Check Supabase connection in browser console
- Verify API keys are correct in `.env`
- Check RLS policies allow SELECT on messages table

---

**Need Help?** Check the browser console (F12) for error messages.
