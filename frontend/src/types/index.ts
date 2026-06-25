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
