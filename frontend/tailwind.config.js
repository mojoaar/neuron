/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      colors: {
        terminal: {
          black: "var(--terminal-black)",
          dark: "var(--terminal-dark)",
          gray: "var(--terminal-gray)",
          lightGray: "var(--terminal-light-gray)",
          green: "var(--terminal-green)",
          darkGreen: "var(--terminal-dark-green)",
          cyan: "var(--terminal-cyan)",
          yellow: "var(--terminal-yellow)",
          red: "var(--terminal-red)",
          text: "var(--terminal-text)",
          muted: "var(--terminal-muted)",
          border: "var(--terminal-border)"
        }
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "blink": "blink 1s step-end infinite",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0 },
        }
      }
    },
  },
  plugins: [],
}
