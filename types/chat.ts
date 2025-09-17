export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file';
  created_at: string;
  edited_at?: string;
  is_edited: boolean;
  sender: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  created_at: string;
  updated_at: string;
  participants: ChatParticipant[];
  last_message?: {
    content: string;
    created_at: string;
    sender: {
      username: string;
    };
  };
}

export interface ChatParticipant {
  user_id: string;
  user: {
    username: string;
    avatar_url?: string;
  };
  joined_at: string;
  last_read_at?: string;
}

export interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  unreadCount: number;
  isTyping: boolean;
}