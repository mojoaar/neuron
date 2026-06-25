export interface TechStackInfo {
  id: string;
  label: string;
  icon: string;
}

export const TECH_STACKS: TechStackInfo[] = [
  { id: "go", label: "Go (Golang)", icon: "cpu" },
  { id: "node", label: "Node.js", icon: "layers" },
  { id: "nextjs", label: "Next.js", icon: "globe" },
  { id: "html", label: "HTML5 Static", icon: "file-code" },
  { id: "python", label: "Python", icon: "cpu" },
  { id: "android", label: "Android (Kotlin)", icon: "smartphone" },
  { id: "powershell", label: "PowerShell", icon: "terminal" },
];

export function isValidTechStack(id: string): boolean {
  return TECH_STACKS.some((stack) => stack.id === id.toLowerCase().trim());
}
