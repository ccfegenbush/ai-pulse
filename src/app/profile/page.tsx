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
  stripe_customer_id: string | null;
}

export default function ProfilePage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  
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
      } catch (error) {
        console.error("Error fetching profile:", error);
        setErrorMessage("An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [router, supabase]);
  
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile) return;
    
    try {
      setIsSaving(true);
      
      // Upload image to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const filePath = `profile_photos/${userProfile.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);
        
      if (uploadError) {
        throw uploadError;
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
        
      // Update user profile with new photo URL
      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_photo_url: urlData.publicUrl })
        .eq('id', userProfile.id);
        
      if (updateError) {
        throw updateError;
      }
      
      // Update local state
      setUserProfile({
        ...userProfile,
        profile_photo_url: urlData.publicUrl
      });
      
      setSuccessMessage("Profile photo updated successfully");
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
      
    } catch (error) {
      console.error("Error uploading photo:", error);
      setErrorMessage("Failed to upload profile photo");
      
      // Clear error message after 3 seconds
      setTimeout(() => setErrorMessage(""), 3000);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleToggleNotification = async (type: 'email' | 'push') => {
    if (!userProfile) return;
    
    try {
      setIsSaving(true);
      
      const fieldName = type === 'email' ? 'notification_email' : 'notification_push';
      const currentValue = type === 'email' ? userProfile.notification_email : userProfile.notification_push;
      
      const { error } = await supabase
        .from('users')
        .update({ [fieldName]: !currentValue })
        .eq('id', userProfile.id);
        
      if (error) {
        throw error;
      }
      
      // Update local state
      setUserProfile({
        ...userProfile,
        [fieldName]: !currentValue
      });
      
      setSuccessMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} notifications ${!currentValue ? 'enabled' : 'disabled'}`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
      
    } catch (error) {
      console.error(`Error toggling ${type} notifications:`, error);
      setErrorMessage(`Failed to update ${type} notification preferences`);
      
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
      label: "My Courses",
      href: "/my-courses",
      icon: <CourseIcon className="h-4 w-4" />,
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
      <div className="ios-container flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading your profile...</p>
        </div>
      </div>
    );
  }
  
  if (!userProfile) {
    return (
      <div className="ios-container flex items-center justify-center min-h-screen">
        <div className="ios-card text-center">
          <p className="text-gray-800 mb-4">Unable to load profile</p>
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
    <div className="ios-container max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="ios-header flex justify-between items-center mb-6">
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
      
      <div className="ios-animate-in max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Your Profile</h1>
        
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
          <div className="flex flex-col sm:flex-row items-center">
            <div className="mb-4 sm:mb-0 sm:mr-6">
              <div className="h-20 w-20 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-md">
                {userProfile.profile_photo_url ? (
                  <img 
                    src={userProfile.profile_photo_url} 
                    alt={userProfile.email} 
                    className="h-full w-full object-cover" 
                  />
                ) : (
                  <span className="text-primary text-2xl font-medium">
                    {userProfile.email.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-semibold">{userProfile.email}</h2>
              <p className="text-sm text-gray-500 mb-3">
                {userProfile.subscription === "paid" ? "Premium Subscription" : "Free Account"}
              </p>
              
              <label className="ios-button ios-button-secondary text-sm">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={isSaving}
                />
                {isSaving ? 'Uploading...' : 'Change Profile Photo'}
              </label>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          <div className="ios-card">
            <h2 className="text-lg font-semibold mb-4">Notification Preferences</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Email Notifications</h3>
                  <p className="text-sm text-gray-500">Receive updates, tips, and reminders via email</p>
                </div>
                
                <button 
                  onClick={() => handleToggleNotification('email')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                    userProfile.notification_email ? 'bg-primary' : 'bg-gray-200'
                  }`}
                  disabled={isSaving}
                >
                  <span 
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      userProfile.notification_email ? 'translate-x-6' : 'translate-x-1'
                    }`} 
                  />
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Push Notifications</h3>
                  <p className="text-sm text-gray-500">Receive real-time notifications in your browser</p>
                </div>
                
                <button 
                  onClick={() => handleToggleNotification('push')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                    userProfile.notification_push ? 'bg-primary' : 'bg-gray-200'
                  }`}
                  disabled={isSaving}
                >
                  <span 
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      userProfile.notification_push ? 'translate-x-6' : 'translate-x-1'
                    }`} 
                  />
                </button>
              </div>
            </div>
          </div>
          
          <div className="ios-card">
            <h2 className="text-lg font-semibold mb-4">Account Settings</h2>
            
            <div className="space-y-4">
              <Link href="/settings" className="block">
                <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md -mx-2">
                  <div className="flex items-center">
                    <SettingsIcon className="text-gray-500 mr-3" />
                    <span className="font-medium">Account Settings</span>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </Link>
              
              <Link href="/payment-methods" className="block">
                <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md -mx-2">
                  <div className="flex items-center">
                    <PaymentIcon className="text-gray-500 mr-3" />
                    <span className="font-medium">Payment Methods</span>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </Link>
              
              <Link href="/theme" className="block">
                <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md -mx-2">
                  <div className="flex items-center">
                    <ThemeIcon className="text-gray-500 mr-3" />
                    <span className="font-medium">Theme Preferences</span>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </Link>
            </div>
          </div>
        </div>
        
        <div className="ios-card mt-6 border-red-200">
          <h2 className="text-lg font-semibold mb-4 text-red-600">Danger Zone</h2>
          
          <div className="space-y-4">
            <button className="text-red-600 hover:text-red-700 font-medium flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2">
                <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" />
              </svg>
              Delete My Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}