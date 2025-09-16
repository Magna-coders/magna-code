'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Project {
  id: number;
  title: string;
  description: string;
  category: string;
  techStack: string[];
  teamSize: number;
  progress: number;
  status: 'open' | 'in-progress' | 'completed';
  owner: string;
  avatar: string;
  deadline: string;
  lookingFor: string[];
}

export default function ViewProjects() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const projects: Project[] = [
    {
      id: 1,
      title: 'E-commerce Platform',
      description: 'Modern React-based e-commerce solution with real-time inventory management and AI-powered recommendations.',
      category: 'Web Development',
      techStack: ['React', 'Node.js', 'MongoDB', 'Stripe'],
      teamSize: 5,
      progress: 75,
      status: 'in-progress',
      owner: 'Sarah Chen',
      avatar: '/tech symbols/1.png',
      deadline: '2024-03-15',
      lookingFor: ['UI/UX Designer', 'Backend Developer']
    },
    {
      id: 2,
      title: 'Mobile Banking App',
      description: 'Secure mobile banking application with biometric authentication and real-time transaction tracking.',
      category: 'Mobile Development',
      techStack: ['React Native', 'TypeScript', 'Firebase'],
      teamSize: 4,
      progress: 45,
      status: 'in-progress',
      owner: 'David Kim',
      avatar: '/tech symbols/4.png',
      deadline: '2024-04-20',
      lookingFor: ['Security Expert', 'QA Engineer']
    },
    {
      id: 3,
      title: 'AI Content Generator',
      description: 'Machine learning platform for generating marketing content and social media posts using GPT technology.',
      category: 'AI/ML',
      techStack: ['Python', 'TensorFlow', 'FastAPI', 'React'],
      teamSize: 3,
      progress: 90,
      status: 'completed',
      owner: 'Aisha Patel',
      avatar: '/tech symbols/3.png',
      deadline: '2024-02-28',
      lookingFor: ['DevOps Engineer']
    },
    {
      id: 4,
      title: 'Fitness Tracking App',
      description: 'Cross-platform fitness application with workout planning, nutrition tracking, and social features.',
      category: 'Mobile Development',
      techStack: ['Flutter', 'Firebase', 'Dart'],
      teamSize: 6,
      progress: 60,
      status: 'in-progress',
      owner: 'Marcus Rodriguez',
      avatar: '/tech symbols/2.png',
      deadline: '2024-05-10',
      lookingFor: ['Mobile Developer', 'UI Designer']
    },
    {
      id: 5,
      title: 'Open Source Contribution',
      description: 'Contributing to popular open-source projects and building a collaborative development community.',
      category: 'Open Source',
      techStack: ['Various', 'GitHub', 'Documentation'],
      teamSize: 10,
      progress: 30,
      status: 'open',
      owner: 'Emma Wilson',
      avatar: '/tech symbols/5.png',
      deadline: '2024-06-30',
      lookingFor: ['All Skill Levels', 'Documentation Writers']
    },
    {
      id: 6,
      title: 'Real-time Analytics Dashboard',
      description: 'Interactive dashboard for monitoring business metrics with real-time data visualization and alerts.',
      category: 'Data Visualization',
      techStack: ['D3.js', 'WebSockets', 'PostgreSQL'],
      teamSize: 4,
      progress: 20,
      status: 'open',
      owner: 'James Taylor',
      avatar: '/tech symbols/6.png',
      deadline: '2024-04-15',
      lookingFor: ['Frontend Developer', 'Data Analyst']
    }
  ];

  const categories = ['all', 'Web Development', 'Mobile Development', 'AI/ML', 'Open Source', 'Data Visualization'];
  const statuses = ['all', 'open', 'in-progress', 'completed'];

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || project.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || project.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-500/20 text-green-400 border border-green-500/50';
      case 'in-progress': return 'bg-[#FF9940]/20 text-[#FF9940] border border-[#FF9940]/50';
      case 'completed': return 'bg-gray-500/20 text-gray-400 border border-gray-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border border-gray-500/50';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-black border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white">View Projects</h1>
            <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-mono text-[#F9E4AD] mb-2">Search</label>
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-[#E70008] focus:ring-1 focus:ring-[#E70008]"
              />
            </div>
            <div>
              <label className="block text-sm font-mono text-[#F9E4AD] mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-[#E70008] focus:ring-1 focus:ring-[#E70008]"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-mono text-[#F9E4AD] mb-2">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-[#E70008] focus:ring-1 focus:ring-[#E70008]"
              >
                {statuses.map(status => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredProjects.map((project) => (
            <div 
              key={project.id} 
              className="bg-gradient-to-r from-[#E70008]/10 to-[#FF9940]/10 rounded-lg p-6 border border-[#E70008]/30 hover:border-[#FF9940] transition-all duration-300 hover:shadow-lg hover:shadow-[#E70008]/20"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <img
                    src={project.avatar}
                    alt={project.owner}
                    className="w-12 h-12 rounded-full mr-3 border-2 border-[#E70008]"
                  />
                  <div>
                    <h3 className="text-xl font-bold font-mono text-[#F9E4AD]">{project.title}</h3>
                    <p className="text-sm font-mono text-[#FF9940]">by {project.owner}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 text-xs font-mono rounded-full border ${getStatusColor(project.status)}`}>
                  {project.status.replace('-', ' ')}
                </span>
              </div>
              
              <p className="text-[#F9E4AD]/80 font-mono text-sm mb-4 line-clamp-3">
                {project.description}
              </p>
              
              <div className="mb-4">
                <p className="text-sm font-mono text-[#F9E4AD] mb-2">Tech Stack</p>
                <div className="flex flex-wrap gap-2">
                  {project.techStack.slice(0, 4).map((tech) => (
                    <span
                      key={tech}
                      className="px-2 py-1 bg-[#E70008]/20 text-[#F9E4AD] text-xs font-mono rounded-full border border-[#E70008]/50"
                    >
                      {tech}
                    </span>
                  ))}
                  {project.techStack.length > 4 && (
                    <span className="px-2 py-1 text-[#F9E4AD]/60 text-xs font-mono">
                      +{project.techStack.length - 4} more
                    </span>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm font-mono mb-4">
                <div>
                  <span className="text-[#F9E4AD]/60">Team Size:</span>
                  <span className="text-[#F9E4AD] ml-2">{project.teamSize} members</span>
                </div>
                <div>
                  <span className="text-[#F9E4AD]/60">Progress:</span>
                  <span className="text-[#FF9940] ml-2">{project.progress}%</span>
                </div>
                <div>
                  <span className="text-[#F9E4AD]/60">Category:</span>
                  <span className="text-[#F9E4AD] ml-2">{project.category}</span>
                </div>
                <div>
                  <span className="text-[#F9E4AD]/60">Deadline:</span>
                  <span className="text-[#FF9940] ml-2">{new Date(project.deadline).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-sm font-mono text-[#F9E4AD] mb-2">Looking For</p>
                <div className="flex flex-wrap gap-2">
                  {project.lookingFor.map((role) => (
                    <span
                      key={role}
                      className="px-2 py-1 bg-[#FF9940]/20 text-[#FF9940] text-xs font-mono rounded-full border border-[#FF9940]/50"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3">
                <button className="flex-1 py-2 px-4 bg-[#E70008] text-black font-mono font-bold rounded-md hover:bg-[#FF9940] transition-colors">
                  View Details
                </button>
                {project.status !== 'completed' && (
                  <button className="flex-1 py-2 px-4 bg-transparent border border-[#E70008] text-[#E70008] font-mono font-bold rounded-md hover:bg-[#E70008]/10 transition-colors">
                    Join Project
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No projects found matching your criteria.</p>
          </div>
        )}
      </main>
    </div>
  );
}