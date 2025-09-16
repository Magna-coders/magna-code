#  Supabase Auth Troubleshooting Guide

## Your Error Analysis
The error `handleError -> _handleRequest -> _request -> SupabaseAuthClient.signUp` indicates **Supabase Auth is failing at the API level**, not your database.

## Quick Fix Steps

### Step 1: Verify Your Supabase Project Settings

1. **Go to your Supabase Dashboard**: https://app.supabase.com
2. **Select your project**: `uzsaaxuifuoimgqjxynz`
3. **Check these settings**:

#### Authentication Settings
- **Settings** → **Authentication**
- Ensure **Enable Email Confirmations** is set appropriately
- Check **Enable User Sign Ups** is turned ON

#### Email Settings
- **Settings** → **Authentication** → **Emails**
- Ensure **SMTP Settings** are configured (even for testing)
- For testing, you can use these temporary settings:
  - **Enable Email Confirmations**: OFF (for now)
  - **Enable Email Sign Ups**: ON

### Step 2: Verify Your Environment Variables

Check your `.env.local` file has the EXACT values from your Supabase project:

```bash
# Get these from: Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://uzsaaxuifuoimgqjxynz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

### Step 3: Test Your Configuration

Run this test in your browser console on your create-account page:

```javascript
// Open browser console (F12) and run:
const { supabase } = await import('@/src/lib/supabase/client');

// Test 1: Check if Supabase is initialized
console.log('Supabase URL:', supabase.supabaseUrl);
console.log('Supabase Key:', supabase.supabaseAnonKey?.substring(0, 20) + '...');

// Test 2: Try a simple auth call
const { data, error } = await supabase.auth.signUp({
  email: 'test-' + Date.now() + '@example.com',
  password: 'testpass123'
});

if (error) {
  console.error('Auth Error:', error.message);
  console.error('Full Error:', error);
} else {
  console.log('Success! User:', data.user.id);
}
```

### Step 4: Common Fixes

#### Fix A: Enable Auth in Supabase
1. Go to **Authentication** → **Providers**
2. Ensure **Email** provider is **enabled**
3. Set **Enable Confirmations** to **OFF** for testing

#### Fix B: Check Project Status
1. Go to **Project Settings** → **General**
2. Ensure your project is **Active** (not paused)
3. Check if you're within free tier limits

#### Fix C: Reset Auth Settings
1. **Authentication** → **Policies**
2. Ensure there are no restrictive policies blocking sign-ups

### Step 5: If Still Failing

#### Check Supabase Logs
1. Go to **Logs** → **Auth Logs** in your Supabase dashboard
2. Look for specific error messages during sign-up attempts

#### Test with Curl
```bash
# Replace with your actual values
curl -X POST 'https://uzsaaxuifuoimgqjxynz.supabase.co/auth/v1/signup' \
  -H 'apikey: your-anon-key' \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

## Expected Results

 **Working**: Should return user object with ID
 **Failing**: Will show specific error message

## Next Steps After Fix

1. Restart your dev server: `npm run dev`
2. Clear browser cache/cookies
3. Try creating a new account
4. Check Supabase dashboard for new user

## Emergency Debug Mode

If all else fails, temporarily disable email confirmation:

1. **Supabase Dashboard** → **Authentication** → **Providers**
2. **Email Provider** → **Enable Confirmations**: **OFF**
3. **Save**
4. Test registration again

## Support

If issues persist:
1. Check **Supabase Status**: https://status.supabase.com
2. **Discord**: https://discord.supabase.com
3. **Support**: https://supabase.com/support