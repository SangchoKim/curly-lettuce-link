"use client";

import { useEffect, useState } from "react";

export function ShareButton({ url, title }: { url: string; title: string }) {
  const [toast, setToast] = useState<string | null>(null);
  async function onClick() {
    const target = url || window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url: target });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(target);
      setToast("링크를 복사했어요");
    } catch {
      setToast(target);
    }
    setTimeout(() => setToast(null), 2000);
  }
  return (
    <>
      <button type="button" className="ml-iconbtn" onClick={onClick} aria-label="공유하기">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3v12M7 8l5-5 5 5" />
          <path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
        </svg>
      </button>
      {toast && (
        <div className="ml-toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}

export function ViewBeacon() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem("ml_viewed")) return;
      sessionStorage.setItem("ml_viewed", "1");
    } catch {}
    const body = JSON.stringify({ ref: document.referrer || "" });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track/view", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/track/view", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
    }
  }, []);
  return null;
}

export function YoutubeFacade({
  videoId,
  format,
  title,
  preview,
}: {
  videoId: string;
  format: "video" | "shorts";
  title?: string;
  preview?: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const [thumbOk, setThumbOk] = useState(true);
  const ratio = format === "shorts" ? "9 / 16" : "16 / 9";
  return (
    <div className={`ml-yt ${format === "shorts" ? "ml-yt-shorts" : ""}`}>
      {title && <p className="ml-yt-title">{title}</p>}
      <div className="ml-yt-frame" style={{ aspectRatio: ratio }}>
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1`}
            title={title || "YouTube video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            className="ml-yt-poster"
            onClick={() => !preview && setPlaying(true)}
            aria-label={`${title || "영상"} 재생`}
          >
            {thumbOk && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
                alt=""
                loading="lazy"
                onError={() => setThumbOk(false)}
              />
            )}
            <span className="ml-yt-play" aria-hidden>
              <svg width="68" height="48" viewBox="0 0 68 48">
                <path d="M66.5 7.7a8.5 8.5 0 0 0-6-6C55.3.3 34 .3 34 .3S12.7.3 7.5 1.7a8.5 8.5 0 0 0-6 6C.1 13 .1 24 .1 24s0 11 1.4 16.3a8.5 8.5 0 0 0 6 6C12.7 47.7 34 47.7 34 47.7s21.3 0 26.5-1.4a8.5 8.5 0 0 0 6-6C67.9 35 67.9 24 67.9 24s0-11-1.4-16.3z" fill="#f00" />
                <path d="M45 24 27 14v20" fill="#fff" />
              </svg>
            </span>
          </button>
        )}
      </div>
      <a className="ml-yt-fallback" href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer">
        유튜브에서 보기
      </a>
    </div>
  );
}
