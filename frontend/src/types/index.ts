export interface Project {
  id: string;
  name: string;
  path: string;
  tech_stack: string;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  content: string;
  status: string; // pending, in_progress, completed, cancelled
  priority: string; // high, medium, low
  updated_at: string;
}

export interface Skill {
  id: string;
  project_id: string;
  name: string;
  description: string;
  trigger_pattern: string;
  execution_type: string; // script, mcp, binary
  execution_path: string;
}

export interface LogLine {
  timestamp: string;
  text: string;
  type: "system" | "success" | "error" | "info";
}

export interface GitStatus {
  is_repo: boolean;
  branch?: string;
  commit?: string;
  is_dirty?: boolean;
  dirty_count?: number;
  dirty_files?: string[];
}

export interface SystemTemplate {
  tech_stack: string;
  agents_md: string;
  plan_md: string;
}

export interface CatalogSkill {
  url: string;
  label: string;
  tech_stack: string;
  is_checked: boolean;
}

export interface ApiEndpoint {
  method: string;
  path: string;
  desc: string;
  mockParams: Record<string, string>;
  mockBody?: string;
}

export interface DbTableData {
  columns: string[];
  rows: any[][];
}

export interface Cluster {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CheckStatus {
  test_passed: boolean;
  test_output: string;
  lint_passed: boolean;
  lint_output: string;
  checked_at: string;
}

export interface ActivityEntry {
  entity_type: string;
  entity_id: string;
  project_id?: string;
  action: string;
  label?: string;
  created_at: string;
}

export type ThemeName = "neuron" | "dracula" | "nord" | "cyberpunk" | "github";
export type ThemeMode = "dark" | "light";
export type FontFamily = "jetbrains-mono" | "fira-code" | "source-code-pro" | "ibm-plex-mono" | "cascadia-code" | "roboto-mono" | "inconsolata" | "space-mono" | "ubuntu-mono" | "cousine";

export interface ThemeInfo {
  id: ThemeName;
  label: string;
  description: string;
}

export interface FontFamilyInfo {
  id: FontFamily;
  label: string;
  googleFont: string; // URL-safe Google Font family name
  previewText: string;
}

export const THEMES: ThemeInfo[] = [
  { id: "neuron", label: "Neuron (Green Terminal)", description: "Neon-green text on deep black — high contrast hacking aesthetic" },
  { id: "dracula", label: "Dracula (Purple Syntax)", description: "Warm purple/magenta accents on dark blue-grey background" },
  { id: "nord", label: "Nord (Arctic Night)", description: "Cool frost-blue grays with soft pastel syntax highlighting" },
  { id: "cyberpunk", label: "Cyberpunk 2077", description: "Electric yellow and pink neon on pure black terminal" },
  { id: "github", label: "GitHub Developer", description: "Clean developer platform — soft grays with comfortable contrast" },
];

export const FONTS: FontFamilyInfo[] = [
  { id: "jetbrains-mono", label: "JetBrains Mono", googleFont: "JetBrains+Mono", previewText: "// JetBrains: ligature-rich developer precision" },
  { id: "fira-code", label: "Fira Code", googleFont: "Fira+Code", previewText: "// Fira Code: powerful programming ligatures" },
  { id: "source-code-pro", label: "Source Code Pro", googleFont: "Source+Code+Pro", previewText: "// Source Code Pro: Adobe clean reading" },
  { id: "ibm-plex-mono", label: "IBM Plex Mono", googleFont: "IBM+Plex+Mono", previewText: "// IBM Plex Mono: corporate high-legibility" },
  { id: "cascadia-code", label: "Cascadia Code", googleFont: "Cascadia+Code", previewText: "// Cascadia Code: Windows modern terminal" },
  { id: "roboto-mono", label: "Roboto Mono", googleFont: "Roboto+Mono", previewText: "// Roboto Mono: geometric Android-native clarity" },
  { id: "inconsolata", label: "Inconsolata", googleFont: "Inconsolata", previewText: "// Inconsolata: timeless developer favorite" },
  { id: "space-mono", label: "Space Mono", googleFont: "Space+Mono", previewText: "// Space Mono: retro-futuristic fixed width" },
  { id: "ubuntu-mono", label: "Ubuntu Mono", googleFont: "Ubuntu+Mono", previewText: "// Ubuntu Mono: Linux system typeface" },
  { id: "cousine", label: "Cousine", googleFont: "Cousine", previewText: "// Cousine: ChromeOS-friendly clean mono" },
];
