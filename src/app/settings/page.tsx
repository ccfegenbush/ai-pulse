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
  subscription: "free" | "paid";
  theme_preference: string | null;
  notification_email: boolean;
  notification_push: boolean;
  profile_photo_url: string | null;
}

export default function SettingsPage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [formData, setFormData] = useState({
    notification_email: false,
    notification_push: false,
  });
  
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
          .select("*")
          .eq("id", userData.user.id)
          .single();
          
        if (profileError || !profileData) {
          setErrorMessage("Failed to load profile");
          return;
        }
        
        setUserProfile(profileData as UserProfile);
        setFormData({
          notification_email: profileData.notification_email || false,
          notification_push: profileData.notification_push || false,
        });
      } catch (error) {
        console.error("Error fetching profile:", error);
        setErrorMessage("An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [router, supabase]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    
    setFormData({
      ...formData,
      [name]: checked,
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userProfile) return;
    
    setIsSaving(true);
    setSuccessMessage("");
    setErrorMessage("");
    
    try {
      const { error } = await supabase
        .from("users")
        .update({
          notification_email: formData.notification_email,
          notification_push: formData.notification_push,
        })
        .eq("id", userProfile.id);
        
      if (error) {
        throw error;
      }
      
      setSuccessMessage("Settings updated successfully");
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error updating settings:", error);
      setErrorMessage("Failed to update settings");
      
      // Clear error message after 3 seconds
      setTimeout(() => setErrorMessage(""), 3000);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return;
    }
    
    try {
      setIsSaving(true);
      
      // In a real application, this would involve a proper deletion process
      // including cleaning up all user data from your database
      const { error } = await supabase
        .from('user_courses')
        .delete()
        .eq('user_id', userProfile?.id || "");
        
      if (error) {
        throw error;
      }
      
      // Delete the user from the users table
      const { error: userDeleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', userProfile?.id || "");
        
      if (userDeleteError) {
        throw userDeleteError;
      }
      
      // Finally, delete the auth user
      if (userProfile && userProfile.id) {
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
          userProfile.id
        );
        
        if (authDeleteError) {
          // This might fail in the frontend due to permissions
          // In a real app, you'd use a server-side function for this
          console.warn("Auth user deletion should be handled server-side:", authDeleteError);
        }
      }
      
      // Sign out the user
      await supabase.auth.signOut();
      
      router.push("/");
      
    } catch (error) {
      console.error("Error deleting account:", error);
      setErrorMessage("Failed to delete account");
      
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
      label: "Payment Methods",
      href: "/payment-methods",
      icon: <PaymentIcon className="h-4 w-4" />,
    },
    {
      label: "Theme",
      href: "/theme",
      icon: <ThemeIcon className="h-4 w-4" />,
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
          <p className="text-gray-500">Loading settings...</p>
        </div>
      </div>
    );
  }
  
  if (!userProfile) {
    return (
      <div className="ios-container flex items-center justify-center h-screen">
        <div className="ios-card text-center">
          <p className="text-gray-800 mb-4">Unable to load settings</p>
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
      
      <div className="ios-animate-in max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Settings</h1>
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
          <form onSubmit={handleSubmit}>
            <h2 className="text-lg font-semibold mb-4">Notification Settings</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Email Notifications</h3>
                  <p className="text-sm text-gray-500">Receive updates and course information via email</p>
                </div>
                
                <div className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                  <input 
                    type="checkbox" 
                    name="notification_email" 
                    id="notification_email" 
                    checked={formData.notification_email}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                      formData.notification_email 
                        ? 'translate-x-5 bg-primary' 
                        : 'translate-x-0 bg-gray-200'
                    }`}
                  />
                  <label htmlFor="notification_email" className="sr-only">
                    Enable email notifications
                  </label>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Push Notifications</h3>
                  <p className="text-sm text-gray-500">Receive real-time notifications in your browser</p>
                </div>
                
                <div className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                  <input 
                    type="checkbox" 
                    name="notification_push" 
                    id="notification_push" 
                    checked={formData.notification_push}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                      formData.notification_push 
                        ? 'translate-x-5 bg-primary' 
                        : 'translate-x-0 bg-gray-200'
                    }`}
                  />
                  <label htmlFor="notification_push" className="sr-only">
                    Enable push notifications
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                type="submit"
                disabled={isSaving}
                className="ios-button ios-button-primary"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
        
        <div className="ios-card mb-6">
          <h2 className="text-lg font-semibold mb-4">Theme Preferences</h2>
          <p className="text-sm text-gray-600 mb-4">
            Customize the appearance of the AI Leap app.
          </p>
          
          <Link href="/theme">
            <button
              className="ios-button ios-button-secondary"
            >
              Change Theme Settings
            </button>
          </Link>
        </div>
        
        <div className="ios-card mb-6">
          <h2 className="text-lg font-semibold mb-4">Account Management</h2>
          
          <Link href="/payment-methods">
            <button 
              className="ios-button ios-button-secondary w-full mb-3 text-left flex items-center"
            >
              <PaymentIcon className="h-5 w-5 mr-2" />
              Manage Payment Methods
            </button>
          </Link>
          
          <Link href="/profile">
            <button 
              className="ios-button ios-button-secondary w-full mb-6 text-left flex items-center"
            >
              <UserIcon className="h-5 w-5 mr-2" />
              Edit Profile
            </button>
          </Link>
          
          <div className="border-t pt-6">
            <h3 className="text-red-600 font-medium mb-3">Danger Zone</h3>
            <p className="text-sm text-gray-600 mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button
              onClick={handleDeleteAccount}
              disabled={isSaving}
              className="text-red-600 border border-red-300 hover:bg-red-50 px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}