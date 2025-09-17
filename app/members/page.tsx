'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import ChatButton from '@/components/chat/ChatButton';
import { supabase } from '@/lib/supabase/client';

interface Member {
  id: string;
  username: string;
  email: string;
  avatar_url: string;
  bio: string;
  location?: string;
  github_url?: string;
  linkedin_url?: string;
  twitter_url?: string;
  website_url?: string;
  profile_complete_percentage: number;
  skills: string[];
  categories: string[];
  roles: string[];
  availability: string;
  created_at: string;
  updated_at: string;
}

export default function FindMembers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch users with their skills, categories, and roles
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*, user_skills(skill_name), user_categories(category_name), user_roles(role_name)')
        .order('created_at', { ascending: false });

      if (usersError) {
        throw usersError;
      }

      // Transform the data to match our Member interface
      const avatarCache = new Map();
      const transformedMembers = usersData.map(user => {
        const defaultAvatar = '/tech symbols/default-avatar.png';
        const avatarKey = user.avatar_url || defaultAvatar;
        if (!avatarCache.has(avatarKey)) {
          avatarCache.set(avatarKey, avatarKey);
        }
        return {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar_url: avatarCache.get(avatarKey),
          bio: user.bio || 'No bio provided',
          location: user.location,
          github_url: user.github_url,
          linkedin_url: user.linkedin_url,
          twitter_url: user.twitter_url,
          website_url: user.website_url,
          profile_complete_percentage: user.profile_complete_percentage || 0,
          skills: user.user_skills?.map((skill: { skill_name: string }) => skill.skill_name) || [],
          categories: user.user_categories?.map((cat: { category_name: string }) => cat.category_name) || [],
          roles: user.user_roles?.map((role: { role_name: string }) => role.role_name) || [],
          availability: user.availability || 'available',
          created_at: user.created_at,
          updated_at: user.updated_at
        };
      });

      setMembers(transformedMembers);
    } catch (error) {
      console.error('Error fetching members:', error);
      setError('Failed to load members. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) return members;
    
    return members.filter(member => {
      const searchLower = searchTerm.toLowerCase();
      return (
        member.username.toLowerCase().includes(searchLower) ||
        member.email.toLowerCase().includes(searchLower) ||
        (member.bio && member.bio.toLowerCase().includes(searchLower)) ||
        member.skills.some(skill => skill.toLowerCase().includes(searchLower)) ||
        member.categories.some(category => category.toLowerCase().includes(searchLower)) ||
        member.roles.some(role => role.toLowerCase().includes(searchLower))
      );
    });
  }, [members, searchTerm]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <header className="bg-black border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-white">Find Members</h1>
              <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E70008]"></div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white">
        <header className="bg-black border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-white">Find Members</h1>
              <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <button 
              onClick={fetchMembers}
              className="px-4 py-2 bg-[#E70008] text-white rounded-lg hover:bg-[#FF9940] transition-colors"
            >
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-black border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white">Find Members</h1>
            <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search members by name, email, skills, categories, roles, or bio..."
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-[#E70008] focus:ring-1 focus:ring-[#E70008]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {filteredMembers.length > 0 && (
            <p className="text-gray-400 text-sm">
              Showing {filteredMembers.length} of {members.length} members
            </p>
          )}
        </div>

        {/* Members Grid */}
        {filteredMembers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No members found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMembers.map((member) => (
              <div 
                key={member.id} 
                className="group relative bg-gradient-to-br from-[#E70008]/5 via-black to-[#FF9940]/5 rounded-xl p-6 border border-[#E70008]/20 hover:border-[#FF9940]/40 transition-all duration-500 hover:shadow-2xl hover:shadow-[#E70008]/30 backdrop-blur-sm overflow-hidden"
              >
                {/* Modern gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#E70008]/5 via-transparent to-[#FF9940]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {/* Modern avatar with glow effect */}
                <div className="relative mb-5">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="absolute -inset-1 bg-gradient-to-r from-[#E70008] to-[#FF9940] rounded-full blur opacity-0 group-hover:opacity-75 transition-opacity duration-500"></div>
                      <img
                        src={member.avatar_url}
                        alt={member.username}
                        className="relative w-20 h-20 rounded-full border-2 border-[#E70008]/50 group-hover:border-[#FF9940] transition-all duration-500 object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-2xl font-bold bg-gradient-to-r from-[#F9E4AD] to-[#FF9940] bg-clip-text text-transparent group-hover:from-white group-hover:to-[#F9E4AD] transition-all duration-300">
                        {member.username}
                      </h3>
                      <p className="text-[#FF9940]/80 group-hover:text-[#FF9940] font-medium text-sm transition-colors duration-300 truncate">
                        {member.email}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Modern bio section */}
                <div className="relative mb-4">
                  <p className="text-gray-300 text-sm leading-relaxed line-clamp-3 group-hover:text-gray-100 transition-colors duration-300">
                    {member.bio}
                  </p>
                </div>
                
                {member.location && (
                  <div className="flex items-center mb-4 text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-medium">{member.location}</span>
                  </div>
                )}
                
                {/* Modern skills section */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Skills</h4>
                    {member.skills.length > 3 && (
                      <span className="text-xs text-gray-500">+{member.skills.length - 3} more</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {member.skills.slice(0, 3).map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1.5 bg-gradient-to-r from-[#E70008]/20 to-[#FF9940]/20 text-[#F9E4AD] text-xs font-medium rounded-full border border-[#E70008]/30 group-hover:border-[#E70008]/50 transition-all duration-300 backdrop-blur-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {member.categories.length > 0 && (
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Categories</h4>
                      {member.categories.length > 2 && (
                        <span className="text-xs text-gray-500">+{member.categories.length - 2} more</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {member.categories.slice(0, 2).map((category) => (
                        <span
                          key={category}
                          className="px-3 py-1.5 bg-gradient-to-r from-[#FF9940]/20 to-[#F9E4AD]/20 text-[#FF9940] text-xs font-medium rounded-full border border-[#FF9940]/30 group-hover:border-[#FF9940]/50 transition-all duration-300 backdrop-blur-sm"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {member.roles.length > 0 && (
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Roles</h4>
                      {member.roles.length > 1 && (
                        <span className="text-xs text-gray-500">+{member.roles.length - 1} more</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {member.roles.slice(0, 1).map((role) => (
                        <span
                          key={role}
                          className="px-3 py-1.5 bg-gradient-to-r from-[#F9E4AD]/30 to-[#FF9940]/30 text-black text-xs font-bold rounded-full border border-[#F9E4AD]/40 group-hover:border-[#F9E4AD]/60 transition-all duration-300 backdrop-blur-sm"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Modern profile stats */}
                <div className="mb-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Profile</span>
                    <span className="text-sm font-bold text-[#F9E4AD]">{member.profile_complete_percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-1.5">
                    <div 
                      className="bg-gradient-to-r from-[#E70008] to-[#FF9940] h-1.5 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${member.profile_complete_percentage}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</span>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        member.availability === 'available' ? 'bg-green-400 animate-pulse' :
                        member.availability === 'busy' ? 'bg-yellow-400' :
                        'bg-red-400'
                      }`}></div>
                      <span className={`text-xs font-medium capitalize ${
                        member.availability === 'available' ? 'text-green-400' :
                        member.availability === 'busy' ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {member.availability}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Modern Social Links */}
                {(member.github_url || member.linkedin_url || member.twitter_url) && (
                  <div className="mb-5">
                    <div className="flex space-x-3">
                      {member.github_url && (
                        <a href={member.github_url} target="_blank" rel="noopener noreferrer" className="group">
                          <div className="w-10 h-10 bg-gray-800/50 rounded-lg flex items-center justify-center border border-gray-700 group-hover:border-[#F9E4AD] transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-[#F9E4AD]/20">
                            <svg className="w-4 h-4 text-gray-400 group-hover:text-[#F9E4AD] transition-colors duration-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                          </div>
                        </a>
                      )}
                      {member.linkedin_url && (
                        <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="group">
                          <div className="w-10 h-10 bg-gray-800/50 rounded-lg flex items-center justify-center border border-gray-700 group-hover:border-[#F9E4AD] transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-[#F9E4AD]/20">
                            <svg className="w-4 h-4 text-gray-400 group-hover:text-[#F9E4AD] transition-colors duration-300" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                          </div>
                        </a>
                      )}
                      {member.twitter_url && (
                        <a href={member.twitter_url} target="_blank" rel="noopener noreferrer" className="group">
                          <div className="w-10 h-10 bg-gray-800/50 rounded-lg flex items-center justify-center border border-gray-700 group-hover:border-[#F9E4AD] transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-[#F9E4AD]/20">
                            <svg className="w-4 h-4 text-gray-400 group-hover:text-[#F9E4AD] transition-colors duration-300" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                          </div>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Modern Action Buttons */}
                <div className="flex space-x-3">
                  <ChatButton
                    targetUserId={member.id}
                    targetUsername={member.username}
                    size="small"
                    showLabel={true}
                    className="group flex-1 bg-gradient-to-r from-[#E70008] to-[#FF9940] hover:from-[#FF9940] hover:to-[#E70008] text-white px-4 py-3 rounded-xl transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:shadow-[#E70008]/30 transform hover:-translate-y-0.5"
                  />
                  <button className="group flex-1 bg-gray-800/50 border-2 border-gray-700 hover:border-[#F9E4AD] text-[#F9E4AD] hover:text-white px-4 py-3 rounded-xl transition-all duration-300 font-semibold backdrop-blur-sm hover:bg-gray-800/80 transform hover:-translate-y-0.5">
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-[#F9E4AD] transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                      <span>Connect</span>
                    </div>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}