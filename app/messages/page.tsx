"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

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
}

function MessagesContent() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

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
      const { data, error } = await supabase
        .from("conversations")
        .select(
          `
          id, type,
          participants:conversation_participants(user_id, users(id, username, avatar_url)),
          last_message:messages(id, sender_id, content, created_at, sender:users(id, username, avatar_url))
          `
        )
        .order("id", { ascending: false });

      if (error) {
        console.error("Error fetching conversations:", error);
        return;
      }

      // Transform the data to match the Conversation interface
      const transformedData: Conversation[] = (data as unknown as Conversation[] || []).map((conv: unknown) => {
        const conversation = conv as {
          id: string;
          type: 'direct' | 'group';
          participants: unknown[];
          last_message?: unknown[];
        };
        
        return {
          id: conversation.id,
          type: conversation.type,
          participants: (conversation.participants as unknown[] || []).map((p: unknown) => {
            const participant = p as {
              user_id: string;
              users: unknown[];
            };
            return {
              user_id: participant.user_id,
              users: (participant.users as unknown[])[0] as User // The users array should contain the user object
            };
          }),
          last_message: conversation.last_message?.[0] ? {
            id: (conversation.last_message[0] as { id: string }).id,
            sender_id: (conversation.last_message[0] as { sender_id: string }).sender_id,
            content: (conversation.last_message[0] as { content: string }).content,
            created_at: (conversation.last_message[0] as { created_at: string }).created_at,
            sender: ((conversation.last_message[0] as { sender: unknown[] }).sender?.[0] as User | undefined) // sender is also an array from Supabase
          } : undefined
        };
      });

      setConversations(transformedData);

      if (conversationId) {
        const found = transformedData.find((c) => c.id === conversationId);
        if (found) {
          setSelectedConversation(found);
          fetchMessages(found.id);
        }
      }

      setLoading(false);
    };

    fetchConversations();
  }, [currentUser, conversationId]);

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
    
    setMessages((prev) => [...prev, transformedMessage]);
    setNewMessage("");
    setSending(false);
  };

  // 5. Select conversation
  const selectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    fetchMessages(conv.id);
  };

  // 6. Back button
  const goBack = () => {
    setSelectedConversation(null);
    setMessages([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-[#F9E4AD]">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-black text-white">
      {/* Sidebar */}
      <div className="w-80 bg-[#111] border-r border-[#333]">
        <div className="p-4 border-b border-[#333]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#F9E4AD]">Conversations</h2>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-[#FF9940] text-black px-3 py-1 rounded-lg hover:bg-[#E70008] transition-colors text-sm"
            >
              Dashboard
            </button>
          </div>
        </div>
        <div className="overflow-y-auto h-[calc(100%-65px)]">
          {conversations.length === 0 && (
            <div className="p-4 text-center text-gray-400">
              <p>No conversations yet</p>
            </div>
          )}

          {conversations.map((conv) => {
            const friendParticipant = conv.participants.find(
              (p) => p.user_id !== currentUser?.id
            );
            const friendUser = friendParticipant?.users;

            return (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`p-4 border-b border-[#333] cursor-pointer hover:bg-[#222] transition-colors ${
                  selectedConversation?.id === conv.id ? "bg-[#222]" : ""
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-[#FF9940]/20 flex items-center justify-center overflow-hidden">
                    {friendUser?.avatar_url ? (
                      <img
                        src={friendUser.avatar_url}
                        alt={friendUser.username}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      friendUser?.username?.charAt(0).toUpperCase() || "?"
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-[#F9E4AD]">
                      {friendUser?.username || "Unknown"}
                    </span>
                    {conv.last_message && (
                      <span className="text-xs text-[#FF9940] truncate max-w-[200px]">
                        {conv.last_message.content}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat window */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header with Back Button */}
            <div className="flex items-center justify-between bg-[#111] border-b border-[#333] p-4">
              <button
                onClick={goBack}
                className="bg-[#FF9940] text-black px-4 py-1 rounded-lg hover:bg-[#E70008] transition-colors"
              >
                ← Back
              </button>
              <div className="flex items-center space-x-3">
                {(() => {
                  const otherParticipant = selectedConversation.participants.find(p => p.user_id !== currentUser?.id);
                  const otherUser = otherParticipant?.users;
                  const avatarUrl = otherUser?.avatar_url;
                  
                  return (
                    <>
                      <div className="w-10 h-10 rounded-full bg-[#FF9940]/20 flex items-center justify-center overflow-hidden">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={otherUser?.username || "User"}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          otherUser?.username?.charAt(0).toUpperCase() || "?"
                        )}
                      </div>
                      <span className="font-medium text-[#F9E4AD]">
                        {otherUser?.username || "Unknown"}
                      </span>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <p className="text-center text-gray-400">
                  No messages yet. Start the conversation!
                </p>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.sender_id === currentUser?.id
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg ${
                      msg.sender_id === currentUser?.id
                        ? "bg-[#E70008] text-white"
                        : "bg-[#222] text-[#F9E4AD]"
                    }`}
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
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="bg-[#111] border-t border-[#333] p-4">
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-[#222] text-[#F9E4AD] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF9940]"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="bg-[#E70008] hover:bg-[#FF9940] text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? "Sending..." : "Send"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-[#F9E4AD]">
            <p>Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Wrapper component with Suspense boundary
export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-[#F9E4AD]">Loading messages...</p>
      </div>
    }>
      <MessagesContent />
    </Suspense>
  );
}
