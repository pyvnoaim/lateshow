"use client";

import { useEffect, useState } from "react";

/** The sticky group links beside Settings. The group taking the upper part of the screen is white, the rest grey. */
export function SettingsNav({ groups }: { groups: readonly { id: string; title: string }[] }) {
  const [current, setCurrent] = useState(groups[0]?.id);
  useEffect(() => {
    // a thin band near the top of the screen: whichever group crosses it is current
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setCurrent(e.target.id);
      },
      { rootMargin: "-30% 0px -65% 0px" },
    );
    for (const g of groups) {
      const el = document.getElementById(g.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [groups]);

  return (
    <nav aria-label="Settings" className="sticky top-page-top hidden w-side-nav shrink-0 self-start pt-32 md:block">
      <ul className="flex flex-col gap-3 text-body">
        {groups.map((g) => (
          <li key={g.id}>
            <a
              href={`#${g.id}`}
              aria-current={current === g.id ? "location" : undefined}
              className={`transition-colors duration-200 hover:text-fg ${current === g.id ? "text-fg" : "text-muted"}`}
            >
              {g.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
