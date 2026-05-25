import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { Network, Target, Compass, ArrowRight, BookOpen } from "lucide-react";
import {
  loadAppData,
  type KnowledgeEdge,
  type KnowledgeNode,
  type KnowledgeNodeState,
} from "../lib/storage";

function stateColor(state: KnowledgeNodeState) {
  if (state === "mastered") return "#4CAF7C";
  if (state === "current") return "#2D7A6B";
  if (state === "next") return "#C4C0B6";
  return "#A8A49C";
}

function stateLabel(state: KnowledgeNodeState) {
  if (state === "current") return "正在学习";
  if (state === "mastered") return "已掌握";
  if (state === "next") return "下一步";
  return "待开启";
}

function stateBadgeClass(state: KnowledgeNodeState) {
  if (state === "mastered") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (state === "current") return "bg-qz-primary/10 text-qz-primary";
  if (state === "next") return "bg-black/5 dark:bg-white/10 text-qz-text-muted";
  return "bg-black/5 dark:bg-white/5 text-qz-text-muted opacity-60";
}

function findNode(nodes: KnowledgeNode[], nodeId: string) {
  return nodes.find((node) => node.id === nodeId);
}

function computeNodeDegree(nodeId: string, edges: KnowledgeEdge[]) {
  return edges.filter((e) => e.source === nodeId || e.target === nodeId).length;
}

function nodeRadius(degree: number, isActive: boolean) {
  const base = Math.min(22, 10 + degree * 2);
  return isActive ? base + 4 : base;
}

function buildRecommendations(nodes: KnowledgeNode[], edges: KnowledgeEdge[]) {
  const currentNodes = nodes.filter((n) => n.state === "current");
  const nextNodes = nodes.filter((n) => n.state === "next");

  const recommendations: { node: KnowledgeNode; reason: string; priority: number }[] = [];

  for (const node of currentNodes) {
    const preIds = edges.filter((e) => e.target === node.id).map((e) => e.source);
    const preNodes = preIds.map((id) => findNode(nodes, id)).filter(Boolean) as KnowledgeNode[];
    const allMastered = preNodes.every((p) => p.state === "mastered");
    const reason = preNodes.length > 0
      ? allMastered
        ? `前置节点「${preNodes.map((p) => p.label).join("、")}」已掌握，可以全力推进。`
        : `前置节点「${preNodes.map((p) => p.label).join("、")}」尚未全部掌握，建议先巩固。`
      : "这是当前正在学习的核心节点。";
    recommendations.push({ node, reason, priority: 1 });
  }

  for (const node of nextNodes) {
    const preIds = edges.filter((e) => e.target === node.id).map((e) => e.source);
    const preNodes = preIds.map((id) => findNode(nodes, id)).filter(Boolean) as KnowledgeNode[];
    const allMastered = preNodes.every((p) => p.state === "mastered");
    const someMastered = preNodes.some((p) => p.state === "mastered");
    let reason: string;
    let priority: number;
    if (allMastered) {
      reason = `前置节点「${preNodes.map((p) => p.label).join("、")}」已全部掌握，随时可以开始。`;
      priority = 2;
    } else if (someMastered) {
      reason = `部分前置已掌握，可以预习了解。`;
      priority = 3;
    } else {
      reason = `前置节点尚未掌握，建议按顺序推进。`;
      priority = 4;
    }
    recommendations.push({ node, reason, priority });
  }

  return recommendations.sort((a, b) => a.priority - b.priority).slice(0, 4);
}

function EdgePath({ edge, nodes, activeNodeId }: { edge: KnowledgeEdge; nodes: KnowledgeNode[]; activeNodeId: string }) {
  const source = findNode(nodes, edge.source);
  const target = findNode(nodes, edge.target);
  if (!source || !target) return null;

  const isActive = edge.source === activeNodeId || edge.target === activeNodeId;
  const controlX = (source.x + target.x) / 2;
  const controlY = Math.min(source.y, target.y) - 45;
  const path = `M ${source.x} ${source.y} Q ${controlX} ${controlY} ${target.x} ${target.y}`;

  return (
    <path
      d={path}
      fill="none"
      stroke={isActive ? "#2D7A6B" : "currentColor"}
      strokeWidth={isActive ? 2.5 : 1.5}
      opacity={isActive ? 1 : 0.4}
      markerEnd={isActive ? "url(#arrow-active)" : "url(#arrow)"}
      className={clsx(
        "transition-all duration-300 text-slate-200 dark:text-zinc-800",
        isActive && "animate-dash-flow text-qz-primary"
      )}
    />
  );
}

