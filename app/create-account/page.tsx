'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase, TABLES } from '@/src/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function CreateAccount() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    selectedCategories: [] as string[],
    selectedRoles: [] as string[]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [ballPosition, setBallPosition] = useState({ x: 0, y: 0 });
  const [step, setStep] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleCategoryChange = (category: string) => {
    setFormData(prev => {
      const newCategories = prev.selectedCategories.includes(category)
        ? prev.selectedCategories.filter(c => c !== category)
        : [...prev.selectedCategories, category];
      
      const newRoles = prev.selectedRoles.filter(role => {
        const categoryData = roleCategories[category as keyof typeof roleCategories];
        return !categoryData || newCategories.some(cat => 
          roleCategories[cat as keyof typeof roleCategories]?.includes(role)
        );
      });
      
      return {
        ...prev,
        selectedCategories: newCategories,
        selectedRoles: newRoles
      };
    });
  };

  const handleRoleChange = (role: string) => {
    setFormData(prev => ({
      ...prev,
      selectedRoles: prev.selectedRoles.includes(role)
        ? prev.selectedRoles.filter(r => r !== role)
        : [...prev.selectedRoles, role]
    }));
  };

  const roleCategories = {
    "Developer": [
      "Frontend Developer", "Backend Developer", "Fullstack Developer", "Mobile App Developer",
      "DevOps Engineer", "Data Engineer", "AI/ML Engineer", "Blockchain Developer",
      "Game Developer", "Embedded Systems Developer"
    ],
    "Designer": [
      "UI Designer", "UX Designer", "Product Designer", "Graphic Designer",
      "Motion Designer", "Web Designer", "Branding/Identity Designer"
    ],
    "Research/Analyst": [
      "Data Scientist", "Data Analyst", "Business Analyst", "Market Researcher",
      "QA/Test Engineer", "User Researcher", "Security Analyst"
    ],
    "Business/Strategy": [
      "Project Manager", "Product Manager", "Business Development", "Marketing Specialist",
      "Sales & Partnerships", "Finance & Operations", "Legal/Compliance Advisor"
    ],
    "Support": [
      "Community Manager", "Technical Writer", "Content Creator", "Mentor/Coach",
      "Customer Support", "Recruiter/Talent Scout", "Educator/Trainer"
    ]
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (formData.selectedCategories.length === 0) {
      newErrors.categories = 'Please select at least one category';
    }
    if (formData.selectedRoles.length === 0) {
      newErrors.roles = 'Please select at least one role';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // 1. Sign up user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            username: formData.username,
          }
        }
      });

      if (authError) {
        throw authError;
      }

      if (authData.user) {
        // 2. Insert user profile into users table
        const { error: profileError } = await supabase
          .from(TABLES.users)
          .insert([
            {
              id: authData.user.id,
              username: formData.username,
              email: formData.email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ]);

        if (profileError) {
          console.error('Profile creation error:', profileError);
          throw new Error('Failed to create user profile. Please contact support.');
        }

        // 3. Insert user categories
        if (formData.selectedCategories.length > 0) {
          const categoryData = formData.selectedCategories.map(category => ({
            user_id: authData.user!.id,
            category_name: category
          }));

          const { error: categoryError } = await supabase
            .from(TABLES.userCategories)
            .insert(categoryData);

          if (categoryError) {
            console.error('Category creation error:', categoryError);
            // Don't throw error for categories, as they're not critical
          }
        }

        // 4. Insert user roles
        if (formData.selectedRoles.length > 0) {
          const roleData = formData.selectedRoles.map(role => ({
            user_id: authData.user!.id,
            role_name: role
          }));

          const { error: roleError } = await supabase
            .from(TABLES.userRoles)
            .insert(roleData);

          if (roleError) {
            console.error('Role creation error:', roleError);
            // Don't throw error for roles, as they're not critical
          }
        }

        // Success - redirect to dashboard
        router.push('/dashboard');
      }
    } catch (error: unknown) {
      console.error('Registration error:', error);
      // Handle specific Supabase errors
      if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string') {
        if ((error as any).message.includes('already registered')) {
          setErrors({ submit: 'An account with this email already exists.' });
        } else if ((error as any).message.includes('username')) {
          setErrors({ submit: 'This username is already taken.' });
        } else {
          setErrors({ submit: (error as any).message || 'Registration failed. Please try again.' });
        }
      } else {
        setErrors({ submit: 'Registration failed. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  // Ball animation and border drawing/erasing
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const perimeter = 2 * (width + height);
    const totalSteps = 200;
    const segmentLength = perimeter / totalSteps;

    const getPosition = (step: number) => {
      const progress = (step % totalSteps) / totalSteps;
      const totalDistance = progress * perimeter;

      if (totalDistance <= width) {
        return { x: totalDistance, y: 0 };
      } else if (totalDistance <= width + height) {
        return { x: width, y: totalDistance - width };
      } else if (totalDistance <= 2 * width + height) {
        return { x: 2 * width + height - totalDistance, y: height };
      } else {
        return { x: 0, y: 2 * (width + height) - totalDistance };
      }
    };

    const interval = setInterval(() => {
      setStep(prev => (prev + 1) % (totalSteps * 2));
      const { x, y } = getPosition(step);
      setBallPosition({ x, y });
    }, 50);

    return () => {
      clearInterval(interval);
    };
  }, [step]);

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8 sm:py-12 md:py-16">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8 sm:mb-10">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-mono text-[#E70008] mb-4">
              Create Account
            </h1>
            <p className="text-[#F9E4AD] font-mono text-sm sm:text-base">
              Join the Magna Coders community
            </p>
          </div>

          <div className="relative p-6 sm:p-8 rounded-lg overflow-hidden" ref={containerRef}>
            {/* Border segments */}
            <div
              className="absolute border-top bg-[#E70008]"
              style={{ top: 0, left: 0, height: '1px', transition: 'width 0.3s ease-out' }}
            />
            <div
              className="absolute border-right bg-[#E70008]"
              style={{ top: 0, right: 0, width: '1px', transition: 'height 0.3s ease-out' }}
            />
            <div
              className="absolute border-bottom bg-[#E70008]"
              style={{ bottom: 0, right: 0, height: '1px', transition: 'width 0.3s ease-out' }}
            />
            <div
              className="absolute border-left bg-[#E70008]"
              style={{ bottom: 0, left: 0, width: '1px', transition: 'height 0.3s ease-out' }}
            />

            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              {/* Username */}
              <div>
                <label className="block text-[#F9E4AD] font-mono text-sm font-medium mb-2">
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-black border border-[#E70008] rounded-md text-[#F9E4AD] font-mono placeholder-[#F9E4AD]/50 focus:outline-none focus:border-[#FF9940] focus:ring-1 focus:ring-[#FF9940]"
                  placeholder="Enter your username"
                />
                {errors.username && (
                  <p className="text-[#E70008] font-mono text-xs mt-1">{errors.username}</p>
                )}
              </div>

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

              {/* Categories */}
              <div>
                <label className="block text-[#F9E4AD] font-mono text-sm font-medium mb-2">
                  Categories (Select all that apply)
                </label>
                <div className="relative p-4 border border-[#E70008] rounded-md">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.keys(roleCategories).map((category) => (
                      <label key={category} className="flex items-center space-x-2 cursor-pointer hover:bg-[#E70008]/10 p-2 rounded transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.selectedCategories.includes(category)}
                          onChange={() => handleCategoryChange(category)}
                          className="w-4 h-4 text-[#E70008] bg-black border border-[#E70008] rounded focus:ring-[#FF9940] focus:ring-1"
                        />
                        <span className="text-[#F9E4AD] font-mono text-sm">{category}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {errors.categories && (
                  <p className="text-[#E70008] font-mono text-xs mt-1">{errors.categories}</p>
                )}
              </div>

              {/* Roles */}
              {formData.selectedCategories.length > 0 && (
                <div>
                  <label className="block text-[#F9E4AD] font-mono text-sm font-medium mb-2">
                    Roles (Select all that apply)
                  </label>
                  <div className="space-y-4">
                    {formData.selectedCategories.map((category) => (
                      <div key={category}>
                        <h4 className="text-[#FF9940] font-mono text-sm font-semibold mb-2">
                          {category}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {roleCategories[category as keyof typeof roleCategories]?.map((role) => (
                            <label key={role} className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.selectedRoles.includes(role)}
                                onChange={() => handleRoleChange(role)}
                                className="w-4 h-4 text-[#E70008] bg-black border border-[#E70008] rounded focus:ring-[#FF9940] focus:ring-1"
                              />
                              <span className="text-[#F9E4AD] font-mono text-xs">{role}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {errors.roles && (
                    <p className="text-[#E70008] font-mono text-xs mt-1">{errors.roles}</p>
                  )}
                </div>
              )}

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

              {/* Confirm Password */}
              <div>
                <label className="block text-[#F9E4AD] font-mono text-sm font-medium mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-black border border-[#E70008] rounded-md text-[#F9E4AD] font-mono placeholder-[#F9E4AD]/50 focus:outline-none focus:border-[#FF9940] focus:ring-1 focus:ring-[#FF9940]"
                  placeholder="Confirm your password"
                />
                {errors.confirmPassword && (
                  <p className="text-[#E70008] font-mono text-xs mt-1">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 px-4 bg-[#E70008] hover:bg-[#FF9940] text-black font-mono font-bold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#FF9940] focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>

              {/* Submit Error */}
              {errors.submit && (
                <p className="text-[#E70008] font-mono text-xs mt-2 text-center">{errors.submit}</p>
              )}
            </form>

            <div className="mt-6 text-center relative z-10">
              <p className="text-[#F9E4AD] font-mono text-sm">
                Already have an account?{' '}
                <a href="/login" className="text-[#FF9940] hover:text-[#E70008] font-mono">
                  Sign in
                </a>
              </p>
            </div>

            {/* Bouncing cream ball along perimeter */}
            <div
              className="absolute w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 bg-[#F9E4AD] rounded-full transition-all duration-300 ease-out"
              style={{
                left: `${ballPosition.x}px`,
                top: `${ballPosition.y}px`,
                transform: 'translate(-50%, -50%)'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}