"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

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

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function HomeDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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

  const fetchUserData = async () => {
    try {
      // Get the current authenticated user
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Auth session error:', sessionError);
        // Redirect to login page
        router.push('/login');
        return;
      }
      
      const authUser = session.user;

      // Fetch user profile from public.users table
      let { data: userData, error: userError } = await supabase
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
      let skillsData = [];
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
    difficulty: 'Intermediate' as const
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

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    
    const project: Project = {
      id: Date.now().toString(),
      title: newProject.title,
      description: newProject.description,
      category: newProject.category,
      techStack: newProject.techStack.split(',').map(s => s.trim()),
      lookingFor: newProject.lookingFor.split(',').map(s => s.trim()),
      difficulty: newProject.difficulty,
      status: 'open',
      createdAt: new Date().toISOString()
    };

    setProjects(prev => [project, ...prev]);
    setShowCreateModal(false);
    setNewProject({
      title: '',
      description: '',
      category: '',
      techStack: '',
      lookingFor: '',
      difficulty: 'Intermediate'
    });
  };

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
                <a href="/my-projects" className="text-[#F9E4AD] font-mono hover:text-[#FF9940] transition-colors">
                  My Projects
                </a>
                <a href="/members" className="text-[#F9E4AD] font-mono hover:text-[#FF9940] transition-colors">
                  Members
                </a>
                <a href="/projects" className="text-[#F9E4AD] font-mono hover:text-[#FF9940] transition-colors">
                  All Projects
                </a>
                <a href="/profile" className="text-[#F9E4AD] font-mono hover:text-[#FF9940] transition-colors">
                  Profile
                </a>
                <a href="/settings" className="text-[#F9E4AD] font-mono hover:text-[#FF9940] transition-colors">
                  Settings
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
        {/* Welcome Section */}
        <section className="mb-8">
          <div className="bg-gradient-to-r from-[#E70008]/10 to-[#FF9940]/10 rounded-lg p-6 mb-4">
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-[#E70008]/20 rounded w-64 mb-2"></div>
                <div className="h-4 bg-[#E70008]/20 rounded w-48"></div>
              </div>
            ) : user ? (
              <>
                <h2 className="text-3xl font-bold font-mono text-[#F9E4AD] mb-2">
                  Welcome back, {user.username}
                </h2>
                <p className="text-[#F9E4AD]/80 font-mono">
                  Ready to collaborate and build something amazing?
                </p>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold font-mono text-[#F9E4AD] mb-2">
                  Welcome back
                </h2>
                <p className="text-[#F9E4AD]/80 font-mono">
                  Please log in to see your personalized dashboard
                </p>
              </>
            )}
            {user && user.profileComplete < 100 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-mono text-[#F9E4AD]">
                    Profile Complete: {user?.profileComplete || 0}%
                  </span>
                </div>
                <div className="w-full bg-[#1a1a1a] rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(user?.profileComplete || 0)}`}
                    style={{ width: `${user?.profileComplete || 0}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="mb-8">
          <h3 className="text-2xl font-bold font-mono text-[#F9E4AD] mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="block w-full text-left p-6 rounded-lg border border-[#E70008]/30 hover:border-[#FF9940] transition-all duration-300 hover:shadow-lg hover:shadow-[#E70008]/20"
              >
                <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center text-2xl mb-3`}>
                  {action.icon}
                </div>
                <h4 className="text-lg font-bold font-mono text-[#F9E4AD] mb-2">
                  {action.title}
                </h4>
                <p className="text-sm font-mono text-[#F9E4AD]/80">
                  {action.description}
                </p>
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Community Feed */}
          <section className="lg:col-span-2">
            <h3 className="text-2xl font-bold font-mono text-[#F9E4AD] mb-4">
              Community Feed
            </h3>
            <div className="space-y-4">
              {communityUpdates.map((update) => (
                <div key={update.id} className="bg-[#E70008]/5 border border-[#E70008]/20 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-[#F9E4AD] mb-1">
                        {update.message}
                      </p>
                      {update.author && (
                        <p className="text-xs font-mono text-[#FF9940]">
                          by {update.author}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-mono text-[#F9E4AD]/60">
                      {update.timestamp}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Your Stats */}
          <section>
            <h3 className="text-2xl font-bold font-mono text-[#F9E4AD] mb-4">
              Your Stats
            </h3>
            <div className="space-y-4">
              <div className="bg-[#E70008]/5 border border-[#E70008]/20 rounded-lg p-4">
                <h4 className="text-lg font-bold font-mono text-[#F9E4AD] mb-2">
                  Skills
                </h4>
                <div className="flex flex-wrap gap-2">
                    {user?.skills?.length > 0 ? (
                      user.skills.map((skill, index) => (
                        <span key={index} className="px-3 py-1 bg-[#FF9940]/20 text-[#F9E4AD] font-mono text-xs rounded-full border border-[#FF9940]/30">
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="px-3 py-1 bg-[#1a1a1a] text-[#F9E4AD]/50 font-mono text-xs rounded-full">
                        No skills added yet
                      </span>
                    )}
                  </div>
              </div>

              <div className="bg-[#E70008]/5 border border-[#E70008]/20 rounded-lg p-4">
                <h4 className="text-lg font-bold font-mono text-[#F9E4AD] mb-2">
                  Activity
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-mono text-[#F9E4AD]">Projects Joined</span>
                    <span className="font-mono text-[#FF9940] font-bold">{user?.projectsJoined || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono text-[#F9E4AD]">Connections</span>
                    <span className="font-mono text-[#FF9940] font-bold">{user?.connections || 0}</span>
                  </div>
                </div>
              </div>
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