export default function Graph() {
  const navigate = useNavigate();
  const data = useMemo(() => loadAppData(), []);
  const nodes = data.knowledgeGraph.nodes;
  const edges = data.knowledgeGraph.edges;
  const [activeNodeId, setActiveNodeId] = useState(
    nodes.find((node) => node.state === "current")?.id ?? nodes[0]?.id ?? ""
  );

  const activeNode = findNode(nodes, activeNodeId) ?? nodes[0];
  const relatedNodeIds = Array.isArray(activeNode?.related) ? activeNode.related : [];
  const relatedNodes = nodes.filter((node) => relatedNodeIds.includes(node.id));
  const linkedResources = data.libraryItems.filter((item) =>
    (Array.isArray(item.linkedNodeIds) ? item.linkedNodeIds : []).includes(activeNodeId)
  );

  const recommendations = useMemo(() => buildRecommendations(nodes, edges), [nodes, edges]);

  function navigateToStudy(nodeId: string) {
    navigate("/study", { state: { source: "graph", nodeId } });
  }

  return (
    <div className="relative h-full overflow-hidden">
      <div className="h-full p-8 max-w-[1320px] mx-auto flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-[34px] text-qz-primary mb-2">知识图谱</h1>
            <p className="font-serif italic text-[14px] text-qz-text-muted">万物皆有联，知识自成林</p>
          </div>
          <div className="flex items-center gap-3 text-[12px] text-qz-text-muted">
            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#4CAF7C]" />已掌握</span>
            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#2D7A6B]" />当前</span>
            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#C4C0B6]" />下一步</span>
            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#A8A49C] border border-dashed border-[#A8A49C]" />待开启</span>
          </div>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-[1fr,340px] gap-6">
          <div className="rounded-[24px] border border-black/5 dark:border-white/5 bg-white/60 dark:bg-black/10 overflow-hidden min-h-0 flex flex-col">
            <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-qz-primary">
                <Network size={16} />
                <span className="font-serif text-[20px]">知识网络</span>
              </div>
              <div className="text-[12px] text-qz-text-muted">节点越大代表关联越多；颜色反映学习进度</div>
            </div>

            <div className="flex-1 min-h-0 p-6">
              <svg viewBox="0 0 860 520" className="w-full h-full relative select-none">
                <style>{`
                  @keyframes dash {
                    to {
                      stroke-dashoffset: -20;
                    }
                  }
                  .animate-dash-flow {
                    stroke-dasharray: 6, 4;
                    animation: dash 1.2s linear infinite;
                  }
                  @keyframes pulse-halo {
                    0%, 100% {
                      transform: scale(1);
                      opacity: 0.12;
                    }
                    50% {
                      transform: scale(1.06);
                      opacity: 0.22;
                    }
                  }
                  .animate-pulse-halo {
                    animation: pulse-halo 3s ease-in-out infinite;
                  }
                  .node-glow {
                    filter: drop-shadow(0 4px 12px rgba(45, 122, 107, 0.25));
                  }
                `}</style>
                <defs>
                  {/* Dotted Grid pattern */}
                  <pattern id="dot-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1" className="fill-black/[0.08] dark:fill-white/[0.04]" />
                  </pattern>

                  {/* Arrow markers */}
                  <marker
                    id="arrow"
                    viewBox="0 0 10 10"
                    refX="21"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 9 5 L 0 9 z" className="fill-slate-200 dark:fill-zinc-800" />
                  </marker>
                  <marker
                    id="arrow-active"
                    viewBox="0 0 10 10"
                    refX="23"
                    refY="5"
                    markerWidth="5.5"
                    markerHeight="5.5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 9 5 L 0 9 z" fill="#2D7A6B" />
                  </marker>

                  {/* Gradient states definitions */}
                  <linearGradient id="grad-mastered" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#52C48A" />
                    <stop offset="100%" stopColor="#3B9E6A" />
                  </linearGradient>
                  
                  <linearGradient id="grad-current" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3CA894" />
                    <stop offset="100%" stopColor="#1E5C50" />
                  </linearGradient>

                  <linearGradient id="grad-next" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#E6E4E0" />
                    <stop offset="100%" stopColor="#C2BEB6" />
                  </linearGradient>

                  <linearGradient id="grad-locked" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F9F8F6" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#E2DFD8" stopOpacity="0.4" />
                  </linearGradient>
                </defs>

                {/* Canvas grid background rect */}
                <rect width="860" height="520" fill="url(#dot-grid)" rx="24" />

                {edges.map((edge) => (
                  <EdgePath key={edge.id} edge={edge} nodes={nodes} activeNodeId={activeNodeId} />
                ))}

                {nodes.map((node) => {
                  const isActive = node.id === activeNodeId;
                  const degree = computeNodeDegree(node.id, edges);
                  const r = nodeRadius(degree, isActive);
                  const isLocked = node.state === "locked";

                  // Gradient and stroke styling values
                  const fillGrad = isLocked
                    ? "url(#grad-locked)"
                    : node.state === "mastered"
                    ? "url(#grad-mastered)"
                    : node.state === "current"
                    ? "url(#grad-current)"
                    : "url(#grad-next)";

                  const strokeColor = isLocked
                    ? "#C2BEB6"
                    : node.state === "mastered"
                    ? "#3B9E6A"
                    : node.state === "current"
                    ? "#2D7A6B"
                    : "#BFBAB0";

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      className="cursor-pointer group/node"
                      onClick={() => setActiveNodeId(node.id)}
                    >
                      {/* Dual-ring breathing active halos */}
                      {isActive ? (
                        <>
                          <circle
                            r={r + 10}
                            fill="none"
                            stroke="#2D7A6B"
                            strokeOpacity="0.06"
                            strokeWidth={6}
                            className="animate-pulse-halo origin-center"
                            style={{ transformOrigin: "0px 0px" }}
                          />
                          <circle
                            r={r + 5}
                            fill="none"
                            stroke="#2D7A6B"
                            strokeOpacity="0.14"
                            strokeWidth={2}
                          />
                        </>
                      ) : null}

                      {/* Glowing interactive node sphere */}
                      <circle
                        r={r}
                        fill={fillGrad}
                        stroke={strokeColor}
                        strokeWidth={isLocked ? 1.5 : isActive ? 2.5 : 1}
                        strokeDasharray={isLocked ? "3 3" : "none"}
                        className={clsx(
                          "transition-all duration-300 origin-center group-hover/node:scale-110 group-hover/node:stroke-qz-primary dark:group-hover/node:stroke-qz-light",
                          isActive ? "node-glow" : ""
                        )}
                        style={{ transformOrigin: "0px 0px" }}
                      />

                      {/* Precise theme-aware typography label */}
                      <text
                        y={r + 18}
                        textAnchor="middle"
                        className={clsx(
                          "select-none transition-all duration-300 font-sans tracking-wide font-medium",
                          isActive 
                            ? "font-bold text-[13px] fill-[#1B5246] dark:fill-[#52C48A]"
                            : "text-[11.5px] fill-slate-700 dark:fill-zinc-400 group-hover/node:fill-qz-primary dark:group-hover/node:fill-qz-light"
                        )}
                      >
                        {node.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="min-h-0 flex flex-col gap-4 overflow-y-auto pr-1">
            {/* Active node detail panel */}
            <div className="qz-card !p-5">
              <div className="flex items-center gap-2 mb-3 text-qz-primary">
                <Target size={16} />
                <span className="font-serif text-[20px]">节点详情</span>
              </div>
              {activeNode ? (
                <>
                  <div className="font-serif text-[28px] leading-tight text-qz-text-strong dark:text-qz-text-dark mb-2">
                    {activeNode.label}
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className={clsx("text-[11px] px-2.5 py-1 rounded-full", stateBadgeClass(activeNode.state))}>
                      {stateLabel(activeNode.state)}
                    </span>
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/5 text-qz-text-muted">
                      {activeNode.kind === "theorem" ? "定理" : activeNode.kind === "application" ? "应用" : activeNode.kind === "topic" ? "主题" : "概念"}
                    </span>
                  </div>
                  <p className="text-[13px] text-qz-text-muted leading-7 mb-4">{activeNode.summary}</p>
                  <div className="rounded-[18px] bg-qz-primary/[0.06] px-4 py-4 text-[12px] text-qz-text-muted leading-7 mb-5">
                    <span className="text-qz-primary font-medium">学习提示：</span>{activeNode.studyHint}
                  </div>

                  {/* Linked resources */}
                  {linkedResources.length > 0 && (
                    <div className="mb-5">
                      <div className="flex items-center gap-1.5 mb-2">
                        <BookOpen size={13} className="text-qz-text-muted" />
                        <span className="text-[12px] text-qz-text-muted">关联资料</span>
                      </div>
                      <div className="space-y-2">
                        {linkedResources.map((item) => (
                          <div key={item.id} className="rounded-[14px] border border-black/5 dark:border-white/5 px-3.5 py-2.5">
                            <div className="text-[13px] text-qz-text-strong dark:text-qz-text-dark">{item.title}</div>
                            <div className="text-[11px] text-qz-text-muted mt-1 leading-6 line-clamp-2">{item.summary}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => navigateToStudy(activeNode.id)}
                    className="qz-btn-primary w-full h-10 text-[13px]"
                  >
                    去学习空间继续学这个
                  </button>
                </>
              ) : null}
            </div>

            {/* Related nodes */}
            <div className="qz-card !p-5">
              <div className="font-serif text-[18px] text-qz-text-strong dark:text-qz-text-dark mb-3">相关节点</div>
              {relatedNodes.length > 0 ? (
                <div className="space-y-2">
                  {relatedNodes.map((node) => (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => setActiveNodeId(node.id)}
                      className="w-full text-left rounded-[16px] border border-black/5 dark:border-white/5 px-4 py-3 hover:border-qz-primary/30 hover:bg-[#E2F1EC]/10 transition-all duration-300"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stateColor(node.state) }} />
                        <div className="text-[13px] text-qz-text-strong dark:text-qz-text-dark">{node.label}</div>
                      </div>
                      <div className="text-[11px] text-qz-text-muted leading-6">{node.summary}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-[12px] text-qz-text-muted">暂无关联节点。</div>
              )}
            </div>

            {/* Recommended next step */}
            <div className="qz-card !p-5">
              <div className="flex items-center gap-2 mb-3 text-qz-primary">
                <Compass size={16} />
                <span className="font-serif text-[18px]">推荐下一步</span>
              </div>
              {recommendations.length > 0 ? (
                <div className="space-y-2">
                  {recommendations.map(({ node, reason }) => (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => navigateToStudy(node.id)}
                      className="w-full text-left rounded-[16px] border border-qz-primary/20 bg-qz-primary/[0.03] px-4 py-3.5 hover:border-qz-primary hover:bg-qz-primary/[0.08] hover:shadow-[0_4px_12px_rgba(45,122,107,0.06)] hover:translate-y-[-1px] transition-all duration-300 group"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stateColor(node.state) }} />
                          <span className="text-[13px] font-medium text-qz-text-strong dark:text-qz-text-dark">{node.label}</span>
                        </div>
                        <ArrowRight size={14} className="text-qz-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-[11px] text-qz-text-muted leading-6">{reason}</div>
                      <div className="mt-1.5 text-[11px] text-qz-primary">点击进入学习</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-[12px] text-qz-text-muted">暂无可推荐的节点。</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
