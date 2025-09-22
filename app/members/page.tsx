"use client";

import { useEffect, useState } from "react";
import { createClient, User } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import { Github, Globe, Twitter, Linkedin, MessageCircle, MapPin, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface Member {
  id: string;
  username: string;
  email: string;
  avatar_url?: string | null;
  bio?: string;
  location?: string;
  availability?: string;
  website_url?: string;
  github_url?: string;
  twitter_url?: string;
  linkedin_url?: string;
  whatsapp_url?: string;
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
        `id, username, email, avatar_url, bio, location, availability, website_url, github_url, twitter_url, linkedin_url, whatsapp_url,
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

    // Sort members: Ashwa first, then members with avatar icons, then alphabetically
    const sortedMembers = (allMembers || []).sort((a, b) => {
      // If either member is "ashwa", prioritize them first
      if (a.username.toLowerCase() === 'ashwa' && b.username.toLowerCase() !== 'ashwa') return -1;
      if (a.username.toLowerCase() !== 'ashwa' && b.username.toLowerCase() === 'ashwa') return 1;
      
      // If neither is ashwa, prioritize members with avatar icons
      const aHasAvatar = a.avatar_url && a.avatar_url !== null;
      const bHasAvatar = b.avatar_url && b.avatar_url !== null;
      
      if (aHasAvatar && !bHasAvatar) return -1;
      if (!aHasAvatar && bHasAvatar) return 1;
      
      // If both have avatars or neither has avatars, sort alphabetically
      return a.username.localeCompare(b.username);
    });

    setConnections(statusMap);
    setMembers(sortedMembers);
    setFilteredMembers(sortedMembers);
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
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
          className="text-center"
        >
          <motion.img
            src="/icons/icon-192x192.png"
            alt="Magna Logo"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 mb-4 mx-auto"
          />
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-[#F9E4AD] font-mono text-lg font-bold"
          >
            magna
          </motion.p>
        </motion.div>
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
          
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-[#F9E4AD] hover:text-[#FF9940] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Desktop navigation */}
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

        {/* Mobile navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-[#E70008]/20 bg-black">
            <div className="container mx-auto px-4 py-4 flex flex-col space-y-4">
              <a href="/dashboard" className="text-[#F9E4AD] font-mono hover:text-[#FF9940] transition-colors">
                Dashboard
              </a>
              <a href="/friends" className="text-[#F9E4AD] font-mono hover:text-[#FF9940] transition-colors">
                Friends
              </a>
              <a href="/messages" className="text-[#F9E4AD] font-mono hover:text-[#FF9940] transition-colors">
                Messages
              </a>
              <a href="/members" className="text-[#FF9940] font-mono border-l-2 border-[#FF9940] pl-3">
                Members
              </a>
            </div>
          </nav>
        )}
      </header>

      <main className="container mx-auto px-3 py-4 sm:px-4 sm:py-8">
        {/* Page Header */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <motion.button
                onClick={() => router.back()}
                className="text-[#F9E4AD] hover:text-[#FF9940] transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </motion.button>
              <motion.h1 
                className="text-4xl font-bold text-[#F9E4AD] font-mono"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                Members
              </motion.h1>
            </div>
            <motion.div 
              className="flex items-center gap-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <span className="text-[#F9E4AD] font-mono text-sm">Total:</span>
              <motion.span 
                className="text-[#FF9940] font-mono font-bold"
                key={filteredMembers.length}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                {filteredMembers.length}
              </motion.span>
            </motion.div>
          </div>

          {/* Search Bar */}
          <motion.div 
            className="relative max-w-md mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
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
              <motion.button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#F9E4AD]/60 hover:text-[#F9E4AD] transition-colors"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            )}
          </motion.div>
        </motion.div>

        {filteredMembers.length === 0 ? (
          <motion.div 
            className="text-center py-12"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div 
              className="w-24 h-24 mx-auto mb-4 bg-[#1a1a1a] border-2 border-dashed border-[#333] rounded-full flex items-center justify-center"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <motion.svg 
                className="w-12 h-12 text-[#F9E4AD]/40" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </motion.svg>
            </motion.div>
            <motion.h3 
              className="text-xl font-mono text-[#F9E4AD] mb-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {searchQuery ? `No members found for "${searchQuery}"` : "No members found."}
            </motion.h3>
            {searchQuery && (
              <motion.button
                onClick={() => setSearchQuery("")}
                className="text-[#FF9940] hover:text-[#E70008] font-mono text-sm underline transition-colors"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                Clear search
              </motion.button>
            )}
          </motion.div>
        ) : (
          <motion.div 
            className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
          >
             {filteredMembers.map((member, index) => (
              <motion.div
                key={member.id}
                className="bg-[#1a1a1a] border border-[#FF9940]/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 flex flex-col justify-between hover:shadow-lg hover:border-[#E70008] transition-all duration-300 cursor-pointer"
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                whileHover={{ 
                  scale: 1.02, 
                  y: -5,
                  transition: { duration: 0.2 }
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                onClick={() => router.push(`/profile-view?member=${encodeURIComponent(JSON.stringify(member))}`)}
              >
                <div>
                  <motion.div 
                    className="flex items-center space-x-3 sm:space-x-4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <motion.div 
                      className="w-12 h-12 sm:w-16 sm:h-16 bg-[#FF9940]/20 rounded-full flex items-center justify-center text-lg sm:text-2xl font-mono text-[#F9E4AD] flex-shrink-0"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={member.username}
                          className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover"
                        />
                      ) : (
                        member.username.charAt(0).toUpperCase()
                      )}
                    </motion.div>
                    <motion.div 
                      className="min-w-0 flex-1"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <motion.h3 
                        className="text-lg sm:text-xl font-bold font-mono text-[#F9E4AD] truncate flex items-center gap-2"
                        whileHover={{ color: "#FF9940" }}
                      >
                        {member.username}
                        {member.username.toLowerCase() === 'ashwa' && (
                          <div className="relative flex-shrink-0">
                            <div className="w-4 h-4 bg-[#1DA1F2] rounded-full flex items-center justify-center">
                              <CheckCircle size={10} className="text-white" />
                            </div>
                          </div>
                        )}
                      </motion.h3>
                      <p className="text-xs sm:text-sm font-mono text-[#F9E4AD]/60 truncate">{member.email}</p>
                      {member.bio && (
                        <motion.p 
                          className="text-xs sm:text-sm font-mono text-[#F9E4AD]/80 mt-1 line-clamp-2"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                        >
                          {member.bio}
                        </motion.p>
                      )}
                    </motion.div>
                  </motion.div>

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
                  <div className="mt-2 flex items-center gap-3 text-xs font-mono text-[#F9E4AD]/60">
                    {member.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={12} className="text-[#E70008]" /> {member.location}
                      </span>
                    )}
                    {member.availability && (
                      <span className="bg-[#F9E4AD]/20 text-[#F9E4AD] px-2 py-1 rounded-lg">{member.availability}</span>
                    )}
                  </div>

                  {/* Social Links */}
                  {(member.website_url || member.github_url || member.twitter_url || member.linkedin_url || member.whatsapp_url) && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {member.website_url && (
                        <a href={member.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#FF9940] hover:underline font-mono text-xs">
                          <Globe size={16} /> Website
                        </a>
                      )}
                      {member.github_url && (
                        <a href={member.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#F9E4AD] hover:underline font-mono text-xs">
                          <Github size={16} /> GitHub
                        </a>
                      )}
                      {member.twitter_url && (
                        <a href={member.twitter_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#1DA1F2] hover:underline font-mono text-xs">
                          <Twitter size={16} /> Twitter
                        </a>
                      )}
                      {member.linkedin_url && (
                        <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#0A66C2] hover:underline font-mono text-xs">
                          <Linkedin size={16} /> LinkedIn
                        </a>
                      )}
                      {member.whatsapp_url && (
                        <a href={member.whatsapp_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#25D366] hover:underline font-mono text-xs">
                          <MessageCircle size={16} /> WhatsApp
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <motion.div 
                  className="flex gap-2 mt-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <motion.button
                    onClick={() => handleSendRequest(member.id)}
                    disabled={connections[member.id] === "pending"}
                    className={`flex-1 py-2 px-3 rounded-lg font-mono text-xs sm:text-sm transition-all duration-200 ${
                      connections[member.id] === "friend"
                        ? "bg-[#FF9940]/20 text-[#FF9940] cursor-not-allowed"
                        : connections[member.id] === "pending"
                        ? "bg-yellow-500/20 text-yellow-400 cursor-not-allowed"
                        : "bg-[#FF9940] text-black hover:bg-[#FF9940]/80"
                    }`}
                    whileHover={{ scale: connections[member.id] ? 1 : 1.05 }}
                    whileTap={{ scale: connections[member.id] ? 1 : 0.95 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    {connections[member.id] === "friend" ? "Connected" : connections[member.id] === "pending" ? "Pending" : "Connect"}
                  </motion.button>
                  <motion.button
                    onClick={() => handleChat(member.id)}
                    className="flex-1 py-2 px-3 bg-[#1a1a1a] text-[#F9E4AD] rounded-lg font-mono text-xs sm:text-sm border border-[#333] hover:border-[#FF9940] hover:text-[#FF9940] transition-all duration-200"
                    whileHover={{ scale: 1.05, borderColor: "#FF9940" }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    Message
                  </motion.button>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}
