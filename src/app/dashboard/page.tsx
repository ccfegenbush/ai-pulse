"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Database } from "@/types/supabase";
import { loadStripe } from "@stripe/stripe-js";
import UserDropdown from "@/components/UserDropdown";
import { UserIcon, SettingsIcon, CourseIcon, PaymentIcon, LogoutIcon, ThemeIcon } from "@/components/Icons";

export interface Path {
  id: string;
  name: string;
  description: string | null;
  difficulty: string | null;
  estimated_hours: number | null;
  prerequisites: string[] | null;
  tags: string[] | null;
  challenges: { day: number; task: string; expectedOutput: string }[];
}

export interface UserCourse {
  id: number;
  user_id: string;
  path_id: string;
  progress: number[] | null;
  completed_days?: number[]; // Keeping this for backward compatibility
  enrolled_at: string | null;
  completed_at: string | null;
  completion_percentage: number | null;
  last_activity_at: string | null;
}

export interface UserData {
  id: string;
  email: string;
  subscription: string | null;
  current_path?: string | null; // Not in DB schema, but keeping for compatibility
  profile_photo_url: string | null;
  notification_email: boolean | null;
  notification_push: boolean | null;
  stripe_customer_id: string | null;
  theme_preference: string | null;
  updated_at: string | null;
  user_courses?: UserCourse[];
}

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

