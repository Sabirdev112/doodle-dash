"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreateRoomPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center font-sketch text-xl text-doodle-muted">
      Redirecting...
    </main>
  );
}
