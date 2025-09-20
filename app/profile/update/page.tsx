'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUserProfile, updateUserProfile, uploadProfilePicture } from '@/lib/supabase/profile';
import { useAuth } from '@/lib/supabase/auth-context';
import { supabase } from '@/lib/supabase/client';

interface Skill {
  name: string;
  availability: 'available' | 'busy' | 'unavailable';
}

interface ProfileData {
  profilePic: string;
  bio: string;
  skills: Skill[];
  location: string;
  website: string;
  github: string;
  linkedin: string;
  twitter: string;
  availability: 'available' | 'busy' | 'unavailable';
}

export default function UpdateProfile() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<ProfileData>({
    profilePic: '',
    bio: '',
    skills: [],
    location: '',
    website: '',
    github: '',
    linkedin: '',
    twitter: '',
    availability: 'available',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      loadUserProfile();
    }
  }, [user, authLoading]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      // Use Supabase client directly to get user profile
      // Load user profile and skills
      const [{ data: userData, error: userError }, { data: skillsData, error: skillsError }] = await Promise.all([
        supabase
          .from('users')
          .select('*')
          .eq('id', user?.id)
          .single(),
        supabase
          .from('user_skills')
          .select('skill_name, availability')
          .eq('user_id', user?.id)
      ]);

      if (userError) {
        console.error('Error loading profile:', userError);
        // If user doesn't exist in users table, create basic profile
        if (userError.code === 'PGRST116') {
          const username = user?.user_metadata?.username || 
                          user?.email?.split('@')[0] || 
                          `user_${user?.id?.substring(0, 8)}`;
          
          const { error: insertError } = await supabase
            .from('users')
            .insert([
              {
                id: user?.id,
                username: username,
                email: user?.email,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            ]);

          if (insertError) {
            console.error('Error creating user profile:', insertError);
          } else {
            // Reload after creating profile
            const { data: newUserData } = await supabase
              .from('users')
              .select('*')
              .eq('id', user?.id)
              .single();
            
            if (newUserData) {
              setProfile({
              profilePic: newUserData.avatar_url || '',
              bio: newUserData.bio || '',
              skills: skillsData?.map(s => ({ name: s.skill_name, availability: s.availability || 'available' })) || [],
              location: newUserData.location || '',
              website: newUserData.website_url || '',
              github: newUserData.github_url || '',
              linkedin: newUserData.linkedin_url || '',
              twitter: newUserData.twitter_url || '',
              availability: newUserData.availability || 'available'
            });
            }
          }
        }
      } else if (userData) {
        setProfile({
            profilePic: userData.avatar_url || '',
            bio: userData.bio || '',
            skills: skillsData?.map(s => ({ name: s.skill_name, availability: s.availability || 'available' })) || [],
            location: userData.location || '',
            website: userData.website_url || '',
            github: userData.github_url || '',
            linkedin: userData.linkedin_url || '',
            twitter: userData.twitter_url || '',
            availability: userData.availability || 'available'
          });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      alert('Error loading profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setSaving(true);
        
        // Upload image to Supabase storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        setProfile(prev => ({ ...prev, profilePic: publicUrl }));
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('Error uploading profile picture');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleAddSkill = () => {
    if (newSkill && !profile.skills.some(skill => skill.name === newSkill)) {
      setProfile(prev => ({
        ...prev,
        skills: [...prev.skills, { name: newSkill, availability: 'available' }]
      }));
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillNameToRemove: string) => {
    setProfile(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill.name !== skillNameToRemove)
    }));
  };

  const handleSkillAvailabilityChange = (skillName: string, availability: 'available' | 'busy' | 'unavailable') => {
    setProfile(prev => ({
      ...prev,
      skills: prev.skills.map(skill => 
        skill.name === skillName ? { ...skill, availability } : skill
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      
      // Update user profile using Supabase client
      const { error } = await supabase
          .from('users')
          .update({
            bio: profile.bio,
            location: profile.location,
            website_url: profile.website,
            github_url: profile.github,
            linkedin_url: profile.linkedin,
            twitter_url: profile.twitter,
            avatar_url: profile.profilePic,
            availability: profile.availability,
            updated_at: new Date().toISOString()
          })
          .eq('id', user?.id);

      if (error) {
        throw error;
      }

      // Handle skills separately - first delete existing skills, then insert new ones
      if (user?.id) {
        // Delete existing skills
        await supabase
          .from('user_skills')
          .delete()
          .eq('user_id', user.id);

        // Insert new skills
        if (profile.skills.length > 0) {
          const skillsToInsert = profile.skills.map(skill => ({
            user_id: user.id,
            skill_name: skill.name,
            proficiency_level: 'beginner', // Default level
            availability: skill.availability
          }));

          const { error: skillsError } = await supabase
            .from('user_skills')
            .insert(skillsToInsert);

          if (skillsError) {
            console.error('Error updating skills:', skillsError);
          }
        }
      }

      alert('Profile updated successfully!');
      router.push('/dashboard');
    } catch (error: unknown) {
      console.error('Error updating profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      alert(`Error updating profile: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-black border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">Update Profile</h1>
            <Link href="/dashboard" className="text-sm sm:text-base text-gray-400 hover:text-white transition-colors flex items-center">
              <svg className="w-4 h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {loading ? (
          <div className="flex justify-center items-center h-48 sm:h-64">
            <div className="text-[#FF9940] font-mono text-sm sm:text-base">Loading profile...</div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-[#E70008]/10 to-[#FF9940]/10 rounded-lg p-4 sm:p-6 lg:p-8 border border-[#E70008]/30">
            <h2 className="text-xl sm:text-2xl font-bold font-mono text-[#FF9940] mb-4 sm:mb-6">Update Your Profile</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Profile Picture Upload */}
              <div className="flex flex-col items-center">
                <label className="block text-sm font-mono text-[#FF9940] mb-2">Profile Picture</label>
                <div className="relative">
                  {profile.profilePic ? (
                    <img 
                      src={profile.profilePic} 
                      alt="Profile" 
                      className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-2 border-[#E70008]"
                    />
                  ) : (
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-[#E70008]/20 border-2 border-[#E70008] flex items-center justify-center">
                      <span className="text-[#FF9940] text-2xl sm:text-4xl">👤</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <p className="text-xs text-[#FF9940]/60 mt-2">Click to upload profile picture</p>
              </div>

              <div>
                <label className="block text-sm font-mono text-[#FF9940] mb-2">Bio</label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  rows={3}
                  className="w-full px-3 sm:px-4 py-2 bg-[#E70008]/20 border border-[#E70008] rounded-lg text-[#FF9940] placeholder-[#FF9940]/60 focus:border-[#FF9940] focus:ring-1 focus:ring-[#FF9940] text-sm sm:text-base"
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
                    className="flex-1 px-3 sm:px-4 py-2 bg-[#E70008]/20 border border-[#E70008] rounded-lg text-[#FF9940] placeholder-[#FF9940]/60 focus:border-[#FF9940] focus:ring-1 focus:ring-[#FF9940] text-sm sm:text-base"
                    placeholder="Enter any skill you have"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-3 sm:px-4 py-2 bg-[#E70008] text-black font-mono font-bold rounded-md hover:bg-[#FF9940] transition-colors text-sm sm:text-base"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 sm:gap-2">
                  {profile.skills.map((skill) => (
                    <span
                      key={skill.name}
                      className="px-2 sm:px-3 py-1 bg-[#E70008]/30 text-[#FF9940] text-xs sm:text-sm font-mono rounded-full border border-[#E70008] flex items-center gap-1 sm:gap-2"
                    >
                      {skill.name}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill.name)}
                        className="text-[#FF9940]/60 hover:text-[#FF9940] text-sm"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-mono text-[#FF9940] mb-2">Location</label>
                <input
                  type="text"
                  value={profile.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 bg-[#E70008]/20 border border-[#E70008] rounded-lg text-[#FF9940] placeholder-[#FF9940]/60 focus:border-[#FF9940] focus:ring-1 focus:ring-[#FF9940] text-sm sm:text-base"
                  placeholder="City, Country"
                />
              </div>

              {/* Links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-mono text-[#FF9940] mb-2">Website <span className="text-[#FF9940]/60 text-xs">(optional)</span></label>
                  <input
                    type="url"
                    value={profile.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    className="w-full px-4 py-2 bg-[#E70008]/20 border border-[#E70008] rounded-lg text-[#FF9940] placeholder-[#FF9940]/60 focus:border-[#FF9940] focus:ring-1 focus:ring-[#FF9940]"
                    placeholder="https://yourwebsite.com (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-mono text-[#FF9940] mb-2">GitHub <span className="text-[#FF9940]/60 text-xs">(optional)</span></label>
                  <input
                    type="url"
                    value={profile.github}
                    onChange={(e) => handleInputChange('github', e.target.value)}
                    className="w-full px-4 py-2 bg-[#E70008]/20 border border-[#E70008] rounded-lg text-[#FF9940] placeholder-[#FF9940]/60 focus:border-[#FF9940] focus:ring-1 focus:ring-[#FF9940]"
                    placeholder="https://github.com/username (optional)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-mono text-[#FF9940] mb-2">LinkedIn <span className="text-[#FF9940]/60 text-xs">(optional)</span></label>
                  <input
                    type="url"
                    value={profile.linkedin}
                    onChange={(e) => handleInputChange('linkedin', e.target.value)}
                    className="w-full px-4 py-2 bg-[#E70008]/20 border border-[#E70008] rounded-lg text-[#FF9940] placeholder-[#FF9940]/60 focus:border-[#FF9940] focus:ring-1 focus:ring-[#FF9940]"
                    placeholder="https://linkedin.com/in/username (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-mono text-[#FF9940] mb-2">Twitter <span className="text-[#FF9940]/60 text-xs">(optional)</span></label>
                  <input
                    type="url"
                    value={profile.twitter}
                    onChange={(e) => handleInputChange('twitter', e.target.value)}
                    className="w-full px-4 py-2 bg-[#E70008]/20 border border-[#E70008] rounded-lg text-[#FF9940] placeholder-[#FF9940]/60 focus:border-[#FF9940] focus:ring-1 focus:ring-[#FF9940]"
                    placeholder="https://twitter.com/username (optional)"
                  />
                </div>
              </div>

              {/* Your Availability */}
              <div>
                <label className="block text-sm font-mono text-[#FF9940] mb-2">Your Availability</label>
                <select
                  value={profile.availability}
                  onChange={(e) => handleInputChange('availability', e.target.value)}
                  className="w-full px-4 py-2 bg-[#E70008]/20 border border-[#E70008] rounded-lg text-[#FF9940] focus:border-[#FF9940] focus:ring-1 focus:ring-[#FF9940]"
                >
                  <option value="available" className="bg-[#E70008] text-black">Available</option>
                  <option value="busy" className="bg-[#E70008] text-black">Busy</option>
                  <option value="unavailable" className="bg-[#E70008] text-black">Unavailable</option>
                </select>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 px-4 bg-[#E70008] text-black font-mono font-bold rounded-md hover:bg-[#FF9940] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Update Profile'}
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
        )}
      </main>
    </div>
  );
}