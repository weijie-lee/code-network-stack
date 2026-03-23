/* ============================================================
   Design: Dark Terminal Hacker Aesthetic
   - Interactive packet field visualization with hover tooltips
   - Syntax-highlighted code blocks with copy functionality
   - Step-by-step experiment guide with expected output
   ============================================================ */

import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { layers, LayerData } from "@/data/layers";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal, ChevronLeft, ChevronRight, Copy, Check,
  BookOpen, Code2, FlaskConical, ExternalLink, Info,
  ChevronDown, ChevronUp, Layers
} from "lucide-react";

// ─── Packet Field Visualizer ─────────────────────────────────
function PacketVisualizer({ layer }: { layer: LayerData }) {
  const [activeField, setActiveField] = useState<number | null>(null);
  const total = layer.packetFields.reduce((s, f) => s + f.bits, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-mono text-[var(--terminal-muted)]">// 数据包结构（点击字段查看详情）</span>
      </div>

      {/* Bit-accurate packet diagram */}
      <div
        className="rounded border overflow-hidden"
        style={{ borderColor: "var(--terminal-border)", background: "#0d1117" }}
      >
        <div
          className="flex items-center justify-between px-4 py-2 border-b text-xs font-mono"
          style={{ borderColor: "var(--terminal-border)", background: "var(--terminal-surface)" }}
        >
          <span style={{ color: layer.color }}>
            {layer.name} — {layer.subtitle}
          </span>
          <span className="text-[var(--terminal-muted)]">{total} bits</span>
        </div>

        {/* Visual packet fields */}
        <div className="p-4">
          <div className="flex flex-wrap gap-0 rounded overflow-hidden border" style={{ borderColor: "var(--terminal-border)" }}>
            {layer.packetFields.map((field, i) => {
              const widthPct = Math.max((field.bits / total) * 100, 4);
              const isActive = activeField === i;
              return (
                <div
                  key={i}
                  className="packet-field flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200"
                  style={{
                    width: `${widthPct}%`,
                    minWidth: "40px",
                    background: isActive ? `${field.color}20` : `${field.color}08`,
                    borderColor: isActive ? field.color : "var(--terminal-border)",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    padding: "8px 4px",
                    boxShadow: isActive ? `0 0 10px ${field.color}40` : "none",
                  }}
                  onClick={() => setActiveField(isActive ? null : i)}
                >
                  <div className="text-xs font-mono font-semibold leading-tight" style={{ color: field.color }}>
                    {field.name}
                  </div>
                  <div className="text-xs font-mono opacity-50 mt-0.5" style={{ color: field.color }}>
                    {field.bits}b
                  </div>
                </div>
              );
            })}
          </div>

          {/* Field detail panel */}
          <AnimatePresence>
            {activeField !== null && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 rounded border p-4"
                style={{
                  borderColor: layer.packetFields[activeField].color,
                  background: `${layer.packetFields[activeField].color}08`,
                }}
              >
                <div className="flex items-start gap-3">
                  <Info size={14} style={{ color: layer.packetFields[activeField].color, flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div className="font-semibold text-sm mb-1" style={{ color: layer.packetFields[activeField].color }}>
                      {layer.packetFields[activeField].name}
                      <span className="ml-2 font-mono text-xs opacity-60">
                        ({layer.packetFields[activeField].bits} bits = {Math.ceil(layer.packetFields[activeField].bits / 8)} bytes)
                      </span>
                    </div>
                    <div className="text-sm text-[var(--terminal-text)] leading-relaxed">
                      {layer.packetFields[activeField].description}
                    </div>
                    {layer.packetFields[activeField].value && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-[var(--terminal-muted)]">示例值:</span>
                        <code
                          className="text-xs px-2 py-0.5 rounded font-mono"
                          style={{
                            background: `${layer.packetFields[activeField].color}15`,
                            color: layer.packetFields[activeField].color,
                          }}
                        >
                          {layer.packetFields[activeField].value}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Code Block with Copy ─────────────────────────────────────
function CodeBlock({ code, title, description, language }: {
  code: string; title: string; description: string; language: string;
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple syntax highlighting for C
  const highlight = (code: string) => {
    const keywords = ["int", "void", "char", "uint8_t", "uint16_t", "uint32_t", "uint64_t",
      "struct", "typedef", "enum", "if", "else", "while", "for", "return", "switch",
      "case", "break", "default", "sizeof", "static", "const", "extern", "include",
      "define", "NULL", "size_t", "ssize_t"];

    return code.split("\n").map((line, lineIdx) => {
      // Comment lines
      if (line.trim().startsWith("//") || line.trim().startsWith("*") || line.trim().startsWith("/*")) {
        return (
          <div key={lineIdx} className="text-[var(--terminal-muted)] opacity-70">
            {line}
          </div>
        );
      }
      // Preprocessor
      if (line.trim().startsWith("#")) {
        return (
          <div key={lineIdx}>
            <span style={{ color: "#c586c0" }}>{line}</span>
          </div>
        );
      }

      // Tokenize line
      const tokens = line.split(/(\b\w+\b|"[^"]*"|'[^']*'|\/\/.*|0x[0-9a-fA-F]+|\d+)/g);
      return (
        <div key={lineIdx}>
          {tokens.map((token, ti) => {
            if (keywords.includes(token)) {
              return <span key={ti} style={{ color: "#569cd6" }}>{token}</span>;
            }
            if (/^".*"$/.test(token) || /^'.*'$/.test(token)) {
              return <span key={ti} style={{ color: "#ce9178" }}>{token}</span>;
            }
            if (/^0x[0-9a-fA-F]+$/.test(token) || /^\d+$/.test(token)) {
              return <span key={ti} style={{ color: "#b5cea8" }}>{token}</span>;
            }
            if (/^[A-Z_][A-Z0-9_]{2,}$/.test(token)) {
              return <span key={ti} style={{ color: "#4fc1ff" }}>{token}</span>;
            }
            return <span key={ti} style={{ color: "var(--terminal-text)" }}>{token}</span>;
          })}
        </div>
      );
    });
  };

  return (
    <div className="rounded border overflow-hidden" style={{ borderColor: "var(--terminal-border)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{ background: "var(--terminal-surface)", borderColor: "var(--terminal-border)" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: "#ff5f57" }} />
            <div className="w-3 h-3 rounded-full" style={{ background: "#febc2e" }} />
            <div className="w-3 h-3 rounded-full" style={{ background: "#28c840" }} />
          </div>
          <span className="text-xs font-mono text-[var(--terminal-muted)]">{title}.{language}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: "rgba(0,212,255,0.1)", color: "var(--electric-blue)" }}>
            {language}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors"
            style={{ color: copied ? "var(--neon-green)" : "var(--terminal-muted)" }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "已复制" : "复制"}
          </button>
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-[var(--terminal-muted)] hover:text-white transition-colors"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Description */}
      {description && (
        <div
          className="px-4 py-2 text-xs text-[var(--terminal-muted)] border-b"
          style={{ background: "rgba(22,27,34,0.5)", borderColor: "var(--terminal-border)" }}
        >
          {description}
        </div>
      )}

      {/* Code */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="overflow-x-auto">
              <pre
                className="p-4 text-xs leading-relaxed font-mono"
                style={{ background: "#0d1117", minHeight: "80px" }}
              >
                {highlight(code)}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Experiment Steps ─────────────────────────────────────────
function ExperimentSteps({ layer }: { layer: LayerData }) {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const handleCopyCmd = (cmd: string, idx: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedStep(idx);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  return (
    <div className="space-y-3">
      {layer.experiments.map((exp, i) => {
        const isActive = activeStep === i;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded border overflow-hidden"
            style={{ borderColor: isActive ? layer.color : "var(--terminal-border)" }}
          >
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200"
              style={{
                background: isActive ? `${layer.color}10` : "rgba(22,27,34,0.6)",
              }}
              onClick={() => setActiveStep(isActive ? null : i)}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold flex-shrink-0"
                style={{
                  background: `${layer.color}20`,
                  color: layer.color,
                  border: `1px solid ${layer.color}60`,
                }}
              >
                {exp.step}
              </div>
              <span className="text-sm font-medium flex-1" style={{ color: isActive ? layer.color : "var(--terminal-text)" }}>
                {exp.title}
              </span>
              {isActive ? <ChevronUp size={14} style={{ color: layer.color }} /> : <ChevronDown size={14} className="text-[var(--terminal-muted)]" />}
            </button>

            <AnimatePresence>
              {isActive && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-3" style={{ background: "rgba(13,17,23,0.8)" }}>
                    <p className="text-sm text-[var(--terminal-muted)] leading-relaxed pt-2">
                      {exp.description}
                    </p>

                    {exp.command && (
                      <div className="rounded border overflow-hidden" style={{ borderColor: "var(--terminal-border)" }}>
                        <div
                          className="flex items-center justify-between px-3 py-1.5 border-b"
                          style={{ background: "var(--terminal-surface)", borderColor: "var(--terminal-border)" }}
                        >
                          <span className="text-xs font-mono text-[var(--terminal-muted)]">命令</span>
                          <button
                            onClick={() => handleCopyCmd(exp.command!, i)}
                            className="flex items-center gap-1 text-xs transition-colors"
                            style={{ color: copiedStep === i ? "var(--neon-green)" : "var(--terminal-muted)" }}
                          >
                            {copiedStep === i ? <Check size={11} /> : <Copy size={11} />}
                            {copiedStep === i ? "已复制" : "复制"}
                          </button>
                        </div>
                        <pre
                          className="p-3 text-xs font-mono leading-relaxed overflow-x-auto"
                          style={{ background: "#0d1117", color: "var(--neon-green)" }}
                        >
                          {exp.command}
                        </pre>
                      </div>
                    )}

                    {exp.expectedOutput && (
                      <div className="rounded border overflow-hidden" style={{ borderColor: "var(--terminal-border)" }}>
                        <div
                          className="px-3 py-1.5 border-b text-xs font-mono text-[var(--terminal-muted)]"
                          style={{ background: "var(--terminal-surface)", borderColor: "var(--terminal-border)" }}
                        >
                          预期输出
                        </div>
                        <pre
                          className="p-3 text-xs font-mono leading-relaxed overflow-x-auto"
                          style={{ background: "#0d1117", color: "var(--terminal-muted)" }}
                        >
                          {exp.expectedOutput}
                        </pre>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Main Layer Page ──────────────────────────────────────────
export default function LayerPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"theory" | "code" | "experiment">("theory");

  const layer = layers.find(l => l.id === params.id);
  const currentIndex = layers.findIndex(l => l.id === params.id);
  const prevLayer = currentIndex > 0 ? layers[currentIndex - 1] : null;
  const nextLayer = currentIndex < layers.length - 1 ? layers[currentIndex + 1] : null;

  useEffect(() => {
    setActiveTab("theory");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [params.id]);

  if (!layer) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--terminal-bg)" }}>
        <div className="text-center">
          <div className="text-[var(--neon-green)] font-mono text-lg mb-2">404</div>
          <div className="text-[var(--terminal-muted)] mb-4">协议层不存在</div>
          <button onClick={() => navigate("/")} className="text-sm text-[var(--electric-blue)] hover:underline">
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "theory", label: "理论剖析", icon: <BookOpen size={14} /> },
    { id: "code", label: "C 语言实现", icon: <Code2 size={14} /> },
    { id: "experiment", label: "实验验证", icon: <FlaskConical size={14} /> },
  ] as const;

  return (
    <div className="min-h-screen" style={{ background: "var(--terminal-bg)", fontFamily: "'Space Grotesk', sans-serif" }}>
      {/* Nav */}
      <nav
        className="sticky top-0 z-50 border-b flex items-center justify-between px-6 py-3"
        style={{
          background: "rgba(13, 17, 23, 0.95)",
          borderColor: "var(--terminal-border)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-xs text-[var(--terminal-muted)] hover:text-white transition-colors"
          >
            <Terminal size={14} className="neon-text" />
            <span className="font-mono neon-text">TCP/IP</span>
          </button>
          <span className="text-[var(--terminal-border)]">/</span>
          <span className="text-xs font-mono" style={{ color: layer.color }}>{layer.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {prevLayer && (
            <button
              onClick={() => navigate(`/layer/${prevLayer.id}`)}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded border transition-colors text-[var(--terminal-muted)] hover:text-white"
              style={{ borderColor: "var(--terminal-border)" }}
            >
              <ChevronLeft size={12} /> {prevLayer.name}
            </button>
          )}
          {nextLayer && (
            <button
              onClick={() => navigate(`/layer/${nextLayer.id}`)}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded border transition-colors"
              style={{ borderColor: nextLayer.color, color: nextLayer.color, background: `${nextLayer.color}10` }}
            >
              {nextLayer.name} <ChevronRight size={12} />
            </button>
          )}
        </div>
      </nav>

      {/* Layer Header */}
      <div
        className="border-b"
        style={{
          background: `linear-gradient(135deg, ${layer.color}08 0%, transparent 60%)`,
          borderColor: "var(--terminal-border)",
        }}
      >
        <div className="container mx-auto px-6 py-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span
                className="text-xs font-mono px-2 py-1 rounded border"
                style={{ borderColor: layer.color, color: layer.color, background: `${layer.color}10` }}
              >
                Layer {layer.level}
              </span>
              {layer.protocols.map(p => (
                <span
                  key={p}
                  className="text-xs font-mono px-2 py-0.5 rounded"
                  style={{ background: `${layer.color}10`, color: layer.color, border: `1px solid ${layer.color}30` }}
                >
                  {p}
                </span>
              ))}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: "var(--terminal-text)" }}>
              <span style={{ color: layer.color }}>{layer.icon} {layer.name}</span>
            </h1>
            <p className="text-[var(--terminal-muted)] font-mono text-sm mb-4">{layer.subtitle}</p>
            <p className="text-[var(--terminal-text)] max-w-2xl leading-relaxed text-sm">
              {layer.overview}
            </p>

            {/* Key Points */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-2">
              {layer.keyPoints.map((point, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-[var(--terminal-muted)]">
                  <span style={{ color: layer.color, flexShrink: 0 }}>▸</span>
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div
        className="sticky border-b z-40"
        style={{
          top: "49px",
          background: "rgba(13, 17, 23, 0.98)",
          borderColor: "var(--terminal-border)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="container mx-auto px-6">
          <div className="flex gap-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all duration-200"
                style={{
                  borderColor: activeTab === tab.id ? layer.color : "transparent",
                  color: activeTab === tab.id ? layer.color : "var(--terminal-muted)",
                  background: activeTab === tab.id ? `${layer.color}08` : "transparent",
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {activeTab === "theory" && (
            <motion.div
              key="theory"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <PacketVisualizer layer={layer} />

              {/* RFC References */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-mono text-[var(--terminal-muted)]">// 参考规范</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {layer.rfcs.map(rfc => (
                    <a
                      key={rfc.number}
                      href={rfc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border transition-all duration-200 hover:scale-105"
                      style={{
                        borderColor: "var(--terminal-border)",
                        color: "var(--terminal-muted)",
                        background: "rgba(22,27,34,0.6)",
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLAnchorElement).style.borderColor = layer.color;
                        (e.currentTarget as HTMLAnchorElement).style.color = layer.color;
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--terminal-border)";
                        (e.currentTarget as HTMLAnchorElement).style.color = "var(--terminal-muted)";
                      }}
                    >
                      <ExternalLink size={11} />
                      <span className="font-mono">{rfc.number}</span>
                      <span className="hidden md:inline">— {rfc.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "code" && (
            <motion.div
              key="code"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-[var(--terminal-muted)]">
                  // {layer.codeExamples.length} 个代码示例 · 点击右上角可复制
                </span>
              </div>
              {layer.codeExamples.map((ex, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <CodeBlock
                    title={ex.title}
                    language={ex.language}
                    code={ex.code}
                    description={ex.description}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}

          {activeTab === "experiment" && (
            <motion.div
              key="experiment"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-mono text-[var(--terminal-muted)]">
                  // {layer.experiments.length} 个实验步骤 · 点击展开查看命令和预期输出
                </span>
              </div>
              <ExperimentSteps layer={layer} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <div
        className="border-t mt-8"
        style={{ borderColor: "var(--terminal-border)" }}
      >
        <div className="container mx-auto px-6 py-6 flex items-center justify-between">
          {prevLayer ? (
            <button
              onClick={() => navigate(`/layer/${prevLayer.id}`)}
              className="flex items-center gap-2 text-sm transition-colors"
              style={{ color: "var(--terminal-muted)" }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = prevLayer.color}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "var(--terminal-muted)"}
            >
              <ChevronLeft size={16} />
              <div className="text-left">
                <div className="text-xs opacity-60">上一层</div>
                <div>{prevLayer.name}</div>
              </div>
            </button>
          ) : <div />}

          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-xs text-[var(--terminal-muted)] hover:text-white transition-colors"
          >
            <Layers size={14} />
            返回总览
          </button>

          {nextLayer ? (
            <button
              onClick={() => navigate(`/layer/${nextLayer.id}`)}
              className="flex items-center gap-2 text-sm transition-colors"
              style={{ color: "var(--terminal-muted)" }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = nextLayer.color}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "var(--terminal-muted)"}
            >
              <div className="text-right">
                <div className="text-xs opacity-60">下一层</div>
                <div>{nextLayer.name}</div>
              </div>
              <ChevronRight size={16} />
            </button>
          ) : <div />}
        </div>
      </div>
    </div>
  );
}
