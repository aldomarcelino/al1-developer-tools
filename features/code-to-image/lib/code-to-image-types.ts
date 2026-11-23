export type SupportedLanguage =
  | "typescript"
  | "javascript"
  | "python"
  | "html"
  | "css"
  | "json"
  | "yaml"
  | "sql"
  | "bash"
  | "rust"
  | "go"
  | "c"
  | "java"
  | "markdown"
  | "plaintext";

export type ThemeId =
  | "one-dark"
  | "dracula"
  | "night-owl"
  | "tokyo-night"
  | "github-dark"
  | "monokai"
  | "nord"
  | "vesper"
  | "github-light"
  | "solarized-light";

export type BackgroundId =
  | "palette"
  | "hyper"
  | "sunset"
  | "cosmic"
  | "emerald"
  | "ocean"
  | "flamingo"
  | "borealis"
  | "neon"
  | "midnight"
  | "peach"
  | "charcoal"
  | "custom"
  | "transparent";

export type WindowStyle = "macos" | "windows" | "minimal" | "none";
export type AspectRatio = "auto" | "16:9" | "1:1" | "4:5";
export type ShadowOption = "none" | "soft" | "medium" | "dramatic" | "glow";

export interface CodeTheme {
  id: ThemeId;
  name: string;
  isDark: boolean;
  background: string;
  headerBackground: string;
  headerBorder: string;
  foreground: string;
  keyword: string;
  string: string;
  number: string;
  comment: string;
  function: string;
  variable: string;
  operator: string;
  punctuation: string;
  type: string;
  tag: string;
  attribute: string;
  lineHighlight: string;
  lineNumber: string;
}

export interface BackgroundPreset {
  id: BackgroundId;
  name: string;
  css: string;
  stops: [string, string, ...string[]];
  angle: number;
  preview: string;
}

export interface CodeToImageSettings {
  code: string;
  language: SupportedLanguage;
  theme: ThemeId;
  background: BackgroundId;
  customBackground?: string;
  title: string;
  showWindowHeader: boolean;
  windowStyle: WindowStyle;
  showLineNumbers: boolean;
  startLineNumber: number;
  autoWrap?: boolean;
  padding: number;
  borderRadius: number;
  fontSize: number;
  fontFamily: "jetbrains" | "fira" | "mono";
  shadow: ShadowOption;
  aspectRatio: AspectRatio;
  watermark: string;
  showWatermark: boolean;
  scale: 1 | 2 | 3;
}

export const LANGUAGE_OPTIONS: { value: SupportedLanguage; label: string }[] = [
  { value: "typescript", label: "TypeScript (TS / TSX)" },
  { value: "javascript", label: "JavaScript (JS / JSX)" },
  { value: "python", label: "Python" },
  { value: "html", label: "HTML / XML" },
  { value: "css", label: "CSS / SCSS" },
  { value: "sql", label: "SQL" },
  { value: "json", label: "JSON" },
  { value: "yaml", label: "YAML" },
  { value: "bash", label: "Bash / Shell" },
  { value: "rust", label: "Rust" },
  { value: "go", label: "Go" },
  { value: "c", label: "C / C++" },
  { value: "java", label: "Java" },
  { value: "markdown", label: "Markdown" },
  { value: "plaintext", label: "Plain Text" },
];

