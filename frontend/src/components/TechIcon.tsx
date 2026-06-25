import React from "react";
import { Cpu, Layers, FileCode, Smartphone, Globe, Terminal as TerminalIcon } from "lucide-react";

interface TechIconProps {
  tech: string;
  className?: string;
}

export const TechIcon: React.FC<TechIconProps> = ({ tech, className = "w-3.5 h-3.5" }) => {
  switch (tech.toLowerCase().trim()) {
    case "go": return <Cpu className={className} />;
    case "node": return <Layers className={className} />;
    case "html": return <FileCode className={className} />;
    case "python": return <Cpu className={className} />;
    case "nextjs": return <Globe className={className} />;
    case "android": return <Smartphone className={className} />;
    default: return <TerminalIcon className={className} />;
  }
};
