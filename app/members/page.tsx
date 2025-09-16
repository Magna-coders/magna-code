'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Member {
  id: number;
  name: string;
  role: string;
  skills: string[];
  experience: string;
  avatar: string;
  status: 'online' | 'offline';
  github?: string;
  linkedin?: string;
  bio: string;
  availability: string;
}

export default function FindMembers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  const members: Member[] = [
    {
      id: 1,
      name: 'Sarah Chen',
      role: 'Full Stack Developer',
      skills: ['React', 'Node.js', 'Python'],
      experience: '5 years',
      avatar: '/tech symbols/1.png',
      status: 'online',
      github: 'sarahchen',
      linkedin: 'sarahchen-dev',
      bio: 'Passionate full-stack developer with expertise in modern web technologies.',
      availability: 'Available for new projects'
    },
    {
      id: 2,
      name: 'Marcus Rodriguez',
      role: 'UI/UX Designer',
      skills: ['Figma', 'Adobe XD', 'Prototyping'],
      experience: '4 years',
      avatar: '/tech symbols/2.png',
      status: 'online',
      github: 'marcusdesigns',
      linkedin: 'marcus-rodriguez',
      bio: 'Creative designer focused on user-centered design and beautiful interfaces.',
      availability: 'Available for collaboration'
    },
    {
      id: 3,
      name: 'Aisha Patel',
      role: 'Backend Developer',
      skills: ['Java', 'Spring Boot', 'MongoDB'],
      experience: '6 years',
      avatar: '/tech symbols/3.png',
      status: 'offline',
      github: 'aishadev',
      linkedin: 'aisha-patel-backend',
      bio: 'Backend specialist with strong focus on scalable architectures and databases.',
      availability: 'Open to opportunities'
    },
    {
      id: 4,
      name: 'David Kim',
      role: 'Frontend Developer',
      skills: ['Vue.js', 'TypeScript', 'Tailwind'],
      experience: '3 years',
      avatar: '/tech symbols/4.png',
      status: 'online',
      github: 'davidkfrontend',
      linkedin: 'david-kim-frontend',
      bio: 'Frontend developer passionate about creating responsive and interactive web applications.',
      availability: 'Available immediately'
    },
    {
      id: 5,
      name: 'Emma Wilson',
      role: 'DevOps Engineer',
      skills: ['Docker', 'Kubernetes', 'AWS'],
      experience: '7 years',
      avatar: '/tech symbols/5.png',
      status: 'offline',
      github: 'emmawilson',
      linkedin: 'emma-wilson-devops',
      bio: 'DevOps expert helping teams build and deploy applications efficiently at scale.',
      availability: 'Part-time available'
    },
    {
      id: 6,
      name: 'James Taylor',
      role: 'Mobile Developer',
      skills: ['React Native', 'Flutter', 'iOS'],
      experience: '4 years',
      avatar: '/tech symbols/6.png',
      status: 'online',
      github: 'jamestaylor',
      linkedin: 'james-taylor-mobile',
      bio: 'Mobile developer creating cross-platform applications with native performance.',
      availability: 'Seeking new projects'
    }
  ];

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = selectedRole === '' || member.role === selectedRole;
    return matchesSearch && matchesRole;
  });

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
                placeholder="Search members by name, skills, or role..."
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-[#E70008] focus:ring-1 focus:ring-[#E70008]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-[#E70008] focus:ring-1 focus:ring-[#E70008]"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="Frontend Developer">Frontend Developer</option>
              <option value="Backend Developer">Backend Developer</option>
              <option value="Full Stack Developer">Full Stack Developer</option>
              <option value="UI/UX Designer">UI/UX Designer</option>
              <option value="Mobile Developer">Mobile Developer</option>
              <option value="Data Scientist">Data Scientist</option>
            </select>
          </div>
        </div>

        {/* Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member) => (
            <div 
              key={member.id} 
              className="bg-gradient-to-r from-[#E70008]/10 to-[#FF9940]/10 rounded-lg p-6 border border-[#E70008]/30 hover:border-[#FF9940] transition-all duration-300 hover:shadow-lg hover:shadow-[#E70008]/20"
            >
              <div className="flex items-center mb-4">
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-16 h-16 rounded-full mr-4 border-2 border-[#E70008]"
                />
                <div>
                  <h3 className="text-xl font-bold font-mono text-[#F9E4AD]">{member.name}</h3>
                  <p className="text-[#FF9940] font-mono">{member.role}</p>
                </div>
              </div>
              
              <p className="text-[#F9E4AD]/80 font-mono text-sm mb-4 line-clamp-3">
                {member.bio}
              </p>
              
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
              
              <div className="flex justify-between items-center text-sm font-mono">
                <span className="text-[#F9E4AD]/80">
                  {member.experience}
                </span>
                <span className="text-[#FF9940]">
                  {member.availability}
                </span>
              </div>
              
              <button className="w-full mt-4 py-2 px-4 bg-[#E70008] text-black font-mono font-bold rounded-md hover:bg-[#FF9940] transition-colors">
                Connect
              </button>
            </div>
          ))}
        </div>

        {filteredMembers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No members found matching your criteria.</p>
          </div>
        )}
      </main>
    </div>
  );
}