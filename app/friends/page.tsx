"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

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

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function FriendsList() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
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
      // Fetch actual friends from the database using the user_friends view
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

  const handleFriendClick = (friendId: string) => {
    router.push(`/messages?friend=${friendId}`);
  };

  const handleStartChat = (friendId: string) => {
    router.push(`/messages?conversation=${friendId}`);
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

  const fetchConnectionRequests = async (userId: string) => {
    try {
      // Fetch pending friend requests from the database
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

  const handleAcceptRequest = async (requestId: string) => {
    try {
      // Call the accept_friend_request function in the database
      const { error } = await supabase
        .rpc('accept_friend_request', { request_id: requestId });

      if (error) {
        console.error('Error accepting friend request:', error);
        return;
      }

      // Refresh the data after successful acceptance
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
      // Call the decline_friend_request function in the database
      const { error } = await supabase
        .rpc('decline_friend_request', { request_id: requestId });

      if (error) {
        console.error('Error declining friend request:', error);
        return;
      }

      // Refresh the connection requests after declining
      if (currentUser) {
        fetchConnectionRequests(currentUser.id);
      }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-[#E70008]/20 rounded w-64 mb-8"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-[#E70008]/20 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-[#E70008]/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold font-mono text-[#E70008]">
                Magna Coders
              </h1>
              <nav className="hidden md:flex items-center space-x-6">
                <a href="/dashboard" className="text-[#F9E4AD] font-mono hover:text-[#FF9940] transition-colors">
                  Dashboard
                </a>
                <a href="/friends" className="text-[#FF9940] font-mono border-b-2 border-[#FF9940] pb-1">
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
              </nav>
            </div>
            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-[#E70008] text-black font-mono font-bold rounded-md hover:bg-[#FF9940] transition-colors">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold font-mono text-[#F9E4AD] mb-2">
            Connected Friends
          </h2>
          <p className="text-[#F9E4AD]/80 font-mono">
            Stay connected with your coding community
          </p>
        </div>

        {/* Connection Requests Section */}
        {connectionRequests.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold font-mono text-[#FF9940]">
                Connection Requests
              </h3>
              <span className="bg-[#E70008] text-black px-3 py-1 rounded-full text-sm font-mono font-bold">
                {connectionRequests.length}
              </span>
            </div>
            <div className="grid gap-4">
              {connectionRequests.map((request) => (
                <div 
                  key={request.id}
                  className="bg-[#1a1a1a] border border-[#FF9940]/30 rounded-lg p-6 hover:border-[#E70008] transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Sender Avatar */}
                      <div className="relative">
                        <div className="w-16 h-16 bg-[#FF9940]/20 rounded-full flex items-center justify-center text-2xl font-mono text-[#F9E4AD]">
                          {request.sender_avatar_url ? (
                            <img 
                              src={request.sender_avatar_url} 
                              alt={request.sender_username}
                              className="w-16 h-16 rounded-full object-cover"
                            />
                          ) : (
                            request.sender_username.charAt(0).toUpperCase()
                          )}
                        </div>
                      </div>

                      {/* Request Info */}
                      <div>
                        <h4 className="text-xl font-bold font-mono text-[#F9E4AD]">
                          {request.sender_username}
                        </h4>
                        <p className="text-sm font-mono text-[#F9E4AD]/60 mb-2">
                          {request.sender_email}
                        </p>
                        {request.sender_bio && (
                          <p className="text-sm font-mono text-[#F9E4AD]/80 mb-2">
                            {request.sender_bio}
                          </p>
                        )}
                        {request.message && (
                          <p className="text-sm font-mono text-[#F9E4AD] italic bg-black/30 p-3 rounded-md border-l-4 border-[#FF9940]">
                            "{request.message}"
                          </p>
                        )}
                        <p className="text-xs font-mono text-[#FF9940] mt-2">
                          Requested {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                      <button 
                        onClick={() => handleAcceptRequest(request.id)}
                        className="px-6 py-2 bg-[#FF9940] text-black font-mono font-bold rounded-md hover:bg-[#E70008] transition-colors flex items-center space-x-2"
                      >
                        <span>✓</span>
                        <span>Accept</span>
                      </button>
                      <button 
                        onClick={() => handleDeclineRequest(request.id)}
                        className="px-6 py-2 border border-[#F9E4AD] text-[#F9E4AD] font-mono font-bold rounded-md hover:bg-[#F9E4AD] hover:text-black transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends List */}
        <div className="grid gap-4">
          {friends.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-xl font-mono text-[#F9E4AD] mb-2">
                No friends yet
              </h3>
              <p className="text-[#F9E4AD]/60 font-mono mb-4">
                Connect with other members to build your network
              </p>
              <a 
                href="/members" 
                className="inline-block px-6 py-3 bg-[#E70008] text-black font-mono font-bold rounded-md hover:bg-[#FF9940] transition-colors"
              >
                Find Members
              </a>
            </div>
          ) : (
            friends.map((friend) => (
              <div 
                key={friend.id}
                className="bg-[#1a1a1a] border border-[#E70008]/30 rounded-lg p-6 hover:border-[#FF9940] transition-all duration-300 hover:shadow-lg hover:shadow-[#E70008]/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-16 h-16 bg-[#E70008]/20 rounded-full flex items-center justify-center text-2xl font-mono text-[#F9E4AD]">
                        {friend.avatar_url ? (
                          <img 
                            src={friend.avatar_url} 
                            alt={friend.username}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          friend.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      {/* Online Status Indicator */}
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-black ${
                        friend.is_online ? 'bg-[#FF9940]' : 'bg-gray-500'
                      }`}></div>
                    </div>

                    {/* Friend Info */}
                    <div>
                      <h3 className="text-xl font-bold font-mono text-[#F9E4AD]">
                        {friend.username}
                      </h3>
                      <p className="text-sm font-mono text-[#F9E4AD]/60 mb-1">
                        {friend.email}
                      </p>
                      {friend.bio && (
                        <p className="text-sm font-mono text-[#F9E4AD]/80">
                          {friend.bio}
                        </p>
                      )}
                      <p className="text-xs font-mono text-[#FF9940] mt-2">
                        {formatConnectedDate(friend.connected_at)}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    <button 
                      onClick={() => handleStartChat(friend.id)}
                      className="px-4 py-2 bg-[#E70008] text-black font-mono font-bold rounded-md hover:bg-[#FF9940] transition-colors flex items-center space-x-2"
                    >
                      <span>💬</span>
                      <span>Chat</span>
                    </button>
                    <button 
                      onClick={() => handleFriendClick(friend.id)}
                      className="px-4 py-2 border border-[#F9E4AD] text-[#F9E4AD] font-mono font-bold rounded-md hover:bg-[#F9E4AD] hover:text-black transition-colors"
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Stats Section */}
        {friends.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#E70008]/10 border border-[#E70008]/30 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold font-mono text-[#FF9940] mb-2">
                {friends.length}
              </div>
              <div className="text-sm font-mono text-[#F9E4AD]">
                Total Connections
              </div>
            </div>
            <div className="bg-[#FF9940]/10 border border-[#FF9940]/30 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold font-mono text-[#E70008] mb-2">
                {friends.filter(f => f.is_online).length}
              </div>
              <div className="text-sm font-mono text-[#F9E4AD]">
                Online Now
              </div>
            </div>
            <div className="bg-[#F9E4AD]/10 border border-[#F9E4AD]/30 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold font-mono text-[#E70008] mb-2">
                {friends.filter(f => {
                  const connectedDate = new Date(f.connected_at);
                  const thirtyDaysAgo = new Date();
                  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                  return connectedDate > thirtyDaysAgo;
                }).length}
              </div>
              <div className="text-sm font-mono text-[#F9E4AD]">
                New This Month
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}