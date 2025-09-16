'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  techStack: string[];
  status: 'open' | 'in-progress' | 'completed';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  teamSize: number;
  createdAt: string;
  owner: string;
}

export default function MyProjects() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [projects, setProjects] = useState<Project[]>([
    {
      id: '1',
      title: 'E-commerce Platform',
      description: 'Building a modern e-commerce platform with React and Node.js',
      category: 'Web Development',
      techStack: ['React', 'Node.js', 'MongoDB', 'Stripe'],
      status: 'in-progress',
      difficulty: 'advanced',
      teamSize: 3,
      createdAt: '2024-01-15',
      owner: 'Alex'
    },
    {
      id: '2',
      title: 'Mobile Weather App',
      description: 'Cross-platform weather application with real-time updates',
      category: 'Mobile Development',
      techStack: ['React Native', 'TypeScript', 'OpenWeather API'],
      status: 'open',
      difficulty: 'intermediate',
      teamSize: 2,
      createdAt: '2024-01-10',
      owner: 'Alex'
    }
  ]);

  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    category: 'Web Development',
    techStack: '',
    difficulty: 'intermediate' as 'beginner' | 'intermediate' | 'advanced',
    teamSize: 1
  });

  const categories = [
    'Web Development',
    'Mobile Development',
    'Data Science',
    'AI/ML',
    'DevOps',
    'UI/UX Design',
    'Game Development',
    'Blockchain'
  ];

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    
    const project: Project = {
      id: Date.now().toString(),
      title: newProject.title,
      description: newProject.description,
      category: newProject.category,
      techStack: newProject.techStack.split(',').map(tech => tech.trim()),
      status: 'open',
      difficulty: newProject.difficulty,
      teamSize: newProject.teamSize,
      createdAt: new Date().toISOString().split('T')[0],
      owner: 'Alex'
    };

    setProjects([project, ...projects]);
    setNewProject({
      title: '',
      description: '',
      category: 'Web Development',
      techStack: '',
      difficulty: 'intermediate',
      teamSize: 1
    });
    setShowCreateForm(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-[#FF9940] bg-[#FF9940]/20 border-[#FF9940]';
      case 'in-progress': return 'text-[#E70008] bg-[#E70008]/20 border-[#E70008]';
      case 'completed': return 'text-[#F9E4AD] bg-[#F9E4AD]/20 border-[#F9E4AD]';
      default: return 'text-gray-400 bg-gray-800 border-gray-600';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-400 bg-green-400/20 border-green-400';
      case 'intermediate': return 'text-[#FF9940] bg-[#FF9940]/20 border-[#FF9940]';
      case 'advanced': return 'text-[#E70008] bg-[#E70008]/20 border-[#E70008]';
      default: return 'text-gray-400 bg-gray-800 border-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-black border-b border-[#E70008]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold font-mono text-[#E70008]">
                My Projects
              </h1>
              <nav className="hidden md:flex items-center space-x-6">
                <Link href="/dashboard" className="text-[#F9E4AD] font-mono hover:text-[#FF9940] transition-colors">
                  Dashboard
                </Link>
                <Link href="/projects" className="text-[#F9E4AD] font-mono hover:text-[#FF9940] transition-colors">
                  All Projects
                </Link>
                <Link href="/members" className="text-[#F9E4AD] font-mono hover:text-[#FF9940] transition-colors">
                  Members
                </Link>
              </nav>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-[#E70008] text-black font-mono font-bold rounded-md hover:bg-[#FF9940] transition-colors"
            >
              Create New Project
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold font-mono text-[#F9E4AD] mb-2">
            My Projects
          </h1>
          <p className="text-lg text-[#F9E4AD]/80 font-mono">
            Manage and create your collaborative projects
          </p>
        </div>

        {/* Create Project Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-r from-[#E70008]/10 to-[#FF9940]/10 rounded-lg p-8 max-w-2xl w-full border border-[#E70008]/30">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold font-mono text-[#F9E4AD]">
                  Create New Project
                </h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-[#F9E4AD] hover:text-[#FF9940] text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-6">
                <div>
                  <label className="block text-sm font-mono text-[#F9E4AD] mb-2">
                    Project Title
                  </label>
                  <input
                    type="text"
                    value={newProject.title}
                    onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                    className="w-full px-4 py-2 bg-[#E70008]/20 border border-[#E70008] rounded-lg text-[#F9E4AD] placeholder-[#F9E4AD]/60 focus:border-[#FF9940] focus:ring-1 focus:ring-[#FF9940]"
                    placeholder="Enter project title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-mono text-[#F9E4AD] mb-2">
                    Description
                  </label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    className="w-full px-4 py-2 bg-[#E70008]/20 border border-[#E70008] rounded-lg text-[#F9E4AD] placeholder-[#F9E4AD]/60 focus:border-[#FF9940] focus:ring-1 focus:ring-[#FF9940]"
                    placeholder="Describe your project"
                    rows={4}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-mono text-[#F9E4AD] mb-2">
                      Category
                    </label>
                    <select
                      value={newProject.category}
                      onChange={(e) => setNewProject({ ...newProject, category: e.target.value })}
                      className="w-full px-4 py-2 bg-[#E70008]/20 border border-[#E70008] rounded-lg text-[#F9E4AD] focus:border-[#FF9940] focus:ring-1 focus:ring-[#FF9940]"
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-mono text-[#F9E4AD] mb-2">
                      Difficulty Level
                    </label>
                    <select
                      value={newProject.difficulty}
                      onChange={(e) => setNewProject({ ...newProject, difficulty: e.target.value as 'beginner' | 'intermediate' | 'advanced' })}
                      className="w-full px-4 py-2 bg-[#E70008]/20 border border-[#E70008] rounded-lg text-[#F9E4AD] focus:border-[#FF9940] focus:ring-1 focus:ring-[#FF9940]"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-mono text-[#F9E4AD] mb-2">
                    Tech Stack (comma separated)
                  </label>
                  <input
                    type="text"
                    value={newProject.techStack}
                    onChange={(e) => setNewProject({ ...newProject, techStack: e.target.value })}
                    className="w-full px-4 py-2 bg-[#E70008]/20 border border-[#E70008] rounded-lg text-[#F9E4AD] placeholder-[#F9E4AD]/60 focus:border-[#FF9940] focus:ring-1 focus:ring-[#FF9940]"
                    placeholder="React, Node.js, MongoDB"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-mono text-[#F9E4AD] mb-2">
                    Team Size Needed
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newProject.teamSize}
                    onChange={(e) => setNewProject({ ...newProject, teamSize: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-[#E70008]/20 border border-[#E70008] rounded-lg text-[#F9E4AD] focus:border-[#FF9940] focus:ring-1 focus:ring-[#FF9940]"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 bg-[#E70008] text-black font-mono font-bold rounded-md hover:bg-[#FF9940] transition-colors"
                  >
                    Create Project
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 py-3 px-4 bg-transparent border border-[#E70008] text-[#F9E4AD] font-mono font-bold rounded-md hover:bg-[#E70008]/20 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-gradient-to-r from-[#E70008]/10 to-[#FF9940]/10 rounded-lg p-6 border border-[#E70008]/30 hover:border-[#FF9940] transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold font-mono text-[#F9E4AD]">
                  {project.title}
                </h3>
                <div className="flex gap-2">
                  <span className={`px-2 py-1 text-xs font-mono rounded-full border ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                  <span className={`px-2 py-1 text-xs font-mono rounded-full border ${getDifficultyColor(project.difficulty)}`}>
                    {project.difficulty}
                  </span>
                </div>
              </div>

              <p className="text-[#F9E4AD]/80 font-mono text-sm mb-4">
                {project.description}
              </p>

              <div className="mb-4">
                <span className="text-xs font-mono text-[#F9E4AD] mb-2 block">Category:</span>
                <span className="text-sm font-mono text-[#FF9940]">
                  {project.category}
                </span>
              </div>

              <div className="mb-4">
                <span className="text-xs font-mono text-[#F9E4AD] mb-2 block">Tech Stack:</span>
                <div className="flex flex-wrap gap-1">
                  {project.techStack.map((tech, index) => (
                    <span key={index} className="px-2 py-1 bg-[#E70008]/20 text-[#F9E4AD] text-xs font-mono rounded border border-[#E70008]/30">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm font-mono">
                <span className="text-[#F9E4AD]">
                  Team: {project.teamSize} members
                </span>
                <span className="text-[#F9E4AD]/60">
                  {project.createdAt}
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                <button className="flex-1 py-2 px-3 bg-[#E70008] text-black font-mono font-bold text-sm rounded hover:bg-[#FF9940] transition-colors">
                  Edit
                </button>
                <button className="flex-1 py-2 px-3 bg-transparent border border-[#E70008] text-[#F9E4AD] font-mono font-bold text-sm rounded hover:bg-[#E70008]/20 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {projects.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-2xl font-bold font-mono text-[#F9E4AD] mb-2">
              No Projects Yet
            </h3>
            <p className="text-[#F9E4AD]/80 font-mono mb-4">
              Start by creating your first project
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-3 bg-[#E70008] text-black font-mono font-bold rounded-md hover:bg-[#FF9940] transition-colors"
            >
              Create Your First Project
            </button>
          </div>
        )}
      </main>
    </div>
  );
}