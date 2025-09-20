"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface User {
  id: string;
  username: string;
  email: string;
  avatar_url?: string | null;
  bio?: string;
  skills: string[];
  profileComplete: number;
  projectsJoined: number;
  connections: number;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  conversation_id: string;
  sender: {
    username: string;
    avatar_url?: string | null;
  };
}

interface Conversation {
  id: string;
  name?: string;
  type: 'direct' | 'group';
  participants: Array<{
    user_id: string;
    user: {
      username: string;
      avatar_url?: string | null;
    };
  }>;
  last_message?: Message;
  unread_count: number;
}

export default function MessagesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchUserData();
    // Skip Supabase auth listener - just use sample data
  }, []);

  useEffect(() => {
    if (user) {
      fetchConversations();
      // Add sample data for demo
      setTimeout(() => {
        setConversations([
          {
            id: '1',
            type: 'direct',
            participants: [
              {
                user_id: '2',
                user: {
                  username: 'Alice Chen',
                  avatar_url: null
                }
              }
            ],
            last_message: {
              id: '1',
              sender_id: '2',
              content: 'Hey! I saw your project on the dashboard, looks interesting!',
              created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
              conversation_id: '1',
              sender: {
                username: 'Alice Chen',
                avatar_url: null
              }
            },
            unread_count: 1,
            updated_at: new Date(Date.now() - 1000 * 60 * 15).toISOString()
          },
          {
            id: '2',
            type: 'group',
            name: 'React Project Team',
            participants: [
              {
                user_id: '2',
                user: {
                  username: 'Alice Chen',
                  avatar_url: null
                }
              },
              {
                user_id: '3',
                user: {
                  username: 'Bob Smith',
                  avatar_url: null
                }
              },
              {
                user_id: '4',
                user: {
                  username: 'Carol Johnson',
                  avatar_url: null
                }
              }
            ],
            last_message: {
              id: '2',
              sender_id: '3',
              content: 'I just pushed the latest changes to the repo',
              created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
              conversation_id: '2',
              sender: {
                username: 'Bob Smith',
                avatar_url: null
              }
            },
            unread_count: 0,
            updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
          },
          {
            id: '3',
            type: 'direct',
            participants: [
              {
                user_id: '5',
                user: {
                  username: 'David Wilson',
                  avatar_url: null
                }
              }
            ],
            last_message: {
              id: '3',
              sender_id: '1',
              content: 'Thanks for the code review!',
              created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
              conversation_id: '3',
              sender: {
                username: 'You',
                avatar_url: null
              }
            },
            unread_count: 0,
            updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
          }
        ]);
      }, 1000);
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages();
      markAsRead();
      
      // Add sample messages for demo
      if (selectedConversation.id === '1') {
        setMessages([
          {
            id: '1',
            sender_id: '2',
            content: 'Hey! I saw your project on the dashboard, looks interesting!',
            created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
            conversation_id: '1',
            sender: {
              username: 'Alice Chen',
              avatar_url: null
            }
          },
          {
            id: '2',
            sender_id: '1',
            content: 'Thanks Alice! It\'s a React app for collaborative coding. Would love to get your feedback.',
            created_at: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
            conversation_id: '1',
            sender: {
              username: 'You',
              avatar_url: null
            }
          },
          {
            id: '3',
            sender_id: '2',
            content: 'That sounds awesome! I\'m working on something similar. Maybe we could collaborate?',
            created_at: new Date(Date.now() - 1000 * 60 * 13).toISOString(),
            conversation_id: '1',
            sender: {
              username: 'Alice Chen',
              avatar_url: null
            }
          }
        ]);
      } else if (selectedConversation.id === '2') {
        setMessages([
          {
            id: '4',
            sender_id: '3',
            content: 'Hey team! I just pushed the latest changes to the repo',
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            conversation_id: '2',
            sender: {
              username: 'Bob Smith',
              avatar_url: null
            }
          },
          {
            id: '5',
            sender_id: '4',
            content: 'Great! I\'ll review them this afternoon',
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 1.5).toISOString(),
            conversation_id: '2',
            sender: {
              username: 'Carol Johnson',
              avatar_url: null
            }
          },
          {
            id: '6',
            sender_id: '2',
            content: 'The new UI components look fantastic! 🎨',
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
            conversation_id: '2',
            sender: {
              username: 'Alice Chen',
              avatar_url: null
            }
          }
        ]);
      }
    }
  }, [selectedConversation]);

  const fetchUserData = async () => {
    // Skip Supabase - use sample user data
    const sampleUser: User = {
      id: '1',
      username: 'You',
      email: 'user@example.com',
      avatar_url: null,
      bio: 'Software developer',
      skills: ['React', 'TypeScript', 'Node.js'],
      profileComplete: 85,
      projectsJoined: 3,
      connections: 12
    };
    
    setUser(sampleUser);
    setIsLoading(false);
  };

  const fetchConversations = async () => {
    // Skip Supabase - conversations are already set in useEffect with sample data
    console.log('Using sample conversations');
  };

  const fetchMessages = async () => {
    if (!selectedConversation) return;
    // Skip Supabase - messages are already set in useEffect with sample data
    console.log('Using sample messages');
  };

  const markAsRead = async () => {
    if (!selectedConversation || !user) return;
    // Skip Supabase - just update local state
    setConversations(prev => 
      prev.map(conv => 
        conv.id === selectedConversation.id 
          ? { ...conv, unread_count: 0 }
          : conv
      )
    );
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !user) return;

    setIsSending(true);
    
    // Create new message locally without Supabase
    const newMsg: Message = {
      id: Date.now().toString(),
      sender_id: user.id,
      content: newMessage.trim(),
      created_at: new Date().toISOString(),
      conversation_id: selectedConversation.id,
      sender: {
        username: user.username,
        avatar_url: user.avatar_url
      }
    };

    setMessages(prev => [...prev, newMsg]);
    setNewMessage('');
    setIsSending(false);
  };

  const handleLogout = async () => {
    // Skip Supabase logout - just redirect to login
    router.push('/login');
  };

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
  };

  const handleCloseChat = () => {
    setSelectedConversation(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-[#F9E4AD]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-[#111] border-b border-[#333] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <h1 className="text-2xl font-bold text-[#F9E4AD]">Messages</h1>
            <nav className="flex space-x-4">
              <a href="/dashboard" className="text-[#F9E4AD] hover:text-[#FF9940] transition-colors">
                Dashboard
              </a>
              <a href="/projects" className="text-[#F9E4AD] hover:text-[#FF9940] transition-colors">
                Projects
              </a>
              <a href="/messages" className="text-[#E70008] font-semibold">
                Messages
              </a>
              <a href="/profile" className="text-[#F9E4AD] hover:text-[#FF9940] transition-colors">
                Profile
              </a>
            </nav>
          </div>
          <button
            onClick={handleLogout}
            className="bg-[#E70008] hover:bg-[#FF9940] text-white px-4 py-2 rounded transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Conversations List */}
        <div className="w-80 bg-[#111] border-r border-[#333]">
          <div className="p-4 border-b border-[#333]">
            <h2 className="text-lg font-semibold text-[#F9E4AD]">Conversations</h2>
          </div>
          <div className="overflow-y-auto h-[calc(100%-65px)]">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className={`p-4 border-b border-[#333] cursor-pointer hover:bg-[#222] transition-colors ${
                  selectedConversation?.id === conversation.id ? 'bg-[#222]' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-[#F9E4AD]">
                    {conversation.name || conversation.participants.map(p => p.user.username).join(', ')}
                  </h3>
                  {conversation.unread_count > 0 && (
                    <span className="bg-[#E70008] text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                      {conversation.unread_count}
                    </span>
                  )}
                </div>
                {conversation.last_message && (
                  <p className="text-sm text-[#FF9940] truncate">
                    {conversation.last_message.content}
                  </p>
                )}
                {conversation.last_message && (
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDistanceToNow(new Date(conversation.last_message.created_at), { addSuffix: true })}
                  </p>
                )}
              </div>
            ))}
            {conversations.length === 0 && (
              <div className="p-4 text-center text-gray-400">
                <p>No conversations yet</p>
                <p className="text-xs mt-1">Start a conversation to begin chatting</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="bg-[#111] border-b border-[#333] px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#F9E4AD]">
                    {selectedConversation.name || selectedConversation.participants.map(p => p.user.username).join(', ')}
                  </h2>
                  <p className="text-sm text-[#FF9940]">
                    {selectedConversation.participants.length} members
                  </p>
                </div>
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="text-[#F9E4AD] hover:text-[#FF9940] transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender_id === user?.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg ${
                      message.sender_id === user?.id
                        ? 'bg-[#E70008] text-white'
                        : 'bg-[#222] text-[#F9E4AD]'
                    }`}>
                      {message.sender_id !== user?.id && (
                        <p className="text-xs text-[#FF9940] mb-1">
                          {message.sender.username}
                        </p>
                      )}
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="text-center text-gray-400 py-8">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <form onSubmit={sendMessage} className="bg-[#111] border-t border-[#333] p-4">
                <div className="flex space-x-4">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-[#222] text-[#F9E4AD] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF9940]"
                    disabled={isSending}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || isSending}
                    className="bg-[#E70008] hover:bg-[#FF9940] text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-[#F9E4AD]">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <p className="text-xl">Select a conversation to start chatting</p>
                <p className="text-sm mt-2 text-gray-400">Choose from your conversations on the left</p>
              </div>
            </div>
          )}
        </div>

        {/* Active Members */}
        <div className="w-64 bg-[#111] border-l border-[#333]">
          <div className="p-4 border-b border-[#333]">
            <h3 className="text-lg font-semibold text-[#F9E4AD]">Active Members</h3>
          </div>
          <div className="p-4 space-y-3 overflow-y-auto h-[calc(100%-65px)]">
            {selectedConversation && selectedConversation.participants.map((participant, index) => (
              <div key={index} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-[#222] transition-colors">
                <div className="w-8 h-8 bg-[#FF9940] rounded-full flex items-center justify-center text-sm font-semibold text-black">
                  {participant.user.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#F9E4AD] truncate">{participant.user.username}</p>
                  <p className="text-xs text-green-400">online</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-400" />
              </div>
            ))}
            {!selectedConversation && (
              <div className="text-center text-gray-400 text-sm py-4">
                <p>Select a conversation to see members</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}