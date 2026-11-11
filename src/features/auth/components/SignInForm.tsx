"use client";

import { Check, Fingerprint, Mail, ScanFace } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { buttonStyles } from "@/components/ui/button";
import { fieldInputStyles, fieldStyles } from "@/components/ui/field";
import { authClient } from "@/lib/authClient";
import { mailApp } from "@/features/auth/mailApp";
import { passkeyLabel } from "@/features/auth/passkeyLabel";
import { HAS_PASSKEY, NO_PASSKEY, recall, remember } from "@/lib/passkeyHint";

const RESEND_SECONDS = 30;
const TOO_MANY_FOR_ADDRESS = "Too many codes for this address"; // auth.ts sends exactly this

// What this browser can do, read once in the browser (the server renders the plain email step).
// A string, so React sees the same snapshot every time.
const browserSnapshot = () =>
  [
    typeof window.PublicKeyCredential !== "undefined" ? "1" : "",
    recall(HAS_PASSKEY) ? "1" : "",
    passkeyLabel(navigator.userAgent, navigator.maxTouchPoints),
  ].join("|");
const noSubscribe = () => () => {};

/**
 * Sign in: email, then the 6 digit code from the email (typed on this device, so it signs in this device).
 * Afterwards, where the browser can, it offers a passkey so next time is one tap. Coming back with a passkey on this
 * browser: "Welcome back" and one button, the email field also offers the passkey like a saved password.
 */
