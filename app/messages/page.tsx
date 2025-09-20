"use client";

import { useState, useEffect } from "react";
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

export default function MessagesPage() {
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
            users: (participant.users as unknown[])[0] as User
          };
        }),
        last_message: conversation.last_message?.[0] ? {
          id: (conversation.last_message[0] as { id: string }).id,
          sender_id: (conversation.last_message[0] as { sender_id: string }).sender_id,
          content: (conversation.last_message[0] as { content: string }).content,
          created_at: (conversation.last_message[0] as { created_at: string }).created_at,
          sender: ((conversation.last_message[0] as { sender: unknown[] }).sender?.[0] as User | undefined)
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
    <div className="min-h-screen bg-black text-white">
      {/* Mobile Header */}
      <div className="md:hidden bg-[#111] border-b border-[#333] p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-[#F9E4AD]">Messages</h1>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="bg-[#FF9940] text-black px-3 py-1 rounded-lg hover:bg-[#E70008] transition-colors text-sm"
          >
            Dashboard
          </button>
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-64px)] md:min-h-screen">
        {/* Sidebar - Hidden on mobile when conversation is selected */}
        <div className={`w-full md:w-80 bg-[#111] border-r border-[#333] ${
          selectedConversation ? 'hidden md:block' : 'block'
        }`}>
          <div className="hidden md:block p-4 border-b border-[#333]">
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
                    <div className="w-12 h-12 md:w-10 md:h-10 rounded-full bg-[#FF9940]/20 flex items-center justify-center overflow-hidden">
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
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-[#F9E4AD] block">
                        {friendUser?.username || "Unknown"}
                      </span>
                      {conv.last_message && (
                        <span className="text-xs text-[#FF9940] truncate block max-w-[200px] md:max-w-[180px]">
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

        {/* Chat window - Full width on mobile */}
        <div className={`flex-1 flex flex-col ${
          selectedConversation ? 'block' : 'hidden md:block'
        }`}>
          {selectedConversation ? (
            <>
              {/* Header with Back Button */}
              <div className="flex items-center justify-between bg-[#111] border-b border-[#333] p-3 md:p-4">
                <button
                  onClick={goBack}
                  className="md:hidden bg-[#FF9940] hover:bg-[#E70008] text-white px-3 py-1 rounded-lg transition-colors text-sm"
                >
                  ← Back
                </button>
                <div className="flex items-center space-x-3 flex-1 justify-center md:justify-start">
                  {(() => {
                    const otherParticipant = selectedConversation.participants.find(p => p.user_id !== currentUser?.id);
                    const otherUser = otherParticipant?.users;
                    const avatarUrl = otherUser?.avatar_url;
                    
                    return (
                      <>
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#FF9940]/20 flex items-center justify-center overflow-hidden">
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
                        <span className="font-medium text-[#F9E4AD] text-sm md:text-base">
                          {otherUser?.username || "Unknown"}
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
                {messages.length === 0 && (
                  <p className="text-center text-gray-400 text-sm md:text-base">
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
                      className={`max-w-[70%] md:max-w-xs lg:max-w-md xl:max-w-lg px-3 py-2 md:px-4 md:py-2 rounded-lg ${
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
                      <p className="text-sm md:text-base">{msg.content}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <form onSubmit={sendMessage} className="bg-[#111] border-t border-[#333] p-3 md:p-4">
                <div className="flex space-x-2 md:space-x-4">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-[#222] text-[#F9E4AD] rounded-lg px-3 py-2 md:px-4 md:py-2 focus:outline-none focus:ring-2 focus:ring-[#FF9940] text-sm md:text-base"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="bg-[#E70008] hover:bg-[#FF9940] text-white px-4 py-2 md:px-6 md:py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                  >
                    {sending ? "Sending..." : "Send"}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-[#F9E4AD] p-4">
              <p className="text-center text-sm md:text-base">Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
