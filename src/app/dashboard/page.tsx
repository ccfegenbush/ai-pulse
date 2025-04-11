"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Database } from "@/types/supabase";
import { loadStripe } from "@stripe/stripe-js";
import UserDropdown from "@/components/UserDropdown";
import {
  UserIcon,
  SettingsIcon,
  CourseIcon,
  PaymentIcon,
  LogoutIcon,
  ThemeIcon,
} from "@/components/Icons";

// Add a new interface for user activity
// Define a type for activity data
interface ActivityData {
  source?: string;
  [key: string]: unknown; // Allow additional properties while being more specific than 'any'
}

interface UserActivity {
  id: string;
  user_id: string;
  activity_type: string;
  created_at: string;
  activity_data: ActivityData;
}

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
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [activityDates, setActivityDates] = useState<Set<string>>(new Set());

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
        const { data: userCoursesData, error: userCoursesError } =
          await supabase
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

        // After fetching user data, also fetch the user's activity
        if (user && user.user) {
          const { data: activityData, error: activityError } = await supabase
            .from("user_activity")
            .select("*")
            .eq("user_id", user.user.id)
            .order("created_at", { ascending: false })
            .limit(100); // Limit to recent activities

          if (!activityError && activityData) {
            setUserActivity(activityData as UserActivity[]);

            // Extract dates for the activity calendar
            const dates = new Set<string>();
            activityData.forEach((activity) => {
              // Format date as YYYY-MM-DD for easy comparison
              const date = new Date(activity.created_at)
                .toISOString()
                .split("T")[0];
              dates.add(date);
            });
            setActivityDates(dates);
          }
        }

        setUserData(fetchedUserData as UserData);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Log activity for current session
    logUserActivity();
  }, [router, supabase]);

  // Function to log user activity for the current session
  const logUserActivity = async () => {
    const { data: sessionData } = await supabase.auth.getSession();

    if (sessionData.session && sessionData.session.user) {
      // Log a "login" activity for today
      await supabase.from("user_activity").insert({
        user_id: sessionData.session.user.id,
        activity_type: "dashboard_visit",
        activity_data: { source: "dashboard" },
      });
    }
  };

  // Function to generate activity calendar data
  const generateActivityCalendar = () => {
    const calendar = [];
    const today = new Date();

    // Generate dates for the past 28 days (4 weeks)
    for (let i = 27; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      // Format as YYYY-MM-DD
      const dateStr = date.toISOString().split("T")[0];

      // Check if user was active on this date
      const isActive = activityDates.has(dateStr);

      calendar.push({
        date: dateStr,
        isActive: isActive,
      });
    }

    return calendar;
  };

  const calculateStreak = (): number => {
    if (!userData || !userData.current_path) return 0;
    const currentPathProgress = userCourses.find(
      (course) => course.path_id === userData.current_path
    );
    // Use progress if available, otherwise fall back to completed_days for backward compatibility
    return (
      currentPathProgress?.progress?.length ||
      currentPathProgress?.completed_days?.length ||
      0
    );
  };

  const calculateProgress = (): number => {
    if (!userData || !userData.current_path) return 0;
    const currentPathProgress = userCourses.find(
      (course) => course.path_id === userData.current_path
    );
    // If completion_percentage is available, use it directly
    if (
      currentPathProgress?.completion_percentage !== null &&
      currentPathProgress?.completion_percentage !== undefined
    ) {
      return currentPathProgress.completion_percentage;
    }
    // Otherwise calculate from progress or completed_days
    const completedCount =
      currentPathProgress?.progress?.length ||
      currentPathProgress?.completed_days?.length ||
      0;
    return (completedCount / 5) * 100;
  };

  // New function to determine the next day to resume for a course
  const getNextDayToResume = (userCourse: UserCourse): number => {
    if (!userCourse.progress || userCourse.progress.length === 0) {
      return 1; // Start from day 1 if no progress
    }

    // Find the maximum day completed
    const maxDayCompleted = Math.max(...userCourse.progress);

    // If they've completed all 5 days, allow them to revisit the last day
    if (maxDayCompleted >= 5) {
      return 5;
    }

    // Otherwise, go to the next day they haven't completed yet
    return maxDayCompleted + 1;
  };

  // Find most recently active course
  const getMostRecentCourse = (): { course: UserCourse; path: Path } | null => {
    if (
      !userCourses ||
      userCourses.length === 0 ||
      !paths ||
      paths.length === 0
    ) {
      return null;
    }

    // Sort courses by last activity date (most recent first)
    const sortedCourses = [...userCourses].sort((a, b) => {
      if (!a.last_activity_at) return 1;
      if (!b.last_activity_at) return -1;
      return (
        new Date(b.last_activity_at).getTime() -
        new Date(a.last_activity_at).getTime()
      );
    });

    // Find the path details for the most recent course
    const mostRecentCourse = sortedCourses[0];
    const pathDetails = paths.find((p) => p.id === mostRecentCourse.path_id);

    if (!pathDetails) return null;

    return {
      course: mostRecentCourse,
      path: pathDetails,
    };
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
  const mostRecentCourseInfo = getMostRecentCourse();
  const activityCalendar = generateActivityCalendar();

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
          {/* Left column - User stats, resume course, and paths */}
          <div className="md:col-span-8 lg:col-span-9">
            {/* User stats */}
            <div className="ios-card bg-gradient-to-br from-purple-500 to-purple-700 text-white">
              <div className="md:flex md:justify-between md:items-center">
                <div className="md:flex-1">
                  <h2 className="text-xl font-semibold mb-1">Welcome back!</h2>
                  <p className="text-sm opacity-80 mb-6 md:mb-0">
                    {userData.email}
                  </p>
                </div>

                <div className="md:flex-1 md:flex md:justify-end">
                  <div className="flex justify-between items-center mb-2 md:mr-8">
                    <span className="text-sm font-medium md:mr-4">
                      Current streak
                    </span>
                    <span className="text-xl font-bold">{streak} days</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Resume Course Section - New */}
            {mostRecentCourseInfo && (
              <div className="mt-8">
                <h2 className="text-xl font-bold mb-4">Resume Learning</h2>

                <div className="ios-card border-l-4 border-purple-500">
                  <div className="md:flex md:items-center md:justify-between">
                    <div className="flex items-center mb-4 md:mb-0">
                      <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center mr-4 shrink-0">
                        <span className="text-primary text-lg font-bold">
                          {mostRecentCourseInfo.path.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          {mostRecentCourseInfo.path.name}
                        </h3>
                        <div className="flex items-center text-sm text-gray-500">
                          <span>
                            {mostRecentCourseInfo.course.progress?.length || 0}{" "}
                            of 5 challenges completed
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col md:items-end">
                      <div className="w-full md:w-48 mb-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500">Progress</span>
                          <span className="text-gray-700 font-medium">
                            {mostRecentCourseInfo.course.completion_percentage?.toFixed(
                              0
                            ) || "0"}
                            %
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{
                              width: `${
                                mostRecentCourseInfo.course
                                  .completion_percentage || 0
                              }%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      <Link
                        href={`/challenge/${
                          mostRecentCourseInfo.path.id
                        }/${getNextDayToResume(mostRecentCourseInfo.course)}`}
                        className="ios-button ios-button-primary"
                      >
                        Resume Course
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Learning paths */}
            <h2 className="text-xl font-bold mt-8 mb-4">Learning Paths</h2>

            <div className="ios-grid">
              {paths.map((path) => {
                // Find user's course for this path
                const userCourse = userCourses.find(
                  (course) => course.path_id === path.id
                );
                const hasStarted =
                  !!userCourse && (userCourse.progress?.length || 0) > 0;
                const nextDay = userCourse ? getNextDayToResume(userCourse) : 1;

                return (
                  <Link
                    href={`/challenge/${path.id}/${nextDay}`}
                    key={path.id}
                    className="block"
                  >
                    <div className="ios-card h-full flex items-center">
                      <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center mr-4 shrink-0">
                        <span className="text-primary text-lg font-bold">
                          {path.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{path.name}</h3>
                        <div className="flex items-center">
                          <p className="text-sm text-gray-500">
                            {hasStarted
                              ? `${
                                  userCourse?.progress?.length || 0
                                } of 5 completed`
                              : `${path.challenges?.length || 0} challenges`}
                          </p>
                          {hasStarted && (
                            <div className="ml-2 h-1.5 w-16 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{
                                  width: `${
                                    userCourse?.completion_percentage || 0
                                  }%`,
                                }}
                              ></div>
                            </div>
                          )}
                        </div>
                      </div>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-gray-400 shrink-0"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right column - Subscription and stats */}
          <div className="md:col-span-4 lg:col-span-3">
            {/* Updated Activity Calendar */}
            <div className="ios-card mt-8 md:mt-0">
              <h3 className="font-semibold mb-3">Your Activity</h3>
              <div className="grid grid-cols-7 gap-1">
                {activityCalendar.map((day, i) => (
                  <div
                    key={i}
                    className={`h-7 w-full rounded cursor-pointer transition-colors ${
                      day.isActive
                        ? "bg-purple-500 hover:bg-purple-600"
                        : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                    }`}
                    title={`${day.date}${
                      day.isActive ? " - Active" : " - Inactive"
                    }`}
                  />
                ))}
              </div>
              <div className="mt-3 flex justify-between text-xs text-gray-500">
                <span>4 weeks ago</span>
                <span>Today</span>
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-primary mr-2 shrink-0 mt-0.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-gray-500 font-medium">
                    Complete daily challenges to build your streak
                  </span>
                </li>
                <li className="flex items-start">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-primary mr-2 shrink-0 mt-0.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-gray-500 font-medium">
                    Focus on one learning path at a time
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
