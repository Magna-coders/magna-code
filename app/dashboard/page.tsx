"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import ChatButton from '@/components/chat/ChatButton';
import { supabase } from '@/src/lib/supabase/client';

interface User {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  skills: string[];
  profileComplete: number;
  projectsJoined: number;
  connections: number;
}

interface CommunityUpdate {
  id: string;
  type: 'project' | 'announcement' | 'join';
  message: string;
  timestamp: string;
  author?: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  techStack: string[];
  lookingFor: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  status: 'open' | 'in-progress' | 'completed';
  createdAt: string;
}

interface ConnectionRequest {
  id: string;
  sender_id: string;
  sender_username: string;
  sender_email: string;
  sender_avatar_url?: string | null;
  created_at: string;
  message?: string;
}



export default function HomeDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    fetchUserData();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      } else if (event === 'SIGNED_IN' && !user) {
        fetchUserData();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

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
          created_at: request.created_at,
          message: request.message
        }));
        console.log('Connection requests fetched:', requestsData.length);
        setConnectionRequests(requestsData);
      }
    } catch (error) {
      console.error('Error fetching connection requests:', error);
    }
  };

  const fetchUserData = async () => {
    try {
      // Get the current authenticated user
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Auth session error:', sessionError);
        router.push('/login');
        return;
      }
      
      const authUser = session.user;

      // Fetch connection requests
      await fetchConnectionRequests(authUser.id);

      // Fetch user profile from public.users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, username, email, avatar_url, bio')
        .eq('id', authUser.id)
        .single();

      console.log('User fetch result:', { userData, userError });

      // If user doesn't exist in public.users, create a basic profile
      if (userError?.code === 'PGRST116' || !userData) {
        console.log('Creating new user profile...');
        const username = authUser.user_metadata?.username || 
                      authUser.email?.split('@')[0] || 
                      `user_${authUser.id.substring(0, 8)}`;
        
        // Ensure username is unique by appending a counter if needed
        let uniqueUsername = username;
        let counter = 1;
        while (counter < 10) {
          const { data: existingUsername } = await supabase
            .from('users')
            .select('username')
            .eq('username', uniqueUsername)
            .single();
          
          if (!existingUsername) break;
          uniqueUsername = `${username}${counter}`;
          counter++;
        }
        
        // Check if user already exists to avoid duplicate key errors
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', authUser.id)
          .single();
        
        let userData = null; // Define userData for this scope
        if (!existingUser) {
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([{
              id: authUser.id,
              username: uniqueUsername,
              email: authUser.email
            }])
            .select()
            .single();

          if (insertError) {
            console.error('Error creating user profile:', JSON.stringify(insertError, null, 2));
            console.error('Error details:', insertError.message, insertError.details, insertError.hint);
          } else {
            userData = newUser;
          }
        } else {
          // User exists, fetch complete data
          const { data: completeUser } = await supabase
            .from('users')
            .select('id, username, email, avatar_url, bio')
            .eq('id', authUser.id)
            .single();
          userData = completeUser;
        }
      } else if (userError) {
        console.error('User data error:', userError);
      }

      // Fetch user skills (handle missing table gracefully)
      let skillsData: { skill_name: string }[] = [];
      try {
        const { data: skills, error: skillsError } = await supabase
          .from('user_skills')
          .select('skill_name')
          .eq('user_id', authUser.id);
        
        if (!skillsError) {
          skillsData = skills || [];
        }
      } catch (skillsTableError) {
        console.warn('user_skills table not available:', skillsTableError);
      }

      // Fetch user's projects count (handle missing table gracefully)
      let projectsCount = 0;
      try {
        const { count, error: projectsError } = await supabase
          .from('project_contributors')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', authUser.id);
        
        if (!projectsError) {
          projectsCount = count || 0;
        }
      } catch (projectsTableError) {
        console.warn('project_contributors table not available:', projectsTableError);
      }

      // Calculate profile completion
      let profileComplete = 50; // Base for having profile
      if (userData?.bio) profileComplete += 20;
      if (skillsData && skillsData.length > 0) profileComplete += 20;
      if (userData?.avatar_url) profileComplete += 10;

      setUser({
        id: userData?.id || authUser.id,
        username: userData?.username || authUser.email?.split('@')[0] || 'User',
        email: userData?.email || authUser.email,
        avatar_url: userData?.avatar_url,
        bio: userData?.bio,
        skills: skillsData?.map(s => s.skill_name) || [],
        profileComplete: Math.min(profileComplete, 100),
        projectsJoined: projectsCount || 0,
        connections: 5 // Default for now
      });

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
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

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    category: '',
    techStack: '',
    lookingFor: '',
    difficulty: 'Intermediate' as 'Beginner' | 'Intermediate' | 'Advanced'
  });

  const [projects, setProjects] = useState<Project[]>([]);

  const [communityUpdates] = useState<CommunityUpdate[]>([
    {
      id: "1",
      type: "project",
      message: "John created a new project: E-commerce Solution",
      timestamp: "2 hours ago",
      author: "John Doe"
    },
    {
      id: "2",
      type: "announcement",
      message: "Weekly Meetup this Friday",
      timestamp: "5 hours ago"
    },
    {
      id: "3",
      type: "join",
      message: "Sarah joined the team: AI-Powered Analytics",
      timestamp: "1 day ago",
      author: "Sarah Chen"
    }
  ]);

  const quickActions = [
    {
      title: "Friends",
      description: connectionRequests.length > 0 ? `${connectionRequests.length} pending requests` : "View and manage your friends",
      icon: "🤗",
      action: () => window.location.href = "/friends",
      color: "bg-[#F9E4AD] text-black",
      badge: connectionRequests.length > 0 ? connectionRequests.length : null
    },
    {
      title: "Find Members",
      description: "Browse other coders/designers",
      icon: "👥",
      action: () => window.location.href = "/members",
      color: "bg-[#E70008]"
    },
    {
      title: "My Projects",
      description: "Manage your projects",
      icon: "📋",
      action: () => window.location.href = "/my-projects",
      color: "bg-[#FF9940]"
    },
    {
      title: "Chats",
      description: "View your conversations",
      icon: "💬",
      action: () => window.location.href = "/messages",
      color: "bg-[#E70008]"
    },
    {
      title: "Create Project",
      description: "Start a new collaboration",
      icon: "➕",
      action: () => setShowCreateModal(true),
      color: "bg-[#E70008]"
    },
    {
      title: "View Projects",
      description: "See ongoing projects",
      icon: "📁",
      action: () => window.location.href = "/projects",
      color: "bg-[#FF9940]"
    },
    {
      title: "Update Profile",
      description: "Add portfolio, GitHub, LinkedIn",
      icon: "✏️",
      action: () => window.location.href = "/profile/update",
      color: "bg-[#F9E4AD] text-black"
    },
    {
      title: "Join a Team",
      description: "Apply to collaborate",
      icon: "🤝",
      action: () => window.location.href = "/join-team",
      color: "bg-[#E70008]"
    }
  ];

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "bg-[#FF9940]";
    if (percentage >= 50) return "bg-[#E70008]";
    return "bg-[#F9E4AD]";
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([{
          title: newProject.title,
          description: newProject.description,
          category: newProject.category,
          tech_stack: newProject.techStack.split(',').map(s => s.trim()),
          looking_for: newProject.lookingFor.split(',').map(s => s.trim()),
          difficulty: newProject.difficulty,
          status: 'open',
          created_at: new Date().toISOString(),
          owner_id: user?.id
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      setProjects(prev => [data, ...prev]);
      setShowCreateModal(false);
      setNewProject({
        title: '',
        description: '',
        category: '',
        techStack: '',
        lookingFor: '',
        difficulty: 'Intermediate'
      });
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  return (
    <div className="min-h-screen bg-black relative">
      {/* Global decorative background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[120vw] h-[60vh] rounded-full blur-3xl opacity-20 bg-gradient-to-r from-[#E70008] via-[#FF9940] to-[#F9E4AD]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(231,0,8,0.08)_0%,_transparent_60%)]" />
      </div>
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-black/40 border-b border-[#E70008]/20">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-4 sm:space-x-8">
              <h1 className="text-xl sm:text-2xl font-bold font-mono text-[#E70008] tracking-tight">
                Magna Coders
              </h1>
              <nav className="hidden md:flex items-center space-x-4 lg:space-x-6">
                <a href="/dashboard" className="text-[#F9E4AD] font-mono hover:text-[#FF9940] transition-colors">Dashboard</a>
                <a href="/my-projects" className="text-[#F9E4AD] font-mono hover:text-[#FF9940] transition-colors">My Projects</a>
                <a href="/members" className="text-[#F9E4AD] font-mono hover:text-[#FF9940] transition-colors">Members</a>
                <a href="/projects" className="text-[#F9E4AD] font-mono hover:text-[#FF9940] transition-colors">All Projects</a>
                <a href="/profile" className="text-[#F9E4AD] font-mono hover:text-[#FF9940] transition-colors">Profile</a>
                <a href="/settings" className="text-[#F9E4AD] font-mono hover:text-[#FF9940] transition-colors">Settings</a>
              </nav>
            </div>
            <div className="hidden lg:flex flex-1 max-w-md">
              <div className="relative w-full">
                <input 
                  type="text"
                  placeholder="Search projects or members..."
                  className="w-full pl-10 pr-4 py-2 bg-black/50 border border-[#E70008]/50 rounded-full text-[#F9E4AD] placeholder-[#F9E4AD]/60 focus:border-[#FF9940] focus:outline-none font-mono text-sm"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F9E4AD]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {user?.avatar_url && (
                <img 
                  src={user.avatar_url} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full border border-[#E70008]/50 hover:border-[#FF9940] transition-colors cursor-pointer"
                  onClick={() => router.push('/profile')}
                />
              )}
              <button 
                onClick={handleLogout}
                className="hidden sm:inline-flex px-4 py-2 bg-[#E70008] text-black font-mono font-bold rounded-md hover:bg-[#FF9940] transition-colors">
                Logout
              </button>
              <button
                aria-label="Toggle Menu"
                className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md border border-[#E70008]/40 text-[#F9E4AD] hover:border-[#FF9940]"
                onClick={() => setMobileNavOpen(v => !v)}
              >
                <span className="sr-only">Open navigation</span>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
            </div>
          </div>
        </div>
        {mobileNavOpen && (
          <div className="md:hidden border-t border-[#E70008]/20 bg-black/70 backdrop-blur-sm">
            <div className="container mx-auto px-4 py-3 grid gap-2">
              <a href="/dashboard" className="text-[#F9E4AD] font-mono py-2 rounded hover:bg-[#E70008]/10">Dashboard</a>
              <a href="/my-projects" className="text-[#F9E4AD] font-mono py-2 rounded hover:bg-[#E70008]/10">My Projects</a>
              <a href="/members" className="text-[#F9E4AD] font-mono py-2 rounded hover:bg-[#E70008]/10">Members</a>
              <a href="/projects" className="text-[#F9E4AD] font-mono py-2 rounded hover:bg-[#E70008]/10">All Projects</a>
              <a href="/profile" className="text-[#F9E4AD] font-mono py-2 rounded hover:bg-[#E70008]/10">Profile</a>
              <a href="/settings" className="text-[#F9E4AD] font-mono py-2 rounded hover:bg-[#E70008]/10">Settings</a>
              <button 
                onClick={handleLogout}
                className="w-full mt-2 px-4 py-2 bg-[#E70008] text-black font-mono font-bold rounded-md hover:bg-[#FF9940] transition-colors">
                Logout
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <motion.section 
          className="relative mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="bg-[#E70008]/10 border border-[#E70008]/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8">
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-[#E70008]/20 rounded w-64 mb-2"></div>
                <div className="h-4 bg-[#E70008]/20 rounded w-48"></div>
              </div>
            ) : user ? (
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 sm:gap-6 lg:gap-8">
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full lg:w-auto">
                  <div className="relative flex-shrink-0">
                    <img 
                      src={user.avatar_url || "/placeholder-avatar.jpg"} 
                      alt="Profile" 
                      className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full border-2 border-[#E70008]/50"
                    />
                  </div>
                  <div className="text-center sm:text-left">
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#F9E4AD] mb-1 sm:mb-2">
                      Welcome back, {user.username}!
                    </h2>
                    <p className="text-[#F9E4AD]/80 text-sm sm:text-base lg:text-lg">
                      Ready to build something amazing?
                    </p>
                    <motion.button 
                      className="mt-3 sm:mt-4 px-4 sm:px-6 py-2 sm:py-3 bg-[#E70008] text-white font-bold rounded-lg hover:bg-[#E70008]/90 transition-colors duration-300 text-sm sm:text-base w-full sm:w-auto"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => router.push('/profile/update')}
                    >
                      Edit Profile
                    </motion.button>
                  </div>
                </div>
                
                <div className="flex-1 grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-3 gap-2 sm:gap-4 lg:gap-6 w-full mt-4 lg:mt-0">
                  <div className="bg-black/30 border border-white/20 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 text-center">
                    <h3 className="text-[#FF9940] font-bold text-lg sm:text-xl lg:text-2xl mb-1 sm:mb-2">{user.projectsJoined || 0}</h3>
                    <p className="text-[#F9E4AD]/80 font-medium text-xs sm:text-sm lg:text-base">Active Projects</p>
                  </div>
                  <div className="bg-black/30 border border-white/20 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 text-center">
                    <h3 className="text-[#FF9940] font-bold text-lg sm:text-xl lg:text-2xl mb-1 sm:mb-2">{user.connections || 0}</h3>
                    <p className="text-[#F9E4AD]/80 font-medium text-xs sm:text-sm lg:text-base">Connections</p>
                  </div>
                  <div className="bg-black/30 border border-white/20 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 text-center">
                    <h3 className="text-[#FF9940] font-bold text-lg sm:text-xl lg:text-2xl mb-1 sm:mb-2">{user.skills?.length || 0}</h3>
                    <p className="text-[#F9E4AD]/80 font-medium text-xs sm:text-sm lg:text-base">Skills</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-3xl sm:text-4xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-[#F9E4AD] via-[#FF9940] to-[#E70008] mb-2">
                  Welcome back
                </h2>
                <p className="text-[#F9E4AD]/80 font-mono">
                  Please log in to see your personalized dashboard
                </p>
              </>
            )}
            
            {user && (
              <div className="mt-6 sm:mt-8">
                <div className="flex justify-between items-center mb-3 sm:mb-4">
                  <span className="text-[#F9E4AD]/80 font-medium text-base sm:text-lg">Profile Completion</span>
                  <span className="text-[#FF9940] font-bold text-lg sm:text-xl">{user.profileComplete}%</span>
                </div>
                <div className="w-full bg-black/40 rounded-full h-2 sm:h-3 border border-white/20">
                  <motion.div 
                    className="h-full bg-[#E70008] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${user.profileComplete}%` }}
                    transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                  />
                </div>
              </div>
            )}
          </div>
        </motion.section>

        {/* Quick Actions */}
        <motion.section className="mb-6 sm:mb-8 lg:mb-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#F9E4AD] mb-4 sm:mb-6 lg:mb-8">
            Quick Actions
          </h3>
          <motion.div
            className="grid grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.08
                }
              }
            }}
          >
            {quickActions.map((action, index) => (
              <motion.button
                key={index}
                onClick={action.action}
                className="bg-[#E70008]/10 border border-[#E70008]/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 hover:bg-[#E70008]/20 transition-all duration-300"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * index }}
              >
                {action.badge && (
                  <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-[#E70008] text-white text-xs sm:text-sm font-bold px-2 py-1 sm:px-3 sm:py-1 rounded-full min-w-[20px] sm:min-w-[24px] text-center shadow-lg">
                    {action.badge}
                  </div>
                )}
                <div className="text-center">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 mx-auto mb-3 sm:mb-4 lg:mb-5 ${action.color} rounded-lg sm:rounded-xl flex items-center justify-center text-xl sm:text-2xl lg:text-3xl`}>
                    {action.icon}
                  </div>
                  <h4 className="font-bold text-[#F9E4AD] text-lg sm:text-xl lg:text-2xl mb-2 sm:mb-3">
                    {action.title}
                  </h4>
                  <p className="text-xs sm:text-sm lg:text-base text-[#F9E4AD]/70 leading-relaxed">
                    {action.description}
                  </p>
                </div>
              </motion.button>
            ))}
          </motion.div>
        </motion.section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Community Feed */}
          <section className="lg:col-span-2">
            <h3 className="text-3xl font-bold text-[#F9E4AD] mb-6">
              Community Feed
            </h3>
            <div className="space-y-6">
              {communityUpdates.map((update, index) => (
                <motion.div 
                  key={update.id} 
                  className="bg-black/30 border border-white/20 rounded-2xl p-6 hover:bg-black/40 transition-all duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-[#F9E4AD]/90 mb-3 leading-relaxed text-lg">
                        {update.message}
                      </p>
                      {update.author && (
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-[#FF9940] tracking-wide">
                            by {update.author}
                          </p>
                          <ChatButton
                            targetUserId={update.author === "John Doe" ? "john-doe-id" : "sarah-chen-id"}
                            targetUsername={update.author || "User"}
                            size="small"
                            showLabel={true}
                            className="ml-2"
                          />
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-medium text-[#F9E4AD]/60 ml-4 flex-shrink-0">
                      {update.timestamp}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Your Stats */}
          <section>
            <h3 className="text-3xl font-bold text-[#F9E4AD] mb-6">
              Your Stats
            </h3>
            <div className="space-y-6">
              <motion.div 
                className="bg-[#E70008]/10 border border-[#E70008]/30 rounded-2xl p-8"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                whileHover={{ scale: 1.01 }}
              >
                <h4 className="font-bold text-[#F9E4AD] text-2xl mb-6">Skills</h4>
                <div className="flex flex-wrap gap-3">
                  {user && user.skills.length > 0 ? (
                    user.skills.map((skill, index) => (
                      <motion.span
                        key={index}
                        className="px-4 py-2 bg-[#E70008] text-white rounded-full text-sm font-bold hover:bg-[#E70008]/90 transition-colors duration-300"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.1 * index }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {skill}
                      </motion.span>
                    ))
                  ) : (
                    <span className="px-4 py-2 bg-black/40 text-[#F9E4AD]/50 font-bold text-sm rounded-full border border-white/20">
                      No skills added yet
                    </span>
                  )}
                </div>
              </motion.div>

              <motion.div 
                className="bg-[#FF9940]/10 border border-[#FF9940]/30 rounded-2xl p-8"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                whileHover={{ scale: 1.01 }}
              >
                <h4 className="font-bold text-[#F9E4AD] text-2xl mb-6">Activity</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[#F9E4AD]/80 font-medium">Projects Joined</span>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-[#E70008] rounded-full flex items-center justify-center text-white font-bold text-sm">{user?.projectsJoined || 0}</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#F9E4AD]/80 font-medium">Connections</span>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-[#FF9940] rounded-full flex items-center justify-center text-black font-bold text-sm">{user?.connections || 0}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>
        </div>


      </main>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#E70008]/10 border border-[#E70008]/30 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold font-mono text-[#F9E4AD]">
                Create New Project
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#F9E4AD] hover:text-[#FF9940] text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-mono font-bold text-[#F9E4AD] mb-2">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  value={newProject.title}
                  onChange={(e) => setNewProject({...newProject, title: e.target.value})}
                  className="w-full px-3 py-2 bg-black border border-[#E70008]/50 rounded-md text-[#F9E4AD] font-mono focus:border-[#FF9940] focus:outline-none"
                  placeholder="Enter project title"
                />
              </div>

              <div>
                <label className="block text-sm font-mono font-bold text-[#F9E4AD] mb-2">
                  Description *
                </label>
                <textarea
                  required
                  value={newProject.description}
                  onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                  className="w-full px-3 py-2 bg-black border border-[#E70008]/50 rounded-md text-[#F9E4AD] font-mono focus:border-[#FF9940] focus:outline-none h-24 resize-none"
                  placeholder="Describe your project"
                />
              </div>

              <div>
                <label className="block text-sm font-mono font-bold text-[#F9E4AD] mb-2">
                  Category *
                </label>
                <select
                  required
                  value={newProject.category}
                  onChange={(e) => setNewProject({...newProject, category: e.target.value})}
                  className="w-full px-3 py-2 bg-black border border-[#E70008]/50 rounded-md text-[#F9E4AD] font-mono focus:border-[#FF9940] focus:outline-none"
                >
                  <option value="">Select category</option>
                  <option value="Web Development">Web Development</option>
                  <option value="Mobile App">Mobile App</option>
                  <option value="AI/ML">AI/ML</option>
                  <option value="Data Science">Data Science</option>
                  <option value="UI/UX Design">UI/UX Design</option>
                  <option value="Game Development">Game Development</option>
                  <option value="Blockchain">Blockchain</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-mono font-bold text-[#F9E4AD] mb-2">
                  Tech Stack (comma-separated)
                </label>
                <input
                  type="text"
                  value={newProject.techStack}
                  onChange={(e) => setNewProject({...newProject, techStack: e.target.value})}
                  className="w-full px-3 py-2 bg-black border border-[#E70008]/50 rounded-md text-[#F9E4AD] font-mono focus:border-[#FF9940] focus:outline-none"
                  placeholder="React, Node.js, MongoDB"
                />
              </div>

              <div>
                <label className="block text-sm font-mono font-bold text-[#F9E4AD] mb-2">
                  Looking For (comma-separated)
                </label>
                <input
                  type="text"
                  value={newProject.lookingFor}
                  onChange={(e) => setNewProject({...newProject, lookingFor: e.target.value})}
                  className="w-full px-3 py-2 bg-black border border-[#E70008]/50 rounded-md text-[#F9E4AD] font-mono focus:border-[#FF9940] focus:outline-none"
                  placeholder="Frontend Developer, UI Designer"
                />
              </div>

              <div>
                <label className="block text-sm font-mono font-bold text-[#F9E4AD] mb-2">
                  Difficulty Level
                </label>
                <select
                  value={newProject.difficulty}
                  onChange={(e) => setNewProject({...newProject, difficulty: e.target.value as 'Beginner' | 'Intermediate' | 'Advanced'})}
                  className="w-full px-3 py-2 bg-black border border-[#E70008]/50 rounded-md text-[#F9E4AD] font-mono focus:border-[#FF9940] focus:outline-none"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#E70008] text-black font-mono font-bold rounded-md hover:bg-[#FF9940] transition-colors"
                >
                  Create Project
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-black border border-[#E70008] text-[#F9E4AD] font-mono font-bold rounded-md hover:bg-[#E70008]/20 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}