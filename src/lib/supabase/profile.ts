import { supabase } from './client';
import { TABLES } from './client';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  website_url?: string;
  github_url?: string;
  linkedin_url?: string;
  twitter_url?: string;
  availability: 'available' | 'busy' | 'unavailable';
  profile_complete_percentage: number;
  skills: string[];
}

export interface UpdateProfileData {
  avatar_url?: string;
  bio?: string;
  location?: string;
  website_url?: string;
  github_url?: string;
  linkedin_url?: string;
  twitter_url?: string;
  availability: 'available' | 'busy' | 'unavailable';
  skills: string[];
}

/**
 * Fetch the current user's profile data
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user');
    }

    // Fetch user profile
    const { data: userData, error: userError } = await supabase
      .from(TABLES.users)
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user profile:', userError);
      throw userError;
    }

    // Fetch user skills
    const { data: skillsData, error: skillsError } = await supabase
      .from('user_skills')
      .select('skill_name')
      .eq('user_id', user.id);

    if (skillsError) {
      console.error('Error fetching user skills:', skillsError);
    }

    const skills = skillsData?.map(skill => skill.skill_name) || [];

    return {
      ...userData,
      skills,
    };
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return null;
  }
}

/**
 * Update the current user's profile
 */
export async function updateUserProfile(profileData: UpdateProfileData): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user');
    }

    // Update user profile
    const { error: updateError } = await supabase
      .from(TABLES.users)
      .update({
        avatar_url: profileData.avatar_url,
        bio: profileData.bio,
        location: profileData.location,
        website_url: profileData.website_url,
        github_url: profileData.github_url,
        linkedin_url: profileData.linkedin_url,
        twitter_url: profileData.twitter_url,
        availability: profileData.availability,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating user profile:', updateError);
      throw updateError;
    }

    // Handle skills update
    await updateUserSkills(user.id, profileData.skills);

    return true;
  } catch (error) {
    console.error('Error in updateUserProfile:', error);
    return false;
  }
}

/**
 * Update user skills
 */
async function updateUserSkills(userId: string, newSkills: string[]): Promise<void> {
  try {
    // Get current skills
    const { data: currentSkills } = await supabase
      .from('user_skills')
      .select('skill_name')
      .eq('user_id', userId);

    const currentSkillNames = currentSkills?.map(s => s.skill_name) || [];

    // Skills to add
    const skillsToAdd = newSkills.filter(skill => !currentSkillNames.includes(skill));
    
    // Skills to remove
    const skillsToRemove = currentSkillNames.filter(skill => !newSkills.includes(skill));

    // Add new skills
    if (skillsToAdd.length > 0) {
      const skillsData = skillsToAdd.map(skill => ({
        user_id: userId,
        skill_name: skill,
        proficiency_level: 'intermediate', // Default proficiency
      }));

      const { error: addError } = await supabase
        .from('user_skills')
        .insert(skillsData);

      if (addError) {
        console.error('Error adding skills:', addError);
      }
    }

    // Remove old skills
    if (skillsToRemove.length > 0) {
      const { error: removeError } = await supabase
        .from('user_skills')
        .delete()
        .eq('user_id', userId)
        .in('skill_name', skillsToRemove);

      if (removeError) {
        console.error('Error removing skills:', removeError);
      }
    }
  } catch (error) {
    console.error('Error in updateUserSkills:', error);
  }
}

/**
 * Upload profile picture to Supabase Storage
 */
export async function uploadProfilePicture(file: File): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user');
    }

    const fileName = `${user.id}-${Date.now()}.${file.name.split('.').pop()}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('profiles')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading profile picture:', uploadError);
      return null;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profiles')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error in uploadProfilePicture:', error);
    return null;
  }
}

/**
 * Check if username is available
 */
export async function checkUsernameAvailability(username: string, excludeCurrentUser = false): Promise<boolean> {
  try {
    let query = supabase
      .from(TABLES.users)
      .select('username')
      .eq('username', username);

    if (excludeCurrentUser) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        query = query.neq('id', user.id);
      }
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking username:', error);
      return false;
    }

    return !data;
  } catch (error) {
    console.error('Error in checkUsernameAvailability:', error);
    return false;
  }
}