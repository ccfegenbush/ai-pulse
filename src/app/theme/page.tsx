"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Database } from "@/types/supabase";
import UserDropdown from "@/components/UserDropdown";
import { UserIcon, SettingsIcon, CourseIcon, PaymentIcon, LogoutIcon, ThemeIcon } from "@/components/Icons";

interface UserProfile {
  id: string;
  email: string;
  theme_preference: string | null;
  profile_photo_url: string | null;
}

export default function ThemePage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<string>("system");
  
  const router = useRouter();
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setIsLoading(true);
        
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          router.push("/");
          return;
        }
        
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          router.push("/");
          return;
        }
        
        const { data: profileData, error: profileError } = await supabase
          .from("users")
          .select("id, email, theme_preference, profile_photo_url")
          .eq("id", userData.user.id)
          .single();
          
        if (profileError || !profileData) {
          setErrorMessage("Failed to load profile");
          return;
        }
        
        setUserProfile(profileData as UserProfile);
        setSelectedTheme(profileData.theme_preference || "system");
      } catch (error) {
        console.error("Error fetching profile:", error);
        setErrorMessage("An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [router, supabase]);
  
  const handleThemeChange = async (theme: string) => {
    if (!userProfile) return;
    
    try {
      setIsSaving(true);
      setSelectedTheme(theme);
      
      // Apply theme to document
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        // System preference
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      
      // Update in database
      const { error } = await supabase
        .from('users')
        .update({ theme_preference: theme })
        .eq('id', userProfile.id);
        
      if (error) {
        throw error;
      }
      
      setSuccessMessage(`Theme updated to ${theme}`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error updating theme:", error);
      setErrorMessage("Failed to update theme preference");
      
      // Clear error message after 3 seconds
      setTimeout(() => setErrorMessage(""), 3000);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleLogout = async () => {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (response.ok) {
      router.push("/");
    } else {
      console.error("Logout failed");
    }
  };
  
  // Dropdown menu items for header
  const dropdownItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <CourseIcon className="h-4 w-4" />,
    },
    {
      label: "Profile",
      href: "/profile",
      icon: <UserIcon className="h-4 w-4" />,
    },
    {
      label: "Settings",
      href: "/settings",
      icon: <SettingsIcon className="h-4 w-4" />,
    },
    {
        label: "Divider",
      divider: true,
    },
    {
      label: "Logout",
      onClick: handleLogout,
      icon: <LogoutIcon className="h-4 w-4" />,
      danger: true,
    },
  ];
  
  if (isLoading) {
    return (
      <div className="ios-container flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading theme settings...</p>
        </div>
      </div>
    );
  }
  
  if (!userProfile) {
    return (
      <div className="ios-container flex items-center justify-center h-screen">
        <div className="ios-card text-center">
          <p className="text-gray-800 mb-4">Unable to load theme settings</p>
          <button 
            onClick={() => router.push("/dashboard")}
            className="ios-button ios-button-primary"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="ios-center-container">
      {/* Header */}
      <div className="ios-header mb-6">
        <Link href="/dashboard" className="text-primary flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-1">
            <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
          </svg>
          Dashboard
        </Link>
        <UserDropdown 
          userEmail={userProfile.email}
          userPhotoUrl={userProfile.profile_photo_url || undefined}
          items={dropdownItems}
        />
      </div>
      
      <div className="ios-animate-in">
        <div className="md:grid md:grid-cols-12 md:gap-6">
          <div className="md:col-span-8 lg:col-span-9">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">Theme Preferences</h1>
              <Link href="/profile" className="text-sm text-primary">
                Back to Profile
              </Link>
            </div>
            
            {successMessage && (
              <div className="mb-6 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md">
                {successMessage}
              </div>
            )}
            
            {errorMessage && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
                {errorMessage}
              </div>
            )}
            
            <div className="ios-card mb-6">
              <h2 className="text-lg font-semibold mb-6">Select Theme</h2>
              
              <div className="md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* System Default Option */}
                <div 
                  className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                    selectedTheme === 'system' 
                      ? 'border-primary bg-purple-50 dark:bg-purple-900/10' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleThemeChange('system')}
                >
                  <div className="flex items-center">
                    <div className="mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M4 5h16v14H4V5zm1 2v10h14V7H5zm6.5 8a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">System Default</h3>
                      <p className="text-sm text-gray-500">
                        Automatically match your device's theme settings
                      </p>
                    </div>
                    {selectedTheme === 'system' && (
                      <div className="h-6 w-6 bg-primary rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Light Theme Option */}
                <div 
                  className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                    selectedTheme === 'light' 
                      ? 'border-primary bg-purple-50 dark:bg-purple-900/10' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleThemeChange('light')}
                >
                  <div className="flex items-center">
                    <div className="mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 18a6 6 0 100-12 6 6 0 000 12zM11 1h2v3h-2V1zm0 19h2v3h-2v-3zM3.515 4.929l1.414-1.414L7.05 5.636 5.636 7.05 3.515 4.93zM16.95 18.364l1.414-1.414 2.121 2.121-1.414 1.414-2.121-2.121zm2.121-14.85l1.414 1.415-2.121 2.121-1.414-1.414 2.121-2.121zM5.636 16.95l1.414 1.414-2.121 2.121-1.414-1.414 2.121-2.121zM23 11v2h-3v-2h3zM4 11v2H1v-2h3z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">Light Mode</h3>
                      <p className="text-sm text-gray-500">
                        Use light theme all the time
                      </p>
                    </div>
                    {selectedTheme === 'light' && (
                      <div className="h-6 w-6 bg-primary rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Dark Theme Option */}
                <div 
                  className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                    selectedTheme === 'dark' 
                      ? 'border-primary bg-purple-50 dark:bg-purple-900/10' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleThemeChange('dark')}
                >
                  <div className="flex items-center">
                    <div className="mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 11.807A9.002 9.002 0 0110.049 2a9.942 9.942 0 00-5.12 2.735c-3.905 3.905-3.905 10.237 0 14.142 3.906 3.906 10.237 3.905 14.143 0a9.946 9.946 0 002.735-5.119A9.003 9.003 0 0112 11.807z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">Dark Mode</h3>
                      <p className="text-sm text-gray-500">
                        Use dark theme all the time
                      </p>
                    </div>
                    {selectedTheme === 'dark' && (
                      <div className="h-6 w-6 bg-primary rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 text-sm text-gray-500">
                <p>Your theme preference will be saved and applied across all your devices when you're logged in.</p>
              </div>
            </div>
          </div>
          
          <div className="md:col-span-4 lg:col-span-3">
            <div className="ios-card mb-6">
              <h2 className="text-lg font-semibold mb-4">Theme Settings</h2>
              <p className="text-sm text-gray-500 mb-4">
                Your theme preference affects how the application appears across all your devices when you're logged in.
              </p>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>System: Uses your device's light/dark mode settings</p>
                </div>
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>Light: Always uses light mode regardless of device settings</p>
                </div>
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>Dark: Always uses dark mode regardless of device settings</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}