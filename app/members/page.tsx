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
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [connections, setConnections] = useState<Record<string, ConnectionStatus>>({});
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  // Search filter function
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMembers(members);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = members.filter((member) => {
      // Search in username
      if (member.username.toLowerCase().includes(query)) return true;
      
      // Search in email
      if (member.email.toLowerCase().includes(query)) return true;
      
      // Search in bio
      if (member.bio?.toLowerCase().includes(query)) return true;
      
      // Search in location
      if (member.location?.toLowerCase().includes(query)) return true;
      
      // Search in availability
      if (member.availability?.toLowerCase().includes(query)) return true;
      
      // Search in categories
      if (member.user_categories?.some(cat => cat.category_name.toLowerCase().includes(query))) return true;
      
      // Search in roles
      if (member.user_roles?.some(role => role.role_name.toLowerCase().includes(query))) return true;
      
      // Search in skills
      if (member.user_skills?.some(skill => skill.skill_name.toLowerCase().includes(query))) return true;
      
      return false;
    });
    
    setFilteredMembers(filtered);
  }, [searchQuery, members]);

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
    setFilteredMembers(allMembers || []);
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
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center text-[#F9E4AD] hover:text-[#FF9940] transition-colors font-mono"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <h1 className="text-2xl font-bold font-mono text-[#E70008]">Magna Coders</h1>
          </div>
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

      <main className="container mx-auto px-3 py-4 sm:px-4 sm:py-8">
        <h2 className="text-2xl sm:text-3xl font-bold font-mono text-[#F9E4AD] mb-4 sm:mb-6">Community Members</h2>

        {/* Search Section */}
        <div className="mb-6 sm:mb-8">
          <div className="relative max-w-md mx-auto">
            <input
              type="text"
              placeholder="Search by name, category, role, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#FF9940]/30 rounded-lg px-4 py-3 pl-10 text-[#F9E4AD] font-mono placeholder-[#F9E4AD]/50 focus:outline-none focus:border-[#E70008] focus:ring-1 focus:ring-[#E70008] transition-colors"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-[#F9E4AD]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#F9E4AD]/60 hover:text-[#F9E4AD] transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
         </div>

        {filteredMembers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[#F9E4AD]/60 font-mono text-sm sm:text-base mb-2">
              {searchQuery ? `No members found for "${searchQuery}"` : "No members found."}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-[#FF9940] hover:text-[#E70008] font-mono text-sm underline transition-colors"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
             {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="bg-[#1a1a1a] border border-[#FF9940]/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 flex flex-col justify-between hover:shadow-lg hover:border-[#E70008] transition-all duration-300"
              >
                <div>
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#FF9940]/20 rounded-full flex items-center justify-center text-lg sm:text-2xl font-mono text-[#F9E4AD] flex-shrink-0">
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={member.username}
                          className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover"
                        />
                      ) : (
                        member.username.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg sm:text-xl font-bold font-mono text-[#F9E4AD] truncate">{member.username}</h3>
                      <p className="text-xs sm:text-sm font-mono text-[#F9E4AD]/60 truncate">{member.email}</p>
                      {member.bio && (
                        <p className="text-xs sm:text-sm font-mono text-[#F9E4AD]/80 mt-1 line-clamp-2">{member.bio}</p>
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
