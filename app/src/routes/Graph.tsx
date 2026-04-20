import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { Network, Target } from "lucide-react";
import {
  loadAppData,
  type KnowledgeEdge,
  type KnowledgeNode,
  type KnowledgeNodeState,
} from "../lib/storage";

function stateColor(state: KnowledgeNodeState) {
  if (state === "mastered") return "#4CAF7C";
  if (state === "current") return "#2D7A6B";
  if (state === "next") return "#E8A93C";
  return "#D4D0C8";
}

function findNode(nodes: KnowledgeNode[], nodeId: string) {
  return nodes.find((node) => node.id === nodeId);
}

function EdgePath({ edge, nodes, activeNodeId }: { edge: KnowledgeEdge; nodes: KnowledgeNode[]; activeNodeId: string }) {
  const source = findNode(nodes, edge.source);
  const target = findNode(nodes, edge.target);
  if (!source || !target) return null;

  const isActive = edge.source === activeNodeId || edge.target === activeNodeId;
  const controlX = (source.x + target.x) / 2;
  const controlY = Math.min(source.y, target.y) - 40;
  const path = `M ${source.x} ${source.y} Q ${controlX} ${controlY} ${target.x} ${target.y}`;

  return (
    <path
      d={path}
      fill="none"
      stroke={isActive ? "#2D7A6B" : "#D7E5DF"}
      strokeWidth={isActive ? 3 : 2}
      opacity={isActive ? 1 : 0.9}
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
  const linkedResources = data.libraryItems.filter((item) => (Array.isArray(item.linkedNodeIds) ? item.linkedNodeIds : []).includes(activeNodeId));

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
            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#E8A93C]" />下一步</span>
          </div>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-[1fr,340px] gap-6">
          <div className="rounded-[24px] border border-black/5 dark:border-white/5 bg-white/60 dark:bg-black/10 overflow-hidden min-h-0 flex flex-col">
            <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-qz-primary">
                <Network size={16} />
                <span className="font-serif text-[20px]">知识网络</span>
              </div>
              <div className="text-[12px] text-qz-text-muted">点一个节点，右侧就会展开解释和学习入口</div>
            </div>

            <div className="flex-1 min-h-0 p-6">
              <svg viewBox="0 0 860 520" className="w-full h-full">
                {edges.map((edge) => (
                  <EdgePath key={edge.id} edge={edge} nodes={nodes} activeNodeId={activeNodeId} />
                ))}

                {nodes.map((node) => {
                  const isActive = node.id === activeNodeId;
                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      className="cursor-pointer"
                      onClick={() => setActiveNodeId(node.id)}
                    >
                      <circle
                        r={isActive ? 18 : 13}
                        fill={stateColor(node.state)}
                        opacity={node.state === "locked" ? 0.75 : 1}
                      />
                      {isActive ? <circle r={26} fill="none" stroke="#2D7A6B" strokeOpacity="0.18" strokeWidth={10} /> : null}
                      <text
                        y={36}
                        textAnchor="middle"
                        className={clsx(
                          "select-none",
                          isActive ? "font-medium" : ""
                        )}
                        style={{ fontSize: 13, fill: isActive ? "#2D7A6B" : "#6E6A63" }}
                      >
                        {node.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="min-h-0 flex flex-col gap-4">
            <div className="qz-card !p-5">
              <div className="flex items-center gap-2 mb-3 text-qz-primary">
                <Target size={16} />
                <span className="font-serif text-[20px]">当前节点</span>
              </div>
              {activeNode ? (
                <>
                  <div className="font-serif text-[28px] leading-tight text-qz-text-strong dark:text-qz-text-dark mb-2">
                    {activeNode.label}
                  </div>
                  <div className="text-[11px] px-2.5 py-1 rounded-full inline-flex bg-qz-primary/10 text-qz-primary mb-4">
                    {activeNode.state === "current"
                      ? "正在学习"
                      : activeNode.state === "mastered"
                      ? "已掌握"
                      : activeNode.state === "next"
                      ? "下一站"
                      : "待开启"}
                  </div>
                  <p className="text-[13px] text-qz-text-muted leading-7 mb-5">{activeNode.summary}</p>
                  <div className="rounded-[18px] bg-qz-primary/6 px-4 py-4 text-[12px] text-qz-text-muted leading-7 mb-5">
                    {activeNode.studyHint}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/study", { state: { source: "graph", nodeId: activeNode.id } })}
                    className="w-full h-10 rounded-full bg-qz-primary text-white text-[13px] hover:bg-qz-dark transition-colors"
                  >
                    去学习空间继续学这个
                  </button>
                </>
              ) : null}
            </div>

            <div className="qz-card !p-5 overflow-y-auto">
              <div className="font-serif text-[20px] text-qz-text-strong dark:text-qz-text-dark mb-4">相关节点</div>
              <div className="space-y-3 mb-5">
                {relatedNodes.map((node) => (
                  <div key={node.id} className="rounded-[16px] border border-black/5 dark:border-white/5 px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stateColor(node.state) }} />
                      <div className="text-[13px] text-qz-text-strong dark:text-qz-text-dark">{node.label}</div>
                    </div>
                    <div className="text-[11px] text-qz-text-muted leading-6">{node.summary}</div>
                  </div>
                ))}
              </div>
              <div className="font-serif text-[18px] text-qz-text-strong dark:text-qz-text-dark mb-3">关联资料</div>
              {linkedResources.length > 0 ? (
                <div className="space-y-3">
                  {linkedResources.map((item) => (
                    <div key={item.id} className="rounded-[16px] border border-black/5 dark:border-white/5 px-4 py-3">
                      <div className="text-[13px] text-qz-text-strong dark:text-qz-text-dark">{item.title}</div>
                      <div className="text-[11px] text-qz-text-muted mt-1 leading-6">{item.summary}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[12px] text-qz-text-muted">当前节点还没有自动关联到资料。</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
