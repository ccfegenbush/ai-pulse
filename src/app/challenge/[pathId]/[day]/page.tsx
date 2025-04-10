"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { Database } from "@/types/supabase";
import Link from "next/link";

export interface Challenge {
  day: number;
  task: string;
  expectedOutput: string;
}

export default function ChallengePage({
  params,
}: {
  params: { pathId: string; day: string };
}) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [answer, setAnswer] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const router = useRouter();
  
  useEffect(() => {
    const fetchChallenge = async () => {
      try {
        setIsLoading(true);
        
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
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchChallenge();
  }, [params.pathId, params.day, router, supabase]);
  
  const handleSubmit = async () => {
    if (!challenge) return;
    
    try {
      setIsSubmitting(true);
      
      if (answer === challenge.expectedOutput) {
        setFeedback("Correct!");
        
        const { data: userData, error: userError } =
          await supabase.auth.getUser();
          
        if (userError || !userData.user) return;
        
        // Check if the user is already enrolled in this path
        const { data: userCourseData, error: courseError } = await supabase
          .from("user_courses")
          .select("*")
          .eq("user_id", userData.user.id)
          .eq("path_id", params.pathId)
          .single();
          
        const dayNum = parseInt(params.day);
        
        if (courseError || !userCourseData) {
          // User is not enrolled in this course yet, create a new entry
          const { error: insertError } = await supabase
            .from("user_courses")
            .insert({
              user_id: userData.user.id,
              path_id: params.pathId,
              progress: [dayNum],
              completion_percentage: (1 / 5) * 100, // Assuming 5 days per path
              enrolled_at: new Date().toISOString(),
              last_activity_at: new Date().toISOString()
            });
            
          if (insertError) {
            setFeedback("Error saving progress");
            return;
          }
        } else {
          // User is already enrolled, update their progress
          const progress = userCourseData.progress || [];
          
          if (!progress.includes(dayNum)) {
            const updatedProgress = [...progress, dayNum];
            const completionPercentage = (updatedProgress.length / 5) * 100; // Assuming 5 days per path
            
            const { error: updateError } = await supabase
              .from("user_courses")
              .update({ 
                progress: updatedProgress,
                completion_percentage: completionPercentage,
                last_activity_at: new Date().toISOString(),
                // If all 5 days are completed, set completed_at
                completed_at: updatedProgress.length === 5 ? new Date().toISOString() : userCourseData.completed_at
              })
              .eq("user_id", userData.user.id)
              .eq("path_id", params.pathId);
              
            if (updateError) {
              setFeedback("Error saving progress");
              return;
            }
          }
        }
        
        setTimeout(() => router.push("/dashboard"), 1500);
      } else {
        setFeedback("That's not quite right. Try again!");
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="ios-container flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading challenge...</p>
        </div>
      </div>
    );
  }
  
  if (!challenge) {
    return (
      <div className="ios-container flex flex-col items-center justify-center h-screen">
        <div className="ios-card text-center w-full max-w-md">
          <p className="text-gray-500 mb-4">Challenge not found</p>
          <Link href="/dashboard">
            <button className="ios-button ios-button-primary">
              Return to Dashboard
            </button>
          </Link>
        </div>
      </div>
    );
  }
  
  const dayNum = parseInt(params.day);
  
  return (
    <div className="ios-center-container">
      {/* Header */}
      <div className="ios-header mb-6">
        <Link href="/dashboard" className="text-primary">
          &larr; Dashboard
        </Link>
        <div className="text-sm font-medium text-gray-500">
          Day {dayNum}
        </div>
      </div>
      
      <div className="ios-animate-in md:grid md:grid-cols-12 md:gap-6">
        {/* Challenge content */}
        <div className="md:col-span-8 lg:col-span-9">
          <div className="ios-card mb-6">
            <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full mb-3">
              Challenge {dayNum}
            </span>
            <h1 className="text-xl md:text-2xl font-bold mb-4">{challenge.task}</h1>
            
            <div className="mt-6">
              <label htmlFor="answer" className="block text-sm font-medium text-gray-700 mb-2">
                Your Answer
              </label>
              <input
                id="answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer here"
                className="ios-input mb-4"
              />
              
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`ios-button ios-button-primary w-full md:w-auto ${isSubmitting ? 'opacity-70' : ''}`}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                    Checking...
                  </span>
                ) : (
                  'Submit Answer'
                )}
              </button>
              
              {feedback && (
                <div className={`mt-4 p-3 rounded-lg text-center font-medium ${
                  feedback === 'Correct!' 
                    ? 'bg-green-50 text-green-700' 
                    : 'bg-red-50 text-red-700'
                }`}>
                  {feedback}
                </div>
              )}
            </div>
          </div>
          
          <div className="ios-glass p-4 rounded-lg mt-4 mb-8 md:mb-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Challenge {dayNum} of 5
                </p>
                <div className="h-1 bg-gray-200 rounded-full w-32 mt-2">
                  <div 
                    className="h-full bg-primary rounded-full" 
                    style={{ width: `${(dayNum / 5) * 100}%` }}
                  ></div>
                </div>
              </div>
              {dayNum < 5 && (
                <Link href={`/challenge/${params.pathId}/${dayNum + 1}`}>
                  <button disabled className="text-sm text-gray-400">
                    Next challenge &rarr;
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>
        
        {/* Sidebar - only visible on medium screens and up */}
        <div className="hidden md:block md:col-span-4 lg:col-span-3">
          <div className="ios-card">
            <h3 className="font-semibold mb-3">Tips</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-600 dark:text-gray-300">Read the question carefully</span>
              </li>
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-600 dark:text-gray-300">Check your answer before submitting</span>
              </li>
            </ul>
          </div>
          
          <div className="ios-card mt-4">
            <h3 className="font-semibold mb-3">Challenge Navigation</h3>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => {
                const day = i + 1;
                const isCurrentDay = day === dayNum;
                
                return (
                  <Link 
                    key={day} 
                    href={`/challenge/${params.pathId}/${day}`}
                    className={`block px-3 py-2 rounded-md ${
                      isCurrentDay 
                        ? 'bg-purple-100 text-purple-700 font-medium' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    Day {day}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
