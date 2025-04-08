"use client";

import { useState } from "react";
// import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
// import { Database } from "@/types/supabase"; // Generate this next

export default function Home() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLogin, setIsLogin] = useState<boolean>(true);
  // const supabase = createClientComponentClient<Database>();
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
    <div style={{ padding: "20px" }}>
      <h1>AI Pulse</h1>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        style={{ display: "block", margin: "10px 0" }}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        style={{ display: "block", margin: "10px 0" }}
      />
      <button onClick={handleAuth} style={{ marginRight: "10px" }}>
        {isLogin ? "Login" : "Signup"}
      </button>
      <button onClick={() => setIsLogin(!isLogin)}>
        Switch to {isLogin ? "Signup" : "Login"}
      </button>
    </div>
  );
}
