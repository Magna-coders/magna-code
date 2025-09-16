'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ProfileData {
  name: string;
  email: string;
  role: string;
  bio: string;
  skills: string[];
  experience: string;
  location: string;
  website: string;
  github: string;
  linkedin: string;
  twitter: string;
  availability: 'available' | 'busy' | 'unavailable';
}

export default function UpdateProfile() {
  const [profile, setProfile] = useState<ProfileData>({
    name: 'Alex Thompson',
    email: 'alex@example.com',
    role: 'Full Stack Developer',
    bio: 'Passionate developer with expertise in modern web technologies. I love building scalable applications and working with diverse teams.',
    skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker'],
    experience: '5 years',
    location: 'San Francisco, CA',
    website: 'https://alexthompson.dev',
    github: 'https://github.com/alexthompson',
    linkedin: 'https://linkedin.com/in/alexthompson',
    twitter: 'https://twitter.com/alexthompson',
    availability: 'available'
  });

  const [newSkill, setNewSkill] = useState('');

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !profile.skills.includes(newSkill.trim())) {
      setProfile(prev => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }));
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setProfile(prev => ({ ...prev, skills: prev.skills.filter(skill => skill !== skillToRemove) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Profile updated:', profile);
    alert('Profile updated successfully!');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-black border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white">Update Profile</h1>
            <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gradient-to-r from-[#E70008]/10 to-[#FF9940]/10 rounded-lg p-8 border border-[#E70008]/30">
          <h2 className="text-2xl font-bold font-mono text-[#FF9940] mb-6">Update Your Profile</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-mono text-[#FF9940] mb-2">Full Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-2 bg-[#E70008]/20 border border-[#E70008] rounded-lg text-[#FF9940] placeholder-[#FF9940]/60 focus:border-[#FF9940] focus:ring-1 focus:ring-[#FF9940]"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-mono text-[#FF9940] mb-2">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-4 py-2 bg-[#E70008]/20 border border-[#E70008] rounded-lg text-[#FF9940] placeholder-[#FF9940]/60 focus:border-[#FF9940] focus:ring-1 focus:ring-[#FF9940]"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-mono text-[#FF9940] mb-2">Role/Title</label>
              <input
                type="text"
                value={profile.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                className="w-full px-4 py-2 bg-[#E70008]/20 border border-[#E70008] rounded-lg text-[#FF9940] placeholder-[#FF9940]/60 focus:border-[#FF9940] focus:ring-1 focus:ring-[#FF9940]"
                placeholder="e.g. Full Stack Developer"
              />
            </div>

            <div>
              <label className="block text-sm font-mono text-[#FF9940] mb-2">Bio</label>
              <textarea
                value={profile.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                rows={4}
                className="w-full px-4 py-2 bg-[#E70008]/20 border border-[#E70008] rounded-lg text-[#FF9940] placeholder-[#FF9940]/60 focus:border-[#FF9940] focus:ring-1 focus:ring-[#FF9940]"
                placeholder="Tell us about yourself"
              />
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm font-mono text-[#FF9940] mb-2">Skills</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                  className="flex-1 px-4 py-2 bg-[#E70008]/20 border border-[#E70008] rounded-lg text-[#FF9940] placeholder-[#FF9940]/60 focus:border-[#FF9940] focus:ring-1 focus:ring-[#FF9940]"
                  placeholder="Add a skill"
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="px-4 py-2 bg-[#E70008] text-black font-mono font-bold rounded-md hover:bg-[#FF9940] transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 bg-[#E70008]/30 text-[#FF9940] text-sm font-mono rounded-full border border-[#E70008] flex items-center gap-2"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-[#FF9940]/60 hover:text-[#FF9940]"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-mono text-[#FF9940] mb-2">Experience</label>
                <input
                  type="text"
                  value={profile.experience}
                  onChange={(e) => handleInputChange('experience', e.target.value)}
                  className="w-full px-4 py-2 bg-[#E70008]/20 border border-[#E70008] rounded-lg text-[#FF9940] placeholder-[#FF9940]/60 focus:border-[#FF9940] focus:ring-1 focus:ring-[#FF9940]"
                  placeholder="e.g. 5 years"
                />
              </div>

              <div>
                <label className="block text-sm font-mono text-[#FF9940] mb-2">Location</label>
                <input
                  type="text"
                  value={profile.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full px-4 py-2 bg-[#E70008]/20 border border-[#E70008] rounded-lg text-[#FF9940] placeholder-[#FF9940]/60 focus:border-[#FF9940] focus:ring-1 focus:ring-[#FF9940]"
                  placeholder="City, Country"
                />
              </div>
            </div>

            {/* Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-mono text-[#FF9940] mb-2">Website</label>
                <input
                  type="url"
                  value={profile.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  className="w-full px-4 py-2 bg-[#E70008]/20 border border-[#E70008] rounded-lg text-[#FF9940] placeholder-[#FF9940]/60 focus:border-[#FF9940] focus:ring-1 focus:ring-[#FF9940]"
                  placeholder="https://yourwebsite.com"
                />
              </div>

              <div>
                <label className="block text-sm font-mono text-[#FF9940] mb-2">GitHub</label>
                <input
                  type="url"
                  value={profile.github}
                  onChange={(e) => handleInputChange('github', e.target.value)}
                  className="w-full px-4 py-2 bg-[#E70008]/20 border border-[#E70008] rounded-lg text-[#FF9940] placeholder-[#FF9940]/60 focus:border-[#FF9940] focus:ring-1 focus:ring-[#FF9940]"
                  placeholder="https://github.com/username"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-mono text-[#FF9940] mb-2">LinkedIn</label>
                <input
                  type="url"
                  value={profile.linkedin}
                  onChange={(e) => handleInputChange('linkedin', e.target.value)}
                  className="w-full px-4 py-2 bg-[#E70008]/20 border border-[#E70008] rounded-lg text-[#FF9940] placeholder-[#FF9940]/60 focus:border-[#FF9940] focus:ring-1 focus:ring-[#FF9940]"
                  placeholder="https://linkedin.com/in/username"
                />
              </div>

              <div>
                <label className="block text-sm font-mono text-[#FF9940] mb-2">Twitter</label>
                <input
                  type="url"
                  value={profile.twitter}
                  onChange={(e) => handleInputChange('twitter', e.target.value)}
                  className="w-full px-4 py-2 bg-[#E70008]/20 border border-[#E70008] rounded-lg text-[#FF9940] placeholder-[#FF9940]/60 focus:border-[#FF9940] focus:ring-1 focus:ring-[#FF9940]"
                  placeholder="https://twitter.com/username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-mono text-[#FF9940] mb-2">Availability</label>
              <select
                value={profile.availability}
                onChange={(e) => handleInputChange('availability', e.target.value as 'available' | 'busy' | 'unavailable')}
                className="w-full px-4 py-2 bg-[#E70008]/20 border border-[#E70008] rounded-lg text-[#FF9940] focus:border-[#FF9940] focus:ring-1 focus:ring-[#FF9940]"
              >
                <option value="available" className="bg-[#E70008] text-black">Available for new projects</option>
                <option value="busy" className="bg-[#E70008] text-black">Busy but open to opportunities</option>
                <option value="unavailable" className="bg-[#E70008] text-black">Not available</option>
              </select>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="flex-1 py-3 px-4 bg-[#E70008] text-black font-mono font-bold rounded-md hover:bg-[#FF9940] transition-colors"
              >
                Update Profile
              </button>
              <Link
                href="/dashboard"
                className="flex-1 py-3 px-4 bg-transparent border border-[#E70008] text-[#FF9940] font-mono font-bold rounded-md text-center hover:bg-[#E70008]/20 hover:text-[#FF9940] transition-colors"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}