export default function Dashboard() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userCourses, setUserCourses] = useState<UserCourse[]>([]);
  const [paths, setPaths] = useState<Path[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const router = useRouter();
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();
          
        if (sessionError || !sessionData.session) {
          router.push("/");
          return;
        }
        
        const { data: user, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user.user) {
          router.push("/");
          return;
        }
        
        const { data: fetchedUserData, error: userFetchError } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.user.id)
          .single();
          
        if (userFetchError || !fetchedUserData) {
          setUserData(null);
          return;
        }
        
        // Fetch user course progress
        const { data: userCoursesData, error: userCoursesError } = await supabase
          .from("user_courses")
          .select("*")
          .eq("user_id", user.user.id);
          
        if (!userCoursesError && userCoursesData) {
          setUserCourses(userCoursesData as UserCourse[]);
        }
        
        const { data: pathsData, error: pathsError } = await supabase
          .from("paths")
          .select("*");
          
        if (pathsError) {
          setPaths([]);
        } else {
          const filteredPaths =
            fetchedUserData.subscription === "free"
              ? (pathsData as Path[]).filter((path) => path.id === "ml-basics")
              : pathsData;
          setPaths(filteredPaths as Path[]);
        }
        
        setUserData(fetchedUserData as UserData);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [router, supabase]);
  
  const calculateStreak = (): number => {
    if (!userData || !userData.current_path) return 0;
    const currentPathProgress = userCourses.find(course => course.path_id === userData.current_path);
    // Use progress if available, otherwise fall back to completed_days for backward compatibility
    return currentPathProgress?.progress?.length || currentPathProgress?.completed_days?.length || 0;
  };
  
  const calculateProgress = (): number => {
    if (!userData || !userData.current_path) return 0;
    const currentPathProgress = userCourses.find(course => course.path_id === userData.current_path);
    // If completion_percentage is available, use it directly
    if (currentPathProgress?.completion_percentage !== null && 
        currentPathProgress?.completion_percentage !== undefined) {
      return currentPathProgress.completion_percentage;
    }
    // Otherwise calculate from progress or completed_days
    const completedCount = currentPathProgress?.progress?.length || 
                           currentPathProgress?.completed_days?.length || 0;
    return (completedCount / 5) * 100;
  };
  
  const handleLogout = async () => {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (response.ok) {
      router.push("/");
    } else {
      console.error("Logout failed");
    }
  };
  
  const handleSubscribe = async () => {
    if (!stripePromise) {
      console.error(
        "Stripe.js not initialized - missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
      );
      return;
    }
    
    const stripe = await stripePromise;
    if (!stripe) {
      console.error("Stripe.js failed to load");
      return;
    }
    
    const response = await fetch("/api/subscribe", { method: "POST" });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Failed to create checkout session: ${response.status} - ${errorText}`
      );
      return;
    }
    
    const { sessionId } = await response.json();
    const { error } = await stripe.redirectToCheckout({ sessionId });
    if (error) {
      console.error("Checkout error:", error.message);
    }
  };
  
  if (isLoading) {
    return (
      <div className="ios-container flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }
  
  if (!userData) {
    return (
      <div className="ios-container flex items-center justify-center h-screen">
        <div className="ios-card text-center">
          <p className="text-gray-500 mb-4">Unable to load user data</p>
          <button 
            onClick={() => router.push("/")}
            className="ios-button ios-button-primary"
          >
            Return to login
          </button>
        </div>
      </div>
    );
  }
  
  const streak = calculateStreak();
  const progress = calculateProgress();
  
  // Dropdown menu items
  const dropdownItems = [
    {
      label: "Profile",
      href: "/profile",
      icon: <UserIcon className="h-4 w-4" />,
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
      label: "Theme",
      href: "/theme",
      icon: <ThemeIcon className="h-4 w-4" />,
    },
    {
      label: "Payment Methods",
      href: "/payment-methods",
      icon: <PaymentIcon className="h-4 w-4" />,
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
  
  return (
    <div className="ios-center-container">
      {/* Header */}
      <div className="ios-header mb-6">
        <h1 className="text-2xl font-bold">AI Leap</h1>
        <UserDropdown 
          userEmail={userData.email}
          userPhotoUrl={userData.profile_photo_url || undefined}
          items={dropdownItems}
        />
      </div>
      
      <div className="ios-animate-in">
        <div className="md:grid md:grid-cols-12 md:gap-6">
          {/* Left column - User stats and paths */}
          <div className="md:col-span-8 lg:col-span-9">
            {/* User stats */}
            <div className="ios-card bg-gradient-to-br from-purple-500 to-purple-700 text-white">
              <div className="md:flex md:justify-between md:items-center">
                <div className="md:flex-1">
                  <h2 className="text-xl font-semibold mb-1">Welcome back!</h2>
                  <p className="text-sm opacity-80 mb-6 md:mb-0">{userData.email}</p>
                </div>
                
                <div className="md:flex-1 md:flex md:justify-end">
                  <div className="flex justify-between items-center mb-2 md:mr-8">
                    <span className="text-sm font-medium md:mr-4">Current streak</span>
                    <span className="text-xl font-bold">{streak} days</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Progress</span>
                  <span>{progress.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white rounded-full" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            {/* Learning paths */}
            <h2 className="text-xl font-bold mt-8 mb-4">Learning Paths</h2>
            
            <div className="ios-grid">
              {paths.map((path) => (
                <Link href={`/challenge/${path.id}/1`} key={path.id} className="block">
                  <div className="ios-card h-full flex items-center">
                    <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center mr-4 shrink-0">
                      <span className="text-primary text-lg font-bold">{path.name.charAt(0)}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{path.name}</h3>
                      <p className="text-sm text-gray-500">
                        {path.challenges?.length || 0} challenges
                      </p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          
          {/* Right column - Subscription and stats */}
          <div className="md:col-span-4 lg:col-span-3">
            {/* Streak Calendar (simplified) */}
            <div className="ios-card mt-8 md:mt-0">
              <h3 className="font-semibold mb-3">Your Activity</h3>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 28 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-7 w-full rounded ${i % 3 === 0 ? 'bg-purple-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                  />
                ))}
              </div>
              <div className="mt-3 flex justify-between text-xs text-gray-500">
                <span>4 weeks ago</span>
                <span>This week</span>
              </div>
            </div>
            
            {/* Subscription */}
            {userData.subscription === "free" && (
              <div className="ios-card mt-4 border-2 border-purple-200">
                <div className="flex items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Upgrade to Premium</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Get access to all learning paths and challenges
                    </p>
                    <button 
                      onClick={handleSubscribe}
                      className="ios-button ios-button-primary w-full"
                    >
                      Subscribe for $8/month
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Quick Tips */}
            <div className="ios-card mt-4">
              <h3 className="font-semibold mb-3">Quick Tips</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-500 font-medium">Complete daily challenges to build your streak</span>
                </li>
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-500 font-medium">Focus on one learning path at a time</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
