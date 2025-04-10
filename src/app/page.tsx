"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Home() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const router = useRouter();
  
  const handleAuth = async () => {
    const url = isLogin ? "/api/auth/login" : "/api/auth/signup";
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (response.ok) router.push("/dashboard");
    else alert(data.error);
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero section for larger screens */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left side - Authentication */}
        <div className="w-full md:w-1/2 flex items-center justify-center">
          <div className="ios-auth-container ios-animate-in">
            <div className="flex flex-col items-center justify-center pt-10 pb-8">
              <div className="h-20 w-20 relative mb-4">
                <Image 
                  src="/globe.svg" 
                  alt="AI Leap Logo" 
                  width={80}
                  height={80}
                  className="text-primary" 
                />
              </div>
              <h1 className="text-3xl font-bold mb-1">AI Leap</h1>
              <p className="text-sm text-gray-500 mb-8">Your modern AI companion</p>
            </div>
            
            <div className="ios-card">
              <h2 className="text-xl font-semibold mb-6">
                {isLogin ? "Welcome back" : "Create account"}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="ios-input"
                  />
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="ios-input"
                  />
                </div>
              </div>
              
              <div className="mt-8">
                <button 
                  onClick={handleAuth} 
                  className="ios-button ios-button-primary w-full mb-4"
                >
                  {isLogin ? "Log in" : "Sign up"}
                </button>
                
                <button 
                  onClick={() => setIsLogin(!isLogin)} 
                  className="text-sm text-primary font-medium w-full text-center"
                >
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right side - Features (only visible on larger screens) */}
        <div className="hidden md:flex md:w-1/2 bg-purple-50 dark:bg-purple-900/30 items-center justify-center p-8">
          <div className="max-w-md">
            <h2 className="text-3xl font-bold mb-6">Accelerate your AI journey</h2>
            
            <div className="ios-grid grid-cols-1 gap-6">
              <div className="ios-feature-card">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg mb-2">Daily Challenges</h3>
                <p className="text-gray-500 text-sm">Complete daily AI challenges to build your skills progressively.</p>
              </div>
              
              <div className="ios-feature-card">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg mb-2">Multiple Learning Paths</h3>
                <p className="text-gray-500 text-sm">Choose from different AI specializations to focus your learning.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="ios-glass p-4 text-center">
        <p className="text-sm text-gray-500">
          {isLogin ? "Discover" : "Join"} the future of AI with AI Leap
        </p>
      </div>
    </div>
  );
}
