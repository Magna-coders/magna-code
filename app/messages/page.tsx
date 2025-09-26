"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/src/lib/supabase/client";
import { subscriptionManager } from "@/src/lib/supabase/subscription-manager";
import { getOptimizedConversations, getOptimizedMessages, clearCache } from "@/src/lib/supabase/query-optimizer";
import { connectionMonitor } from "@/src/lib/supabase/connection-monitor";

interface User {
  id: string;
  username: string;
  avatar_url?: string | null;
}

interface Message {
  id: string;
  conversation_id: string;
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

// Database response types
interface FriendConversationData {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  last_message?: unknown[];
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
  const [conversationsPage, setConversationsPage] = useState(0);
  const [requestsPage, setRequestsPage] = useState(0);
  const [conversationSearchQuery, setConversationSearchQuery] = useState("");
  const friendsPerPage = 6;
  const conversationsPerPage = 6;
  const requestsPerPage = 6;
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [unreadMessages, setUnreadMessages] = useState<Set<string>>(new Set());
  const [newMessageAlert, setNewMessageAlert] = useState<string | null>(null);

  // Reset pagination when search query changes
  useEffect(() => {
    setFriendsPage(0);
  }, [friendSearchQuery]);

  // Reset conversations pagination when conversations change
  useEffect(() => {
    setConversationsPage(0);
  }, [conversations]);

  useEffect(() => {
    setConversationsPage(0);
  }, [conversationSearchQuery]);

  useEffect(() => {
    setRequestsPage(0);
  }, [pendingRequests]);

  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = searchParams.get("conversation");

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
          created_at,
          last_message:messages(id, conversation_id, sender_id, content, created_at, sender:users(id, username, avatar_url))
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

        const friendConversations = (friendConversationsData as unknown[]).map((conv: unknown) => {
          const friendConv = conv as {
            id: string;
            user1_id: string;
            user2_id: string;
            created_at: string;
            last_message?: unknown[];
          };

          // Get the other user's ID
          const otherUserId = friendConv.user1_id === currentUser.id ? friendConv.user2_id : friendConv.user1_id;
          const friendInfo = friendMap.get(otherUserId) || { friend_id: otherUserId, username: 'Friend', avatar_url: null };

          return {
            id: friendConv.id,
            type: 'direct' as const,
            participants: [
              { user_id: currentUser.id, users: currentUser },
              { user_id: otherUserId, users: { id: otherUserId, username: friendInfo.username, avatar_url: friendInfo.avatar_url } }
            ],
            last_message: friendConv.last_message?.[0] ? {
              id: (friendConv.last_message[0] as { id: string }).id,
              conversation_id: friendConv.id,
              sender_id: (friendConv.last_message[0] as { sender_id: string }).sender_id,
              content: (friendConv.last_message[0] as { content: string }).content,
              created_at: (friendConv.last_message[0] as { created_at: string }).created_at,
              sender: ((friendConv.last_message[0] as { sender: unknown[] }).sender?.[0] as User | undefined)
            } : undefined
          };
        });
        transformedConversations.push(...friendConversations);
      }

