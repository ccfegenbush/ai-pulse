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
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/");
        return;
      }

      const { data: user } = await supabase.auth.getUser();
      const { data: fetchedUserData } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.user!.id)
        .single();
      const { data: pathsData } = await supabase.from("paths").select("*");

      setUserData(fetchedUserData as UserData);
      setPaths((pathsData as Path[]) || []);
    };
    fetchData();
  }, [router, supabase]);

  const calculateStreak = (): number => {
    const progress = userData?.progress?.[userData?.current_path || ""] || [];
    return progress.length; // Simple count for MVP
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  if (!userData) return <p>Loading...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>AI Pulse Dashboard</h1>
      <p>Streak: {calculateStreak()} days</p>
      <p>
        Progress:{" "}
        {((userData.progress?.[userData.current_path || ""]?.length || 0) / 5) *
          100}
        %
      </p>
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
