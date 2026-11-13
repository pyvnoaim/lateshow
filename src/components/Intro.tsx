/**
 * The first moment of a visit: black, the logo with its icy light rising behind it, then the black lifts off the page.
 * Server rendered so it covers the very first paint. CSS only (globals.css, .intro): shows once per tab session,
 * never with reduced motion, and comes back as the fade into a reload after a deploy (UpdateBar).
 */
export function Intro() {
  return (
    <div aria-hidden className="intro pointer-events-none fixed inset-0 z-50 bg-bg">
      <span className="intro-light absolute size-40 rounded-full bg-accent/25 blur-3xl" />
      {/* a plain img: no next/image wrapper, it has to paint before anything hydrates */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.svg" alt="" width={72} height={72} className="intro-mark relative" />
    </div>
  );
}

/** Runs before the first paint: the intro only on the first page load of a tab. */
export const INTRO_SCRIPT = `try{if(sessionStorage.getItem("intro"))document.documentElement.dataset.intro="off";else sessionStorage.setItem("intro","1")}catch(e){}`;
