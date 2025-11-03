'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { supabase } from '@/src/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { sanitizeEmail, sanitizeInput, validateFormInput } from '@/src/lib/sanitization';

export default function Login() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Sanitize input based on field type
    let sanitizedValue = value;
    
    if (name === 'email') {
      // For email, only allow safe characters and limit length
      sanitizedValue = sanitizeInput(value, 254); // Max email length is 254
    } else if (name === 'password') {
      // For password, just limit length (don't sanitize content)
      if (value.length > 128) {
        sanitizedValue = value.substring(0, 128);
      }
    }
    
    setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // Sanitize and validate email
    try {
      const emailValidation = validateFormInput('email', formData.email, 'email');
      if (!emailValidation.isValid) {
        newErrors.email = emailValidation.error || 'Invalid email';
      }
    } catch (error) {
      newErrors.email = error instanceof Error ? error.message : 'Invalid email';
    }

    // Validate password
    if (!formData.password || formData.password.trim() === '') {
      newErrors.password = 'Password is required';
    } else if (formData.password.length > 128) {
      newErrors.password = 'Password is too long';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Sanitize inputs before sending to Supabase
      const sanitizedEmail = sanitizeEmail(formData.email);
      const sanitizedPassword = formData.password; // Don't sanitize password, just validate length
      
      if (sanitizedPassword.length > 128) {
        throw new Error('Password is too long');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password: sanitizedPassword,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        // Successful login - send user to new dashboard
        router.push('/new-dashboard');
      }
    } catch (error: unknown) {
      console.error('Login error:', error);
      // Handle specific Supabase errors
      if (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as { message?: string }).message === 'string'
      ) {
        const errorMessage = (error as { message: string }).message;
        if (errorMessage.includes('Invalid login credentials')) {
          setErrors({ submit: 'Invalid email or password.' });
        } else if (errorMessage.includes('Email not confirmed')) {
          setErrors({ submit: 'Please confirm your email before logging in.' });
        } else {
          setErrors({ submit: errorMessage || 'Login failed. Please try again.' });
        }
      } else {
        setErrors({ submit: 'Login failed. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8 sm:py-12 md:py-16">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8 sm:mb-10">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-mono text-[#E70008] mb-4">
              Welcome Back
            </h1>
            <p className="text-[#F9E4AD] font-mono text-sm sm:text-base">
              Sign in to your Magna Coders account
            </p>
          </div>

          <div className="bg-[#1a1a1a] rounded-lg p-6 sm:p-8 border border-[#E70008]/20">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div>
                <label className="block text-[#F9E4AD] font-mono text-sm font-medium mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-black border border-[#E70008] rounded-md text-[#F9E4AD] font-mono placeholder-[#F9E4AD]/50 focus:outline-none focus:border-[#FF9940] focus:ring-1 focus:ring-[#FF9940]"
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="text-[#E70008] font-mono text-xs mt-1">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-[#F9E4AD] font-mono text-sm font-medium mb-2">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-black border border-[#E70008] rounded-md text-[#F9E4AD] font-mono placeholder-[#F9E4AD]/50 focus:outline-none focus:border-[#FF9940] focus:ring-1 focus:ring-[#FF9940]"
                  placeholder="Enter your password"
                />
                {errors.password && (
                  <p className="text-[#E70008] font-mono text-xs mt-1">{errors.password}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 px-4 bg-[#E70008] hover:bg-[#FF9940] text-black font-mono font-bold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#FF9940] focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>

              {/* Submit Error */}
              {errors.submit && (
                <p className="text-[#E70008] font-mono text-xs mt-2 text-center">{errors.submit}</p>
              )}
            </form>

            {/* Social Authentication */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#E70008]/20"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-[#1a1a1a] text-[#F9E4AD] font-mono">Or continue with</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                {/* Google Auth Button */}
                <button
                  type="button"
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-[#E70008]/20 rounded-md shadow-sm bg-black text-[#F9E4AD] font-mono text-sm hover:bg-[#1a1a1a] hover:border-[#FF9940] transition-colors duration-200"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </button>

                {/* GitHub Auth Button */}
                <button
                  type="button"
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-[#E70008]/20 rounded-md shadow-sm bg-black text-[#F9E4AD] font-mono text-sm hover:bg-[#1a1a1a] hover:border-[#FF9940] transition-colors duration-200"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub
                </button>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-[#F9E4AD] font-mono text-sm">
                Don&apos;t have an account?{' '}
                <Link href="/create-account" className="text-[#FF9940] hover:text-[#E70008] font-mono">
                  Create account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}