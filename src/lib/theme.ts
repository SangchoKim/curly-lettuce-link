import type { CSSProperties } from "react";
import type { FontKey, Theme } from "./schema";

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

export function readableOn(bg: string): string {
  return contrastRatio(bg, "#000000") >= contrastRatio(bg, "#FFFFFF") ? "#111111" : "#FFFFFF";
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const FONT_LABELS: Record<FontKey, string> = {
  system: "시스템 기본",
  pretendard: "프리텐다드",
  notoSansKr: "본고딕 (Noto Sans KR)",
  gowunDodum: "고운돋움",
  nanumMyeongjo: "나눔명조",
  ibmPlexSansKr: "IBM Plex Sans KR",
};

export const FONT_VARS: Record<FontKey, string> = {
  system: `-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif`,
  pretendard: "var(--font-pretendard), system-ui, sans-serif",
  notoSansKr: `"Noto Sans KR", system-ui, sans-serif`,
  gowunDodum: `"Gowun Dodum", system-ui, sans-serif`,
  nanumMyeongjo: `"Nanum Myeongjo", serif`,
  ibmPlexSansKr: `"IBM Plex Sans KR", system-ui, sans-serif`,
};

/** Google Fonts에서 런타임으로 불러오는 폰트 (선택된 것만 로드) */
const GOOGLE_FAMILIES: Partial<Record<FontKey, string>> = {
  notoSansKr: "Noto+Sans+KR:wght@400..700",
  gowunDodum: "Gowun+Dodum",
  nanumMyeongjo: "Nanum+Myeongjo:wght@400;700;800",
  ibmPlexSansKr: "IBM+Plex+Sans+KR:wght@400;500;600;700",
};

export function googleFontHref(keys: FontKey[]): string | null {
  const fams = keys.map((k) => GOOGLE_FAMILIES[k]).filter(Boolean);
  if (!fams.length) return null;
  return `https://fonts.googleapis.com/css2?${fams.map((f) => `family=${f}`).join("&")}&display=swap`;
}

export const ALL_GOOGLE_FONT_KEYS = Object.keys(GOOGLE_FAMILIES) as FontKey[];

/** 배경만 (페이지 전체 고정 레이어용) */
export function backgroundCss(theme: Theme): CSSProperties {
  const bg = theme.background;
  if (bg.type === "solid") return { background: bg.color };
  if (bg.type === "gradient") return { background: `linear-gradient(${bg.angle}deg, ${bg.from}, ${bg.to})` };
  return {
    background: `linear-gradient(rgba(0,0,0,${bg.dim}), rgba(0,0,0,${bg.dim})), url("${bg.url}") center / cover no-repeat`,
  };
}

export function themeToCssVars(theme: Theme): CSSProperties {
  const { button } = theme;
  const radius = button.shape === "square" ? "0px" : button.shape === "rounded" ? "14px" : "9999px";
  let btnBg = button.color;
  let border = "transparent";
  let shadow = "none";
  if (button.style === "outline") {
    btnBg = "transparent";
    border = button.color;
  } else if (button.style === "soft") {
    btnBg = rgba(button.color, 0.14);
  } else if (button.style === "hardShadow") {
    border = button.textColor;
    shadow = `4px 4px 0 ${button.textColor}`;
  }
  return {
    "--ml-text": theme.textColor,
    "--ml-btn-bg": btnBg,
    "--ml-btn-text": button.textColor,
    "--ml-btn-border": border,
    "--ml-btn-border-w": button.style === "hardShadow" ? "2px" : "1.5px",
    "--ml-btn-shadow": shadow,
    "--ml-btn-radius": radius,
    "--ml-accent": theme.accentColor,
    "--ml-accent-text": readableOn(theme.accentColor),
    "--ml-font": FONT_VARS[theme.font],
    "--ml-muted": rgba(theme.textColor, 0.2),
    "--ml-card": rgba(theme.textColor, 0.06),
    "--ml-surface":
      theme.background.type === "solid"
        ? theme.background.color
        : theme.background.type === "gradient"
          ? theme.background.from
          : "#000000",
  } as CSSProperties;
}

/** 버튼 글자 / 배경 대비 (soft·outline은 페이지 배경 기준) */
export function buttonContrast(theme: Theme): number {
  const { button } = theme;
  const pageBg =
    theme.background.type === "solid"
      ? theme.background.color
      : theme.background.type === "gradient"
        ? theme.background.from
        : "#000000";
  const bg = button.style === "outline" || button.style === "soft" ? pageBg : button.color;
  return contrastRatio(bg, button.textColor);
}
