'use client';

import { useState } from 'react';
import Link from 'next/link';

interface TeamOpportunity {
  id: number;
  title: string;
  description: string;
  role: string;
  skills: string[];
  experience: string;
  team: string;
  project: string;
  deadline: string;
  compensation: string;
  remote: boolean;
  avatar: string;
}

interface Application {
  name: string;
  email: string;
  role: string;
  experience: string;
  skills: string;
  message: string;
}

export default function JoinTeam() {
  const [selectedOpportunity, setSelectedOpportunity] = useState<TeamOpportunity | null>(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [application, setApplication] = useState<Application>({
    name: '',
    email: '',
    role: '',
    experience: '',
    skills: '',
    message: ''
  });

  const opportunities: TeamOpportunity[] = [
    {
      id: 1,
      title: 'Senior React Developer',
      description: 'Join our team building a cutting-edge SaaS platform. We need experienced React developers to help create scalable and performant user interfaces.',
      role: 'Frontend Developer',
      skills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS'],
      experience: '3+ years',
      team: 'Innovation Labs',
      project: 'CloudSync Pro',
      deadline: '2024-03-15',
      compensation: '$80k - $120k',
      remote: true,
      avatar: '/tech symbols/1.png'
    },
    {
      id: 2,
      title: 'Full Stack Engineer',
      description: 'Looking for a versatile developer to work on both frontend and backend systems. Experience with Node.js and React is essential.',
      role: 'Full Stack Developer',
      skills: ['Node.js', 'React', 'PostgreSQL', 'Docker'],
      experience: '2-5 years',
      team: 'Tech Solutions',
      project: 'DataFlow Analytics',
      deadline: '2024-03-20',
      compensation: '$70k - $110k',
      remote: true,
      avatar: '/tech symbols/2.png'
    },
    {
      id: 3,
      title: 'UI/UX Designer',
      description: 'Creative designer needed to craft beautiful and intuitive user experiences for our mobile and web applications.',
      role: 'UI/UX Designer',
      skills: ['Figma', 'Adobe XD', 'Prototyping', 'User Research'],
      experience: '2+ years',
      team: 'Design Studio',
      project: 'MobileFirst App',
      deadline: '2024-03-10',
      compensation: '$60k - $90k',
      remote: false,
      avatar: '/tech symbols/3.png'
    },
    {
      id: 4,
      title: 'DevOps Engineer',
      description: 'Join our infrastructure team to build and maintain scalable cloud solutions. Experience with AWS and Kubernetes is required.',
      role: 'DevOps Engineer',
      skills: ['AWS', 'Kubernetes', 'Terraform', 'CI/CD'],
      experience: '4+ years',
      team: 'Cloud Infrastructure',
      project: 'ScaleUp Platform',
      deadline: '2024-03-25',
      compensation: '$90k - $130k',
      remote: true,
      avatar: '/tech symbols/4.png'
    }
  ];

  const handleApply = (opportunity: TeamOpportunity) => {
    setSelectedOpportunity(opportunity);
    setShowApplicationForm(true);
  };

  const handleSubmitApplication = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission here
    alert('Application submitted successfully!');
    setShowApplicationForm(false);
    setApplication({
      name: '',
      email: '',
      role: '',
      experience: '',
      skills: '',
      message: ''
    });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-black border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white">Join a Team</h1>
            <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!showApplicationForm ? (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold font-mono text-[#F9E4AD] mb-4">Team Opportunities</h2>
              <p className="text-[#F9E4AD]/80 font-mono">
                Discover exciting opportunities to join innovative teams and work on cutting-edge projects.
              </p>
            </div>

            {/* Opportunities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {opportunities.map((opportunity) => (
                <div 
                  key={opportunity.id} 
                  className="bg-gradient-to-r from-[#E70008]/10 to-[#FF9940]/10 rounded-lg p-6 border border-[#E70008]/30 hover:border-[#FF9940] transition-all duration-300 hover:shadow-lg hover:shadow-[#E70008]/20"
                >
                  <div className="flex items-start mb-4">
                    <img
                      src={opportunity.avatar}
                      alt={opportunity.team}
                      className="w-16 h-16 rounded-full mr-4 border-2 border-[#E70008]"
                    />
                    <div>
                      <h3 className="text-xl font-bold font-mono text-[#F9E4AD]">{opportunity.title}</h3>
                      <p className="text-[#FF9940] font-mono">{opportunity.team}</p>
                      <p className="text-xs font-mono text-[#F9E4AD]/60">{opportunity.project}</p>
                    </div>
                  </div>

                  <p className="text-[#F9E4AD]/80 font-mono text-sm mb-4 line-clamp-3">
                    {opportunity.description}
                  </p>

                  <div className="mb-4">
                    <p className="text-sm font-mono text-[#F9E4AD] mb-2">Required Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {opportunity.skills.slice(0, 4).map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-1 bg-[#E70008]/20 text-[#F9E4AD] text-xs font-mono rounded-full border border-[#E70008]/50"
                        >
                          {skill}
                        </span>
                      ))}
                      {opportunity.skills.length > 4 && (
                        <span className="px-2 py-1 text-[#F9E4AD]/60 text-xs font-mono">
                          +{opportunity.skills.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm font-mono mb-4">
                    <div>
                      <span className="text-[#F9E4AD]/60">Experience:</span>
                      <span className="text-[#F9E4AD] ml-2">{opportunity.experience}</span>
                    </div>
                    <div>
                      <span className="text-[#F9E4AD]/60">Compensation:</span>
                      <span className="text-[#FF9940] ml-2">{opportunity.compensation}</span>
                    </div>
                    <div>
                      <span className="text-[#F9E4AD]/60">Deadline:</span>
                      <span className="text-[#FF9940] ml-2">{new Date(opportunity.deadline).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-[#F9E4AD]/60">Remote:</span>
                      <span className="text-[#F9E4AD] ml-2">{opportunity.remote ? 'Yes' : 'No'}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleApply(opportunity)}
                    className="w-full py-2 px-4 bg-[#E70008] text-black font-mono font-bold rounded-md hover:bg-[#FF9940] transition-colors"
                  >
                    Apply Now
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* Application Form */
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-r from-[#E70008]/10 to-[#FF9940]/10 rounded-lg p-8 border border-[#E70008]/30">
              <h2 className="text-2xl font-bold font-mono text-[#F9E4AD] mb-6">
                Apply for {selectedOpportunity?.title}
              </h2>
              
              <form onSubmit={handleSubmitApplication} className="space-y-6">
                <div>
                  <label className="block text-sm font-mono text-[#F9E4AD] mb-2">Full Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-[#E70008] focus:ring-1 focus:ring-[#E70008]"
                    value={application.name}
                    onChange={(e) => setApplication({...application, name: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-mono text-[#F9E4AD] mb-2">Email</label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-[#E70008] focus:ring-1 focus:ring-[#E70008]"
                    value={application.email}
                    onChange={(e) => setApplication({...application, email: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-mono text-[#F9E4AD] mb-2">Role</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-[#E70008] focus:ring-1 focus:ring-[#E70008]"
                    value={application.role}
                    onChange={(e) => setApplication({...application, role: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-mono text-[#F9E4AD] mb-2">Experience</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-[#E70008] focus:ring-1 focus:ring-[#E70008]"
                    value={application.experience}
                    onChange={(e) => setApplication({...application, experience: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-mono text-[#F9E4AD] mb-2">Skills (comma separated)</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-[#E70008] focus:ring-1 focus:ring-[#E70008]"
                    value={application.skills}
                    onChange={(e) => setApplication({...application, skills: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-mono text-[#F9E4AD] mb-2">Message</label>
                  <textarea
                    rows={4}
                    required
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-[#E70008] focus:ring-1 focus:ring-[#E70008]"
                    value={application.message}
                    onChange={(e) => setApplication({...application, message: e.target.value})}
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 bg-[#E70008] text-black font-mono font-bold rounded-md hover:bg-[#FF9940] transition-colors"
                  >
                    Submit Application
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowApplicationForm(false)}
                    className="flex-1 py-2 px-4 bg-transparent border border-gray-600 text-gray-400 font-mono font-bold rounded-md hover:border-[#E70008] hover:text-[#E70008] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}