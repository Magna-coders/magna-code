# Chat System Setup Guide

## Database Schema Setup

Due to the missing `projects` table, I've created a fixed version of the chat schema that removes the dependency on the projects table.

### Option 1: Use the Fixed Schema
Run the SQL script `create-chat-schema-fixed.sql` instead of `create-chat-schema.sql`:

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `create-chat-schema-fixed.sql`
4. Run the script

### Option 2: Create Projects Table First
If you need the projects functionality, you can create the projects table first:

```sql
-- Create projects table (if needed)
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Then run the original create-chat-schema.sql
```

## Files Updated
- ✅ `create-chat-schema-fixed.sql` - Fixed schema without projects dependency
- ✅ `types/chat.ts` - Removed project_id from Conversation interface
- ✅ `lib/supabase/chat.ts` - Removed projectId parameter from createConversation function

## Testing the Chat System

1. Make sure your dev server is running (`npm run dev`)
2. Visit http://localhost:3000
3. Log in to your account
4. Navigate to the dashboard or members page
5. Click on the "Chat" buttons to start conversations

## Features Available
- ✅ Real-time messaging with Supabase Realtime
- ✅ Direct messaging between users
- ✅ Message history
- ✅ Unread message indicators
- ✅ User avatars and usernames in chat
- ✅ Responsive chat interface

## Troubleshooting

If you encounter any other schema errors:
1. Check the Supabase dashboard for table existence
2. Run the fixed schema file: `create-chat-schema-fixed.sql`
3. Ensure all RLS policies are properly set up
4. Check browser console for any JavaScript errors