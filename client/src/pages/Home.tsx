/* ============================================================
   Design: Dark Terminal Hacker Aesthetic
   - Deep black bg, neon green + electric blue accents
   - JetBrains Mono for code, Space Grotesk for titles
   - Terminal-style UI with glow effects and animations
   ============================================================ */

import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { layers } from "@/data/layers";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Layers, Code2, FlaskConical, ChevronRight, Wifi, Network, Globe, Zap } from "lucide-react";

const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663269602916/KNiMb6KsqqDwNc86jfC43w/hero-bg-JFDEyRHFHdpoqoigPd8wok.webp";

const layerIcons = [Wifi, Network, Zap, Globe];

const typewriterLines = [
  "$ sudo tcpdump -i eth0 -n tcp",
  "$ gcc -o stack tcp_stack.c && ./stack",
  "$ wireshark -k -i tap0 &",
  "$ ping -c 3 10.0.0.4",
];

function TypewriterEffect() {
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [displayed, setDisplayed] = useState<string[]>([]);

  useEffect(() => {
    if (lineIndex >= typewriterLines.length) return;
    const line = typewriterLines[lineIndex];
    if (charIndex < line.length) {
      const t = setTimeout(() => setCharIndex(c => c + 1), 40);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setDisplayed(d => [...d, line]);
        setLineIndex(i => i + 1);
        setCharIndex(0);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [lineIndex, charIndex]);

  const currentLine = lineIndex < typewriterLines.length
    ? typewriterLines[lineIndex].slice(0, charIndex)
    : "";

  return (
    <div className="terminal-block p-0 overflow-hidden w-full max-w-2xl">
      <div className="terminal-dots">
        <div className="terminal-dot" style={{ background: "#ff5f57" }} />
        <div className="terminal-dot" style={{ background: "#febc2e" }} />
        <div className="terminal-dot" style={{ background: "#28c840" }} />
      </div>
      <div className="px-4 py-3 font-mono text-sm space-y-1">
        {displayed.map((line, i) => (
          <div key={i} className="text-[var(--neon-green)] opacity-70">{line}</div>
        ))}
        {lineIndex < typewriterLines.length && (
          <div className="text-[var(--neon-green)] flex items-center gap-0">
            <span>{currentLine}</span>
            <span className="cursor-blink ml-0.5 text-[var(--neon-green)]">█</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ProtocolStackDiagram() {
  const [, navigate] = useLocation();
  const [hoveredLayer, setHoveredLayer] = useState<string | null>(null);

  const stackLayers = [...layers].reverse();

  return (
    <div className="flex flex-col gap-2 w-full max-w-lg mx-auto">
      {stackLayers.map((layer, idx) => {
        const Icon = layerIcons[layers.length - 1 - idx];
        const isHovered = hoveredLayer === layer.id;
        return (
          <motion.div
            key={layer.id}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 + 0.3 }}
            whileHover={{ scale: 1.02, x: 8 }}
            onClick={() => navigate(`/layer/${layer.id}`)}
            onHoverStart={() => setHoveredLayer(layer.id)}
            onHoverEnd={() => setHoveredLayer(null)}
            className="relative flex items-center gap-4 px-5 py-3 rounded cursor-pointer transition-all duration-200 border"
            style={{
              background: isHovered
                ? `${layer.color}15`
                : "rgba(22, 27, 34, 0.8)",
              borderColor: isHovered ? layer.color : "var(--terminal-border)",
              boxShadow: isHovered ? `0 0 16px ${layer.glowColor}` : "none",
            }}
          >
            <div
              className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 text-sm"
              style={{ background: `${layer.color}20`, color: layer.color }}
            >
              <Icon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm" style={{ color: layer.color }}>
                  {layer.name}
                </span>
                <span className="text-xs text-[var(--terminal-muted)] font-mono">
                  {layer.subtitle}
                </span>
              </div>
              <div className="flex gap-1 mt-1 flex-wrap">
                {layer.protocols.slice(0, 3).map(p => (
                  <span
                    key={p}
                    className="text-xs px-1.5 py-0.5 rounded font-mono"
                    style={{ background: `${layer.color}15`, color: layer.color, border: `1px solid ${layer.color}40` }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
            <ChevronRight size={14} style={{ color: layer.color }} className={`transition-transform ${isHovered ? "translate-x-1" : ""}`} />
          </motion.div>
        );
      })}
    </div>
  );
}

function StatsBar() {
  const stats = [
    { label: "协议层", value: "4", unit: "层" },
    { label: "代码示例", value: "12+", unit: "个" },
    { label: "实验步骤", value: "20+", unit: "步" },
    { label: "参考 RFC", value: "10+", unit: "篇" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 + 0.8 }}
          className="text-center p-4 rounded border"
          style={{
            background: "rgba(22, 27, 34, 0.8)",
            borderColor: "var(--terminal-border)",
          }}
        >
          <div className="text-2xl font-bold font-mono neon-text">{s.value}</div>
          <div className="text-xs text-[var(--terminal-muted)] mt-1">{s.label}</div>
        </motion.div>
      ))}
    </div>
  );
}

function FeatureCards() {
  const features = [
    {
      icon: <Layers size={20} />,
      title: "理论剖析",
      desc: "深入解析每层协议的设计原理、数据包结构与字段含义，配合交互式可视化帮助理解",
      color: "#00d4ff",
    },
    {
      icon: <Code2 size={20} />,
      title: "C 语言实现",
      desc: "从 TUN/TAP 设备到 TCP 状态机，提供完整可运行的 C 代码，注释详尽，循序渐进",
      color: "#00ff88",
    },
    {
      icon: <FlaskConical size={20} />,
      title: "实验验证",
      desc: "通过 tcpdump、Wireshark 抓包，结合 ping/arping/ss 等工具，用真实流量验证理解",
      color: "#f0e68c",
    },
    {
      icon: <Terminal size={20} />,
      title: "终端驱动",
      desc: "所有实验均可在 Linux 终端中直接运行，无需额外环境，边学边做，即时反馈",
      color: "#ff6b6b",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {features.map((f, i) => (
        <motion.div
          key={f.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 + 0.5 }}
          className="p-5 rounded border group hover:border-opacity-100 transition-all duration-300"
          style={{
            background: "rgba(22, 27, 34, 0.6)",
            borderColor: "var(--terminal-border)",
          }}
          whileHover={{
            borderColor: f.color,
            boxShadow: `0 0 12px ${f.color}30`,
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: `${f.color}15`, color: f.color }}
            >
              {f.icon}
            </div>
            <div>
              <div className="font-semibold mb-1" style={{ color: f.color }}>{f.title}</div>
              <div className="text-sm text-[var(--terminal-muted)] leading-relaxed">{f.desc}</div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--terminal-bg)", fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {/* Top Nav */}
      <nav
        className="sticky top-0 z-50 border-b flex items-center justify-between px-6 py-3"
        style={{
          background: "rgba(13, 17, 23, 0.95)",
          borderColor: "var(--terminal-border)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex items-center gap-2">
          <Terminal size={18} className="neon-text" />
          <span className="font-bold font-mono text-sm neon-text">TCP/IP</span>
          <span className="text-[var(--terminal-muted)] text-xs font-mono">深度学习指南</span>
        </div>
        <div className="flex items-center gap-4">
          {layers.map(l => (
            <button
              key={l.id}
              onClick={() => navigate(`/layer/${l.id}`)}
              className="text-xs font-mono text-[var(--terminal-muted)] hover:text-white transition-colors hidden md:block"
            >
              {l.name}
            </button>
          ))}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${HERO_BG})` }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 60%, var(--terminal-bg))" }} />

        <div className="relative container mx-auto px-6 py-20 md:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono mb-6"
                style={{ borderColor: "var(--neon-green)", color: "var(--neon-green)", background: "rgba(0,255,136,0.08)" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-green)] animate-pulse" />
                理论 × 代码 × 实验 三位一体
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-5xl font-bold leading-tight mb-4"
                style={{ color: "var(--terminal-text)" }}
              >
                深入掌握
                <br />
                <span className="neon-text">TCP/IP</span>
                <br />
                协议栈
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-[var(--terminal-muted)] leading-relaxed mb-8 max-w-lg"
              >
                从以太网帧到 HTTP 请求，用 C 语言实现每一层协议，
                用 tcpdump 验证每一个字段。这不是教科书，
                这是工程师的实战手册。
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex gap-3 flex-wrap"
              >
                <button
                  onClick={() => navigate("/layer/link")}
                  className="flex items-center gap-2 px-5 py-2.5 rounded font-semibold text-sm transition-all duration-200"
                  style={{
                    background: "var(--neon-green)",
                    color: "#0d1117",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(0,255,136,0.5)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                  }}
                >
                  开始学习 <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => {
                    document.getElementById("stack-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded font-semibold text-sm border transition-all duration-200 text-[var(--terminal-text)]"
                  style={{ borderColor: "var(--terminal-border)", background: "transparent" }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--electric-blue)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--electric-blue)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--terminal-border)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--terminal-text)";
                  }}
                >
                  查看协议栈
                </button>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <TypewriterEffect />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="container mx-auto px-6 py-8">
        <StatsBar />
      </section>

      {/* Protocol Stack Section */}
      <section id="stack-section" className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[var(--neon-green)] font-mono text-xs">// 协议栈</span>
              </div>
              <h2 className="text-2xl font-bold mb-3" style={{ color: "var(--terminal-text)" }}>
                四层协议栈
                <span className="neon-blue-text ml-2">自底向上</span>
              </h2>
              <p className="text-[var(--terminal-muted)] text-sm leading-relaxed mb-6">
                TCP/IP 协议栈采用分层架构，每层只与相邻层通信。
                点击任意层深入学习其理论原理、C 语言实现与实验验证。
              </p>
              <ProtocolStackDiagram />
            </motion.div>
          </div>

          <div>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[var(--electric-blue)] font-mono text-xs">// 学习方法</span>
              </div>
              <h2 className="text-2xl font-bold mb-3" style={{ color: "var(--terminal-text)" }}>
                三位一体
                <span className="neon-text ml-2">学习法</span>
              </h2>
              <p className="text-[var(--terminal-muted)] text-sm leading-relaxed mb-6">
                每个协议都从理论、代码、实验三个维度深入讲解，
                确保你不仅理解"是什么"，更明白"为什么"和"怎么做"。
              </p>
              <FeatureCards />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Learning Path */}
      <section className="container mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="rounded-lg border p-8"
          style={{
            background: "rgba(22, 27, 34, 0.6)",
            borderColor: "var(--terminal-border)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[var(--terminal-yellow)] font-mono text-xs">// 推荐学习路径</span>
          </div>
          <h2 className="text-xl font-bold mb-6" style={{ color: "var(--terminal-text)" }}>
            建议按此顺序学习
          </h2>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            {layers.map((layer, i) => (
              <div key={layer.id} className="flex items-center gap-3">
                <button
                  onClick={() => navigate(`/layer/${layer.id}`)}
                  className="flex items-center gap-2 px-4 py-2 rounded border text-sm font-medium transition-all duration-200 hover:scale-105"
                  style={{
                    borderColor: layer.color,
                    color: layer.color,
                    background: `${layer.color}10`,
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 12px ${layer.glowColor}`;
                    (e.currentTarget as HTMLButtonElement).style.background = `${layer.color}20`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                    (e.currentTarget as HTMLButtonElement).style.background = `${layer.color}10`;
                  }}
                >
                  <span className="font-mono text-xs opacity-60">0{i + 1}</span>
                  {layer.name}
                </button>
                {i < layers.length - 1 && (
                  <ChevronRight size={16} className="text-[var(--terminal-muted)] hidden md:block flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
          <p className="text-[var(--terminal-muted)] text-xs mt-4 font-mono">
            # 建议先掌握数据链路层和网络层基础，再深入学习 TCP 核心机制
          </p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer
        className="border-t mt-8 py-8 text-center"
        style={{ borderColor: "var(--terminal-border)" }}
      >
        <div className="text-[var(--terminal-muted)] text-xs font-mono">
          <span className="neon-text">TCP/IP</span> 深度学习指南 · 理论 × 代码 × 实验
          <span className="mx-2 opacity-30">|</span>
          基于 RFC 793, RFC 791, RFC 826 等标准
        </div>
      </footer>
    </div>
  );
}
