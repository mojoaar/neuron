import { ApiEndpoint } from "../types";

export const API_ENDPOINTS: ApiEndpoint[] = [
  { 
    method: "GET", 
    path: "/api/projects", 
    desc: "Fetch all registered projects scoped under CWD",
    mockParams: {} 
  },
  { 
    method: "POST", 
    path: "/api/projects", 
    desc: "Provision and register a new technological stack project",
    mockParams: {},
    mockBody: '{\n  "name": "scaffolded-api",\n  "path": "./scaffolded-api",\n  "tech_stack": "go",\n  "skill_urls": []\n}'
  },
  { 
    method: "GET", 
    path: "/api/projects/:id/tasks", 
    desc: "List all task board TODOs for a specific project",
    mockParams: { "id": "my-go-app" } 
  },
  { 
    method: "POST", 
    path: "/api/projects/:id/tasks", 
    desc: "Append a new task/TODO to the project catalog",
    mockParams: { "id": "my-go-app" },
    mockBody: '{\n  "content": "Add unit test coverages for routing layer",\n  "priority": "high"\n}'
  },
  { 
    method: "PATCH", 
    path: "/api/projects/:id/tasks/:task_id", 
    desc: "Update status, content, or priority of a task",
    mockParams: { "id": "my-go-app", "task_id": "example-id" },
    mockBody: '{\n  "status": "in_progress"\n}'
  },
  { 
    method: "GET", 
    path: "/api/projects/:id/skills", 
    desc: "List registered project skills",
    mockParams: { "id": "my-go-app" } 
  },
  { 
    method: "POST", 
    path: "/api/projects/:id/skills", 
    desc: "Register a new conceptual skill",
    mockParams: { "id": "my-go-app" },
    mockBody: '{\n  "name": "generate-docs",\n  "description": "Compile technical schemas",\n  "trigger_pattern": "^docs$",\n  "execution_type": "script",\n  "execution_path": "make docs"\n}'
  },
  { 
    method: "POST", 
    path: "/api/projects/:id/skills/export", 
    desc: "Export skills to native project Makefile/package.json",
    mockParams: { "id": "my-go-app" } 
  },
  { 
    method: "POST", 
    path: "/api/system/mcp/setup", 
    desc: "Configure Claude/OpenCode MCP server client configs",
    mockParams: {},
    mockBody: '{\n  "client": "opencode"\n}'
  },
  { 
    method: "GET", 
    path: "/api/system/cwd", 
    desc: "Query running backend execution CWD",
    mockParams: {} 
  }
];