export const THEMES: Record<ThemeId, CodeTheme> = {
  "one-dark": {
    id: "one-dark",
    name: "One Dark",
    isDark: true,
    background: "#282c34",
    headerBackground: "#21252b",
    headerBorder: "#181a1f",
    foreground: "#abb2bf",
    keyword: "#c678dd",
    string: "#98c379",
    number: "#d19a66",
    comment: "#5c6370",
    function: "#61afef",
    variable: "#e06c75",
    operator: "#56b6c2",
    punctuation: "#abb2bf",
    type: "#e5c07b",
    tag: "#e06c75",
    attribute: "#d19a66",
    lineHighlight: "rgba(255, 255, 255, 0.05)",
    lineNumber: "#4b5263",
  },
  dracula: {
    id: "dracula",
    name: "Dracula",
    isDark: true,
    background: "#282a36",
    headerBackground: "#21222c",
    headerBorder: "#191a21",
    foreground: "#f8f8f2",
    keyword: "#ff79c6",
    string: "#f1fa8c",
    number: "#bd93f9",
    comment: "#6272a4",
    function: "#50fa7b",
    variable: "#f8f8f2",
    operator: "#ff79c6",
    punctuation: "#f8f8f2",
    type: "#8be9fd",
    tag: "#ff79c6",
    attribute: "#50fa7b",
    lineHighlight: "rgba(255, 255, 255, 0.06)",
    lineNumber: "#6272a4",
  },
  "night-owl": {
    id: "night-owl",
    name: "Night Owl",
    isDark: true,
    background: "#011627",
    headerBackground: "#010e1a",
    headerBorder: "#0b2942",
    foreground: "#d6deeb",
    keyword: "#c792ea",
    string: "#ecc48d",
    number: "#f78c6c",
    comment: "#637777",
    function: "#82aaff",
    variable: "#addb67",
    operator: "#c792ea",
    punctuation: "#d6deeb",
    type: "#ffcb6b",
    tag: "#7fdbca",
    attribute: "#addb67",
    lineHighlight: "rgba(255, 255, 255, 0.05)",
    lineNumber: "#4b6479",
  },
  "tokyo-night": {
    id: "tokyo-night",
    name: "Tokyo Night",
    isDark: true,
    background: "#1a1b26",
    headerBackground: "#16161e",
    headerBorder: "#101014",
    foreground: "#a9b1d6",
    keyword: "#bb9af7",
    string: "#9ece6a",
    number: "#ff9e64",
    comment: "#565f89",
    function: "#7aa2f7",
    variable: "#c0caf5",
    operator: "#89ddff",
    punctuation: "#a9b1d6",
    type: "#2ac3de",
    tag: "#f7768e",
    attribute: "#73daca",
    lineHighlight: "rgba(255, 255, 255, 0.05)",
    lineNumber: "#444b71",
  },
  "github-dark": {
    id: "github-dark",
    name: "GitHub Dark",
    isDark: true,
    background: "#0d1117",
    headerBackground: "#010409",
    headerBorder: "#30363d",
    foreground: "#c9d1d9",
    keyword: "#ff7b72",
    string: "#a5d6ff",
    number: "#79c0ff",
    comment: "#8b949e",
    function: "#d2a8ff",
    variable: "#ffa657",
    operator: "#ff7b72",
    punctuation: "#c9d1d9",
    type: "#7ee787",
    tag: "#7ee787",
    attribute: "#79c0ff",
    lineHighlight: "rgba(110, 118, 129, 0.1)",
    lineNumber: "#6e7681",
  },
  monokai: {
    id: "monokai",
    name: "Monokai",
    isDark: true,
    background: "#272822",
    headerBackground: "#1e1f1c",
    headerBorder: "#141411",
    foreground: "#f8f8f2",
    keyword: "#f92672",
    string: "#e6db74",
    number: "#ae81ff",
    comment: "#75715e",
    function: "#a6e22e",
    variable: "#fd971f",
    operator: "#f92672",
    punctuation: "#f8f8f2",
    type: "#66d9ef",
    tag: "#f92672",
    attribute: "#a6e22e",
    lineHighlight: "rgba(255, 255, 255, 0.06)",
    lineNumber: "#90908a",
  },
  nord: {
    id: "nord",
    name: "Nord",
    isDark: true,
    background: "#2e3440",
    headerBackground: "#242933",
    headerBorder: "#1e222a",
    foreground: "#d8dee9",
    keyword: "#81a1c1",
    string: "#a3be8c",
    number: "#b48ead",
    comment: "#616e88",
    function: "#88c0d0",
    variable: "#eceff4",
    operator: "#81a1c1",
    punctuation: "#eceff4",
    type: "#8fbcbb",
    tag: "#81a1c1",
    attribute: "#d08770",
    lineHighlight: "rgba(255, 255, 255, 0.05)",
    lineNumber: "#4c566a",
  },
  vesper: {
    id: "vesper",
    name: "Vesper",
    isDark: true,
    background: "#101010",
    headerBackground: "#080808",
    headerBorder: "#1e1e1e",
    foreground: "#ffffff",
    keyword: "#ffc799",
    string: "#99ffe4",
    number: "#ff99aa",
    comment: "#505050",
    function: "#ffc799",
    variable: "#ffffff",
    operator: "#ff99aa",
    punctuation: "#a0a0a0",
    type: "#ffc799",
    tag: "#ff99aa",
    attribute: "#99ffe4",
    lineHighlight: "rgba(255, 255, 255, 0.05)",
    lineNumber: "#505050",
  },
  "github-light": {
    id: "github-light",
    name: "GitHub Light",
    isDark: false,
    background: "#ffffff",
    headerBackground: "#f6f8fa",
    headerBorder: "#d0d7de",
    foreground: "#24292f",
    keyword: "#cf222e",
    string: "#0a3069",
    number: "#0550ae",
    comment: "#6e7781",
    function: "#8250df",
    variable: "#953800",
    operator: "#cf222e",
    punctuation: "#24292f",
    type: "#116329",
    tag: "#116329",
    attribute: "#0550ae",
    lineHighlight: "rgba(234, 238, 242, 0.5)",
    lineNumber: "#8c959f",
  },
  "solarized-light": {
    id: "solarized-light",
    name: "Solarized Light",
    isDark: false,
    background: "#fdf6e3",
    headerBackground: "#eee8d5",
    headerBorder: "#d33682",
    foreground: "#657b83",
    keyword: "#859900",
    string: "#2aa198",
    number: "#d33682",
    comment: "#93a1a1",
    function: "#268bd2",
    variable: "#b58900",
    operator: "#859900",
    punctuation: "#586e75",
    type: "#cb4b16",
    tag: "#268bd2",
    attribute: "#657b83",
    lineHighlight: "rgba(0, 0, 0, 0.04)",
    lineNumber: "#93a1a1",
  },
};

