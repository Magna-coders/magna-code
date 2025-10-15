'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { 
  MessageCircle, 
  Users, 
  Briefcase, 
  Search, 
  Bell, 
  MoreHorizontal,
  Settings,
  BookOpen,
  FileText,
  HelpCircle,
  Award,
  Video,
  Image,
  Puzzle,
  Heart,
  Share2,
  Mail,
  TrendingUp,
  BarChart3,
  Calendar,
  Zap,
  Moon,
  Sun,
  X,
  Menu
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  location?: string;
  availability?: string;
  website_url?: string;
  github_url?: string;
  twitter_url?: string;
  linkedin_url?: string;
  whatsapp_url?: string;
}

interface FeedItem {
  id: string;
  type: 'reel' | 'project' | 'design' | 'opportunity' | 'text';
  title: string;
  content: string;
  author: string;
  avatar: string;
  timestamp: string;
  likes?: number;
  comments?: number;
  skills?: string[];
  image?: string;
}

export default function NewDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [postContent, setPostContent] = useState('');
  const [showMorePopup, setShowMorePopup] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [showProfileCard, setShowProfileCard] = useState(true);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const router = useRouter();

  // Sample feed data
  const sampleFeedItems: FeedItem[] = [
    {
      id: '1',
      type: 'project',
      title: 'React Native Mobile App',
      content: 'Looking for a UI/UX designer to join our mobile app project. We\'re building a social platform for developers.',
      author: 'John Doe',
      avatar: '/icons/icon-32.png',
      timestamp: '2 hours ago',
      likes: 12,
      comments: 5,
      skills: ['React Native', 'UI/UX', 'JavaScript']
    },
    {
      id: '2',
      type: 'reel',
      title: 'Building a REST API in 5 minutes',
      content: 'Quick tutorial on setting up a Node.js REST API with Express',
      author: 'Sarah Wilson',
      avatar: '/icons/icon-32.png',
      timestamp: '4 hours ago',
      likes: 28,
      comments: 8,
      image: '/tech icons/1.svg'
    },
    {
      id: '3',
      type: 'opportunity',
      title: 'Frontend Developer Position',
      content: 'Remote position available for experienced React developer. Competitive salary and great benefits.',
      author: 'TechCorp Inc.',
      avatar: '/icons/icon-32.png',
      timestamp: '1 day ago',
      likes: 45,
      comments: 12,
      skills: ['React', 'TypeScript', 'CSS']
    },
    {
      id: '4',
      type: 'design',
      title: 'Modern Dashboard UI Kit',
      content: 'Just finished designing a comprehensive dashboard UI kit with 50+ components. Available for free download!',
      author: 'Emma Designer',
      avatar: '/icons/icon-32.png',
      timestamp: '3 hours ago',
      likes: 67,
      comments: 15,
      skills: ['Figma', 'UI Design', 'Design Systems'],
      image: '/tech icons/2.svg'
    },
    {
      id: '5',
      type: 'reel',
      title: 'CSS Grid vs Flexbox',
      content: 'When to use CSS Grid vs Flexbox? Here\'s a quick comparison with practical examples.',
      author: 'Mike Frontend',
      avatar: '/icons/icon-32.png',
      timestamp: '6 hours ago',
      likes: 34,
      comments: 11,
      skills: ['CSS', 'Frontend', 'Web Development']
    },
    {
      id: '6',
      type: 'project',
      title: 'Open Source E-commerce Platform',
      content: 'Building an open-source e-commerce platform with Next.js and Stripe. Contributors welcome!',
      author: 'Alex Developer',
      avatar: '/icons/icon-32.png',
      timestamp: '8 hours ago',
      likes: 89,
      comments: 23,
      skills: ['Next.js', 'Stripe', 'E-commerce', 'Open Source']
    },
    {
      id: '7',
      type: 'opportunity',
      title: 'Backend Engineer - Startup',
      content: 'Join our fast-growing startup as a Backend Engineer. Work with cutting-edge technologies and shape the future of fintech.',
      author: 'FinTech Startup',
      avatar: '/icons/icon-32.png',
      timestamp: '12 hours ago',
      likes: 56,
      comments: 18,
      skills: ['Node.js', 'Python', 'AWS', 'Microservices']
    },
    {
      id: '8',
      type: 'design',
      title: 'Mobile App Redesign Case Study',
      content: 'How we increased user engagement by 40% through strategic UX redesign. Full case study inside.',
      author: 'UX Studio',
      avatar: '/icons/icon-32.png',
      timestamp: '1 day ago',
      likes: 123,
      comments: 31,
      skills: ['UX Research', 'Mobile Design', 'User Testing'],
      image: '/tech icons/3.svg'
    },
    {
      id: '9',
      type: 'reel',
      title: 'Docker Containers Explained',
      content: 'Understanding Docker containers in 60 seconds. Perfect for beginners!',
      author: 'DevOps Guru',
      avatar: '/icons/icon-32.png',
      timestamp: '2 days ago',
      likes: 78,
      comments: 19,
      skills: ['Docker', 'DevOps', 'Containerization']
    },
    {
      id: '10',
      type: 'opportunity',
      title: 'Freelance React Developer',
      content: 'Looking for a freelance React developer for a 3-month project. Remote work, competitive rates.',
      author: 'Digital Agency',
      avatar: '/icons/icon-32.png',
      timestamp: '2 days ago',
      likes: 42,
      comments: 14,
      skills: ['React', 'Freelance', 'Remote Work']
    }
  ];

  useEffect(() => {
    fetchUserData();
    setFeedItems(sampleFeedItems);
  }, []);

  // Handle clicking outside popup to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showMorePopup && !target.closest('.more-popup-container')) {
        setShowMorePopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMorePopup]);

  const fetchUserData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        router.push('/login');
        return;
      }

      // Fetch user data from database
      const { data: userData, error } = await supabase
        .from('users')
        .select('id, username, email, avatar_url, bio, location, availability, website_url, github_url, twitter_url, linkedin_url, whatsapp_url')
        .eq('id', authUser.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // User doesn't exist, create new user
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            username: authUser.user_metadata?.username || authUser.email?.split('@')[0],
            email: authUser.email
          })
          .select('id, username, email, avatar_url, bio, location, availability, website_url, github_url, twitter_url, linkedin_url, whatsapp_url')
          .single();

        if (insertError) {
          console.error('Error creating user:', insertError);
          return;
        }
        
        setUser({
          ...newUser,
          skills: [],
          profileComplete: 20,
          projectsJoined: 0,
          connections: 0
        });
      } else if (userData) {
        // Fetch user skills
        const { data: skillsData } = await supabase
          .from('user_skills')
          .select('skill_name')
          .eq('user_id', authUser.id);

        const skills = skillsData?.map(skill => skill.skill_name) || [];

        setUser({
          id: userData.id,
          username: userData.username,
          email: userData.email,
          avatar_url: userData.avatar_url,
          bio: userData.bio,
          location: userData.location || '',
          availability: userData.availability || '',
          website_url: userData.website_url || '',
          github_url: userData.github_url || '',
          twitter_url: userData.twitter_url || '',
          linkedin_url: userData.linkedin_url || '',
          whatsapp_url: userData.whatsapp_url || '',
          skills,
          profileComplete: 75,
          projectsJoined: 3,
          connections: 24
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleCreatePost = () => {
    if (postContent.trim()) {
      const newPost: FeedItem = {
        id: Date.now().toString(),
        type: 'text',
        title: 'Update',
        content: postContent,
        author: user?.username || 'You',
        avatar: user?.avatar_url || '/icons/icon-32.png',
        timestamp: 'Just now',
        likes: 0,
        comments: 0
      };
      setFeedItems([newPost, ...feedItems]);
      setPostContent('');
    }
  };

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
  };

  // Filter feed items by category
  const filteredFeedItems = feedItems.filter(item => {
    if (activeFilter === 'All') return true;
    
    // Map filter names to types
    const filterMap: { [key: string]: string } = {
      'Reels': 'reel',
      'Projects': 'project',
      'Opportunities': 'opportunity',
      'Designs': 'design'
    };
    
    return item.type === filterMap[activeFilter];
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9E4AD] flex items-center justify-center">
        <div className="text-2xl font-semibold text-black">Loading...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkTheme ? 'bg-gray-900' : 'bg-[#F9E4AD]'}`}>
      {/* Mobile Header */}
      <div className={`sm:hidden fixed top-0 left-0 right-0 z-30 p-4 backdrop-blur-sm border-b transition-colors duration-300 ${isDarkTheme ? 'bg-gray-800/95 border-gray-700' : 'bg-white/95 border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            className={`p-2 rounded-lg transition-colors ${isDarkTheme ? 'text-white hover:bg-gray-700' : 'text-black hover:bg-gray-200'}`}
          >
            <Menu className="w-6 h-6" />
          </button>
          <img 
            src="/community app logo.png" 
            alt="Magna Coders" 
            className="w-8 h-8 rounded-lg object-cover"
          />
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors ${isDarkTheme ? 'text-white hover:bg-gray-700' : 'text-black hover:bg-gray-200'}`}
          >
            {isDarkTheme ? (
              <Sun className="w-5 h-5 text-yellow-500" />
            ) : (
              <Moon className="w-5 h-5 text-gray-700" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && (
        <div 
          className="sm:hidden fixed inset-0 bg-black/50 z-15"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      <div className="flex w-full relative">
        {/* LEFT PANEL - Navigation & Identity */}
        <div className={`w-full sm:w-80 lg:w-1/4 h-screen backdrop-blur-sm border-r p-4 sm:p-6 fixed left-0 top-0 overflow-y-auto z-20 scrollbar-thin scrollbar-thumb-[#E70008] transition-all duration-300 transform ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'} sm:translate-x-0 ${isDarkTheme ? 'bg-gray-800/95 border-gray-700 scrollbar-track-gray-700' : 'bg-white/95 border-gray-200 scrollbar-track-gray-200'}`}>
          {/* App Logo & Search */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              {/* Mobile Close Button */}
              <button
                onClick={() => setShowMobileSidebar(false)}
                className={`sm:hidden p-1.5 rounded-full transition-colors ${isDarkTheme ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-200'}`}
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center justify-center relative flex-1 sm:flex-none">
                <img 
                  src="/community app logo.png" 
                  alt="Magna Coders" 
                  className="w-12 h-12 rounded-lg object-cover"
                />
                {/* Theme Toggle Icon - Hidden on mobile since it's in header */}
                <button
                  onClick={toggleTheme}
                  className={`hidden sm:block absolute -top-1 -right-1 p-1.5 rounded-full shadow-md transition-all duration-200 hover:scale-110 ${isDarkTheme ? 'bg-gray-700/80 hover:bg-gray-700' : 'bg-white/80 hover:bg-white'}`}
                  title={isDarkTheme ? "Switch to Light Theme" : "Switch to Dark Theme"}
                >
                  {isDarkTheme ? (
                    <Sun className="w-4 h-4 text-yellow-500" />
                  ) : (
                    <Moon className="w-4 h-4 text-gray-700" />
                  )}
                </button>
              </div>
              
              {/* Spacer for mobile */}
              <div className="sm:hidden w-8"></div>
            </div>
            {/* Search Bar */}
            <div className="relative">
              <Input
                type="text"
                placeholder="search magna coders"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full px-4 py-2 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E70008] focus:border-transparent transition-all pr-10 ${isDarkTheme ? 'bg-gray-700/70 border-gray-600 text-white placeholder-gray-400' : 'bg-white/70 border-gray-200 text-black placeholder-gray-500'}`}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Search className={`w-4 h-4 ${isDarkTheme ? 'text-gray-400' : 'text-gray-400'}`} />
              </div>
            </div>
          </div>
          
          {/* User Identity */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <div className="relative">
                <img
                  src={user?.avatar_url || '/icons/icon-32.png'}
                  alt="Profile"
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#E70008]"
                />
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 ${isDarkTheme ? 'border-gray-800' : 'border-white'}`}></div>
              </div>
              <div className="ml-3">
                <h3 className={`font-semibold ${isDarkTheme ? 'text-white' : 'text-black'}`}>{user?.username}</h3>
                <p className={`text-sm ${isDarkTheme ? 'text-gray-400' : 'text-gray-600'}`}>Online</p>
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="mb-8">
            <div className="space-y-2">
              <a href="/messages" className={`flex items-center p-3 rounded-2xl transition-colors ${isDarkTheme ? 'hover:bg-gray-700/70' : 'hover:bg-white/70'}`}>
                <MessageCircle className="text-[#E70008] mr-3 w-5 h-5" />
                <span className={`font-medium ${isDarkTheme ? 'text-white' : 'text-black'}`}>Messages</span>
              </a>
              <a href="/friends" className={`flex items-center p-3 rounded-2xl transition-colors ${isDarkTheme ? 'hover:bg-gray-700/70' : 'hover:bg-white/70'}`}>
                <Users className="text-[#E70008] mr-3 w-5 h-5" />
                <span className={`font-medium ${isDarkTheme ? 'text-white' : 'text-black'}`}>Friends</span>
              </a>
              <a href="/my-projects" className={`flex items-center p-3 rounded-2xl transition-colors ${isDarkTheme ? 'hover:bg-gray-700/70' : 'hover:bg-white/70'}`}>
                <Briefcase className="text-[#E70008] mr-3 w-5 h-5" />
                <span className={`font-medium ${isDarkTheme ? 'text-white' : 'text-black'}`}>My Projects</span>
              </a>
              <a href="#" className={`flex items-center p-3 rounded-2xl transition-colors ${isDarkTheme ? 'hover:bg-gray-700/70' : 'hover:bg-white/70'}`}>
                <Search className="text-[#E70008] mr-3 w-5 h-5" />
                <span className={`font-medium ${isDarkTheme ? 'text-white' : 'text-black'}`}>Explore</span>
              </a>
              <a href="#" className={`flex items-center p-3 rounded-2xl transition-colors ${isDarkTheme ? 'hover:bg-gray-700/70' : 'hover:bg-white/70'}`}>
                <Bell className="text-[#E70008] mr-3 w-5 h-5" />
                <span className={`font-medium ${isDarkTheme ? 'text-white' : 'text-black'}`}>Notifications</span>
              </a>
              
              {/* More Button */}
              <div className="relative more-popup-container">
                <button 
                  onClick={() => setShowMorePopup(!showMorePopup)}
                  className={`flex items-center p-3 rounded-2xl transition-colors w-full text-left ${isDarkTheme ? 'hover:bg-gray-700/70' : 'hover:bg-white/70'}`}
                >
                  <MoreHorizontal className="text-[#E70008] mr-3 w-5 h-5" />
                  <span className={`font-medium ${isDarkTheme ? 'text-white' : 'text-black'}`}>More</span>
                </button>
                
                {/* More Popup */}
                {showMorePopup && (
                  <div className={`absolute left-0 top-full mt-2 w-64 rounded-2xl shadow-lg border py-2 z-50 ${isDarkTheme ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <a href="#" className={`flex items-center px-4 py-3 transition-colors ${isDarkTheme ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                      <Settings className="text-[#E70008] mr-3 w-5 h-5" />
                      <span className={`font-medium ${isDarkTheme ? 'text-white' : 'text-black'}`}>Settings</span>
                    </a>
                    <a href="#" className={`flex items-center px-4 py-3 transition-colors ${isDarkTheme ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                      <BookOpen className="text-[#E70008] mr-3 w-5 h-5" />
                      <span className={`font-medium ${isDarkTheme ? 'text-white' : 'text-black'}`}>Courses/Classes</span>
                    </a>
                    <a href="#" className={`flex items-center px-4 py-3 transition-colors ${isDarkTheme ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                      <FileText className="text-[#E70008] mr-3 w-5 h-5" />
                      <span className={`font-medium ${isDarkTheme ? 'text-white' : 'text-black'}`}>Documentation</span>
                    </a>
                    <a href="#" className={`flex items-center px-4 py-3 transition-colors ${isDarkTheme ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                      <HelpCircle className="text-[#E70008] mr-3 w-5 h-5" />
                      <span className={`font-medium ${isDarkTheme ? 'text-white' : 'text-black'}`}>Support/Help</span>
                    </a>
                    <a href="#" className={`flex items-center px-4 py-3 transition-colors ${isDarkTheme ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                      <Award className="text-[#E70008] mr-3 w-5 h-5" />
                      <span className={`font-medium ${isDarkTheme ? 'text-white' : 'text-black'}`}>Verification Badges</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </nav>


        </div>

        {/* CENTER PANEL - Main Feed & Actions */}
        <div className="flex-1 p-4 sm:p-6 pt-20 sm:pt-6 ml-0 sm:ml-80 lg:ml-[25%] mr-0 lg:mr-[25%] overflow-y-auto max-h-screen">
          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <h1 className={`text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4 ${isDarkTheme ? 'text-white' : 'text-black'}`}>Welcome back, {user?.username}!</h1>
            
            {/* Profile Snapshot */}
            {showProfileCard && (
              <div className={`backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg mb-4 sm:mb-6 relative ${isDarkTheme ? 'bg-gray-800/70' : 'bg-white/70'}`}>
                {/* Close Button */}
                <button
                  onClick={() => setShowProfileCard(false)}
                  className={`absolute top-2 right-2 p-1 rounded-full hover:bg-gray-200/50 transition-colors ${isDarkTheme ? 'text-gray-300 hover:bg-gray-700/50' : 'text-gray-500 hover:bg-gray-200/50'}`}
                >
                  <X className="w-4 h-4" />
                </button>
                
                {/* Profile Completion */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-sm font-medium ${isDarkTheme ? 'text-white' : 'text-black'}`}>Profile Completion</span>
                    <span className={`text-sm ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>{user?.profileComplete}%</span>
                  </div>
                  <div className={`w-full rounded-full h-2 ${isDarkTheme ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div 
                      className="bg-[#FF9940] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${user?.profileComplete}%` }}
                    ></div>
                  </div>
                  <p className={`text-xs mt-2 ${isDarkTheme ? 'text-gray-400' : 'text-gray-500'}`}>
                    Complete profile to get more opportunities and visibility
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Composer Section */}
          <div className={`backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg mb-4 sm:mb-6 ${isDarkTheme ? 'bg-gray-800/70' : 'bg-white/70'}`}>
            {/* User Profile Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-[#E70008]">
                <img
                  src={user?.avatar_url || '/icons/icon-32.png'}
                  alt={user?.username || 'User'}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className={`font-medium text-sm sm:text-base ${isDarkTheme ? 'text-gray-200' : 'text-gray-800'}`}>
                {user?.username || 'User'}
              </span>
            </div>

            {/* Composer Form */}
            <Textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="What are you building today?"
              className={`w-full p-3 sm:p-4 border rounded-xl sm:rounded-2xl resize-none focus:ring-2 focus:ring-[#E70008] text-sm sm:text-base ${isDarkTheme ? 'border-gray-600 bg-gray-700/50 text-white placeholder-gray-400' : 'border-gray-200 bg-white/50 text-black placeholder-gray-500'}`}
              rows={3}
            />
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-4 gap-3">
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <button className="flex items-center px-3 py-2 sm:px-4 bg-[#FF9940] text-white rounded-xl sm:rounded-2xl hover:bg-orange-600 transition-colors text-xs sm:text-sm">
                  <Video className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Reel
                </button>
                <button className="flex items-center px-3 py-2 sm:px-4 bg-[#E70008] text-white rounded-xl sm:rounded-2xl hover:bg-red-700 transition-colors text-xs sm:text-sm">
                  <Image className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Photo
                </button>
                <button className="flex items-center px-3 py-2 sm:px-4 bg-[#E70008] text-white rounded-xl sm:rounded-2xl hover:bg-red-700 transition-colors text-xs sm:text-sm">
                  <Puzzle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Project
                </button>
                <button className="flex items-center px-3 py-2 sm:px-4 bg-[#E70008] text-white rounded-xl sm:rounded-2xl hover:bg-red-700 transition-colors text-xs sm:text-sm">
                  <Briefcase className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Opportunity
                </button>
              </div>
              <button 
                onClick={handleCreatePost}
                className="px-4 py-2 sm:px-6 bg-[#E70008] text-white rounded-xl sm:rounded-2xl hover:bg-red-700 transition-colors font-semibold text-sm sm:text-base w-full sm:w-auto"
              >
                Post
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex justify-center sm:justify-between items-center mb-4 sm:mb-6">
            <div className={`flex flex-wrap gap-1 sm:space-x-1 rounded-xl sm:rounded-2xl p-1 shadow-lg ${isDarkTheme ? 'bg-gray-800/50' : 'bg-white/50'}`}>
              {['All', 'Reels', 'Projects', 'Opportunities', 'Designs'].map((filter) => {
                const isActive = activeFilter === filter;

                return (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`relative px-2 py-1 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl font-medium transition-all duration-300 transform text-xs sm:text-sm ${
                      isActive
                        ? 'bg-[#E70008] text-white shadow-lg scale-105'
                        : `${isDarkTheme ? 'text-white hover:bg-gray-700/70' : 'text-black hover:bg-white/70'} hover:scale-102`
                    }`}
                  >
                    {filter}
                    {isActive && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 sm:w-2 sm:h-2 bg-[#E70008] rounded-full"></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feed Section */}
          <div className="space-y-4 sm:space-y-6">
            {filteredFeedItems.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">🔍</div>
                <h3 className={`text-lg sm:text-xl font-semibold mb-2 ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>No items found</h3>
                <p className={`text-sm sm:text-base ${isDarkTheme ? 'text-gray-400' : 'text-gray-500'}`}>Try adjusting your filters or check back later for new content.</p>
              </div>
            ) : (
              filteredFeedItems.map((item, index) => (
                <div 
                  key={item.id} 
                  className={`backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] animate-fadeIn ${isDarkTheme ? 'bg-gray-800/70' : 'bg-white/70'}`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center mb-3 sm:mb-4">
                    <img
                      src={item.avatar}
                      alt={item.author}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-white shadow-md"
                    />
                    <div className="ml-3 flex-1">
                      <h4 className={`font-semibold text-sm sm:text-base ${isDarkTheme ? 'text-white' : 'text-black'}`}>{item.author}</h4>
                      <p className={`text-xs sm:text-sm ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>{item.timestamp}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 sm:px-3 rounded-full text-xs font-medium ${
                        item.type === 'project' ? (isDarkTheme ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800') :
                        item.type === 'reel' ? (isDarkTheme ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-800') :
                        item.type === 'opportunity' ? (isDarkTheme ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800') :
                        item.type === 'design' ? (isDarkTheme ? 'bg-pink-900 text-pink-200' : 'bg-pink-100 text-pink-800') :
                        (isDarkTheme ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800')
                      }`}>
                        {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                      </span>
                    </div>
                  </div>
                  
                  <h3 className={`text-base sm:text-lg font-semibold mb-2 hover:text-[#E70008] transition-colors cursor-pointer ${isDarkTheme ? 'text-white' : 'text-black'}`}>{item.title}</h3>
                  <p className={`mb-3 sm:mb-4 leading-relaxed text-sm sm:text-base ${isDarkTheme ? 'text-gray-300' : 'text-gray-700'}`}>{item.content}</p>
                  
                  {item.image && (
                    <img src={item.image} alt="Content" className="w-full h-32 sm:h-48 object-cover rounded-lg sm:rounded-xl mb-3 sm:mb-4 hover:scale-105 transition-transform duration-300" />
                  )}
                  
                  {item.skills && (
                    <div className="flex flex-wrap gap-1 sm:gap-2 mb-3 sm:mb-4">
                      {item.skills.map((skill, index) => (
                        <span key={index} className="px-2 py-1 sm:px-3 bg-[#FF9940] text-white text-xs sm:text-sm rounded-full hover:bg-[#E70008] transition-colors cursor-pointer">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between pt-3 sm:pt-4 border-t gap-3 sm:gap-0 ${isDarkTheme ? 'border-gray-600' : 'border-gray-200'}`}>
                    <div className="flex space-x-4 sm:space-x-6">
                      <button className={`flex items-center space-x-1 sm:space-x-2 hover:text-[#E70008] transition-all duration-200 hover:scale-110 ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
                        <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="font-medium text-sm sm:text-base">{item.likes}</span>
                      </button>
                      <button className={`flex items-center space-x-1 sm:space-x-2 hover:text-[#E70008] transition-all duration-200 hover:scale-110 ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
                        <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="font-medium text-sm sm:text-base">{item.comments}</span>
                      </button>
                      <button className={`flex items-center space-x-1 sm:space-x-2 hover:text-[#E70008] transition-all duration-200 hover:scale-110 ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
                        <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="font-medium text-sm sm:text-base">Share</span>
                      </button>
                    </div>
                    
                    {item.type === 'project' && (
                      <button className="px-3 py-2 sm:px-4 bg-[#E70008] text-white rounded-xl sm:rounded-2xl hover:bg-red-700 transition-all duration-200 hover:scale-105 shadow-lg text-sm sm:text-base w-full sm:w-auto">
                        Join Project
                      </button>
                    )}
                    
                    {item.type === 'opportunity' && (
                      <button className="px-4 py-2 bg-[#FF9940] text-white rounded-2xl hover:bg-orange-600 transition-all duration-200 hover:scale-105 shadow-lg">
                        Apply Now
                      </button>
                    )}
                    
                    {item.type === 'design' && (
                      <button className="px-4 py-2 bg-pink-500 text-white rounded-2xl hover:bg-pink-600 transition-all duration-200 hover:scale-105 shadow-lg">
                        View Design
                      </button>
                    )}
                    
                    {item.type === 'reel' && (
                      <button className="px-4 py-2 bg-purple-500 text-white rounded-2xl hover:bg-purple-600 transition-all duration-200 hover:scale-105 shadow-lg">
                        Watch Reel
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT PANEL - Context & Awareness */}
        <div className={`hidden lg:block w-1/4 p-6 space-y-6 fixed right-0 top-0 h-screen overflow-y-auto z-10 scrollbar-thin scrollbar-thumb-[#FF9940] transition-colors duration-300 ${isDarkTheme ? 'bg-gray-900 scrollbar-track-gray-800' : 'bg-[#F9E4AD] scrollbar-track-gray-200'}`}>
          {/* Invitations & Requests */}
          <div className={`backdrop-blur-sm rounded-2xl p-4 shadow-lg ${isDarkTheme ? 'bg-gray-800/70' : 'bg-white/70'}`}>
            <div className="flex items-center mb-4">
              <Mail className="text-[#FF9940] w-5 h-5" />
              <h3 className={`font-semibold ml-2 ${isDarkTheme ? 'text-white' : 'text-black'}`}>Invitations & Requests</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <img src="/icons/icon-32.png" alt="User" className="w-8 h-8 rounded-full" />
                  <div className="ml-2">
                    <p className={`text-sm font-medium ${isDarkTheme ? 'text-white' : 'text-black'}`}>Alex Chen</p>
                    <p className={`text-xs ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>Project invite</p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button className="px-2 py-1 bg-[#E70008] text-white text-xs rounded-lg">Accept</button>
                  <button className={`px-2 py-1 text-xs rounded-lg ${isDarkTheme ? 'bg-gray-600 text-gray-200' : 'bg-gray-300 text-gray-700'}`}>Decline</button>
                </div>
              </div>
            </div>
          </div>

          {/* Trending Now */}
          <div className={`backdrop-blur-sm rounded-2xl p-4 shadow-lg ${isDarkTheme ? 'bg-gray-800/70' : 'bg-white/70'}`}>
            <div className="flex items-center mb-4">
              <TrendingUp className="text-[#FF9940] w-5 h-5" />
              <h3 className={`font-semibold ml-2 ${isDarkTheme ? 'text-white' : 'text-black'}`}>Trending Now</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center">
                <img src="/tech icons/2.svg" alt="Trending" className="w-8 h-8 rounded" />
                <div className="ml-2">
                  <p className={`text-sm font-medium ${isDarkTheme ? 'text-white' : 'text-black'}`}>AI Chat Bot Tutorial</p>
                  <p className={`text-xs ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>1.2k views</p>
                </div>
              </div>
              <div className="flex items-center">
                <img src="/tech icons/3.svg" alt="Trending" className="w-8 h-8 rounded" />
                <div className="ml-2">
                  <p className={`text-sm font-medium ${isDarkTheme ? 'text-white' : 'text-black'}`}>React 18 Features</p>
                  <p className={`text-xs ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>856 views</p>
                </div>
              </div>
            </div>
          </div>

          {/* Your Stats & Achievements */}
          <div className={`backdrop-blur-sm rounded-2xl p-4 shadow-lg ${isDarkTheme ? 'bg-gray-800/70' : 'bg-white/70'}`}>
            <div className="flex items-center mb-4">
              <BarChart3 className="text-[#FF9940] w-5 h-5" />
              <h3 className={`font-semibold ml-2 ${isDarkTheme ? 'text-white' : 'text-black'}`}>Your Stats</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className={`text-sm ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>Projects Active</span>
                <span className={`text-sm font-medium ${isDarkTheme ? 'text-white' : 'text-black'}`}>2</span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>Projects Completed</span>
                <span className={`text-sm font-medium ${isDarkTheme ? 'text-white' : 'text-black'}`}>8</span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>Skills Mastered</span>
                <span className={`text-sm font-medium ${isDarkTheme ? 'text-white' : 'text-black'}`}>{user?.skills.length}</span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>Badges Earned</span>
                <span className={`text-sm font-medium ${isDarkTheme ? 'text-white' : 'text-black'}`}>5</span>
              </div>
            </div>
          </div>

          {/* Active Members */}
          <div className={`backdrop-blur-sm rounded-2xl p-4 shadow-lg ${isDarkTheme ? 'bg-gray-800/70' : 'bg-white/70'}`}>
            <div className="flex items-center mb-4">
              <Users className="text-[#FF9940] w-5 h-5" />
              <h3 className={`font-semibold ml-2 ${isDarkTheme ? 'text-white' : 'text-black'}`}>Active Members</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="relative">
                  <img src="/icons/icon-32.png" alt="Member" className="w-8 h-8 rounded-full" />
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border ${isDarkTheme ? 'border-gray-800' : 'border-white'}`}></div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className={`backdrop-blur-sm rounded-2xl p-4 shadow-lg ${isDarkTheme ? 'bg-gray-800/70' : 'bg-white/70'}`}>
            <div className="flex items-center mb-4">
              <Calendar className="text-[#FF9940] w-5 h-5" />
              <h3 className={`font-semibold ml-2 ${isDarkTheme ? 'text-white' : 'text-black'}`}>Upcoming Events</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className={`text-sm font-medium ${isDarkTheme ? 'text-white' : 'text-black'}`}>Weekly Code Review</p>
                <p className={`text-xs ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>Tomorrow, 3:00 PM</p>
                <button className="mt-1 px-3 py-1 bg-[#E70008] text-white text-xs rounded-lg">Join Event</button>
              </div>
              <div>
                <p className={`text-sm font-medium ${isDarkTheme ? 'text-white' : 'text-black'}`}>React Workshop</p>
                <p className={`text-xs ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>Friday, 2:00 PM</p>
                <button className="mt-1 px-3 py-1 bg-[#E70008] text-white text-xs rounded-lg">Join Event</button>
              </div>
              <div>
                <p className={`text-sm font-medium ${isDarkTheme ? 'text-white' : 'text-black'}`}>Design Sprint</p>
                <p className={`text-xs ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>Next Monday, 10:00 AM</p>
                <button className="mt-1 px-3 py-1 bg-[#E70008] text-white text-xs rounded-lg">Join Event</button>
              </div>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}