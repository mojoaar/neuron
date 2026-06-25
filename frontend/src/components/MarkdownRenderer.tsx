import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Extend defaultSchema to allow checkboxes (for TODO list checklists in plan.md)
const customSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    input: [["type", "checkbox"], ["disabled", true], ["checked", true], ["checked", false]],
  },
  tagNames: [...(defaultSchema.tagNames || []), "input"],
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = "" }) => {
  return (
    <div className={`prose prose-invert prose-xs max-w-none font-mono text-[11px] leading-relaxed text-terminal-text ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, customSchema]]}
        components={{
          // Render markdown elements using our high-fidelity terminal dark-theme tokens
          h1: ({ children }) => <h1 className="text-sm font-bold text-terminal-green uppercase tracking-wider border-b border-terminal-border pb-1.5 mb-3 mt-4">[ {children} ]</h1>,
          h2: ({ children }) => <h2 className="text-[12px] font-bold text-terminal-green uppercase tracking-wider mb-2 mt-3 font-mono">{children}</h2>,
          h3: ({ children }) => <h3 className="text-[11px] font-bold text-terminal-text uppercase mb-1.5 mt-2.5 font-mono">{children}</h3>,
          p: ({ children }) => <p className="mb-2 leading-relaxed text-terminal-text">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-4 mb-3 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 mb-3 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="text-terminal-text">{children}</li>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-terminal-green hover:underline inline-flex items-center space-x-0.5">
              <span>{children}</span>
            </a>
          ),
          code: ({ className, children }) => {
            const match = /language-(\w+)/.exec(className || "");
            const inline = !match;
            return inline ? (
              <code className="bg-terminal-gray border border-terminal-border text-terminal-green px-1.5 py-0.5 rounded font-mono text-[10px] break-all">
                {children}
              </code>
            ) : (
              <pre className="bg-terminal-black border border-terminal-border p-3 rounded font-mono text-[10px] text-terminal-green overflow-x-auto my-3 leading-relaxed">
                <code>{children}</code>
              </pre>
            );
          },
          hr: () => <hr className="border-t border-terminal-border my-4" />,
          table: ({ children }) => <table className="w-full border-collapse border border-terminal-border my-3 text-[10px]">{children}</table>,
          th: ({ children }) => <th className="border border-terminal-border bg-terminal-gray p-2 text-left text-terminal-green font-bold uppercase">{children}</th>,
          td: ({ children }) => <td className="border border-terminal-border p-2 text-left">{children}</td>,
          input: ({ type, checked, disabled }) => {
            if (type === "checkbox") {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  className="mr-2 text-terminal-green bg-terminal-black border-terminal-border rounded focus:ring-0 focus:ring-offset-0"
                  readOnly
                />
              );
            }
            return null;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
