"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Database } from "@/types/supabase";
import UserDropdown from "@/components/UserDropdown";
import {
  UserIcon,
  SettingsIcon,
  CourseIcon,
  PaymentIcon,
  LogoutIcon,
  ThemeIcon,
} from "@/components/Icons";

// Toast interface
interface Toast {
  id: string;
  message: string;
  type: "success" | "error";
}

interface UserProfile {
  id: string;
  email: string;
  name?: string | null; // Adding name field
  phone_number?: string | null; // Adding phone number field
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
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [formData, setFormData] = useState({
    notification_email: false,
    notification_push: false,
    name: "",
    email: "",
    phone_number: "",
    theme_preference: "light",
  });

  const router = useRouter();
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Add a toast with auto-removal
  const addToast = (message: string, type: "success" | "error") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto remove after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  };

  // Remove a specific toast
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setIsLoading(true);

        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          router.push("/");
          return;
        }

        const { data: userData, error: userError } =
          await supabase.auth.getUser();
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
          addToast("Failed to load profile", "error");
          return;
        }

        setUserProfile(profileData as UserProfile);
        setFormData({
          notification_email: profileData.notification_email || false,
          notification_push: profileData.notification_push || false,
          name: profileData.name || "",
          email: profileData.email || "",
          phone_number: profileData.phone_number || "",
          theme_preference: profileData.theme_preference || "light",
        });

        // Apply the theme from user preferences
        if (profileData.theme_preference) {
          applyTheme(profileData.theme_preference);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        addToast("An unexpected error occurred", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [router, supabase]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, checked, value } = e.target;

    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const applyTheme = (theme: string) => {
    // Apply theme to document
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (theme === "light") {
      document.documentElement.classList.remove("dark");
    } else if (theme === "system") {
      // Check system preference
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      if (prefersDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  const handleThemeChange = async (theme: string) => {
    if (!userProfile) return;

    setIsSaving(true);

    try {
      // Update form data
      setFormData({
        ...formData,
        theme_preference: theme,
      });

      // Apply theme immediately
      applyTheme(theme);

      // Save to database
      const { error } = await supabase
        .from("users")
        .update({
          theme_preference: theme,
        })
        .eq("id", userProfile.id);

      if (error) {
        throw error;
      }

      addToast("Theme updated successfully", "success");
    } catch (error) {
      console.error("Error updating theme:", error);
      addToast("Failed to update theme", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userProfile) return;

    setIsSaving(true);

    try {
      // Handle authentication email update if email was changed
      if (formData.email !== userProfile.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: formData.email,
        });

        if (authError) {
          throw new Error(`Email update failed: ${authError.message}`);
        }
      }

      // Update profile data in the users table
      const { error } = await supabase
        .from("users")
        .update({
          notification_email: formData.notification_email,
          notification_push: formData.notification_push,
          name: formData.name,
          phone_number: formData.phone_number,
          theme_preference: formData.theme_preference,
          // Don't update email in the profile table as it's managed by the auth service
        })
        .eq("id", userProfile.id);

      if (error) {
        throw error;
      }

      // Apply theme immediately
      applyTheme(formData.theme_preference);

      addToast("Settings updated successfully", "success");
    } catch (error) {
      console.error("Error updating settings:", error);
      addToast(
        error instanceof Error ? error.message : "Failed to update settings",
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete your account? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setIsSaving(true);

      // In a real application, this would involve a proper deletion process
      // including cleaning up all user data from your database
      const { error } = await supabase
        .from("user_courses")
        .delete()
        .eq("user_id", userProfile?.id || "");

      if (error) {
        throw error;
      }

      // Delete the user from the users table
      const { error: userDeleteError } = await supabase
        .from("users")
        .delete()
        .eq("id", userProfile?.id || "");

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
          console.warn(
            "Auth user deletion should be handled server-side:",
            authDeleteError
          );
        }
      }

      // Sign out the user
      await supabase.auth.signOut();

      router.push("/");
    } catch (error) {
      console.error("Error deleting account:", error);
      addToast("Failed to delete account", "error");
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

  // Modified to handle toggle changes directly
  const handleToggleChange = async (name: string, checked: boolean) => {
    if (!userProfile) return;

    setIsSaving(true);

    try {
      // Update form data
      setFormData({
        ...formData,
        [name]: checked,
      });

      // Update the database immediately
      const { error } = await supabase
        .from("users")
        .update({
          [name]: checked,
        })
        .eq("id", userProfile.id);

      if (error) {
        throw error;
      }

      // Show a success toast
      addToast(
        `${name === "notification_email" ? "Email" : "Push"} notifications ${
          checked ? "enabled" : "disabled"
        }`,
        "success"
      );
    } catch (error) {
      console.error("Error updating notification settings:", error);

      // Revert the form state
      setFormData({
        ...formData,
        [name]: !checked,
      });

      addToast("Failed to update notification settings", "error");
    } finally {
      setIsSaving(false);
    }
  };

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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5 mr-1"
          >
            <path
              fillRule="evenodd"
              d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z"
              clipRule="evenodd"
            />
          </svg>
          Dashboard
        </Link>
        <UserDropdown
          userEmail={userProfile.email}
          userPhotoUrl={userProfile.profile_photo_url || undefined}
          items={dropdownItems}
        />
      </div>

      <div className="ios-animate-in w-full max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Personal Information and Notification Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information Section */}
            <div className="ios-card">
              <form onSubmit={handleSubmit}>
                <h2 className="text-lg font-semibold mb-4">
                  Personal Information
                </h2>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="ios-input w-full"
                      placeholder="Your full name"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="ios-input w-full"
                      placeholder="your@email.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Changing your email will require verification of the new
                      address.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="phone_number"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone_number"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleInputChange}
                      className="ios-input w-full"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="ios-button ios-button-primary"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>

            {/* Notification Settings Section - Fixed toggle implementation */}
            <div className="ios-card">
              <h2 className="text-lg font-semibold mb-4">
                Notification Settings
              </h2>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Email Notifications</h3>
                    <p className="text-sm text-gray-500">
                      Receive updates and course information via email
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleToggleChange(
                        "notification_email",
                        !formData.notification_email
                      )
                    }
                    disabled={isSaving}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                      formData.notification_email ? "bg-primary" : "bg-gray-200"
                    }`}
                    aria-pressed={formData.notification_email}
                    aria-labelledby="email-notification-label"
                  >
                    <span className="sr-only">Toggle email notifications</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        formData.notification_email
                          ? "translate-x-5"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium" id="push-notification-label">
                      Push Notifications
                    </h3>
                    <p className="text-sm text-gray-500">
                      Receive real-time notifications in your browser
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleToggleChange(
                        "notification_push",
                        !formData.notification_push
                      )
                    }
                    disabled={isSaving}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                      formData.notification_push ? "bg-primary" : "bg-gray-200"
                    }`}
                    aria-pressed={formData.notification_push}
                    aria-labelledby="push-notification-label"
                  >
                    <span className="sr-only">Toggle push notifications</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        formData.notification_push
                          ? "translate-x-5"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Changes to notification settings are saved automatically.
                </p>
              </div>
            </div>
          </div>

          {/* Right column - Theme and Account Management */}
          <div className="lg:col-span-1 space-y-6">
            {/* Theme Preferences - Updated with inline radio buttons */}
            <div className="ios-card">
              <h2 className="text-lg font-semibold mb-4">Theme Preferences</h2>
              <p className="text-sm text-gray-600 mb-4">
                Choose your preferred theme for the AI Leap app.
              </p>

              <fieldset className="space-y-4">
                <legend className="sr-only">Theme Options</legend>

                <div className="flex items-center">
                  <input
                    id="theme-light"
                    name="theme_preference"
                    type="radio"
                    checked={formData.theme_preference === "light"}
                    onChange={() => handleThemeChange("light")}
                    className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                  />
                  <label
                    htmlFor="theme-light"
                    className="ml-3 block text-sm font-medium text-gray-700"
                  >
                    <div className="flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-5 h-5 mr-2 text-yellow-500"
                      >
                        <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                      </svg>
                      Light Mode
                    </div>
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    id="theme-dark"
                    name="theme_preference"
                    type="radio"
                    checked={formData.theme_preference === "dark"}
                    onChange={() => handleThemeChange("dark")}
                    className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                  />
                  <label
                    htmlFor="theme-dark"
                    className="ml-3 block text-sm font-medium text-gray-700"
                  >
                    <div className="flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-5 h-5 mr-2 text-indigo-600"
                      >
                        <path
                          fillRule="evenodd"
                          d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Dark Mode
                    </div>
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    id="theme-system"
                    name="theme_preference"
                    type="radio"
                    checked={formData.theme_preference === "system"}
                    onChange={() => handleThemeChange("system")}
                    className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                  />
                  <label
                    htmlFor="theme-system"
                    className="ml-3 block text-sm font-medium text-gray-700"
                  >
                    <div className="flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-5 h-5 mr-2 text-gray-600"
                      >
                        <path
                          fillRule="evenodd"
                          d="M2.25 5.25a3 3 0 013-3h13.5a3 3 0 013 3V15a3 3 0 01-3 3h-3v.257c0 .597.237 1.17.659 1.591l.621.622a.75.75 0 01-.53 1.28h-9a.75.75 0 01-.53-1.28l.621-.622a2.25 2.25 0 00.659-1.59V18h-3a3 3 0 01-3-3V5.25zm1.5 0v9.75c0 .83.67 1.5 1.5 1.5h13.5c.83 0 1.5-.67 1.5-1.5V5.25c0-.83-.67-1.5-1.5-1.5H5.25c-.83 0-1.5.67-1.5 1.5z"
                          clipRule="evenodd"
                        />
                      </svg>
                      System Default
                    </div>
                  </label>
                </div>
              </fieldset>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Changes to the theme are applied immediately.
                </p>
              </div>
            </div>

            {/* Account Management - Removed Edit Profile button */}
            <div className="ios-card">
              <h2 className="text-lg font-semibold mb-4">Account Management</h2>

              <div className="space-y-3">
                <Link href="/payment-methods">
                  <button className="ios-button ios-button-secondary w-full text-left flex items-center">
                    <PaymentIcon className="h-5 w-5 mr-2" />
                    Manage Payment Methods
                  </button>
                </Link>
              </div>

              <div className="border-t pt-6 mt-6">
                <h3 className="text-red-600 font-medium mb-3">Danger Zone</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Once you delete your account, there is no going back. Please
                  be certain.
                </p>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isSaving}
                  className="text-red-600 border border-red-300 hover:bg-red-50 px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 w-full"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 transition-all">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center justify-between p-3 rounded-md shadow-lg transition-all transform translate-y-0 fade-in ${
              toast.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
            role="alert"
          >
            <div className="flex items-center">
              {toast.type === "success" ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2 text-green-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2 text-red-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <span className="text-sm font-medium">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-4 text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
