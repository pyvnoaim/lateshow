"use client";

import { Check, Mail } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { buttonStyles } from "@/components/ui/button";
import { fieldInputStyles, fieldStyles } from "@/components/ui/field";
import { authClient } from "@/lib/authClient";
import { mailApp } from "@/features/auth/mailApp";

const RESEND_SECONDS = 30;

export function SignInForm({
  linkError,
  minutes,
  next,
}: {
  linkError: boolean;
  minutes: number;
  /** Where the link takes you after signing in (already checked to be a path on this site). */
  next: string;
}) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(linkError ? "That link expired or was already used. Get a new one below." : "");
  const [wait, setWait] = useState(0);
  const emailInput = useRef<HTMLInputElement>(null);

  // Ready to type on computers. Not on phones: the keyboard would cover the page before you've seen it.
  useEffect(() => {
    if (matchMedia("(hover: hover) and (pointer: fine)").matches) emailInput.current?.focus();
  }, []);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function send(to: string) {
    setPending(true);
    setError("");
    const res = await authClient.signIn.magicLink({
      email: to,
      callbackURL: next,
      errorCallbackURL: `/login?error=link&next=${encodeURIComponent(next)}`,
    });
    setPending(false);
    if (res.error) {
      setError(
        res.error.status === 429
          ? "Too many tries. Wait a minute and try again."
          : "That didn't work. Check the address and try again.",
      );
      return;
    }
    setSentTo(to);
    setWait(RESEND_SECONDS);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(email.trim());
  }

  if (sentTo) {
    const app = mailApp(sentTo);
    return (
      <div className="flex rise flex-col gap-14">
        <div className="flex flex-col gap-6">
          <h1 className="text-page leading-none font-bold">
            Check your
            <br />
            <span className="text-muted">inbox.</span>
          </h1>
          <p className="text-body leading-normal text-muted">We sent a link. It works for {minutes} minutes.</p>
        </div>
        <div className="flex flex-col gap-4">
          {/* the email sits where the field was, same pill */}
          <output className={fieldStyles("lg")}>
            <Check size={18} strokeWidth={2.25} aria-hidden className="shrink-0 pop text-accent" />
            <span className="min-w-0 flex-1 truncate text-label text-fg">{sentTo}</span>
            {app && (
              <a href={app.url} target="_blank" rel="noopener noreferrer" className={buttonStyles("primary", "sm")}>
                Open {app.name}
              </a>
            )}
          </output>
          {error && (
            <p role="alert" className="text-caption">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 pl-5 text-muted">
            <button type="button" onClick={() => setSentTo(null)} className={buttonStyles("text", "text")}>
              Different email
            </button>
            <span aria-hidden>·</span>
            <button
              type="button"
              disabled={wait > 0 || pending}
              onClick={() => void send(sentTo)}
              className={buttonStyles("text", "text")}
            >
              {wait > 0 ? <span className="nums">Send again in {wait} s</span> : "Send again"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex rise flex-col gap-14">
      <div className="flex flex-col gap-6">
        <h1 className="text-page leading-none font-bold">
          Everything
          <br />
          you watch.
          <br />
          <span className="text-muted">One place.</span>
        </h1>
        <p className="text-body leading-normal text-muted">No password. We email you a link.</p>
      </div>
      <div className="flex flex-col gap-4">
        <form onSubmit={onSubmit} className={fieldStyles("lg")}>
          <Mail size={18} strokeWidth={1.75} aria-hidden />
          <label htmlFor="email" className="sr-only">
            Email
          </label>
          <input
            ref={emailInput}
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldInputStyles}
          />
          <button type="submit" disabled={pending} className={buttonStyles("primary", "sm")}>
            {pending ? "Sending" : "Email me a link"}
          </button>
        </form>
        {error && (
          <p role="alert" className="text-caption">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
