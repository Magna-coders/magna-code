"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface User {
  id: string;
  username: string;
  avatar_url?: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: User;
}

interface Conversation {
  id: string;
  type: "direct" | "group";
  participants: Array<{
    user_id: string;
    users: User;
  }>;
  last_message?: Message;
  unread_count?: number;
}

interface Friend {
  friend_id: string;
  username: string;
  avatar_url?: string | null;
  bio?: string | null;
  connected_at: string;
}

interface PendingFriendRequest {
  id: string;
  sender_id: string;
  sender_username: string;
  sender_avatar_url?: string | null;
  message?: string | null;
  created_at: string;
}

interface FriendConversationData {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
}

interface FriendData {
  friend_id: string;
  username: string;
  avatar_url?: string | null;
}

function MessagesContent() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingFriendRequest[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [startingConversation, setStartingConversation] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"conversations" | "friends" | "requests">("conversations");
  const [friendSearchQuery, setFriendSearchQuery] = useState("");
  const [friendsPage, setFriendsPage] = useState(0);
  const friendsPerPage = 6;
  const [unreadMessages, setUnreadMessages] = useState<Record<string, number>>({});
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Reset pagination when search query changes
  useEffect(() => {
    setFriendsPage(0);
  }, [friendSearchQuery]);

  // Close mobile sidebar when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      setIsMobileSidebarOpen(false);
    }
  }, [selectedConversation]);

  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = searchParams.get("conversation");

  // Helper function to get conversation name
  const getConversationName = (conversation: Conversation) => {
    if (conversation.type === 'direct') {
      // For direct conversations, show the other participant's name
      const otherParticipant = conversation.participants.find(p => p.user_id !== currentUser?.id);
      return otherParticipant?.users.username || 'Unknown User';
    }
    // For group conversations, you could implement group name logic here
    return 'Group Chat';
  };

  // 1. Fetch logged-in user
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("id, username, avatar_url")
        .eq("id", user.id)
        .single();

      setCurrentUser(profile);
    };

    fetchUser();
  }, [router]);

  // 2. Fetch conversations
  useEffect(() => {
    if (!currentUser) return;

    const fetchConversations = async () => {
      // For now, only fetch friend conversations to ensure privacy
      // This ensures users only see conversations with their friends
      console.log("Fetching conversations for user:", currentUser.id);
      
      const { data: friendConversationsData, error: friendError } = await supabase
        .from("friend_conversations")
        .select(`
          id,
          user1_id,
          user2_id,
          created_at
        `)
        .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
        .order("id", { ascending: false });

      console.log("Raw friend conversations data:", friendConversationsData);
      console.log("Friend conversations error:", friendError);

      if (friendError) {
        console.error("Error fetching friend conversations:", friendError);
        setConversations([]);
        setLoading(false);
        return;
      }

      console.log("Friend conversations count:", friendConversationsData?.length || 0);

      // Transform conversations data - only friend conversations
      const transformedConversations: Conversation[] = [];

      // Process friend conversations
      if (friendConversationsData) {
        // Get friend details for better participant information
        const friendIds = friendConversationsData.map((conv: FriendConversationData) => {
          return conv.user1_id === currentUser.id ? conv.user2_id : conv.user1_id;
        });

        // Fetch friend details
        const { data: friendsData } = await supabase
          .from("user_friends")
          .select("friend_id, username, avatar_url")
          .in("friend_id", friendIds)
          .eq("user_id", currentUser.id);

        const friendMap = new Map<string, FriendData>();
        friendsData?.forEach((friend: FriendData) => {
          friendMap.set(friend.friend_id, friend);
        });

        const friendConversations = await Promise.all(
          (friendConversationsData as unknown[]).map(async (conv: unknown) => {
            const friendConv = conv as {
              id: string;
              user1_id: string;
              user2_id: string;
              created_at: string;
            };

            // Get the other user's ID
            const otherUserId = friendConv.user1_id === currentUser.id ? friendConv.user2_id : friendConv.user1_id;
            const friendInfo = friendMap.get(otherUserId) || { friend_id: otherUserId, username: 'Friend', avatar_url: null };

            // Fetch the latest message for this conversation
            const { data: latestMessageData } = await supabase
              .from("messages")
              .select(`
                id,
                sender_id,
                content,
                created_at,
                sender:users(id, username, avatar_url)
              `)
              .eq("conversation_id", friendConv.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

            return {
              id: friendConv.id,
              type: 'direct' as const,
              participants: [
                { user_id: currentUser.id, users: currentUser },
                { user_id: otherUserId, users: { id: otherUserId, username: friendInfo.username, avatar_url: friendInfo.avatar_url } }
              ],
              last_message: latestMessageData ? {
                id: latestMessageData.id,
                sender_id: latestMessageData.sender_id,
                content: latestMessageData.content,
                created_at: latestMessageData.created_at,
                sender: Array.isArray(latestMessageData.sender) 
                  ? latestMessageData.sender[0] as User 
                  : latestMessageData.sender as User
              } : undefined
            };
          })
        );
        transformedConversations.push(...friendConversations);
      }

      // Sort conversations by most recent activity (using last_message if available)
      const sortedConversations = transformedConversations.sort((a, b) => {
        // If both have last_message, compare those timestamps
        if (a.last_message?.created_at && b.last_message?.created_at) {
          return new Date(b.last_message.created_at).getTime() - new Date(a.last_message.created_at).getTime();
        }
        // If only one has last_message, prioritize the one with a message
        if (a.last_message?.created_at) return -1;
        if (b.last_message?.created_at) return 1;
        // If neither has last_message, keep original order
        return 0;
      });

      setConversations(sortedConversations);
      console.log("Transformed conversations:", sortedConversations);
      console.log("Current conversations state will be:", sortedConversations);

      if (conversationId) {
        const found = transformedConversations.find((c) => c.id === conversationId);
        if (found) {
          setSelectedConversation(found);
          fetchMessages(found.id);
        }
      }

      setLoading(false);
    };

    fetchConversations();
    
    // Only fetch friends and requests if current user is available
    if (currentUser) {
      fetchFriends();
      fetchPendingRequests();
    }
  }, [currentUser, conversationId]);

  // Fetch friends without conversations
  const fetchFriends = async () => {
    if (!currentUser) return;
    
    const { data, error } = await supabase
      .from("user_friends")
      .select("friend_id, username, avatar_url, bio, connected_at")
      .eq('user_id', currentUser.id)
      .order("connected_at", { ascending: false });

    if (error) {
      console.error("Error fetching friends:", error);
      return;
    }

    setFriends(data as Friend[]);
  };

  // Fetch pending friend requests
  const fetchPendingRequests = async () => {
    if (!currentUser) return;
    
    const { data, error } = await supabase
      .from("pending_friend_requests")
      .select("id, sender_id, sender_username, sender_avatar_url, message, created_at")
      .eq('receiver_id', currentUser.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching pending requests:", error);
      return;
    }

    setPendingRequests(data as PendingFriendRequest[]);
  };

  // 3. Fetch messages
  const fetchMessages = async (convId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("id, sender_id, content, created_at, sender:users(id, username, avatar_url)")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return;
    }

    // Transform the data to match the Message interface
    const transformedMessages: Message[] = (data as unknown as Message[] || []).map((msg: unknown) => {
      const message = msg as {
        id: string;
        sender_id: string;
        content: string;
        created_at: string;
        sender: unknown[];
      };
      
      return {
        id: message.id,
        sender_id: message.sender_id,
        content: message.content,
        created_at: message.created_at,
        sender: (message.sender as unknown[])?.[0] as User | undefined
      };
    });
    
    setMessages(transformedMessages);
    
    // Update the conversation's last message if there are messages
    if (transformedMessages.length > 0) {
      const lastMessage = transformedMessages[transformedMessages.length - 1];
      setConversations((prev) => prev.map(conv => 
        conv.id === convId 
          ? { ...conv, last_message: lastMessage }
          : conv
      ));
    }
  };

  // 4. Send message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !currentUser) return;

    setSending(true);

    const { data, error } = await supabase
      .from("messages")
      .insert([{
        conversation_id: selectedConversation.id,
        sender_id: currentUser.id,
        content: newMessage.trim(),
      }])
      .select("id, sender_id, content, created_at, sender:users(id, username, avatar_url)")
      .single();

    if (error) {
      console.error("Error sending message:", error);
      setSending(false);
      return;
    }

    // Transform the new message data to match Message interface
    const transformedMessage: Message = {
      id: data.id as string,
      sender_id: data.sender_id as string,
      content: data.content as string,
      created_at: data.created_at as string,
      sender: data.sender && Array.isArray(data.sender) && data.sender.length > 0 
        ? {
            id: data.sender[0].id as string,
            username: data.sender[0].username as string,
            avatar_url: data.sender[0].avatar_url as string | null
          }
        : undefined
    };
    
    // Add message with deduplication check
    setMessages((prev) => {
      // Check if message already exists to prevent duplicates
      const messageExists = prev.some(msg => msg.id === transformedMessage.id);
      if (messageExists) {
        return prev;
      }
      return [...prev, transformedMessage];
    });
    console.log("Message sent, updating conversations list...");
    
    // Update the conversation's last message in the conversations list and re-sort
    setConversations((prev) => {
      // Update the conversation's last message
      const updatedConversations = prev.map(conv => 
        conv.id === selectedConversation.id 
          ? { ...conv, last_message: transformedMessage }
          : conv
      );
      
      // Re-sort conversations by most recent activity
      return updatedConversations.sort((a, b) => {
        // If both have last_message, compare their timestamps
        if (a.last_message?.created_at && b.last_message?.created_at) {
          return new Date(b.last_message.created_at).getTime() - new Date(a.last_message.created_at).getTime();
        }
        // If only one has last_message, prioritize that one
        if (a.last_message?.created_at) return -1;
        if (b.last_message?.created_at) return 1;
        // If neither has last_message, maintain original order
        return 0;
      });
    });
    
    setNewMessage("");
    setSending(false);
    
    // Scroll to bottom when new message is added
    setTimeout(() => {
      const messagesContainer = document.querySelector('.flex-1.overflow-y-auto');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 100);
  };

  // 5. Select conversation
  const selectConversation = (conv: Conversation) => {
    // Add conversation to list if it doesn't exist
    setConversations((prev) => {
      const exists = prev.some(c => c.id === conv.id);
      if (!exists) {
        return [conv, ...prev];
      }
      return prev;
    });
    
    // Clear unread count for this conversation
    setUnreadMessages(prev => ({
      ...prev,
      [conv.id]: 0
    }));
    
    // Update conversation unread count in the list
    setConversations(prev => prev.map(c => 
      c.id === conv.id 
        ? { ...c, unread_count: 0 }
        : c
    ));
    
    setSelectedConversation(conv);
    fetchMessages(conv.id);
  };

  // Real-time subscription for messages
  useEffect(() => {
    if (!selectedConversation || !currentUser) return;

    console.log('Setting up real-time subscription for conversation:', selectedConversation.id);

    // Subscribe to new messages in the current conversation
    const subscription = supabase
      .channel(`messages:${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`
        },
        async (payload) => {
          console.log('Real-time message received:', payload);
          // Skip messages from the current user (they're already handled by sendMessage)
          if (payload.new.sender_id === currentUser.id) {
            return;
          }

          // Fetch the complete message with sender info
          const { data, error } = await supabase
            .from('messages')
            .select('id, sender_id, content, created_at, sender:users(id, username, avatar_url)')
            .eq('id', payload.new.id)
            .single();

          if (error) {
            console.error('Error fetching new message:', error);
            return;
          }

          // Transform the message data
          const transformedMessage: Message = {
            id: data.id as string,
            sender_id: data.sender_id as string,
            content: data.content as string,
            created_at: data.created_at as string,
            sender: data.sender && Array.isArray(data.sender) && data.sender.length > 0 
              ? {
                  id: data.sender[0].id as string,
                  username: data.sender[0].username as string,
                  avatar_url: data.sender[0].avatar_url as string | null
                }
              : undefined
          };

          // Add the new message to the messages list (with deduplication check)
          setMessages(prev => {
            // Check if message already exists to prevent duplicates
            const messageExists = prev.some(msg => msg.id === transformedMessage.id);
            if (messageExists) {
              return prev;
            }
            return [...prev, transformedMessage];
          });

          // Update the conversation's last message and re-sort
          setConversations((prev) => {
            const updatedConversations = prev.map(conv => 
              conv.id === selectedConversation.id 
                ? { ...conv, last_message: transformedMessage }
                : conv
            );
            
            // Re-sort conversations by most recent activity
            return updatedConversations.sort((a, b) => {
              // If both have last_message, compare their timestamps
              if (a.last_message?.created_at && b.last_message?.created_at) {
                return new Date(b.last_message.created_at).getTime() - new Date(a.last_message.created_at).getTime();
              }
              // If only one has last_message, prioritize that one
              if (a.last_message?.created_at) return -1;
              if (b.last_message?.created_at) return 1;
              // If neither has last_message, maintain original order
              return 0;
            });
          });

          // Scroll to bottom when new message is received
          setTimeout(() => {
            const messagesContainer = document.querySelector('.flex-1.overflow-y-auto');
            if (messagesContainer) {
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
          }, 100);
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    // Cleanup subscription when conversation changes or component unmounts
    return () => {
      console.log('Cleaning up subscription for conversation:', selectedConversation.id);
      supabase.removeChannel(subscription);
    };
  }, [selectedConversation?.id, currentUser?.id]);

  // Real-time subscription for new conversations
  useEffect(() => {
    if (!currentUser) return;

    // Subscribe to new friend conversations where current user is involved
    const conversationSubscription = supabase
      .channel(`friend_conversations:${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_conversations',
          filter: `or(user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id})`
        },
        async (payload) => {
          // Fetch the complete conversation with participant details
          const friendConv = payload.new as {
            id: string;
            user1_id: string;
            user2_id: string;
            created_at: string;
          };

          // Get the other user's ID
          const otherUserId = friendConv.user1_id === currentUser.id ? friendConv.user2_id : friendConv.user1_id;

          // Fetch friend details
          const { data: friendData } = await supabase
            .from("user_friends")
            .select("friend_id, username, avatar_url")
            .eq("friend_id", otherUserId)
            .eq("user_id", currentUser.id)
            .single();

          const friendInfo = friendData || { friend_id: otherUserId, username: 'Friend', avatar_url: null };

          // Create new conversation object
          const newConversation: Conversation = {
            id: friendConv.id,
            type: 'direct',
            participants: [
              { user_id: currentUser.id, users: currentUser },
              { user_id: otherUserId, users: { id: otherUserId, username: friendInfo.username, avatar_url: friendInfo.avatar_url } }
            ]
          };

          // Add to conversations list if it doesn't already exist
          setConversations(prev => {
            const exists = prev.some(conv => conv.id === friendConv.id);
            if (!exists) {
              return [newConversation, ...prev];
            }
            return prev;
          });
        }
      )
      .subscribe();

    // Subscribe to new participants being added to conversations
    const participantSubscription = supabase
      .channel(`participants:${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id.eq.${currentUser.id}`
        },
        async (payload) => {
          // A new participant was added (user was added to a conversation)
          const participant = payload.new as {
            conversation_id: string;
            user_id: string;
            joined_at: string;
          };

          // Check if this is a regular conversation (not friend_conversation)
          const { data: conversationData } = await supabase
            .from('conversations')
            .select('id, type')
            .eq('id', participant.conversation_id)
            .single();

          if (conversationData) {
            // Fetch the complete conversation with participants
            const { data: completeConversation } = await supabase
              .from('conversations')
              .select(`
                id, type,
                participants:conversation_participants(user_id, users(id, username, avatar_url))
              `)
              .eq('id', participant.conversation_id)
              .single();

            if (completeConversation) {
              const newConversation: Conversation = {
                id: completeConversation.id,
                type: completeConversation.type,
                participants: (completeConversation.participants as unknown[] || []).map((p: unknown) => {
                  const participant = p as {
                    user_id: string;
                    users: unknown[];
                  };
                  return {
                    user_id: participant.user_id,
                    users: (participant.users as unknown[])[0] as User
                  };
                })
              };

              // Add to conversations list if it doesn't already exist
              setConversations(prev => {
                const exists = prev.some(conv => conv.id === completeConversation.id);
                if (!exists) {
                  return [newConversation, ...prev];
                }
                return prev;
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationSubscription);
      supabase.removeChannel(participantSubscription);
    };
  }, [currentUser?.id]);

  // Global subscription for unread message tracking
  useEffect(() => {
    if (!currentUser) return;

    console.log('Setting up unread messages subscription for user:', currentUser.id);

    // Subscribe to all new messages to track unread counts
    const unreadSubscription = supabase
      .channel(`unread_messages:${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          console.log('Unread message subscription received:', payload);
          const newMessage = payload.new as {
            id: string;
            conversation_id: string;
            sender_id: string;
            content: string;
            created_at: string;
          };

          // Skip messages from the current user
          if (newMessage.sender_id === currentUser.id) {
            return;
          }

          // Check if this conversation involves the current user
          const { data: friendConvData } = await supabase
            .from('friend_conversations')
            .select('id')
            .eq('id', newMessage.conversation_id)
            .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
            .single();

          if (friendConvData) {
            // Only increment unread count if the conversation is not currently selected
            if (!selectedConversation || selectedConversation.id !== newMessage.conversation_id) {
              setUnreadMessages(prev => ({
                ...prev,
                [newMessage.conversation_id]: (prev[newMessage.conversation_id] || 0) + 1
              }));

              // Update conversations list with unread count
              setConversations(prev => prev.map(conv => 
                conv.id === newMessage.conversation_id 
                  ? { ...conv, unread_count: (conv.unread_count || 0) + 1 }
                  : conv
              ));
            }

            // Fetch the complete message with sender info for updating last_message
            const { data: messageData } = await supabase
              .from('messages')
              .select('id, sender_id, content, created_at, sender:users(id, username, avatar_url)')
              .eq('id', newMessage.id)
              .single();

            if (messageData) {
              const transformedMessage: Message = {
                id: messageData.id as string,
                sender_id: messageData.sender_id as string,
                content: messageData.content as string,
                created_at: messageData.created_at as string,
                sender: messageData.sender && Array.isArray(messageData.sender) && messageData.sender.length > 0 
                  ? {
                      id: messageData.sender[0].id as string,
                      username: messageData.sender[0].username as string,
                      avatar_url: messageData.sender[0].avatar_url as string | null
                    }
                  : undefined
              };

              // Update the conversation's last message and re-sort
              setConversations(prev => {
                const updatedConversations = prev.map(conv => 
                  conv.id === newMessage.conversation_id 
                    ? { ...conv, last_message: transformedMessage }
                    : conv
                );
                
                // Re-sort conversations by most recent activity
                return updatedConversations.sort((a, b) => {
                  if (a.last_message?.created_at && b.last_message?.created_at) {
                    return new Date(b.last_message.created_at).getTime() - new Date(a.last_message.created_at).getTime();
                  }
                  if (a.last_message?.created_at) return -1;
                  if (b.last_message?.created_at) return 1;
                  return 0;
                });
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Unread subscription status:', status);
      });

    return () => {
      console.log('Cleaning up unread subscription for user:', currentUser.id);
      supabase.removeChannel(unreadSubscription);
    };
  }, [currentUser?.id, selectedConversation?.id]);

  // 6. Back button
  const goBack = () => {
    setSelectedConversation(null);
    setMessages([]);
  };

  // 7. Start conversation with friend
  const startConversationWithFriend = async (friend: Friend) => {
    if (!currentUser || startingConversation) return;

    setStartingConversation(friend.friend_id);

    try {
      // Check if conversation already exists in friend_conversations table
      const { data: existingConversationData, error: checkError } = await supabase
        .from('friend_conversations')
        .select('id')
        .or(`and(user1_id.eq.${currentUser.id},user2_id.eq.${friend.friend_id}),and(user1_id.eq.${friend.friend_id},user2_id.eq.${currentUser.id})`)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error checking existing conversation:', checkError);
        return;
      }

      if (existingConversationData) {
        // Conversation exists, find it in our conversations array and select it
        const existingConversation = conversations.find(conv => conv.id === existingConversationData.id);
        if (existingConversation) {
          selectConversation(existingConversation);
          return;
        } else {
          // Conversation exists in DB but not in local array, just select it
          const friendUser = { id: friend.friend_id, username: friend.username, avatar_url: friend.avatar_url };
          const newConversation: Conversation = {
            id: existingConversationData.id,
            type: 'direct',
            participants: [
              { user_id: currentUser.id, users: currentUser },
              { user_id: friend.friend_id, users: friendUser }
            ]
          };
          selectConversation(newConversation);
          return;
        }
      }

      // Create new conversation in friend_conversations table
      const { data: conversationData, error: conversationError } = await supabase
        .from('friend_conversations')
        .insert([{ 
          user1_id: currentUser.id,
          user2_id: friend.friend_id,
          created_at: new Date().toISOString()
        }])
        .select('id')
        .single();

      if (conversationError) {
        if (conversationError.code === '23505') {
          // Duplicate key error - conversation already exists, try to find and select it
          const { data: duplicateConversationData } = await supabase
            .from('friend_conversations')
            .select('id')
            .or(`and(user1_id.eq.${currentUser.id},user2_id.eq.${friend.friend_id}),and(user1_id.eq.${friend.friend_id},user2_id.eq.${currentUser.id})`)
            .single();
          
          if (duplicateConversationData) {
             const existingConversation = conversations.find(conv => conv.id === duplicateConversationData.id);
             if (existingConversation) {
               selectConversation(existingConversation);
             } else {
               // Conversation exists but not in our array, manually add it
               const friendUser = { id: friend.friend_id, username: friend.username, avatar_url: friend.avatar_url };
               const newConversation: Conversation = {
                 id: duplicateConversationData.id,
                 type: 'direct',
                 participants: [
                   { user_id: currentUser.id, users: currentUser },
                   { user_id: friend.friend_id, users: friendUser }
                 ]
               };
               selectConversation(newConversation);
             }
           }
        } else {
          console.error('Error creating friend conversation:', conversationError);
        }
        return;
      }

      // CRITICAL: Add both users as participants in conversation_participants table
      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert([
          { 
            conversation_id: conversationData.id,
            user_id: currentUser.id,
            joined_at: new Date().toISOString()
          },
          { 
            conversation_id: conversationData.id,
            user_id: friend.friend_id,
            joined_at: new Date().toISOString()
          }
        ]);

      if (participantsError) {
        console.error('Error adding participants:', participantsError);
        return;
      }

      // Create new conversation object
      const newConversation: Conversation = {
        id: conversationData.id,
        type: 'direct',
        participants: [
          { user_id: currentUser.id, users: currentUser },
          { user_id: friend.friend_id, users: { id: friend.friend_id, username: friend.username, avatar_url: friend.avatar_url } }
        ]
      };

      // Select the conversation (it will be added to the list if needed)
      selectConversation(newConversation);
    } finally {
      setStartingConversation(null);
    }
  };

  // 8. Accept friend request
  const acceptFriendRequest = async (requestId: string) => {
    const { error } = await supabase.rpc('accept_friend_request', { request_id: requestId });
    
    if (error) {
      console.error('Error accepting friend request:', error);
      return;
    }

    // Refresh friends and pending requests for current user only
    if (currentUser) {
      const { data: friendsData } = await supabase
        .from("user_friends")
        .select("friend_id, username, avatar_url, bio, connected_at")
        .eq('user_id', currentUser.id)
        .order("connected_at", { ascending: false });

      if (friendsData) {
        setFriends(friendsData as Friend[]);
      }
    }

    setPendingRequests(prev => prev.filter(req => req.id !== requestId));
  };

  // 9. Decline friend request
  const declineFriendRequest = async (requestId: string) => {
    const { error } = await supabase.rpc('decline_friend_request', { request_id: requestId });
    
    if (error) {
      console.error('Error declining friend request:', error);
      return;
    }

    setPendingRequests(prev => prev.filter(req => req.id !== requestId));
  };

  if (loading) {
    return (
      <motion.div 
        className="min-h-screen bg-black flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.2
          }}
        >
          <div className="flex items-center space-x-2">
            <motion.div
              className="w-3 h-3 bg-[#FF9940] rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className="w-3 h-3 bg-[#E70008] rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
            />
            <motion.div
              className="w-3 h-3 bg-[#FF9940] rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
            />
          </div>
          <motion.p 
            className="text-[#F9E4AD] mt-4 text-center"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Loading messages...
          </motion.p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="flex min-h-screen bg-black text-white relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Mobile Overlay */}
      {isMobileSidebarOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.div 
        className={`
          fixed lg:relative lg:translate-x-0 z-50 lg:z-auto
          w-80 sm:w-96 lg:w-80 xl:w-96 
          bg-[#111] border-r border-[#333] 
          h-full lg:h-auto
          transition-transform duration-300 ease-in-out
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        initial={{ x: -320, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 100, 
          damping: 20,
          delay: 0.2 
        }}
      >
        <motion.div 
          className="p-3 sm:p-4 border-b border-[#333]"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-3">
            <motion.h2 
              className="text-lg sm:text-xl font-semibold text-[#F9E4AD]"
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Messages
            </motion.h2>
            {/* Close button for mobile */}
            <motion.button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg bg-[#222] hover:bg-[#333] transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          </div>
          <div className="flex space-x-1 bg-[#222] rounded-lg p-1">
            <motion.button
              onClick={() => setActiveTab("conversations")}
              className={`flex-1 py-2 px-2 sm:px-3 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                activeTab === "conversations" 
                  ? "bg-[#FF9940] text-black" 
                  : "text-gray-400 hover:text-white"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="hidden sm:inline">Chats ({conversations.length})</span>
              <span className="sm:hidden">Chats</span>
            </motion.button>
            <motion.button
              onClick={() => setActiveTab("friends")}
              className={`flex-1 py-2 px-2 sm:px-3 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                activeTab === "friends" 
                  ? "bg-[#FF9940] text-black" 
                  : "text-gray-400 hover:text-white"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="hidden sm:inline">Friends ({friends.length})</span>
              <span className="sm:hidden">Friends</span>
            </motion.button>
            <motion.button
              onClick={() => setActiveTab("requests")}
              className={`flex-1 py-2 px-2 sm:px-3 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                activeTab === "requests" 
                  ? "bg-[#FF9940] text-black" 
                  : "text-gray-400 hover:text-white"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="hidden sm:inline">Requests ({pendingRequests.length})</span>
              <span className="sm:hidden">Req</span>
            </motion.button>
          </div>
        </motion.div>
        <div className="overflow-y-auto h-[calc(100vh-140px)] sm:h-[calc(100%-120px)]">
          <AnimatePresence mode="wait">
            {/* Conversations Tab */}
            {activeTab === "conversations" && (
              <motion.div
                key="conversations"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                {conversations.length === 0 && (
                  <motion.div 
                    className="p-4 text-center text-gray-400"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: 0.1 }}
                  >
                    <p>No conversations yet</p>
                    <p className="text-xs mt-1">Start chatting with your friends!</p>
                  </motion.div>
                )}

                {conversations.map((conv, index) => {
                  console.log("Rendering conversation:", conv.id, "participants:", conv.participants);
                  const friendParticipant = conv.participants.find(
                    (p) => p.user_id !== currentUser?.id
                  );
                  const friendUser = friendParticipant?.users;
                  console.log("Friend participant:", friendParticipant, "friend user:", friendUser);

                  const hasUnreadMessages = (conv.unread_count || unreadMessages[conv.id]) && (conv.unread_count || unreadMessages[conv.id]) > 0;
                  
                  return (
                    <motion.div
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className={`p-3 sm:p-4 border-b cursor-pointer transition-all duration-300 min-h-[60px] sm:min-h-[auto] ${
                        selectedConversation?.id === conv.id 
                          ? "bg-[#222] border-[#FF9940]/50" 
                          : hasUnreadMessages
                          ? "bg-[#FF9940]/5 border-[#FF9940]/30 hover:bg-[#FF9940]/10"
                          : "border-[#333] hover:bg-[#222]"
                      }`}
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ 
                        x: 0, 
                        opacity: 1,
                        scale: hasUnreadMessages ? 1.01 : 1
                      }}
                      transition={{ 
                        delay: 0.1 * index + 0.2,
                        type: "spring",
                        stiffness: 100
                      }}
                      whileHover={{ scale: hasUnreadMessages ? 1.03 : 1.02, x: 5 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <motion.div 
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#FF9940]/20 flex items-center justify-center overflow-hidden flex-shrink-0"
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          {friendUser?.avatar_url ? (
                            <img
                              src={friendUser.avatar_url}
                              alt={friendUser.username}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <span className="text-xs sm:text-sm font-bold">
                              {friendUser?.username?.charAt(0).toUpperCase() || "?"}
                            </span>
                          )}
                        </motion.div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className={`font-medium text-sm sm:text-base truncate ${hasUnreadMessages ? 'text-[#F9E4AD] font-semibold' : 'text-[#F9E4AD]'}`}>
                            {friendUser?.username || "Unknown"}
                          </span>
                          {conv.last_message && (
                            <span className={`text-xs sm:text-sm truncate ${
                              hasUnreadMessages 
                                ? 'text-[#FF9940] font-semibold' 
                                : 'text-[#FF9940]/70'
                            }`}>
                              {hasUnreadMessages && conv.last_message.sender_id !== currentUser?.id && (
                                <span className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#FF9940] rounded-full mr-1 sm:mr-2 animate-pulse"></span>
                              )}
                              {conv.last_message.content}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          {conv.last_message && (
                            <span className="text-xs text-gray-500">
                              {(() => {
                                const messageTime = new Date(conv.last_message.created_at);
                                const now = new Date();
                                const diffInHours = (now.getTime() - messageTime.getTime()) / (1000 * 60 * 60);
                                
                                if (diffInHours < 24) {
                                  // Today - show time
                                  return messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                } else if (diffInHours < 48) {
                                  // Yesterday
                                  return 'Yesterday';
                                } else if (diffInHours < 168) {
                                  // This week - show day name
                                  return messageTime.toLocaleDateString([], { weekday: 'short' });
                                } else {
                                  // Older - show date
                                  return messageTime.toLocaleDateString([], { month: 'short', day: 'numeric' });
                                }
                              })()}
                            </span>
                          )}
                          {(conv.unread_count || unreadMessages[conv.id]) && (conv.unread_count || unreadMessages[conv.id]) > 0 && (
                            <motion.div
                              className="bg-[#FF9940] text-black text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            >
                              {Math.min(conv.unread_count || unreadMessages[conv.id] || 0, 99)}
                              {(conv.unread_count || unreadMessages[conv.id] || 0) > 99 && '+'}
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {/* Friends Tab */}
            {activeTab === "friends" && (
              <motion.div
                key="friends"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Search Bar */}
                <motion.div 
                  className="p-3 sm:p-4 border-b border-[#333]"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search friends..."
                      value={friendSearchQuery}
                      onChange={(e) => setFriendSearchQuery(e.target.value)}
                      className="w-full bg-[#222] text-white px-3 sm:px-4 py-2 sm:py-3 pl-9 sm:pl-10 rounded-lg border border-[#333] focus:border-[#FF9940] focus:outline-none transition-colors text-sm sm:text-base min-h-[44px]"
                    />
                    <div className="absolute left-2 sm:left-3 top-2 sm:top-2.5 text-gray-400 text-sm sm:text-base">
                      🔍
                    </div>
                  </div>
                </motion.div>

                {friends.length === 0 && (
                  <motion.div 
                    className="p-4 text-center text-gray-400"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: 0.1 }}
                  >
                    <p>No friends yet</p>
                    <p className="text-xs mt-1">Add friends to start chatting!</p>
                  </motion.div>
                )}

                {friends.length > 0 && friends.filter(friend => 
                  friendSearchQuery === "" || 
                  friend.username.toLowerCase().includes(friendSearchQuery.toLowerCase()) ||
                  (friend.bio && friend.bio.toLowerCase().includes(friendSearchQuery.toLowerCase()))
                ).length === 0 && friendSearchQuery !== "" && (
                  <motion.div 
                    className="p-4 text-center text-gray-400"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: 0.1 }}
                  >
                    <p>No friends found matching &quot;{friendSearchQuery}&quot;</p>
                    <p className="text-xs mt-1">Try a different search term</p>
                  </motion.div>
                )}

                {friends
                  .filter(friend => 
                    friendSearchQuery === "" || 
                    friend.username.toLowerCase().includes(friendSearchQuery.toLowerCase()) ||
                    (friend.bio && friend.bio.toLowerCase().includes(friendSearchQuery.toLowerCase()))
                  )
                  .slice(friendsPage * friendsPerPage, (friendsPage + 1) * friendsPerPage)
                  .map((friend, index) => (
                  <motion.div
                    key={friend.friend_id}
                    onClick={() => startConversationWithFriend(friend)}
                    className={`p-3 sm:p-4 border-b border-[#333] cursor-pointer hover:bg-[#222] transition-colors min-h-[60px] sm:min-h-[auto] ${
                      startingConversation === friend.friend_id ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ 
                      delay: 0.1 * index + 0.2,
                      type: "spring",
                      stiffness: 100
                    }}
                    whileHover={{ scale: startingConversation === friend.friend_id ? 1 : 1.02, x: startingConversation === friend.friend_id ? 0 : 5 }}
                    whileTap={{ scale: startingConversation === friend.friend_id ? 1 : 0.98 }}
                  >
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <motion.div 
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#FF9940]/20 flex items-center justify-center overflow-hidden flex-shrink-0"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        {friend.avatar_url ? (
                          <img
                            src={friend.avatar_url}
                            alt={friend.username}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <span className="text-xs sm:text-sm font-bold">
                            {friend.username?.charAt(0).toUpperCase() || "?"}
                          </span>
                        )}
                      </motion.div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-medium text-[#F9E4AD] text-sm sm:text-base truncate">
                          {friend.username}
                        </span>
                        {friend.bio && (
                          <span className="text-xs sm:text-sm text-gray-400 truncate">
                            {friend.bio}
                          </span>
                        )}
                        <span className="text-xs text-gray-500 truncate">
                          Connected {formatDistanceToNow(new Date(friend.connected_at), { addSuffix: true })}
                        </span>
                      </div>
                      {startingConversation === friend.friend_id ? (
                        <div className="w-4 h-4 border-2 border-[#FF9940] border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <div className="text-[#FF9940] text-sm">
                          💬
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                
                {/* Pagination Controls */}
                {friends.filter(friend => 
                  friendSearchQuery === "" || 
                  friend.username.toLowerCase().includes(friendSearchQuery.toLowerCase()) ||
                  (friend.bio && friend.bio.toLowerCase().includes(friendSearchQuery.toLowerCase()))
                ).length > friendsPerPage && (
                  <motion.div 
                    className="flex justify-between items-center p-4 border-t border-[#333]"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <motion.button
                      onClick={() => setFriendsPage(prev => Math.max(0, prev - 1))}
                      disabled={friendsPage === 0}
                      className={`px-3 py-1 rounded-md text-sm transition-colors ${
                        friendsPage === 0 
                          ? 'bg-[#222] text-gray-500 cursor-not-allowed' 
                          : 'bg-[#FF9940] text-black hover:bg-[#E70008]'
                      }`}
                      whileHover={friendsPage === 0 ? {} : { scale: 1.05 }}
                      whileTap={friendsPage === 0 ? {} : { scale: 0.95 }}
                    >
                      ← Previous
                    </motion.button>
                    
                    <span className="text-sm text-gray-400">
                      Page {friendsPage + 1} of {Math.ceil(friends.filter(friend => 
                        friendSearchQuery === "" || 
                        friend.username.toLowerCase().includes(friendSearchQuery.toLowerCase()) ||
                        (friend.bio && friend.bio.toLowerCase().includes(friendSearchQuery.toLowerCase()))
                      ).length / friendsPerPage)}
                    </span>
                    
                    <motion.button
                      onClick={() => setFriendsPage(prev => prev + 1)}
                      disabled={(friendsPage + 1) * friendsPerPage >= friends.filter(friend => 
                        friendSearchQuery === "" || 
                        friend.username.toLowerCase().includes(friendSearchQuery.toLowerCase()) ||
                        (friend.bio && friend.bio.toLowerCase().includes(friendSearchQuery.toLowerCase()))
                      ).length}
                      className={`px-3 py-1 rounded-md text-sm transition-colors ${
                        (friendsPage + 1) * friendsPerPage >= friends.filter(friend => 
                          friendSearchQuery === "" || 
                          friend.username.toLowerCase().includes(friendSearchQuery.toLowerCase()) ||
                          (friend.bio && friend.bio.toLowerCase().includes(friendSearchQuery.toLowerCase()))
                        ).length
                          ? 'bg-[#222] text-gray-500 cursor-not-allowed' 
                          : 'bg-[#FF9940] text-black hover:bg-[#E70008]'
                      }`}
                      whileHover={(friendsPage + 1) * friendsPerPage >= friends.filter(friend => 
                        friendSearchQuery === "" || 
                        friend.username.toLowerCase().includes(friendSearchQuery.toLowerCase()) ||
                        (friend.bio && friend.bio.toLowerCase().includes(friendSearchQuery.toLowerCase()))
                      ).length ? {} : { scale: 1.05 }}
                      whileTap={(friendsPage + 1) * friendsPerPage >= friends.filter(friend => 
                        friendSearchQuery === "" || 
                        friend.username.toLowerCase().includes(friendSearchQuery.toLowerCase()) ||
                        (friend.bio && friend.bio.toLowerCase().includes(friendSearchQuery.toLowerCase()))
                      ).length ? {} : { scale: 0.95 }}
                    >
                      Next →
                    </motion.button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Requests Tab */}
            {activeTab === "requests" && (
              <motion.div
                key="requests"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                {pendingRequests.length === 0 && (
                  <motion.div 
                    className="p-4 text-center text-gray-400"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: 0.1 }}
                  >
                    <p>No pending requests</p>
                    <p className="text-xs mt-1">Friend requests will appear here</p>
                  </motion.div>
                )}

                {pendingRequests.map((request, index) => (
                  <motion.div
                    key={request.id}
                    className="p-3 sm:p-4 border-b border-[#333]"
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ 
                      delay: 0.1 * index + 0.2,
                      type: "spring",
                      stiffness: 100
                    }}
                  >
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <motion.div 
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#FF9940]/20 flex items-center justify-center overflow-hidden flex-shrink-0"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        {request.sender_avatar_url ? (
                          <img
                            src={request.sender_avatar_url}
                            alt={request.sender_username}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <span className="text-xs sm:text-sm font-bold">
                            {request.sender_username?.charAt(0).toUpperCase() || "?"}
                          </span>
                        )}
                      </motion.div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-medium text-[#F9E4AD] text-sm sm:text-base truncate">
                          {request.sender_username}
                        </span>
                        {request.message && (
                          <span className="text-xs sm:text-sm text-gray-400 truncate">
                            {request.message}
                          </span>
                        )}
                        <span className="text-xs text-gray-500 truncate">
                          {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2 mt-2 sm:mt-3">
                      <motion.button
                        onClick={() => acceptFriendRequest(request.id)}
                        className="bg-[#FF9940] text-black px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm hover:bg-[#E70008] transition-colors flex-1 sm:flex-none"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Accept
                      </motion.button>
                      <motion.button
                        onClick={() => declineFriendRequest(request.id)}
                        className="bg-[#333] text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm hover:bg-[#444] transition-colors flex-1 sm:flex-none"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Decline
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Chat window */}
      <motion.div 
        className="flex-1 flex flex-col min-w-0"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ 
          type: "spring", 
          stiffness: 100, 
          damping: 20,
          delay: 0.4 
        }}
      >
        {/* Mobile Header with Hamburger */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-[#111] border-b border-[#333]">
          <motion.button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 rounded-lg bg-[#222] hover:bg-[#333] transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </motion.button>
          {selectedConversation && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-[#FF9940] to-[#E70008] rounded-full flex items-center justify-center text-sm font-bold">
                {getConversationName(selectedConversation).charAt(0).toUpperCase()}
              </div>
              <span className="font-medium text-sm truncate max-w-32">
                {getConversationName(selectedConversation)}
              </span>
            </div>
          )}
        </div>
        <AnimatePresence mode="wait">
          {selectedConversation ? (
            <motion.div
              key="chat"
              className="flex flex-col h-full"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              {/* Header with Back Button - Hidden on mobile */}
              <motion.div 
                className="hidden lg:flex items-center justify-between bg-[#111] border-b border-[#333] p-4"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <motion.button
                  onClick={goBack}
                  className="bg-[#FF9940] text-black px-4 py-1 rounded-lg hover:bg-[#E70008] transition-colors"
                  whileHover={{ scale: 1.05, x: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  ← Back
                </motion.button>
                <motion.div 
                  className="flex items-center space-x-3"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {(() => {
                    const otherParticipant = selectedConversation.participants.find(p => p.user_id !== currentUser?.id);
                    const otherUser = otherParticipant?.users;
                    const avatarUrl = otherUser?.avatar_url;
                    
                    return (
                      <>
                        <motion.div 
                          className="w-10 h-10 rounded-full bg-[#FF9940]/20 flex items-center justify-center overflow-hidden"
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={otherUser?.username || "User"}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            otherUser?.username?.charAt(0).toUpperCase() || "?"
                          )}
                        </motion.div>
                        <span className="font-medium text-[#F9E4AD]">
                          {otherUser?.username || "Unknown"}
                        </span>
                      </>
                    );
                  })()}
                </motion.div>
              </motion.div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
                <AnimatePresence>
                  {messages.length === 0 && (
                    <motion.p 
                      className="text-center text-gray-400 text-sm sm:text-base"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      No messages yet. Start the conversation!
                    </motion.p>
                  )}

                  {messages.map((msg, index) => (
                    <motion.div
                      key={msg.id}
                      className={`flex ${
                        msg.sender_id === currentUser?.id
                          ? "justify-end"
                          : "justify-start"
                      }`}
                      initial={{ opacity: 0, y: 20, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ 
                        type: "spring",
                        stiffness: 200,
                        damping: 20,
                        delay: index * 0.05
                      }}
                      layout
                    >
                      <motion.div
                        className={`max-w-[85%] sm:max-w-xs lg:max-w-md xl:max-w-lg px-3 sm:px-4 py-2 sm:py-3 rounded-lg ${
                          msg.sender_id === currentUser?.id
                            ? "bg-[#E70008] text-white"
                            : "bg-[#222] text-[#F9E4AD]"
                        }`}
                        whileHover={{ scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        {msg.sender_id !== currentUser?.id && msg.sender && (
                          <p className="text-xs text-[#FF9940] mb-1">
                            {msg.sender.username}
                          </p>
                        )}
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs mt-1 opacity-70">
                          {(() => {
                            const messageTime = new Date(msg.created_at);
                            const now = new Date();
                            const diffInMinutes = (now.getTime() - messageTime.getTime()) / (1000 * 60);
                            
                            if (diffInMinutes < 1) {
                              return 'Just now';
                            } else if (diffInMinutes < 60) {
                              // Within last hour - show minutes
                              return `${Math.floor(diffInMinutes)}m ago`;
                            } else if (diffInMinutes < 1440) {
                              // Today - show time
                              return messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            } else if (diffInMinutes < 2880) {
                              // Yesterday
                              return 'Yesterday';
                            } else {
                              // Older - show date and time
                              return messageTime.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                            }
                          })()}
                        </p>
                      </motion.div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Input */}
              <motion.form 
                onSubmit={sendMessage} 
                className="bg-[#111] border-t border-[#333] p-3 sm:p-4"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex space-x-2 sm:space-x-4">
                  <motion.input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-[#222] text-[#F9E4AD] rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#FF9940] min-h-[44px]"
                    disabled={sending}
                    whileFocus={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  />
                  <motion.button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="bg-[#E70008] hover:bg-[#FF9940] text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base min-h-[44px] min-w-[60px] sm:min-w-[80px]"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {sending ? (
                      <span className="hidden sm:inline">Sending...</span>
                    ) : (
                      <span className="hidden sm:inline">Send</span>
                    )}
                    {/* Mobile send icon */}
                    <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </motion.button>
                </div>
              </motion.form>
            </motion.div>
          ) : (
            <motion.div 
              className="flex items-center justify-center h-full text-[#F9E4AD]"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 200,
                damping: 20,
                delay: 0.3
              }}
            >
              <p>Select a conversation to start chatting</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// Wrapper component with Suspense boundary
export default function MessagesPage() {
  return (
    <Suspense fallback={
      <motion.div 
        className="min-h-screen bg-black flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.2
          }}
        >
          <div className="flex items-center space-x-2">
            <motion.div
              className="w-3 h-3 bg-[#FF9940] rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className="w-3 h-3 bg-[#E70008] rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
            />
            <motion.div
              className="w-3 h-3 bg-[#FF9940] rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
            />
          </div>
          <motion.p 
            className="text-[#F9E4AD] mt-4 text-center"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Loading messages...
          </motion.p>
        </motion.div>
      </motion.div>
    }>
      <MessagesContent />
    </Suspense>
  );
}
