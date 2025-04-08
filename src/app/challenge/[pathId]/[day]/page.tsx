"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { Database } from "@/types/supabase";
import { use } from "react";

export interface Challenge {
  day: number;
  task: string;
  expectedOutput: string;
}

export default function ChallengePage({
  params: paramsPromise,
}: {
  params: Promise<{ pathId: string; day: string }>;
}) {
  const params = use(paramsPromise); // Unwrap the Promise
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [answer, setAnswer] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const router = useRouter();

  useEffect(() => {
    const fetchChallenge = async () => {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        router.push("/");
        return;
      }

      const { data, error } = await supabase
        .from("paths")
        .select("challenges")
        .eq("id", params.pathId)
        .single();

      if (error || !data || !data.challenges) {
        setChallenge(null);
        return;
      }

      const challenges = data.challenges as unknown as Challenge[];
      const dayNum = parseInt(params.day);
      const foundChallenge = challenges.find((c) => c.day === dayNum) || null;
      setChallenge(foundChallenge);
    };

    fetchChallenge();
  }, [params.pathId, params.day, router, supabase]);

  const handleSubmit = async () => {
    if (!challenge) return;

    if (answer === challenge.expectedOutput) {
      setFeedback("Correct!");
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError || !userData.user) return;

      const { data: fetchedUser, error: fetchError } = await supabase
        .from("users")
        .select("progress")
        .eq("id", userData.user.id)
        .single();

      if (fetchError || !fetchedUser) return;

      const progress: Record<string, number[]> =
        (fetchedUser.progress as Record<string, number[]>) || {};
      const pathProgress = progress[params.pathId] || [];
      const dayNum = parseInt(params.day);

      if (!pathProgress.includes(dayNum)) {
        progress[params.pathId] = [...pathProgress, dayNum];
        const { error: updateError } = await supabase
          .from("users")
          .update({ progress, current_path: params.pathId })
          .eq("id", userData.user.id);

        if (updateError) {
          setFeedback("Error saving progress");
          return;
        }
      }
      setTimeout(() => router.push("/dashboard"), 1000);
    } else {
      setFeedback("Try again.");
    }
  };

  if (!challenge) return <p>Loading or no challenge found...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>{challenge.task}</h1>
      <input
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Your answer"
        style={{ display: "block", margin: "10px 0" }}
      />
      <button onClick={handleSubmit}>Check</button>
      <p>{feedback}</p>
    </div>
  );
}
