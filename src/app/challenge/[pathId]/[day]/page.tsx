import { use } from "react";
import ChallengeClient from "./client";

interface ChallengePageProps {
  params: Promise<{ pathId: string; day: string }>;
}

// This is a server component
export default function ChallengePage({ params }: ChallengePageProps) {
  // Unwrap the params promise using React.use()
  const unwrappedParams = use(params);

  return (
    <ChallengeClient
      pathId={unwrappedParams.pathId}
      day={unwrappedParams.day}
    />
  );
}
