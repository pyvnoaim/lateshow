// Runs inside Crunchyroll's player frame (static.crunchyroll.com), where its <video> plays: once a second it tells
// the Crunchyroll page around it where the video is (position, length, speed, paused). Only that page gets it, only
// these numbers. The page's Lateshow script (crunchyroll.ts) counts with them.
const TOP = "https://www.crunchyroll.com";

if (window.top !== window)
  window.setInterval(() => {
    let v: HTMLVideoElement | null = null;
    for (const el of document.querySelectorAll("video"))
      if (el.duration > 0 && (!v || el.clientWidth * el.clientHeight > v.clientWidth * v.clientHeight)) v = el;
    if (!v) return;
    window.top?.postMessage(
      { type: "lateshow:tick", at: v.currentTime, duration: v.duration, rate: v.playbackRate, paused: v.paused },
      TOP,
    );
  }, 1000);
