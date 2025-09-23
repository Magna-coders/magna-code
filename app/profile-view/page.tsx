'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Globe, Github, Twitter, Linkedin, MessageCircle, CheckCircle, Users, Folder, Activity, User, Info } from 'lucide-react';
import { useAuth } from '@/lib/supabase/auth-context';
import { useRouter } from 'next/navigation';

interface Member {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  availability?: string;
  website_url?: string;
  github_url?: string;
  twitter_url?: string;
  linkedin_url?: string;
  whatsapp_url?: string;
  user_categories?: Array<{ category_name: string }>;
  user_roles?: Array<{ role_name: string }>;
  user_skills?: Array<{ skill_name: string }>;
}

function ProfileViewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [member, setMember] = useState<Member | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    const memberData = searchParams.get('member');
    if (memberData) {
      try {
        const parsedMember = JSON.parse(decodeURIComponent(memberData));
        setMember(parsedMember);
        
        // Check if this is the current user's profile
        if (user && parsedMember.id === user.id) {
          setIsOwnProfile(true);
        }
      } catch (error) {
        console.error('Error parsing member data:', error);
      }
    }
  }, [searchParams, user]);

  if (!member) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-[#F9E4AD]/60 font-mono">No member data found</div>
      </div>
    );
  }

  // Card-style profile view (like members page)
  const renderCardStyleProfile = () => (
    <div className="min-h-screen bg-black">
      <header className="border-b border-[#E70008]/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="flex items-center text-[#F9E4AD] hover:text-[#FF9940] transition-colors font-mono"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <h1 className="text-2xl font-bold font-mono text-[#E70008]">Your Profile</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 py-4 sm:px-4 sm:py-8">
        <div className="max-w-2xl mx-auto">
          <motion.div
            className="bg-[#1a1a1a] border border-[#FF9940]/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 flex flex-col justify-between hover:shadow-lg hover:border-[#E70008] transition-all duration-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            whileHover={{ scale: 1.02, y: -5 }}
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
            >
              <motion.button
                onClick={() => router.push('/profile/update')}
                className="flex-1 py-2 px-3 bg-[#FF9940] text-black font-mono text-xs sm:text-sm rounded-lg hover:bg-[#FF9940]/80 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                Edit Profile
              </motion.button>
              <motion.button
                onClick={() => router.push('/dashboard')}
                className="flex-1 py-2 px-3 bg-[#1a1a1a] text-[#F9E4AD] rounded-lg font-mono text-xs sm:text-sm border border-[#333] hover:border-[#FF9940] hover:text-[#FF9940] transition-all duration-200"
                whileHover={{ scale: 1.05, borderColor: "#FF9940" }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                Dashboard
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'roles', label: 'Roles', icon: User },
    { id: 'projects', label: 'Projects', icon: Folder },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'connections', label: 'Connections', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-black font-mono">
      {isOwnProfile ? renderCardStyleProfile() : (
        <>
          {/* Header Section - Facebook Style */}
      <div className="bg-[#1a1a1a] border-b border-[#333]">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
            {/* Left: Profile Picture */}
            <div>
              <motion.div 
                className="w-32 h-32 md:w-40 md:h-40 bg-[#FF9940]/20 rounded-full flex items-center justify-center text-5xl font-mono text-[#F9E4AD] border-4 border-[#1a1a1a]"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {member.avatar_url ? (
                  <img
                    src={member.avatar_url}
                    alt={member.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  member.username.charAt(0).toUpperCase()
                )}
              </motion.div>
            </div>

            {/* Right: Name, Status, Location, Quick Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <motion.h1 
                    className="text-3xl md:text-4xl font-bold font-mono text-[#F9E4AD] mb-2 flex items-center gap-3"
                    whileHover={{ color: "#FF9940" }}
                  >
                    {member.username}
                    {member.username.toLowerCase() === 'ashwa' && (
                      <div className="w-6 h-6 bg-[#1DA1F2] rounded-full flex items-center justify-center">
                        <CheckCircle size={12} className="text-white" />
                      </div>
                    )}
                  </motion.h1>
                  
                  {/* Status and Location */}
                  <div className="flex flex-wrap items-center gap-3 text-sm font-mono text-[#F9E4AD]/60 mb-3">
                    {member.availability && (
                      <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-medium">
                        ● {member.availability}
                      </span>
                    )}
                    {member.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={14} className="text-[#E70008]" /> {member.location}
                      </span>
                    )}
                  </div>

                  {/* Quick Info - Roles and Categories */}
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    {member.user_roles && member.user_roles.slice(0, 2).map((role, i) => (
                      <span key={i} className="bg-[#FF9940]/20 text-[#FF9940] text-xs font-mono px-2 py-1 rounded-lg">
                        {role.role_name}
                      </span>
                    ))}
                    {member.user_categories && member.user_categories.slice(0, 2).map((category, i) => (
                      <span key={i} className="bg-[#E70008]/20 text-[#E70008] text-xs font-mono px-2 py-1 rounded-lg">
                        {category.category_name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <motion.button
                    className="px-6 py-2 bg-[#FF9940] text-black font-mono font-bold rounded-lg hover:bg-[#FF9940]/80 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Connect
                  </motion.button>
                  <motion.button
                    className="px-6 py-2 bg-[#1a1a1a] text-[#F9E4AD] font-mono font-bold rounded-lg border border-[#333] hover:border-[#FF9940] hover:text-[#FF9940] transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Message
                  </motion.button>
                </div>
              </div>

              {/* Bio */}
              {member.bio && (
                <motion.p 
                  className="text-[#F9E4AD]/80 font-mono text-base mt-4 leading-relaxed max-w-2xl"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {member.bio}
                </motion.p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-[#1a1a1a] border-b border-[#333] sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <nav className="flex flex-wrap sm:flex-nowrap gap-1 sm:space-x-1 bg-[#2A2A2A] p-1 rounded-lg">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-2 px-2 sm:px-3 text-xs sm:text-sm font-mono rounded-md transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-[#FF9940] text-black'
                      : 'text-gray-400 hover:text-white hover:bg-[#3A3A3A]'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon size={16} />
                  {tab.label}
                </motion.button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2">
            {activeTab === 'overview' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                {/* About Section */}
                <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6">
                  <h2 className="text-xl font-bold font-mono text-[#F9E4AD] mb-4">About</h2>
                  <p className="text-[#F9E4AD]/80 font-mono leading-relaxed">
                    {member.bio || 'No bio available.'}
                  </p>
                </div>

                {/* Skills */}
                {member.user_skills && member.user_skills.length > 0 && (
                  <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6">
                    <h2 className="text-xl font-bold font-mono text-[#F9E4AD] mb-4">Skills</h2>
                    <div className="flex flex-wrap gap-3">
                      {member.user_skills.map((skill, i) => (
                        <span
                          key={i}
                          className="bg-[#1DA1F2]/20 text-[#1DA1F2] text-sm font-mono px-4 py-2 rounded-lg"
                        >
                          {skill.skill_name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Social Links */}
                {(member.website_url || member.github_url || member.twitter_url || member.linkedin_url || member.whatsapp_url) && (
                  <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6">
                    <h2 className="text-xl font-bold font-mono text-[#F9E4AD] mb-4">Social Links</h2>
                    <div className="flex flex-wrap gap-4">
                      {member.website_url && (
                        <a href={member.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#FF9940] hover:text-[#FF9940]/80 hover:underline font-mono">
                          <Globe size={20} /> Website
                        </a>
                      )}
                      {member.github_url && (
                        <a href={member.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#F9E4AD] hover:text-[#F9E4AD]/80 hover:underline font-mono">
                          <Github size={20} /> GitHub
                        </a>
                      )}
                      {member.twitter_url && (
                        <a href={member.twitter_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#1DA1F2] hover:text-[#1DA1F2]/80 hover:underline font-mono">
                          <Twitter size={20} /> Twitter
                        </a>
                      )}
                      {member.linkedin_url && (
                        <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#0A66C2] hover:text-[#0A66C2]/80 hover:underline font-mono">
                          <Linkedin size={20} /> LinkedIn
                        </a>
                      )}
                      {member.whatsapp_url && (
                        <a href={member.whatsapp_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#25D366] hover:text-[#25D366]/80 hover:underline font-mono">
                          <MessageCircle size={20} /> WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'roles' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                {/* All Roles */}
                {member.user_roles && member.user_roles.length > 0 && (
                  <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6">
                    <h2 className="text-xl font-bold font-mono text-[#F9E4AD] mb-4">All Roles</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {member.user_roles.map((role, i) => (
                        <div key={i} className="bg-[#FF9940]/10 border border-[#FF9940]/30 rounded-lg p-4">
                          <h3 className="font-bold font-mono text-[#FF9940] mb-2">{role.role_name}</h3>
                          <p className="text-sm font-mono text-[#F9E4AD]/60">Role description would go here.</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* All Categories */}
                {member.user_categories && member.user_categories.length > 0 && (
                  <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6">
                    <h2 className="text-xl font-bold font-mono text-[#F9E4AD] mb-4">Categories</h2>
                    <div className="flex flex-wrap gap-3">
                      {member.user_categories.map((category, i) => (
                        <span
                          key={i}
                          className="bg-[#E70008]/20 text-[#E70008] text-sm font-mono px-4 py-2 rounded-lg"
                        >
                          {category.category_name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'projects' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6"
              >
                <h2 className="text-xl font-bold font-mono text-[#F9E4AD] mb-4">Projects</h2>
                <p className="text-[#F9E4AD]/60 font-mono">Projects section coming soon...</p>
              </motion.div>
            )}

            {activeTab === 'activity' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6"
              >
                <h2 className="text-xl font-bold font-mono text-[#F9E4AD] mb-4">Recent Activity</h2>
                <p className="text-[#F9E4AD]/60 font-mono">Activity feed coming soon...</p>
              </motion.div>
            )}

            {activeTab === 'connections' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6"
              >
                <h2 className="text-xl font-bold font-mono text-[#F9E4AD] mb-4">Connections</h2>
                <p className="text-[#F9E4AD]/60 font-mono">Connections list coming soon...</p>
              </motion.div>
            )}
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Stats Card */}
            <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6">
              <h3 className="text-lg font-bold font-mono text-[#F9E4AD] mb-4">Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[#F9E4AD]/60 font-mono text-sm">Connections</span>
                  <span className="text-[#FF9940] font-mono font-bold">42</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#F9E4AD]/60 font-mono text-sm">Projects</span>
                  <span className="text-[#E70008] font-mono font-bold">15</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#F9E4AD]/60 font-mono text-sm">Skills</span>
                  <span className="text-[#1DA1F2] font-mono font-bold">{member.user_skills?.length || 0}</span>
                </div>
              </div>
            </div>

            {/* Availability */}
            {member.availability && (
              <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6">
                <h3 className="text-lg font-bold font-mono text-[#F9E4AD] mb-2">Availability</h3>
                <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-mono">
                  {member.availability}
                </span>
              </div>
            )}

            {/* Mutual Connections (Placeholder) */}
            <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6">
              <h3 className="text-lg font-bold font-mono text-[#F9E4AD] mb-4">Mutual Connections</h3>
              <p className="text-[#F9E4AD]/60 font-mono text-sm">Coming soon...</p>
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}

export default function ProfileView() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-[#F9E4AD] font-mono">Loading profile...</div>
    </div>}>
      <ProfileViewContent />
    </Suspense>
  );
}