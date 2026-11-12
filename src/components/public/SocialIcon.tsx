import type { SocialPlatform } from "@/lib/schema";

export const SOCIAL_LABELS: Record<SocialPlatform, string> = {
  instagram: "인스타그램",
  tiktok: "틱톡",
  youtube: "유튜브",
  x: "X",
  threads: "스레드",
  github: "깃허브",
  blog: "블로그",
  email: "이메일",
  kakao: "카카오톡",
  website: "웹사이트",
};

const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function SocialIcon({ platform, size = 24 }: { platform: SocialPlatform; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": true };
  switch (platform) {
    case "instagram":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="5" {...S} />
          <circle cx="12" cy="12" r="4" {...S} />
          <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...common}>
          <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" {...S} />
          <path d="M14 3c.4 2.6 2.2 4.4 5 4.7" {...S} />
        </svg>
      );
    case "youtube":
      return (
        <svg {...common}>
          <rect x="2.5" y="5.5" width="19" height="13" rx="4" {...S} />
          <path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor" />
        </svg>
      );
    case "x":
      return (
        <svg {...common}>
          <path d="M4 4l16 16M20 4L4 20" {...S} />
        </svg>
      );
    case "threads":
      return (
        <svg {...common}>
          <path d="M16.5 11.2c-.3-2.6-2-3.9-4.3-3.9-2.6 0-4 1.8-4 4.7s1.6 4.8 4.3 4.8c2.2 0 3.6-1.2 3.6-3 0-1.9-1.6-2.8-3.4-2.8-1.6 0-2.6.8-2.6 1.9 0 1 .9 1.6 2 1.6 2.4 0 3.2-2.2 3.2-4.6" {...S} />
          <path d="M19.5 8C18.3 4.9 15.8 3 12.2 3 7 3 4 6.6 4 12s3 9 8.2 9c3.6 0 6.2-1.8 7.3-4.6" {...S} />
        </svg>
      );
    case "github":
      return (
        <svg {...common}>
          <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" {...S} />
        </svg>
      );
    case "blog":
      return (
        <svg {...common}>
          <path d="M4 20h4L19 9l-4-4L4 16z" {...S} />
          <path d="M13.5 6.5l4 4" {...S} />
        </svg>
      );
    case "email":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="3" {...S} />
          <path d="M4 7l8 6 8-6" {...S} />
        </svg>
      );
    case "kakao":
      return (
        <svg {...common}>
          <path d="M12 4C7 4 3 7.1 3 11c0 2.5 1.7 4.7 4.2 5.9L6.5 20l3.6-2.3c.6.1 1.2.1 1.9.1 5 0 9-3.1 9-7s-4-6.8-9-6.8z" {...S} />
        </svg>
      );
    case "website":
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" {...S} />
          <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" {...S} />
        </svg>
      );
  }
}
