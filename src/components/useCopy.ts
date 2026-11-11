"use client";

import { useEffect, useRef, useState } from "react";

/** Copies text and says "Copied" for a moment, then goes back (the button is ready to copy again). */
export function useCopy(ms = 2000) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = (text: string) =>
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), ms);
    });
  return { copied, copy };
}