export function SignInForm({
  minutes,
  next,
  heading,
  intro = "No password. We email you a code.",
}: {
  minutes: number;
  /** Where to go after signing in (already checked to be a path on this site). */
  next: string;
  /** Replaces "Everything you watch. One place." (the invite page says who invited you). */
  heading?: ReactNode;
  intro?: string;
}) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [bad, setBad] = useState(false);
  const [phase, setPhase] = useState<"form" | "offer" | "done">("form");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [wait, setWait] = useState(0);
  const [canFlag, hasFlag, browserLabel] = useSyncExternalStore(noSubscribe, browserSnapshot, () => "||").split("|");
  const canPasskey = canFlag === "1";
  const returning = canPasskey && hasFlag === "1";
  const label = browserLabel || "your passkey";
  // Touch ID / Face ID get their own name and icon, anything else is "a passkey"
  const named = label !== "your passkey";
  const PasskeyIcon = label === "Touch ID" ? Fingerprint : ScanFace;
  const emailInput = useRef<HTMLInputElement>(null);
  const codeInput = useRef<HTMLInputElement>(null);

  const go = () => window.location.assign(next); // a full load, so every part of the page sees the new session

  // The email field offers a saved passkey like a saved password (conditional UI), where the browser can.
  // Again after the big button: WebAuthn runs one request at a time, so that one cancelled this.
  function autofill() {
    if (typeof window.PublicKeyCredential === "undefined") return;
    void PublicKeyCredential.isConditionalMediationAvailable?.().then((ok) => {
      if (ok) void authClient.signIn.passkey({ autoFill: true }).then((r) => !r?.error && go());
    });
  }

  useEffect(() => {
    // Ready to type on computers. Not on phones: the keyboard would cover the page before you've seen it.
    if (matchMedia("(hover: hover) and (pointer: fine)").matches) emailInput.current?.focus();
    autofill();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on arrival
  }, []);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function send(to: string) {
    setPending(true);
    setError("");
    const res = await authClient.emailOtp.sendVerificationOtp({ email: to, type: "sign-in" });
    setPending(false);
    // Codes for this address went out recently (maybe not by you): the newest one in the inbox still works,
    // so go to the code step instead of a dead end. A stranger asking for codes can't lock you out.
    if (res.error?.message === TOO_MANY_FOR_ADDRESS) {
      setSentTo(to);
      setCode("");
      setBad(false);
      setWait(RESEND_SECONDS);
      setError("Codes went to this address a moment ago. Use the newest one.");
      return;
    }
    if (res.error) {
      setError(
        res.error.status === 429
          ? "Too many tries. Wait a minute and try again."
          : "That didn't go out. Check the address and try again.",
      );
      return;
    }
    setSentTo(to);
    setCode("");
    setBad(false);
    setWait(RESEND_SECONDS);
    setTimeout(() => codeInput.current?.focus(), 50);
  }

  async function check(otp: string) {
    if (!sentTo) return;
    setPending(true);
    const res = await authClient.signIn.emailOtp({ email: sentTo, otp });
    setPending(false);
    if (res.error) {
      setBad(true);
      setError(
        res.error.status === 429
          ? "Too many tries. Wait a minute and try again."
          : /attempt/i.test(res.error.message ?? "")
            ? "Too many wrong tries. Send a new code."
            : "That code doesn't match. Check the newest email, or send a new one.",
      );
      return;
    }
    setError("");
    if (canPasskey && !recall(HAS_PASSKEY) && !recall(NO_PASSKEY)) setPhase("offer");
    else {
      setPhase("done");
      go();
    }
  }

  function typed(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (bad) {
      setBad(false);
      setError("");
    }
    if (digits.length === 6) void check(digits);
  }

  async function addPasskey() {
    setPending(true);
    const res = await authClient.passkey.addPasskey();
    setPending(false);
    if (!res?.error) remember(HAS_PASSKEY);
    go();
  }

  async function passkeySignIn() {
    setError("");
    const res = await authClient.signIn.passkey();
    if (res?.error) {
      setError(`That didn't work. Use ${label} again, or get a code by email.`);
      autofill();
    } else go();
  }

  if (phase === "offer" || phase === "done") {
    return (
      <div className="flex rise flex-col gap-10">
        <span className="flex size-16 pop items-center justify-center rounded-full glass-accent">
          <Check size={28} strokeWidth={2.5} aria-hidden />
        </span>
        <div className="flex flex-col gap-6">
          <h1 className="text-page leading-none font-bold">
            You&apos;re in.
            <br />
            <span className="text-muted">
              {phase === "offer" ? `${named ? label : "A passkey"} next time?` : "Taking you back."}
            </span>
          </h1>
          {phase === "offer" && (
            <p className="text-body leading-normal text-muted">
              This device remembers you, so coming back
              <br />
              is one tap. No codes, no passwords.
            </p>
          )}
        </div>
        {phase === "offer" && (
          <div className="flex items-center gap-6">
            <button
              type="button"
              disabled={pending}
              onClick={() => void addPasskey()}
              className={buttonStyles("primary", "sm")}
            >
              <PasskeyIcon size={18} strokeWidth={1.75} aria-hidden />
              {named ? `Use ${label}` : "Save a passkey"}
            </button>
            <button
              type="button"
              onClick={() => {
                remember(NO_PASSKEY);
                go();
              }}
              className={buttonStyles("text", "text")}
            >
              Not now
            </button>
          </div>
        )}
      </div>
    );
  }

  if (sentTo) {
    const app = mailApp(sentTo);
    const boxes = Array.from({ length: 6 }, (_, i) => code[i] ?? "");
    return (
      <div className="flex rise flex-col gap-12">
        <div className="flex flex-col gap-6">
          <h1 className="text-page leading-none font-bold">
            Check your
            <br />
            <span className="text-muted">email.</span>
          </h1>
          <p className="text-body leading-normal break-words text-muted">
            Type the 6 digits we sent to <span className="text-fg">{sentTo}</span>.
            <br />
            The code works for {minutes} minutes.
            <br />
            {/* a young sending domain lands in Gmail's spam at first */}
            Nothing there? Check your spam folder.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          {/* one real input under six boxes: one-time-code autofill, paste and screen readers all just work */}
          <div className={`relative flex w-fit gap-2 sm:gap-2.5 ${bad ? "shake" : ""}`}>
            {boxes.map((d, i) => (
              <span
                key={i}
                aria-hidden
                className={`flex h-14 w-11 items-center justify-center rounded-thumb glass-cell text-section font-bold nums sm:h-17 sm:w-14 ${i === 3 ? "ml-2 sm:ml-2.5" : ""} ${bad ? "ring-1 ring-danger ring-inset" : i === code.length ? "ring-1 ring-fg/45 ring-inset" : ""}`}
              >
                {d}
              </span>
            ))}
            <label htmlFor="otp" className="sr-only">
              6 digit code
            </label>
            <input
              ref={codeInput}
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              // no maxLength: the email shows "951 456", and a cap of 6 would cut the pasted space version short.
              // typed() keeps the first 6 digits anyway.
              value={code}
              disabled={pending}
              onChange={(e) => typed(e.target.value)}
              className="absolute inset-0 cursor-text opacity-0"
            />
          </div>
          {error && (
            <p role="alert" className="text-caption text-danger">
              {error}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-muted">
          {app && (
            <a href={app.url} target="_blank" rel="noopener noreferrer" className={buttonStyles("glass", "sm")}>
              Open {app.name}
            </a>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              void navigator.clipboard
                .readText()
                .then(typed)
                .catch(() => codeInput.current?.focus())
            }
            className={buttonStyles("text", "text")}
          >
            Paste code
          </button>
          <button type="button" onClick={() => setSentTo(null)} className={buttonStyles("text", "text")}>
            Different email
          </button>
          <button
            type="button"
            disabled={wait > 0 || pending}
            onClick={() => void send(sentTo)}
            className={buttonStyles("text", "text")}
          >
            {wait > 0 ? <span className="nums">Send again in {wait} s</span> : "Send a new code"}
          </button>
        </div>
      </div>
    );
  }

  const emailForm = (
    <form onSubmit={(e: FormEvent) => (e.preventDefault(), void send(email.trim()))} className={fieldStyles("lg")}>
      <Mail size={18} strokeWidth={1.75} aria-hidden />
      <label htmlFor="email" className="sr-only">
        Email
      </label>
      <input
        ref={emailInput}
        id="email"
        type="email"
        required
        autoComplete="username webauthn"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={fieldInputStyles}
      />
      <button type="submit" disabled={pending} className={buttonStyles(returning ? "glass" : "primary", "sm")}>
        {pending ? "Sending" : "Email me a code"}
      </button>
    </form>
  );

  return (
    <div className="flex rise flex-col gap-14">
      <div className="flex flex-col gap-6">
        <h1 className="text-page leading-none font-bold">
          {heading ??
            (returning ? (
              <>
                Welcome
                <br />
                <span className="text-muted">back.</span>
              </>
            ) : (
              <>
                Everything
                <br />
                you watch.
                <br />
                <span className="text-muted">One place.</span>
              </>
            ))}
        </h1>
        <p className="text-body leading-normal text-muted">
          {returning && !heading ? `One tap with ${label} on this device.` : intro}
        </p>
      </div>
      <div className="flex flex-col gap-4">
        {returning && (
          <>
            <button
              type="button"
              onClick={() => void passkeySignIn()}
              className={buttonStyles("primary", "md", "w-full")}
            >
              <PasskeyIcon size={20} strokeWidth={1.75} aria-hidden />
              Sign in with {label}
            </button>
            <span className="flex items-center gap-4 text-caption text-muted">
              <span className="h-px flex-1 bg-hairline" />
              or
              <span className="h-px flex-1 bg-hairline" />
            </span>
          </>
        )}
        {emailForm}
        {error && (
          <p role="alert" className="text-caption text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