export const BACKGROUND_PRESETS: Record<BackgroundId, BackgroundPreset> = {
  palette: {
    id: "palette",
    name: "Green Palette",
    css: "linear-gradient(140deg, #0e363c 0%, #176c4b 45%, #10b981 75%, #e1ffc1 100%)",
    stops: ["#0e363c", "#176c4b", "#10b981", "#e1ffc1"],
    angle: 140,
    preview: "#176c4b",
  },
  hyper: {
    id: "hyper",
    name: "Hyper",
    css: "linear-gradient(135deg, #8A2387 0%, #E94057 50%, #F27121 100%)",
    stops: ["#8A2387", "#E94057", "#F27121"],
    angle: 135,
    preview: "#E94057",
  },
  sunset: {
    id: "sunset",
    name: "Sunset",
    css: "linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)",
    stops: ["#ff7e5f", "#feb47b"],
    angle: 135,
    preview: "#ff7e5f",
  },
  cosmic: {
    id: "cosmic",
    name: "Cosmic",
    css: "linear-gradient(135deg, #654ea3 0%, #eaafc8 100%)",
    stops: ["#654ea3", "#eaafc8"],
    angle: 135,
    preview: "#654ea3",
  },
  emerald: {
    id: "emerald",
    name: "Emerald",
    css: "linear-gradient(135deg, #0ba360 0%, #3cba92 100%)",
    stops: ["#0ba360", "#3cba92"],
    angle: 135,
    preview: "#0ba360",
  },
  ocean: {
    id: "ocean",
    name: "Ocean",
    css: "linear-gradient(135deg, #2b5876 0%, #4e4376 100%)",
    stops: ["#2b5876", "#4e4376"],
    angle: 135,
    preview: "#2b5876",
  },
  flamingo: {
    id: "flamingo",
    name: "Flamingo",
    css: "linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)",
    stops: ["#ee0979", "#ff6a00"],
    angle: 135,
    preview: "#ee0979",
  },
  borealis: {
    id: "borealis",
    name: "Borealis",
    css: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    stops: ["#43e97b", "#38f9d7"],
    angle: 135,
    preview: "#43e97b",
  },
  neon: {
    id: "neon",
    name: "Neon Night",
    css: "linear-gradient(135deg, #000428 0%, #004e92 100%)",
    stops: ["#000428", "#004e92"],
    angle: 135,
    preview: "#004e92",
  },
  midnight: {
    id: "midnight",
    name: "Midnight",
    css: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    stops: ["#1e293b", "#0f172a"],
    angle: 135,
    preview: "#1e293b",
  },
  peach: {
    id: "peach",
    name: "Soft Peach",
    css: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
    stops: ["#ffecd2", "#fcb69f"],
    angle: 135,
    preview: "#fcb69f",
  },
  charcoal: {
    id: "charcoal",
    name: "Charcoal",
    css: "linear-gradient(135deg, #18181b 0%, #27272a 100%)",
    stops: ["#18181b", "#27272a"],
    angle: 135,
    preview: "#27272a",
  },
  custom: {
    id: "custom",
    name: "Custom Palette",
    css: "#6366f1",
    stops: ["#6366f1", "#6366f1"],
    angle: 0,
    preview: "#6366f1",
  },
  transparent: {
    id: "transparent",
    name: "Transparent",
    css: "transparent",
    stops: ["transparent", "transparent"],
    angle: 0,
    preview: "transparent",
  },
};

