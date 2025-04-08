"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Database } from "@/types/supabase";

export interface Path {
  id: string;
  name: string;
  challenges: { day: number; task: string; expectedOutput: string }[];
}

export interface UserData {
  id: string;
  email: string;
  subscription: "free" | "paid";
  current_path: string | null;
  progress: Record<string, number[]>;
}

export default function Dashboard() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [paths, setPaths] = useState<Path[]>([]);
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
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

      const { data: pathsData, error: pathsError } = await supabase
        .from("paths")
        .select("*");
      if (pathsError) {
        setPaths([]);
      } else {
        setPaths(pathsData as Path[]);
      }

      setUserData(fetchedUserData as UserData);
    };

    fetchData();
  }, [router, supabase]);

  const calculateStreak = (): number => {
    if (!userData || !userData.current_path) return 0;
    const progress = userData.progress?.[userData.current_path] || [];
    return progress.length; // Simple count for MVP
  };

  const calculateProgress = (): number => {
    if (!userData || !userData.current_path) return 0;
    const progress = userData.progress?.[userData.current_path] || [];
    return (progress.length / 5) * 100; // Assuming 5 challenges per path
  };

  const handleLogout = async () => {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (response.ok) {
      router.push("/");
    } else {
      console.error("Logout failed");
    }
  };

  if (!userData) return <p>Loading user data...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>AI Pulse Dashboard</h1>
      <p>Streak: {calculateStreak()} days</p>
      <p>Progress: {calculateProgress().toFixed(1)}%</p>
      <h2>Paths</h2>
      <ul>
        {paths.map((path) => (
          <li key={path.id}>
            <Link href={`/challenge/${path.id}/1`}>{path.name}</Link>
          </li>
        ))}
      </ul>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
