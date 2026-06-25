export const getRulesByTech = (tech: string) => {
  switch (tech) {
    case "go":
      return {
        always: [
          "Run standard linter and typecheck tests before finishing task.",
          "Handle all return errors explicitly with clear logs.",
          "Compile and verify package syntax."
        ],
        askFirst: [
          "Adding third-party dependencies/external packages.",
          "Creating packages outside standard Go project conventions."
        ],
        never: [
          "Commit secrets, API keys, credentials, or `.env` files.",
          "Bypass returned error channels using blank identifier (_)."
        ]
      };
    case "node":
      return {
        always: [
          "Run npm test before declaring task completion.",
          "Verify node dependencies are stored cleanly."
        ],
        askFirst: [
          "Installing new npm package dependencies.",
          "Modifying major entry-point configurations."
        ],
        never: [
          "Commit secrets, `.env` files, or private credentials.",
          "Force push to main branches."
        ]
      };
    case "html":
      return {
        always: [
          "Verify styling layout on responsive viewports.",
          "Check relative file paths for images/scripts."
        ],
        askFirst: [
          "Copying bulky styling CDN libraries like Bootstrap or Tailwind."
        ],
        never: [
          "Hardcode full credentials, endpoints, or keys inside static files.",
          "Put inline styles directly into HTML structures."
        ]
      };
    case "powershell":
      return {
        always: [
          "Document parameters and usage inside the script headers.",
          "Gracefully handle default errors with try/catch blocks."
        ],
        askFirst: [
          "Modifying structural OS registers or registry items."
        ],
        never: [
          "Commit personal system credentials inside PowerShell execution blocks.",
          "Use script aliases (like cat or ls) within shared cmdlets."
        ]
      };
    case "nextjs":
      return {
        always: [
          "Run standard Next.js build validation (npm run build) before declaring success.",
          "Isolate client hooks under components directory."
        ],
        askFirst: [
          "Importing massive external state-management or UI animation packages."
        ],
        never: [
          "Store local keys or private keys in Git records.",
          "Render server environment variables directly in client components."
        ]
      };
    case "python":
      return {
        always: [
          "Isolate package dependencies inside local virtual environments (.venv).",
          "Run formatter (black or ruff) before submitting files."
        ],
        askFirst: [
          "Adding third-party package dependencies to requirements.txt."
        ],
        never: [
          "Commit virtual environment folders (.venv) or active user keys.",
          "Leave trailing debug prints in production code paths."
        ]
      };
    case "android":
      return {
        always: [
          "Decouple credentials and API secrets; read from local.properties only.",
          "Run lint validation before committing changes."
        ],
        askFirst: [
          "Adding third-party package dependencies to build.gradle."
        ],
        never: [
          "Commit compiled outputs (build/), SDK caches (.gradle/), or built APK assets to Git.",
          "Run synchronous networking requests directly on Main thread pathways."
        ]
      };
    default:
      return {
        always: ["Compile and run build commands", "Ensure no syntax errors exist"],
        askFirst: ["Adding massive packages"],
        never: ["Commit secrets or passwords"]
      };
  }
};
