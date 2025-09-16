import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Export table names for easy access
export const TABLES = {
  users: process.env.NEXT_PUBLIC_USERS_TABLE || 'users',
  userRoles: process.env.NEXT_PUBLIC_ROLES_TABLE || 'user_roles',
  userCategories: process.env.NEXT_PUBLIC_CATEGORIES_TABLE || 'user_categories',
  projects: process.env.NEXT_PUBLIC_PROJECTS_TABLE || 'projects',
  projectContributors: process.env.NEXT_PUBLIC_PROJECT_CONTRIBUTORS_TABLE || 'project_contributors',
  userPreferences: process.env.NEXT_PUBLIC_USER_PREFERENCES_TABLE || 'user_preferences',
} as const