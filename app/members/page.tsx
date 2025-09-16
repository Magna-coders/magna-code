'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

interface Member {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  github_url?: string;
  linkedin_url?: string;
  twitter_url?: string;
  website_url?: string;
  profile_complete_percentage: number;
  skills: string[];
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

      // Fetch users with their skills
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*, user_skills(skill_name)')
        .order('created_at', { ascending: false });

      if (usersError) {
        throw usersError;
      }

      // Transform the data to match our Member interface
      const transformedMembers = usersData.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url || '/tech symbols/default-avatar.png',
        bio: user.bio || 'No bio provided',
        location: user.location,
        github_url: user.github_url,
        linkedin_url: user.linkedin_url,
        twitter_url: user.twitter_url,
        website_url: user.website_url,
        profile_complete_percentage: user.profile_complete_percentage || 0,
        skills: user.user_skills?.map((skill: { skill_name: string }) => skill.skill_name) || [],
        availability: user.availability || 'available',
        created_at: user.created_at,
        updated_at: user.updated_at
      }));

      setMembers(transformedMembers);
    } catch (error) {
      console.error('Error fetching members:', error);
      setError('Failed to load members. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = 
      member.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.bio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
  });

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
                placeholder="Search members by name, email, skills, or bio..."
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
                className="bg-gradient-to-r from-[#E70008]/10 to-[#FF9940]/10 rounded-lg p-6 border border-[#E70008]/30 hover:border-[#FF9940] transition-all duration-300 hover:shadow-lg hover:shadow-[#E70008]/20"
              >
                <div className="flex items-center mb-4">
                  <img
                    src={member.avatar_url}
                    alt={member.username}
                    className="w-16 h-16 rounded-full mr-4 border-2 border-[#E70008]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/tech symbols/default-avatar.png';
                    }}
                  />
                  <div>
                    <h3 className="text-xl font-bold font-mono text-[#F9E4AD]">{member.username}</h3>
                    <p className="text-[#FF9940] font-mono text-sm">{member.email}</p>
                  </div>
                </div>
                
                <p className="text-[#F9E4AD]/80 font-mono text-sm mb-4 line-clamp-3">
                  {member.bio}
                </p>
                
                {member.location && (
                  <p className="text-[#F9E4AD]/60 font-mono text-xs mb-2">
                    📍 {member.location}
                  </p>
                )}
                
                <div className="mb-4">
                  <p className="text-sm font-mono text-[#F9E4AD] mb-2">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {member.skills.slice(0, 3).map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-1 bg-[#E70008]/20 text-[#F9E4AD] text-xs font-mono rounded-full border border-[#E70008]/50"
                      >
                        {skill}
                      </span>
                    ))}
                    {member.skills.length > 3 && (
                      <span className="px-2 py-1 text-[#F9E4AD]/60 text-xs font-mono">
                        +{member.skills.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-sm font-mono mb-4">
                  <span className="text-[#F9E4AD]/80">
                    Profile: {member.profile_complete_percentage}%
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    member.availability === 'available' ? 'bg-green-500/20 text-green-400' :
                    member.availability === 'busy' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {member.availability}
                  </span>
                </div>

                <div className="flex gap-2">
                  {member.github_url && (
                    <a
                      href={member.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-gray-800 text-white text-xs rounded hover:bg-gray-700 transition-colors"
                    >
                      GitHub
                    </a>
                  )}
                  {member.linkedin_url && (
                    <a
                      href={member.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-500 transition-colors"
                    >
                      LinkedIn
                    </a>
                  )}
                </div>
                
                <button className="w-full mt-4 py-2 px-4 bg-[#E70008] text-black font-mono font-bold rounded-md hover:bg-[#FF9940] transition-colors">
                  Connect
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}