export const CODE_TEMPLATES: Record<string, { title: string; language: SupportedLanguage; code: string }> = {
  react: {
    title: "useDebounce.ts",
    language: "typescript",
    code: `import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}`,
  },
  python: {
    title: "fastapi_app.py",
    language: "python",
    code: `from fastapi import FastAPI, HTTPException
import httpx

app = FastAPI(title="Weather API")

@app.get("/weather/{city}")
async def get_weather(city: str):
    async with httpx.AsyncClient() as client:
        res = await client.get(f"https://api.weather.com/v1/{city}")
        if res.status_code != 200:
            raise HTTPException(status_code=404, detail="City not found")
        return res.json()`,
  },
  sql: {
    title: "monthly_revenue.sql",
    language: "sql",
    code: `SELECT 
    DATE_TRUNC('month', created_at) AS order_month,
    COUNT(DISTINCT user_id) AS active_customers,
    SUM(total_amount) AS total_revenue,
    ROUND(AVG(total_amount), 2) AS avg_order_value
FROM orders
WHERE status = 'completed'
GROUP BY 1
HAVING SUM(total_amount) > 10000
ORDER BY 1 DESC;`,
  },
  rust: {
    title: "token_bucket.rs",
    language: "rust",
    code: `pub struct RateLimiter {
    capacity: usize,
    tokens: usize,
    last_refill: Instant,
}

impl RateLimiter {
    pub fn try_acquire(&mut self) -> bool {
        self.refill();
        if self.tokens > 0 {
            self.tokens -= 1;
            true
        } else {
            false
        }
    }
}`,
  },
  css: {
    title: "glow-button.css",
    language: "css",
    code: `.glow-button {
  display: inline-flex;
  align-items: center;
  padding: 12px 24px;
  border-radius: 9999px;
  background: linear-gradient(135deg, #6366f1, #a855f7);
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 0 25px rgba(99, 102, 241, 0.5);
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.glow-button:hover {
  transform: translateY(-2px) scale(1.02);
}`,
  },
};

export const DEFAULT_SETTINGS: CodeToImageSettings = {
  code: CODE_TEMPLATES.react.code,
  language: "typescript",
  theme: "one-dark",
  background: "palette",
  customBackground: "#176c4b",
  title: "useDebounce.ts",
  showWindowHeader: true,
  windowStyle: "macos",
  showLineNumbers: true,
  startLineNumber: 1,
  autoWrap: true,
  padding: 48,
  borderRadius: 16,
  fontSize: 14,
  fontFamily: "jetbrains",
  shadow: "medium",
  aspectRatio: "auto",
  watermark: "Ramupod",
  showWatermark: false,
  scale: 2,
};
