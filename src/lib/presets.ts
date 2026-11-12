import type { Theme } from "./schema";

export interface Preset {
  id: string;
  name: string;
  theme: Omit<Theme, "presetId" | "font"> & { font?: Theme["font"] };
}

export const PRESETS: Preset[] = [
  {
    id: "paper",
    name: "페이퍼",
    theme: {
      background: { type: "solid", color: "#F6F1E7" },
      textColor: "#1F1B16",
      button: { shape: "rounded", style: "fill", color: "#1F1B16", textColor: "#F6F1E7" },
      accentColor: "#E8572A",
    },
  },
  {
    id: "mono",
    name: "모노",
    theme: {
      background: { type: "solid", color: "#FFFFFF" },
      textColor: "#111111",
      button: { shape: "rounded", style: "outline", color: "#111111", textColor: "#111111" },
      accentColor: "#111111",
    },
  },
  {
    id: "night",
    name: "나이트",
    theme: {
      background: { type: "solid", color: "#141B2D" },
      textColor: "#E8ECF6",
      button: { shape: "rounded", style: "soft", color: "#8FA8FF", textColor: "#E8ECF6" },
      accentColor: "#8FA8FF",
    },
  },
  {
    id: "sunset",
    name: "선셋",
    theme: {
      background: { type: "gradient", from: "#FF8A3D", to: "#F2557A", angle: 160 },
      textColor: "#FFFFFF",
      button: { shape: "pill", style: "fill", color: "#FFFFFF", textColor: "#7A1F35" },
      accentColor: "#3B0A1A",
    },
  },
  {
    id: "forest",
    name: "포레스트",
    theme: {
      background: { type: "solid", color: "#1E3A2F" },
      textColor: "#F3EBD8",
      button: { shape: "rounded", style: "fill", color: "#F3EBD8", textColor: "#1E3A2F" },
      accentColor: "#E3B341",
    },
  },
  {
    id: "candy",
    name: "캔디",
    theme: {
      background: { type: "solid", color: "#FFE1EC" },
      textColor: "#3A1029",
      button: { shape: "rounded", style: "hardShadow", color: "#FFFFFF", textColor: "#3A1029" },
      accentColor: "#FF4F93",
    },
  },
  {
    id: "ocean",
    name: "오션",
    theme: {
      background: { type: "gradient", from: "#8FD3F4", to: "#1B3B6F", angle: 180 },
      textColor: "#FFFFFF",
      button: { shape: "pill", style: "soft", color: "#FFFFFF", textColor: "#FFFFFF" },
      accentColor: "#FFD166",
    },
  },
  {
    id: "brutal",
    name: "브루탈",
    theme: {
      background: { type: "solid", color: "#FFE14D" },
      textColor: "#000000",
      button: { shape: "square", style: "hardShadow", color: "#FFFFFF", textColor: "#000000" },
      accentColor: "#FF3D2E",
    },
  },
];

export function applyPreset(current: Theme, preset: Preset): Theme {
  return {
    ...current,
    ...preset.theme,
    font: preset.theme.font ?? current.font,
    presetId: preset.id,
  };
}
