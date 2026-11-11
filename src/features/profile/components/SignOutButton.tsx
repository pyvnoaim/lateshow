"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { buttonStyles } from "@/components/ui/button";
import { authClient } from "@/lib/authClient";

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await authClient.signOut();
          router.push("/");
          router.refresh();
        })
      }
      className={buttonStyles("text", "text")}
    >
      Sign out
    </button>
  );
}
