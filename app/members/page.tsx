"use client";

import { useEffect, useState } from "react";
import { createClient, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

interface Member {
  id: string;
  username: string;
  email: string;
  avatar_url?: string | null;
  bio?: string;
  location?: string;
  availability?: string;
  user_categories?: { category_name: string }[];
  user_skills?: { skill_name: string }[];
  user_roles?: { role_name: string }[];
}

type ConnectionStatus = "friend" | "pending" | "none";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [connections, setConnections] = useState<Record<string, ConnectionStatus>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      router.push("/login");
      return;
    }

    setCurrentUser(user);
    fetchMembers(user.id);
  };

  const fetchMembers = async (userId: string) => {
    // Fetch all members except current user
    const { data: allMembers, error: membersError } = await supabase
      .from("users")
      .select(
        `id, username, email, avatar_url, bio, location, availability,
         user_categories(category_name),
         user_skills(skill_name),
         user_roles(role_name)`
      )
      .neq("id", userId)
      .order("username", { ascending: true });

    if (membersError) {
      console.error("Error fetching members:", membersError);
      setLoading(false);
      return;
    }

    // Fetch friends
    const { data: friends } = await supabase
      .from("friends")
      .select("friend_id")
      .eq("user_id", userId);

    // Fetch pending friend requests
    const { data: pending } = await supabase
      .from("friend_requests")
      .select("sender_id, receiver_id, status")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq("status", "pending");

    // Map connection status
    const statusMap: Record<string, ConnectionStatus> = {};

    friends?.forEach((f) => (statusMap[f.friend_id] = "friend"));
    pending?.forEach((r) => {
      const otherId = r.sender_id === userId ? r.receiver_id : r.sender_id;
      statusMap[otherId] = "pending";
    });

    setConnections(statusMap);
    setMembers(allMembers || []);
    setLoading(false);
  };

  const handleSendRequest = async (receiverId: string) => {
    if (!currentUser) return;

    const { error } = await supabase.from("friend_requests").insert([
      {
        sender_id: currentUser.id,
        receiver_id: receiverId,
        message: "Let's connect!",
      },
    ]);

    if (error) {
      if (error.code === "23505") {
        alert("You already sent a request to this user.");
      } else {
        console.error("Error sending request:", error);
        alert("Failed to send request.");
      }
      return;
    }

    setConnections((prev) => ({ ...prev, [receiverId]: "pending" }));
    alert("Friend request sent!");
  };

  const handleChat = async (friendId: string) => {
    if (!currentUser) return;

    const { data, error } = await supabase
      .rpc("get_or_create_direct_conversation", {
        sender_id: currentUser.id,
        receiver_id: friendId,
      })
      .single();

    if (error) {
      console.error("Error opening conversation:", error);
      alert("Failed to open chat.");
      return;
    }

    if (data && typeof data === 'object' && 'id' in data) {
      router.push(`/messages?conversation=${(data as { id: string }).id}`);
    } else {
      console.error("Invalid response from conversation creation");
      alert("Failed to open chat - invalid response.");
    }
  };

  const renderButton = (memberId: string) => {
    const status = connections[memberId] || "none";

    if (status === "friend") {
      return (
        <button
          onClick={() => handleChat(memberId)}
          className="flex-1 px-4 py-2 bg-[#E70008] text-black font-mono font-bold rounded-md hover:bg-[#FF9940] transition-colors"
        >
          Chat
        </button>
      );
    }

    if (status === "pending") {
      return (
        <button
          disabled
          className="flex-1 px-4 py-2 bg-yellow-600 text-black font-mono font-bold rounded-md cursor-not-allowed"
        >
          ⏳ Pending
        </button>
      );
    }

    return (
      <button
        onClick={() => handleSendRequest(memberId)}
        className="flex-1 px-4 py-2 bg-[#FF9940] text-black font-mono font-bold rounded-md hover:bg-[#E70008] transition-colors"
      >
        Connect
      </button>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-[#F9E4AD] font-mono">Loading members...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <header className="border-b border-[#E70008]/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold font-mono text-[#E70008]">Magna Coders</h1>
          <nav className="hidden md:flex items-center space-x-6">
            <a href="/dashboard" className="text-[#F9E4AD] font-mono hover:text-[#FF9940] transition-colors">
              Dashboard
            </a>
            <a href="/friends" className="text-[#F9E4AD] font-mono hover:text-[#FF9940] transition-colors">
              Friends
            </a>
            <a href="/messages" className="text-[#F9E4AD] font-mono hover:text-[#FF9940] transition-colors">
              Messages
            </a>
            <a href="/members" className="text-[#FF9940] font-mono border-b-2 border-[#FF9940] pb-1">
              Members
            </a>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold font-mono text-[#F9E4AD] mb-6">Community Members</h2>

        {members.length === 0 ? (
          <p className="text-[#F9E4AD]/60 font-mono">No members found.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="bg-[#1a1a1a] border border-[#FF9940]/30 rounded-2xl p-6 flex flex-col justify-between hover:shadow-lg hover:border-[#E70008] transition-all duration-300"
              >
                <div>
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-[#FF9940]/20 rounded-full flex items-center justify-center text-2xl font-mono text-[#F9E4AD]">
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={member.username}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        member.username.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold font-mono text-[#F9E4AD]">{member.username}</h3>
                      <p className="text-sm font-mono text-[#F9E4AD]/60">{member.email}</p>
                      {member.bio && (
                        <p className="text-sm font-mono text-[#F9E4AD]/80 mt-1 line-clamp-2">{member.bio}</p>
                      )}
                    </div>
                  </div>

                  {/* Roles */}
                  {member.user_roles && member.user_roles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {member.user_roles.slice(0, 2).map((r, i) => (
                        <span
                          key={i}
                          className="inline-block bg-[#FF9940]/20 text-[#FF9940] text-xs font-mono px-2 py-1 rounded-lg"
                        >
                          {r.role_name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Categories */}
                  {member.user_categories && member.user_categories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {member.user_categories.slice(0, 2).map((c, i) => (
                        <span
                          key={i}
                          className="inline-block bg-[#E70008]/20 text-[#E70008] text-xs font-mono px-2 py-1 rounded-lg"
                        >
                          {c.category_name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Skills */}
                  {member.user_skills && member.user_skills.length > 0 && (
                    <p className="text-xs text-[#F9E4AD]/60 font-mono mt-2 line-clamp-1">
                      Skills: {member.user_skills.map((s) => s.skill_name).join(", ")}
                    </p>
                  )}

                  {/* Location + Availability */}
                  <div className="mt-2 text-xs font-mono text-[#F9E4AD]/60">
                    {member.location && <span>{member.location}</span>}
                    {member.availability && (
                      <span className="ml-2 bg-[#F9E4AD]/20 text-[#F9E4AD] px-2 py-1 rounded-lg">{member.availability}</span>
                    )}
                  </div>
                </div>

                {/* Bottom buttons */}
                <div className="mt-6 flex space-x-3">{renderButton(member.id)}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
