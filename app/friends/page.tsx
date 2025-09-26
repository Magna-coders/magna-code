"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/src/lib/supabase/client";

interface Friend {
  id: string;
  username: string;
  email: string;
  avatar_url?: string | null;
  bio?: string;
  connected_at: string;
  is_online?: boolean;
}

interface ConnectionRequest {
  id: string;
  sender_id: string;
  sender_username: string;
  sender_email: string;
  sender_avatar_url?: string | null;
  sender_bio?: string;
  created_at: string;
  message?: string;
}



export default function FriendsList() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push('/login');
        return;
      }
      setCurrentUser(user);
      fetchFriends(user.id);
      fetchConnectionRequests(user.id);
    } catch (error) {
      console.error('Error fetching current user:', error);
      router.push('/login');
    }
  };

  const fetchFriends = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_friends')
        .select('*')
        .eq('user_id', userId)
        .order('connected_at', { ascending: false });

      if (error) {
        console.error('Error fetching friends:', error);
        return;
      }

      if (data) {
        const friendsData: Friend[] = data.map(friend => ({
          id: friend.friend_id,
          username: friend.username,
          email: friend.email,
          avatar_url: friend.avatar_url,
          bio: friend.bio,
          connected_at: friend.connected_at,
          is_online: friend.is_online
        }));
        setFriends(friendsData);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConnectionRequests = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('pending_friend_requests')
        .select('*')
        .eq('receiver_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching connection requests:', error);
        return;
      }

      if (data) {
        const requestsData: ConnectionRequest[] = data.map(request => ({
          id: request.id,
          sender_id: request.sender_id,
          sender_username: request.sender_username,
          sender_email: request.sender_email,
          sender_avatar_url: request.sender_avatar_url,
          sender_bio: request.sender_bio,
          created_at: request.created_at,
          message: request.message
        }));
        setConnectionRequests(requestsData);
      }
    } catch (error) {
      console.error('Error fetching connection requests:', error);
    }
  };

  const handleFriendClick = (friendId: string) => router.push(`/messages?friend=${friendId}`);
  const handleStartChat = (friendId: string) => router.push(`/messages?conversation=${friendId}`);

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const { error } = await supabase.rpc('accept_friend_request', { request_id: requestId });
      if (error) {
        console.error('Error accepting friend request:', error);
        return;
      }
      if (currentUser) {
        fetchConnectionRequests(currentUser.id);
        fetchFriends(currentUser.id);
      }
    } catch (error) {
      console.error('Error accepting connection request:', error);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      const { error } = await supabase.rpc('decline_friend_request', { request_id: requestId });
      if (error) {
        console.error('Error declining friend request:', error);
        return;
      }
      if (currentUser) fetchConnectionRequests(currentUser.id);
    } catch (error) {
      console.error('Error declining connection request:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const formatConnectedDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Connected yesterday';
    if (diffDays < 7) return `Connected ${diffDays} days ago`;
    if (diffDays < 30) return `Connected ${Math.ceil(diffDays / 7)} weeks ago`;
    return `Connected ${Math.ceil(diffDays / 30)} months ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse w-full max-w-md px-4">
          <div className="h-8 bg-[#E70008]/20 rounded mb-4"></div>
          {[1,2,3].map(i => (
            <div key={i} className="h-20 bg-[#E70008]/20 rounded-lg mb-4"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-[#F9E4AD]">
      {/* Header */}
      <header className="border-b border-[#E70008]/20">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4">
          <h1 className="text-2xl font-bold font-mono text-[#E70008]">
            Magna Coders
          </h1>
          
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
          <div className="hidden md:flex md:flex-row items-center space-x-4">
            <nav className="flex flex-row items-center space-x-4">
              <a href="/dashboard" className="text-[#F9E4AD] hover:text-[#FF9940] transition-colors">Dashboard</a>
              <a href="/friends" className="text-[#FF9940] border-b-2 border-[#FF9940] pb-1">Friends</a>
              <a href="/messages" className="text-[#F9E4AD] hover:text-[#FF9940] transition-colors">Messages</a>
              <a href="/members" className="text-[#F9E4AD] hover:text-[#FF9940] transition-colors">Members</a>
              <a href="/my-projects" className="text-[#F9E4AD] hover:text-[#FF9940] transition-colors">My Projects</a>
            </nav>
            <button onClick={handleLogout} className="px-4 py-2 bg-[#E70008] text-black font-bold rounded hover:bg-[#FF9940] transition-colors">
              Logout
            </button>
          </div>
        </div>

        {/* Mobile navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-[#E70008]/20 bg-black">
            <div className="container mx-auto px-4 py-4 flex flex-col space-y-4">
              <a href="/dashboard" className="text-[#F9E4AD] font-mono hover:text-[#FF9940] transition-colors">
                Dashboard
              </a>
              <a href="/friends" className="text-[#FF9940] font-mono border-l-2 border-[#FF9940] pl-3">
                Friends
              </a>
              <a href="/messages" className="text-[#F9E4AD] font-mono hover:text-[#FF9940] transition-colors">
                Messages
              </a>
              <a href="/members" className="text-[#F9E4AD] font-mono hover:text-[#FF9940] transition-colors">
                Members
              </a>
              <a href="/my-projects" className="text-[#F9E4AD] font-mono hover:text-[#FF9940] transition-colors">
                My Projects
              </a>
              <button onClick={handleLogout} className="px-4 py-2 bg-[#E70008] text-black font-bold rounded hover:bg-[#FF9940] transition-colors w-fit">
                Logout
              </button>
            </div>
          </nav>
        )}
      </header>

      <main className="px-4 sm:px-6 py-8 max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold font-mono text-[#F9E4AD] mb-2">Connected Friends</h2>
          <p className="text-[#F9E4AD]/80 font-mono">Stay connected with your coding community</p>
        </div>

        {/* Connection Requests */}
        {connectionRequests.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl sm:text-2xl font-bold font-mono text-[#FF9940]">Connection Requests</h3>
              <span className="bg-[#E70008] text-black px-3 py-1 rounded-full text-sm font-bold">{connectionRequests.length}</span>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {connectionRequests.map(req => (
                <div key={req.id} className="bg-[#1a1a1a] border border-[#FF9940]/30 rounded-lg p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0 sm:space-x-4">
                    <div className="flex items-center space-x-4">
                      <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#FF9940]/20 flex items-center justify-center text-xl sm:text-2xl">
                        {req.sender_avatar_url ? (
                          <img src={req.sender_avatar_url} alt={req.sender_username} className="w-full h-full rounded-full object-cover" />
                        ) : req.sender_username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm sm:text-lg">{req.sender_username}</h4>
                        <p className="text-xs sm:text-sm text-[#F9E4AD]/60">{req.sender_email}</p>
                        {req.sender_bio && <p className="text-xs sm:text-sm text-[#F9E4AD]/80">{req.sender_bio}</p>}
                        {req.message && (
                          <p className="text-xs sm:text-sm italic bg-black/30 p-2 rounded border-l-4 border-[#FF9940] mt-1">
                            &ldquo;{req.message}&rdquo;
                          </p>
                        )}
                        <p className="text-[10px] sm:text-xs text-[#FF9940] mt-1">Requested {new Date(req.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => handleAcceptRequest(req.id)} className="px-3 py-2 bg-[#FF9940] text-black font-bold rounded hover:bg-[#E70008] transition-colors">✓ Accept</button>
                      <button onClick={() => handleDeclineRequest(req.id)} className="px-3 py-2 border border-[#F9E4AD] text-[#F9E4AD] rounded hover:bg-[#F9E4AD] hover:text-black transition-colors">Decline</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {friends.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl sm:text-6xl mb-4">👥</div>
              <h3 className="text-lg sm:text-xl font-bold mb-2">No friends yet</h3>
              <p className="text-[#F9E4AD]/60 mb-4">Connect with other members to build your network</p>
              <a href="/members" className="inline-block px-4 sm:px-6 py-2 bg-[#E70008] text-black font-bold rounded hover:bg-[#FF9940] transition-colors">Find Members</a>
            </div>
          ) : (
            friends.map(friend => (
              <div key={friend.id} className="bg-[#1a1a1a] border border-[#E70008]/30 rounded-lg p-4 sm:p-6 hover:border-[#FF9940] transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0 sm:space-x-4">
                  <div className="flex items-center space-x-4">
                    <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#E70008]/20 flex items-center justify-center text-xl sm:text-2xl">
                      {friend.avatar_url ? (
                        <img src={friend.avatar_url} alt={friend.username} className="w-full h-full rounded-full object-cover" />
                      ) : friend.username.charAt(0).toUpperCase()}
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-black ${friend.is_online ? 'bg-[#FF9940]' : 'bg-gray-500'}`}></div>
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-lg font-bold">{friend.username}</h3>
                      <p className="text-xs sm:text-sm text-[#F9E4AD]/60">{friend.email}</p>
                      {friend.bio && <p className="text-xs sm:text-sm text-[#F9E4AD]/80">{friend.bio}</p>}
                      <p className="text-[10px] sm:text-xs text-[#FF9940] mt-1">{formatConnectedDate(friend.connected_at)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => handleStartChat(friend.id)} className="px-3 py-2 bg-[#E70008] text-black font-bold rounded hover:bg-[#FF9940] transition-colors">💬 Chat</button>
                    <button onClick={() => handleFriendClick(friend.id)} className="px-3 py-2 border border-[#F9E4AD] text-[#F9E4AD] rounded hover:bg-[#F9E4AD] hover:text-black transition-colors">View Profile</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Stats Section */}
        {friends.length > 0 && (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-[#E70008]/10 border border-[#E70008]/30 rounded-lg p-4 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-[#FF9940] mb-1">{friends.length}</div>
              <div className="text-sm">Total Connections</div>
            </div>
            <div className="bg-[#FF9940]/10 border border-[#FF9940]/30 rounded-lg p-4 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-[#E70008] mb-1">{friends.filter(f => f.is_online).length}</div>
              <div className="text-sm">Online Now</div>
            </div>
            <div className="bg-[#F9E4AD]/10 border border-[#F9E4AD]/30 rounded-lg p-4 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-[#E70008] mb-1">{friends.filter(f => new Date(f.connected_at) > new Date(Date.now() - 30*24*60*60*1000)).length}</div>
              <div className="text-sm">New This Month</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