      // Sort conversations by most recent activity (last message timestamp)
      const sortedConversations = transformedConversations.sort((a, b) => {
        const aTime = a.last_message?.created_at || '0';
        const bTime = b.last_message?.created_at || '0';
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
      
      setConversations(sortedConversations);
      console.log("Transformed conversations:", transformedConversations);
      console.log("Current conversations state will be:", transformedConversations);

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
        conversation_id: convId,
        sender_id: message.sender_id,
        content: message.content,
        created_at: message.created_at,
        sender: (message.sender as unknown[])?.[0] as User | undefined
      };
    });
    
    setMessages(transformedMessages);
    
    // Update the conversation's last message if there are messages and sort by recent activity
    if (transformedMessages.length > 0) {
      const lastMessage = transformedMessages[transformedMessages.length - 1];
      setConversations((prev) => {
        const updatedConversations = prev.map(conv => 
          conv.id === convId 
            ? { ...conv, last_message: lastMessage }
            : conv
        );
        
        // Sort conversations by most recent activity (last message timestamp)
        return updatedConversations.sort((a, b) => {
          const aTime = a.last_message?.created_at || '0';
          const bTime = b.last_message?.created_at || '0';
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });
      });
    }
  };

  // 4. Send message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;
    
    // If we have a selected friend but no conversation, create the conversation first
    let conversationId = selectedConversation?.id;
    let targetConversation = selectedConversation;
    
    if (!conversationId && selectedFriend) {
      setSending(true);
      
      try {
        // Check if conversation already exists in friend_conversations table
        const { data: existingConversationData, error: checkError } = await supabase
          .from('friend_conversations')
          .select('id')
          .or(`and(user1_id.eq.${currentUser.id},user2_id.eq.${selectedFriend.friend_id}),and(user1_id.eq.${selectedFriend.friend_id},user2_id.eq.${currentUser.id})`)
          .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error
          console.error('Error checking existing conversation:', checkError);
          setSending(false);
          return;
        }

        if (existingConversationData) {
          // Conversation exists, use it
          conversationId = existingConversationData.id;
          
          // Create conversation object for local state
          const friendUser = { id: selectedFriend.friend_id, username: selectedFriend.username, avatar_url: selectedFriend.avatar_url };
          targetConversation = {
            id: existingConversationData.id,
            type: 'direct',
            participants: [
              { user_id: currentUser.id, users: currentUser },
              { user_id: selectedFriend.friend_id, users: friendUser }
            ]
          };
          
          // Set the conversation
          console.log('Setting existing conversation:', targetConversation);
          setSelectedConversation(targetConversation);
        } else {
          // Create new conversation in friend_conversations table
          const { data: conversationData, error: conversationError } = await supabase
            .from('friend_conversations')
            .insert([{ 
              user1_id: currentUser.id,
              user2_id: selectedFriend.friend_id,
              created_at: new Date().toISOString()
            }])
            .select('id')
            .single();

          if (conversationError) {
            if (conversationError.code === '23505') {
              // Duplicate key error - conversation already exists, try to find and use it
              const { data: duplicateConversationData } = await supabase
                .from('friend_conversations')
                .select('id')
                .or(`and(user1_id.eq.${currentUser.id},user2_id.eq.${selectedFriend.friend_id}),and(user1_id.eq.${selectedFriend.friend_id},user2_id.eq.${currentUser.id})`)
                .single();
              
              if (duplicateConversationData) {
                conversationId = duplicateConversationData.id;
                
                // Create conversation object for local state
                const friendUser = { id: selectedFriend.friend_id, username: selectedFriend.username, avatar_url: selectedFriend.avatar_url };
                targetConversation = {
                  id: duplicateConversationData.id,
                  type: 'direct',
                  participants: [
                    { user_id: currentUser.id, users: currentUser },
                    { user_id: selectedFriend.friend_id, users: friendUser }
                  ]
                };
                
                setSelectedConversation(targetConversation);
              }
            } else {
              console.error('Error creating friend conversation:', conversationError);
              setSending(false);
              return;
            }
          } else {
            conversationId = conversationData.id;
            
            // Create conversation object for local state
            const friendUser = { id: selectedFriend.friend_id, username: selectedFriend.username, avatar_url: selectedFriend.avatar_url };
            targetConversation = {
              id: conversationData.id,
              type: 'direct',
              participants: [
                { user_id: currentUser.id, users: currentUser },
                { user_id: selectedFriend.friend_id, users: friendUser }
              ]
            };
            
            console.log('Setting newly created conversation:', targetConversation);
            setSelectedConversation(targetConversation);
            
            // Add a small delay to ensure subscription is properly established
            setTimeout(() => {
              console.log('Conversation subscription should be active for:', conversationData.id);
            }, 500);
          }

          // Add both users as participants in conversation_participants table
          const { error: participantsError } = await supabase
            .from('conversation_participants')
            .insert([
              { 
                conversation_id: conversationId,
                user_id: currentUser.id,
                joined_at: new Date().toISOString()
              },
              { 
                conversation_id: conversationId,
                user_id: selectedFriend.friend_id,
                joined_at: new Date().toISOString()
              }
            ]);

          if (participantsError) {
            console.error('Error adding participants:', participantsError);
            setSending(false);
            return;
          }
        }
      } catch (error) {
        console.error('Error creating conversation:', error);
        setSending(false);
        return;
      }
    }
    
    if (!conversationId) {
      console.error('No conversation available to send message');
      setSending(false);
      return;
    }

    // Ensure we have a target conversation object
    if (!targetConversation) {
      // Try to find the conversation in our conversations list
      const foundConversation = conversations.find(c => c.id === conversationId);
      if (foundConversation) {
        targetConversation = foundConversation;
      } else {
        console.error('No target conversation object available');
        setSending(false);
        return;
      }
    }

    setSending(true);

    const { data, error } = await supabase
      .from("messages")
      .insert([{
        conversation_id: conversationId,
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
      conversation_id: targetConversation.id,
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
    
    setMessages((prev) => [...prev, transformedMessage]);
    console.log("Message sent, updating conversations list...");
    
    // Update the conversation's last message in the conversations list and sort by recent activity
    if (targetConversation) {
      setConversations((prev) => {
        const exists = prev.some(c => c.id === targetConversation.id);
        let updatedConversations;
        
        if (!exists) {
          updatedConversations = [targetConversation, ...prev];
        } else {
          updatedConversations = prev.map(conv => 
            conv.id === targetConversation.id 
              ? { ...conv, last_message: transformedMessage }
              : conv
          );
        }
        
        // Sort conversations by most recent activity (last message timestamp)
        return updatedConversations.sort((a, b) => {
          const aTime = a.last_message?.created_at || '0';
          const bTime = b.last_message?.created_at || '0';
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });
      });
    }
    
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
    
    setSelectedConversation(conv);
    fetchMessages(conv.id);
  };

  // Real-time subscription for messages
  useEffect(() => {
    if (!selectedConversation || !currentUser) return;

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
          console.log('New message received:', payload.new);
          
          // Skip messages from the current user (they're already handled by sendMessage)
          if (payload.new.sender_id === currentUser.id) {
            console.log('Skipping own message');
            return;
          }

          // Fetch the complete message with sender info
          const { data, error } = await supabase
            .from('messages')
            .select('id, sender_id, content, created_at, sender:users(id, username, avatar_url)')
            .eq('id', payload.new.id)
            .single();

          console.log('Fetched message data:', { data, error });

          if (error) {
            console.error('Error fetching new message:', error);
            return;
          }

          // Transform the message data
          const transformedMessage: Message = {
            id: data.id as string,
            conversation_id: payload.new.conversation_id as string,
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

          // Add the new message to the messages array
          setMessages((prev) => {
            console.log('Adding message to display:', transformedMessage);
            return [...prev, transformedMessage];
          });

          // Update the conversation's last message and sort by recent activity
          setConversations((prev) => {
            console.log('Updating conversation last message for:', selectedConversation.id);
            const updatedConversations = prev.map(conv => 
              conv.id === selectedConversation.id 
                ? { ...conv, last_message: transformedMessage }
                : conv
            );
            
            // Sort conversations by most recent activity (last message timestamp)
            return updatedConversations.sort((a, b) => {
              const aTime = a.last_message?.created_at || '0';
              const bTime = b.last_message?.created_at || '0';
              return new Date(bTime).getTime() - new Date(aTime).getTime();
            });
          });

          // Add visual indicator for new message (only if not from current user)
          if (transformedMessage.sender_id !== currentUser?.id) {
            setNewMessageAlert(`New message from ${transformedMessage.sender?.username || 'Unknown'}`);
            setTimeout(() => setNewMessageAlert(null), 3000);

            // Add to unread messages if conversation is not currently active
            setUnreadMessages(prev => new Set([...prev, selectedConversation.id]));
          }

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
        console.log('Selected conversation subscription status:', status);
      });

    // Cleanup subscription when conversation changes or component unmounts
    return () => {
      console.log('Removing subscription for conversation:', selectedConversation.id);
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

          // Add to conversations list if it doesn't already exist and sort by recent activity
          setConversations(prev => {
            const exists = prev.some(conv => conv.id === friendConv.id);
            let updatedConversations;
            
            if (!exists) {
              updatedConversations = [newConversation, ...prev];
            } else {
              updatedConversations = prev;
            }
            
            // Sort conversations by most recent activity (creation time for new conversations)
            return updatedConversations.sort((a, b) => {
              const aTime = a.last_message?.created_at || '0';
              const bTime = b.last_message?.created_at || '0';
              return new Date(bTime).getTime() - new Date(aTime).getTime();
            });
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

              // Add to conversations list if it doesn't already exist and sort by recent activity
              setConversations(prev => {
                const exists = prev.some(conv => conv.id === completeConversation.id);
                let updatedConversations;
                
                if (!exists) {
                  updatedConversations = [newConversation, ...prev];
                } else {
                  updatedConversations = prev;
                }
                
                // Sort conversations by most recent activity (creation time for new conversations)
                return updatedConversations.sort((a, b) => {
                  const aTime = a.last_message?.created_at || '0';
                  const bTime = b.last_message?.created_at || '0';
                  return new Date(bTime).getTime() - new Date(aTime).getTime();
                });
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

  // Real-time subscription for ALL incoming messages (not just selected conversation)
  useEffect(() => {
    if (!currentUser) return;

    // Subscribe to ALL messages where current user is a participant
    const allMessagesSubscription = supabase
      .channel(`all_messages:${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          console.log('All-messages subscription received new message:', payload.new);
          
          // Skip messages from the current user (they're already handled by sendMessage)
          if (payload.new.sender_id === currentUser.id) {
            console.log('Skipping own message in all-messages subscription');
            return;
          }

          // Check if this message is for a conversation where current user is a participant
          const { data: participantData } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('conversation_id', payload.new.conversation_id)
            .eq('user_id', currentUser.id)
            .single();

          // Also check friend_conversations
          const { data: friendConvData } = await supabase
            .from('friend_conversations')
            .select('id')
            .eq('id', payload.new.conversation_id)
            .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
            .single();

          console.log('Participant check:', { participantData, friendConvData, conversationId: payload.new.conversation_id });

          // If user is not a participant in this conversation, ignore the message
          if (!participantData && !friendConvData) {
            console.log('User is not a participant in this conversation, ignoring message');
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
            conversation_id: payload.new.conversation_id as string,
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

          // If this conversation is currently selected, add the message to the display
          if (selectedConversation?.id === payload.new.conversation_id) {
            console.log('Adding message to current conversation display:', transformedMessage);
            setMessages((prev) => [...prev, transformedMessage]);
            
            // Scroll to bottom
            setTimeout(() => {
              const messagesContainer = document.querySelector('.flex-1.overflow-y-auto');
              if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
              }
            }, 100);
            
            // Play sound notification for current conversation too
            playNewMessageSound();
          } else {
            // Conversation is not selected, show alert and add to unread
            setNewMessageAlert(`New message from ${transformedMessage.sender?.username || 'Unknown'}`);
            setTimeout(() => setNewMessageAlert(null), 3000);
            setUnreadMessages(prev => new Set([...prev, payload.new.conversation_id]));
            
            // Play sound notification
            playNewMessageSound();
            
            // Auto-select the conversation if user is not currently viewing another conversation
            // This ensures new messages appear immediately in the chat window
            if (!selectedConversation) {
              // Fetch the conversation and select it automatically
              fetchConversationById(payload.new.conversation_id).then(newConv => {
                if (newConv) {
                  selectConversation(newConv);
                }
              });
            }
          }

          // Update the conversation's last message in the conversations list and sort by recent activity
          setConversations((prev) => {
            console.log('Updating conversations list, current conversations:', prev.length, 'looking for:', payload.new.conversation_id);
            
            // Check if conversation exists in the list
            const existingConv = prev.find(conv => conv.id === payload.new.conversation_id);
            
            let updatedConversations;
            
            if (existingConv) {
              // Update existing conversation's last message
              updatedConversations = prev.map(conv => 
                conv.id === payload.new.conversation_id 
                  ? { ...conv, last_message: transformedMessage }
                  : conv
              );
            } else {
              // Conversation doesn't exist, we need to fetch it
              fetchConversationById(payload.new.conversation_id).then(newConv => {
                if (newConv) {
                  setConversations(prevConvs => {
                    // Add new conversation and sort by recent activity
                    const withNewConv = [newConv, ...prevConvs];
                    return withNewConv.sort((a, b) => {
                      const aTime = a.last_message?.created_at || '0';
                      const bTime = b.last_message?.created_at || '0';
                      return new Date(bTime).getTime() - new Date(aTime).getTime();
                    });
                  });
                }
              });
              return prev;
            }
            
            // Sort conversations by most recent activity (last message timestamp)
            return updatedConversations.sort((a, b) => {
              const aTime = a.last_message?.created_at || '0';
              const bTime = b.last_message?.created_at || '0';
              return new Date(bTime).getTime() - new Date(aTime).getTime();
            });
          });
        }
      )
      .subscribe((status) => {
        console.log('All-messages subscription status:', status);
      });

    return () => {
      console.log('Removing all-messages subscription');
      supabase.removeChannel(allMessagesSubscription);
    };
  }, [currentUser?.id, selectedConversation?.id]);

  // Sound notification for new messages
  const playNewMessageSound = () => {
    try {
      // Create a simple beep sound using Web Audio API
      interface WindowWithWebkit extends Window {
        webkitAudioContext?: typeof AudioContext;
      }
      const audioContext = new (window.AudioContext || (window as WindowWithWebkit).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  };

  // Helper function to fetch conversation by ID
  const fetchConversationById = async (conversationId: string): Promise<Conversation | null> => {
    try {
      // First check friend_conversations
      const { data: friendConvData } = await supabase
        .from('friend_conversations')
        .select(`
          id,
          user1_id,
          user2_id,
          created_at,
          last_message:messages(id, conversation_id, sender_id, content, created_at, sender:users(id, username, avatar_url))
        `)
        .eq('id', conversationId)
        .single();

      if (friendConvData) {
        const otherUserId = friendConvData.user1_id === currentUser?.id ? friendConvData.user2_id : friendConvData.user1_id;
        
        // Fetch friend details
        const { data: friendData } = await supabase
          .from("user_friends")
          .select("friend_id, username, avatar_url")
          .eq("friend_id", otherUserId)
          .eq("user_id", currentUser?.id)
          .single();

        const friendInfo = friendData || { friend_id: otherUserId, username: 'Friend', avatar_url: null };

        return {
          id: friendConvData.id,
          type: 'direct',
          participants: [
            { user_id: currentUser?.id || '', users: currentUser || { id: '', username: 'You' } },
            { user_id: otherUserId, users: { id: otherUserId, username: friendInfo.username, avatar_url: friendInfo.avatar_url } }
          ],
          last_message: friendConvData.last_message?.[0] ? {
            ...friendConvData.last_message[0],
            sender: Array.isArray(friendConvData.last_message[0].sender) 
              ? friendConvData.last_message[0].sender[0] 
              : friendConvData.last_message[0].sender
          } as Message : undefined
        };
      }

      // If not found in friend_conversations, check regular conversations
      const { data: convData } = await supabase
        .from('conversations')
        .select(`
          id, type,
          participants:conversation_participants(user_id, users(id, username, avatar_url)),
          last_message:messages(id, conversation_id, sender_id, content, created_at, sender:users(id, username, avatar_url))
        `)
        .eq('id', conversationId)
        .single();

      if (convData) {
        return {
          id: convData.id,
          type: convData.type,
          participants: (convData.participants as unknown[] || []).map((p: unknown) => {
            const participant = p as {
              user_id: string;
              users: unknown[];
            };
            return {
              user_id: participant.user_id,
              users: (participant.users as unknown[])[0] as User
            };
          }),
          last_message: convData.last_message?.[0] ? {
            ...convData.last_message[0],
            sender: Array.isArray(convData.last_message[0].sender) 
              ? convData.last_message[0].sender[0] 
              : convData.last_message[0].sender
          } as Message : undefined
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return null;
    }
  };

  // 6. Back button
  const goBack = () => {
    setSelectedConversation(null);
    setSelectedFriend(null);
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
      {/* Sidebar - Hidden on mobile when chat is open */}
      <motion.div 
        className={`w-80 bg-[#111] border-r border-[#333] fixed md:relative inset-y-0 left-0 z-30 transform transition-transform duration-300 md:transform-none ${
          selectedConversation || selectedFriend ? 'translate-x-full md:translate-x-0' : 'translate-x-0'
        }`}
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
          className="p-4 border-b border-[#333]"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <motion.h2 
            className="text-lg font-semibold text-[#F9E4AD] mb-3"
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Messages
          </motion.h2>
          <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-1 bg-[#222] rounded-lg p-1">
            <motion.button
              onClick={() => {
                setActiveTab("conversations");
                setConversationsPage(0);
                setRequestsPage(0);
                setConversationSearchQuery("");
              }}
              className={`flex-1 py-2 px-3 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                activeTab === "conversations" 
                  ? "bg-[#FF9940] text-black" 
                  : "text-gray-400 hover:text-white"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Chats ({conversations.length})
            </motion.button>
            <motion.button
              onClick={() => {
                setActiveTab("friends");
                setConversationsPage(0);
                setRequestsPage(0);
                setConversationSearchQuery("");
              }}
              className={`flex-1 py-2 px-3 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                activeTab === "friends" 
                  ? "bg-[#FF9940] text-black" 
                  : "text-gray-400 hover:text-white"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Friends ({friends.length})
            </motion.button>
            <motion.button
              onClick={() => {
                setActiveTab("requests");
                setConversationsPage(0);
                setRequestsPage(0);
                setConversationSearchQuery("");
              }}
              className={`flex-1 py-2 px-3 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                activeTab === "requests" 
                  ? "bg-[#FF9940] text-black" 
                  : "text-gray-400 hover:text-white"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Requests ({pendingRequests.length})
            </motion.button>
          </div>
        </motion.div>
        <div className="overflow-y-auto h-[calc(100%-120px)]">
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
              placeholder="Search conversations..."
              value={conversationSearchQuery}
              onChange={(e) => setConversationSearchQuery(e.target.value)}
              className="w-full bg-[#222] text-white px-3 sm:px-4 py-2 pl-8 sm:pl-10 rounded-lg border border-[#333] focus:border-[#FF9940] focus:outline-none transition-colors text-sm sm:text-base"
            />
            <div className="absolute left-2.5 sm:left-3 top-2 text-gray-400 text-sm">
              🔍
            </div>
          </div>
        </motion.div>

                {conversations.length > 0 && conversations.filter(conv => {
                  const friendParticipant = conv.participants.find(
                    (p) => p.user_id !== currentUser?.id
                  );
                  const friendUser = friendParticipant?.users;
                  return conversationSearchQuery === "" || 
                    friendUser?.username.toLowerCase().includes(conversationSearchQuery.toLowerCase()) ||
                    (conv.last_message && conv.last_message.content.toLowerCase().includes(conversationSearchQuery.toLowerCase()));
                }).length === 0 && conversationSearchQuery !== "" && (
                  <motion.div 
                    className="p-4 text-center text-gray-400"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: 0.1 }}
                  >
                    <p>No conversations found matching &quot;{conversationSearchQuery}&quot;</p>
                    <p className="text-xs mt-1">Try a different search term</p>
                  </motion.div>
                )}

                {conversations
                  .filter(conv => {
                    const friendParticipant = conv.participants.find(
                      (p) => p.user_id !== currentUser?.id
                    );
                    const friendUser = friendParticipant?.users;
                    return conversationSearchQuery === "" || 
                      friendUser?.username.toLowerCase().includes(conversationSearchQuery.toLowerCase()) ||
                      (conv.last_message && conv.last_message.content.toLowerCase().includes(conversationSearchQuery.toLowerCase()));
                  })
                  .slice(conversationsPage * conversationsPerPage, (conversationsPage + 1) * conversationsPerPage)
                  .map((conv, index) => {
                  console.log("Rendering conversation:", conv.id, "participants:", conv.participants);
                  const friendParticipant = conv.participants.find(
                    (p) => p.user_id !== currentUser?.id
                  );
                  const friendUser = friendParticipant?.users;
                  console.log("Friend participant:", friendParticipant, "friend user:", friendUser);

                  return (
                    <motion.div
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className={`p-3 sm:p-4 border-b border-[#333] cursor-pointer hover:bg-[#222] transition-colors ${
                        selectedConversation?.id === conv.id ? "bg-[#222]" : ""
                      }`}
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ 
                        delay: 0.1 * index + 0.2,
                        type: "spring",
                        stiffness: 100
                      }}
                      whileHover={{ scale: 1.02, x: 5 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center space-x-3">
                        <motion.div 
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#FF9940]/20 flex items-center justify-center overflow-hidden"
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
                            friendUser?.username?.charAt(0).toUpperCase() || "?"
                          )}
                        </motion.div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="font-medium text-[#F9E4AD] text-sm sm:text-base">
                            {friendUser?.username || "Unknown"}
                          </span>
                          {conv.last_message && (
                            <span className="text-xs text-[#FF9940] truncate max-w-[120px] sm:max-w-[200px]">
                              {conv.last_message.content}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col items-end space-y-1 flex-shrink-0">
                          {conv.last_message && (
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: true })}
                            </span>
                          )}
                          {unreadMessages.has(conv.id) && (
                            <motion.div
                              className="w-2 h-2 bg-[#E70008] rounded-full"
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 1, repeat: Infinity }}
                            />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                
                {/* Pagination Controls */}
                {conversations.filter(conv => {
                  const friendParticipant = conv.participants.find(
                    (p) => p.user_id !== currentUser?.id
                  );
                  const friendUser = friendParticipant?.users;
                  return conversationSearchQuery === "" || 
                    friendUser?.username.toLowerCase().includes(conversationSearchQuery.toLowerCase()) ||
                    (conv.last_message && conv.last_message.content.toLowerCase().includes(conversationSearchQuery.toLowerCase()));
                }).length > conversationsPerPage && (
                  <motion.div 
                    className="flex flex-col sm:flex-row justify-between items-center p-3 sm:p-4 border-t border-[#333] space-y-2 sm:space-y-0"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <motion.button
                      onClick={() => setConversationsPage(prev => Math.max(0, prev - 1))}
                      disabled={conversationsPage === 0}
                      className={`px-3 py-1 rounded-md text-xs sm:text-sm transition-colors ${
                        conversationsPage === 0 
                          ? 'bg-[#222] text-gray-500 cursor-not-allowed' 
                          : 'bg-[#FF9940] text-black hover:bg-[#E70008]'
                      }`}
                      whileHover={conversationsPage === 0 ? {} : { scale: 1.05 }}
                      whileTap={conversationsPage === 0 ? {} : { scale: 0.95 }}
                    >
                      ← Previous
                    </motion.button>
                    
                    <span className="text-xs sm:text-sm text-gray-400 text-center py-1">
                      Page {conversationsPage + 1} of {Math.ceil(conversations.filter(conv => {
                        const friendParticipant = conv.participants.find(
                          (p) => p.user_id !== currentUser?.id
                        );
                        const friendUser = friendParticipant?.users;
                        return conversationSearchQuery === "" || 
                          friendUser?.username.toLowerCase().includes(conversationSearchQuery.toLowerCase()) ||
                          (conv.last_message && conv.last_message.content.toLowerCase().includes(conversationSearchQuery.toLowerCase()));
                      }).length / conversationsPerPage)}
                    </span>
                    
                    <motion.button
                      onClick={() => setConversationsPage(prev => prev + 1)}
                      disabled={(conversationsPage + 1) * conversationsPerPage >= conversations.filter(conv => {
                        const friendParticipant = conv.participants.find(
                          (p) => p.user_id !== currentUser?.id
                        );
                        const friendUser = friendParticipant?.users;
                        return conversationSearchQuery === "" || 
                          friendUser?.username.toLowerCase().includes(conversationSearchQuery.toLowerCase()) ||
                          (conv.last_message && conv.last_message.content.toLowerCase().includes(conversationSearchQuery.toLowerCase()));
                      }).length}
                      className={`px-3 py-1 rounded-md text-xs sm:text-sm transition-colors ${
                        (conversationsPage + 1) * conversationsPerPage >= conversations.filter(conv => {
                          const friendParticipant = conv.participants.find(
                            (p) => p.user_id !== currentUser?.id
                          );
                          const friendUser = friendParticipant?.users;
                          return conversationSearchQuery === "" || 
                            friendUser?.username.toLowerCase().includes(conversationSearchQuery.toLowerCase()) ||
                            (conv.last_message && conv.last_message.content.toLowerCase().includes(conversationSearchQuery.toLowerCase()));
                        }).length
                          ? 'bg-[#222] text-gray-500 cursor-not-allowed' 
                          : 'bg-[#FF9940] text-black hover:bg-[#E70008]'
                      }`}
                      whileHover={(conversationsPage + 1) * conversationsPerPage >= conversations.filter(conv => {
                        const friendParticipant = conv.participants.find(
                          (p) => p.user_id !== currentUser?.id
                        );
                        const friendUser = friendParticipant?.users;
                        return conversationSearchQuery === "" || 
                          friendUser?.username.toLowerCase().includes(conversationSearchQuery.toLowerCase()) ||
                          (conv.last_message && conv.last_message.content.toLowerCase().includes(conversationSearchQuery.toLowerCase()));
                      }).length ? {} : { scale: 1.05 }}
                      whileTap={(conversationsPage + 1) * conversationsPerPage >= conversations.filter(conv => {
                        const friendParticipant = conv.participants.find(
                          (p) => p.user_id !== currentUser?.id
                        );
                        const friendUser = friendParticipant?.users;
                        return conversationSearchQuery === "" || 
                          friendUser?.username.toLowerCase().includes(conversationSearchQuery.toLowerCase()) ||
                          (conv.last_message && conv.last_message.content.toLowerCase().includes(conversationSearchQuery.toLowerCase()));
                      }).length ? {} : { scale: 0.95 }}
                    >
                      Next →
                    </motion.button>
                  </motion.div>
                )}
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
                      className="w-full bg-[#222] text-white px-3 sm:px-4 py-2 pl-8 sm:pl-10 rounded-lg border border-[#333] focus:border-[#FF9940] focus:outline-none transition-colors text-sm sm:text-base"
                    />
                    <div className="absolute left-2.5 sm:left-3 top-2 text-gray-400 text-sm">
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
                    onClick={() => {
                      setSelectedFriend(friend);
                      setSelectedConversation(null);
                      setMessages([]);
                    }}
                    className={`p-4 border-b border-[#333] cursor-pointer hover:bg-[#222] transition-colors ${
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
                    <div className="flex items-center space-x-3">
                      <motion.div 
                        className="w-10 h-10 rounded-full bg-[#FF9940]/20 flex items-center justify-center overflow-hidden"
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
                          friend.username?.charAt(0).toUpperCase() || "?"
                        )}
                      </motion.div>
                      <div className="flex flex-col flex-1">
                        <span className="font-medium text-[#F9E4AD]">
                          {friend.username}
                        </span>
                        {friend.bio && (
                          <span className="text-xs text-gray-400 truncate max-w-[200px]">
                            {friend.bio}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
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

                {pendingRequests.slice(requestsPage * requestsPerPage, (requestsPage + 1) * requestsPerPage).map((request, index) => (
                  <motion.div
                    key={request.id}
                    className="p-4 border-b border-[#333]"
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ 
                      delay: 0.1 * index + 0.2,
                      type: "spring",
                      stiffness: 100
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <motion.div 
                        className="w-10 h-10 rounded-full bg-[#FF9940]/20 flex items-center justify-center overflow-hidden"
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
                          request.sender_username?.charAt(0).toUpperCase() || "?"
                        )}
                      </motion.div>
                      <div className="flex flex-col flex-1">
                        <span className="font-medium text-[#F9E4AD]">
                          {request.sender_username}
                        </span>
                        {request.message && (
                          <span className="text-xs text-gray-400 truncate max-w-[200px]">
                            {request.message}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2 mt-3">
                      <motion.button
                        onClick={() => acceptFriendRequest(request.id)}
                        className="bg-[#FF9940] text-black px-3 py-1 rounded-md text-sm hover:bg-[#E70008] transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Accept
                      </motion.button>
                      <motion.button
                        onClick={() => declineFriendRequest(request.id)}
                        className="bg-[#333] text-white px-3 py-1 rounded-md text-sm hover:bg-[#444] transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Decline
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
                
                {/* Pagination Controls for Requests */}
                {pendingRequests.length > requestsPerPage && (
                  <motion.div 
                    className="flex items-center justify-center space-x-4 p-4 border-t border-[#333]"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <motion.button
                      onClick={() => setRequestsPage(Math.max(0, requestsPage - 1))}
                      disabled={requestsPage === 0}
                      className={`px-4 py-2 rounded-lg transition-all ${
                        requestsPage === 0
                          ? "bg-[#222] text-gray-500 cursor-not-allowed"
                          : "bg-[#FF9940] text-black hover:bg-[#E70008]"
                      }`}
                      whileHover={requestsPage === 0 ? {} : { scale: 1.05, x: -2 }}
                      whileTap={requestsPage === 0 ? {} : { scale: 0.95 }}
                    >
                      ← Previous
                    </motion.button>
                    
                    <span className="text-[#F9E4AD] text-sm">
                      Page {requestsPage + 1} of {Math.ceil(pendingRequests.length / requestsPerPage)}
                    </span>
                    
                    <motion.button
                      onClick={() => setRequestsPage(Math.min(Math.ceil(pendingRequests.length / requestsPerPage) - 1, requestsPage + 1))}
                      disabled={requestsPage >= Math.ceil(pendingRequests.length / requestsPerPage) - 1}
                      className={`px-4 py-2 rounded-lg transition-all ${
                        requestsPage >= Math.ceil(pendingRequests.length / requestsPerPage) - 1
                          ? "bg-[#222] text-gray-500 cursor-not-allowed"
                          : "bg-[#FF9940] text-black hover:bg-[#E70008]"
                      }`}
                      whileHover={requestsPage >= Math.ceil(pendingRequests.length / requestsPerPage) - 1 ? {} : { scale: 1.05, x: 2 }}
                      whileTap={requestsPage >= Math.ceil(pendingRequests.length / requestsPerPage) - 1 ? {} : { scale: 0.95 }}
                    >
                      Next →
                    </motion.button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Chat window */}
      <motion.div 
        className="flex-1 flex flex-col"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ 
          type: "spring", 
          stiffness: 100, 
          damping: 20,
          delay: 0.4 
        }}
      >
        <AnimatePresence mode="wait">
          {selectedConversation || selectedFriend ? (
            <motion.div
              key="chat"
              className="flex flex-col h-full"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              {/* Header with Back Button */}
              <motion.div 
                className="flex items-center justify-between bg-[#111] border-b border-[#333] p-4"
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
                    let otherUser;
                    
                    if (selectedConversation) {
                      const otherParticipant = selectedConversation.participants.find(p => p.user_id !== currentUser?.id);
                      otherUser = otherParticipant?.users;
                    } else if (selectedFriend) {
                      otherUser = { id: selectedFriend.friend_id, username: selectedFriend.username, avatar_url: selectedFriend.avatar_url };
                    }
                    
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

              {/* New Message Alert */}
              <AnimatePresence>
                {newMessageAlert && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-[#FF9940] text-black px-4 py-2 text-center font-medium"
                  >
                    {newMessageAlert}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <AnimatePresence>
                  {messages.length === 0 && (
                    <motion.p 
                      className="text-center text-gray-400"
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
                        className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg ${
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
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </p>
                      </motion.div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Input */}
              <motion.form 
                onSubmit={sendMessage} 
                className="bg-[#111] border-t border-[#333] p-4"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex space-x-4">
                  <motion.input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-[#222] text-[#F9E4AD] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF9940]"
                    disabled={sending}
                    whileFocus={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  />
                  <motion.button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="bg-[#E70008] hover:bg-[#FF9940] text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {sending ? "Sending..." : "Send"}
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
