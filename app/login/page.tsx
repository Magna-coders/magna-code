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
        // Successful login - redirect to profile update page
        router.push('/profile/update');
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