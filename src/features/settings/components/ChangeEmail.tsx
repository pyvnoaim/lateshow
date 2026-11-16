"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { buttonStyles } from "@/components/ui/button";
import { fieldInputStyles, fieldStyles } from "@/components/ui/field";
import { authClient } from "@/lib/authClient";

/**
 * Settings › Email: your address with Change, then the new one, then the 6 digit code sent there (Better Auth's
 * emailOTP change-email). Only then is it the address sign-in codes go to.
 */
export function ChangeEmail({ current }: { current: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"show" | "address" | "code">("show");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      if (step === "address") {
        const { error } = await authClient.emailOtp.requestEmailChange({ newEmail: email.trim() });
        if (error) return setError(error.message ?? "That address didn't work.");
        return setStep("code");
      }
      const { error } = await authClient.emailOtp.changeEmail({ newEmail: email.trim(), otp: code.trim() });
      if (error) return setError(error.message ?? "That code didn't work.");
      setStep("show");
      setCode("");
      router.refresh();
    });
  }

  if (step === "show")
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-body">{current}</p>
        <button type="button" onClick={() => setStep("address")} className={buttonStyles("glass", "xs")}>
          Change
        </button>
      </div>
    );

  return (
    <div className="flex max-w-form flex-col gap-3">
      <form onSubmit={submit} className={fieldStyles("lg")}>
        <label htmlFor="new-email" className="sr-only">
          {step === "address" ? "New email" : "Code from the new email"}
        </label>
        {step === "address" ? (
          <input
            id="new-email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            placeholder="new@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldInputStyles}
          />
        ) : (
          <input
            id="new-email"
            required
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]{6,7}"
            placeholder="6 digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={`${fieldInputStyles} nums`}
          />
        )}
        <button type="submit" disabled={pending} className={buttonStyles("primary", "sm")}>
          {step === "address" ? (pending ? "Sending" : "Send code") : pending ? "Checking" : "Confirm"}
        </button>
      </form>
      <p role={error ? "alert" : undefined} className="pl-5 text-caption text-pretty text-muted">
        {error ||
          (step === "address"
            ? "We send a code there. Your current address stays until you type it."
            : `Code sent to ${email.trim()}. Not there? It may be taken by another account.`)}
      </p>
      <button
        type="button"
        onClick={() => {
          setStep("show");
          setError("");
        }}
        className={buttonStyles("text", "text", "self-start pl-5 text-small")}
      >
        Cancel
      </button>
    </div>
  );
}
