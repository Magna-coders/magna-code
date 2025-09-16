# Database Setup Guide

## Prerequisites
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key from the project settings

## Step 1: Environment Variables

Copy the `.env.local.example` file to `.env.local` and update with your Supabase credentials:

```bash
cp .env.local.example .env.local
```

Then edit `.env.local` with your actual values:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key

## Step 2: Database Schema

The `supabase-schema.sql` file contains the complete database schema. You can run this in your Supabase SQL editor:

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Open and run the contents of `supabase-schema.sql`

## Step 3: Test the Setup

1. Start the development server:
```bash
npm run dev
```

2. Visit http://localhost:3000/create-account
3. Fill out the registration form
4. Check your Supabase dashboard to see the new user data

## Troubleshooting

### Common Issues:

1. **"relation does not exist" errors**: Run the SQL schema file first
2. **"Invalid authentication credentials"**: Check your `.env.local` values
3. **Email already exists**: Try a different email address
4. **Username already taken**: Try a different username

### Checking Database Tables

After running the schema, verify these tables exist:
- `users` - User profiles
- `user_categories` - User category selections
- `user_roles` - User role selections
- `projects` - Projects created by users

### Row Level Security (RLS)

The schema includes RLS policies that allow:
- Users to read their own data
- Users to update their own data
- Authenticated users to create new records

## Next Steps

1. Set up email confirmation (optional)
2. Configure OAuth providers (optional)
3. Add additional user fields as needed
4. Set up project creation functionality

## Support

If you encounter issues:
1. Check the browser console for detailed error messages
2. Verify your Supabase project settings
3. Ensure all environment variables are correctly set
4. Check the Supabase logs in your dashboard