"use client";

import { Mail } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { buttonStyles } from "@/components/ui/button";
import { fieldInputStyles, fieldStyles } from "@/components/ui/field";
import { authClient } from "@/lib/authClient";

const RESEND_SECONDS = 30;

export function SignInForm({ linkError, minutes, devHint }: { linkError: boolean; minutes: number; devHint: boolean }) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(linkError ? "That link expired or was already used. Get a new one below." : "");
  const [wait, setWait] = useState(0);

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
      callbackURL: "/",
      errorCallbackURL: "/login?error=link",
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
    return (
      <div className="flex flex-col items-start gap-8">
        <div className="flex size-16 pop items-center justify-center rounded-full bg-accent text-bg">
          <Mail size={28} strokeWidth={2} aria-hidden />
        </div>
        <div className="flex rise flex-col gap-4">
          <h1 className="text-page leading-none font-bold">Check your inbox.</h1>
          <p className="text-body leading-normal text-muted">
            We sent a sign in link to <span className="text-fg">{sentTo}</span>.
            <br />
            It works for {minutes} minutes.
            {devHint && (
              <>
                <br />
                Dev mode: the link is printed in your terminal.
              </>
            )}
          </p>
        </div>
        {error && (
          <p role="alert" className="text-caption">
            {error}
          </p>
        )}
        {/* pulled left by the button padding, so the text lines up with the headline */}
        <div className="-ml-5 flex rise flex-wrap gap-1 text-muted">
          <button type="button" onClick={() => setSentTo(null)} className={buttonStyles("ghost", "sm")}>
            Use a different email
          </button>
          <button
            type="button"
            disabled={wait > 0 || pending}
            onClick={() => void send(sentTo)}
            className={buttonStyles("ghost", "sm")}
          >
            {wait > 0 ? `Send again in ${wait} s` : "Send again"}
          </button>
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
