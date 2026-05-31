import { useMemo, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import clsx from "clsx";
import { Columns, Plus, MessageSquare } from "lucide-react";

import { MessageList } from "../components/study/MessageList";
import { StudyInput } from "../components/study/StudyInput";
import { StudyEmptyState } from "../components/study/StudyEmptyState";
import { RightToolDock } from "../components/study/RightToolDock";
import { GraphPanel } from "../components/study/panels/GraphPanel";
import { NotePanel } from "../components/study/panels/NotePanel";
import { PomodoroPanel } from "../components/study/panels/PomodoroPanel";
import { ResourcePanel } from "../components/study/panels/ResourcePanel";
import { useStudySession } from "../hooks/useStudySession";
import type { StudyLocationState } from "../lib/study/types";
import {
  getActiveStudyConversationId,
  getStudyConversationChangeEventName,
  listStudyConversations,
  setActiveStudyConversationId,
  type PersistedStudyConversation
} from "../lib/studyConversations";

export default function Study() {
  const location = useLocation();
  const locationState = (location.state ?? null) as StudyLocationState | null;

  const routeContext = useMemo<StudyLocationState | null>(() => {
    if (
      !locationState?.resourceId &&
      !locationState?.nodeId &&
      !locationState?.taskId &&
      !locationState?.noteId
    )
      return null;
    return {
      source: locationState?.source,
      resourceId: locationState?.resourceId,
      nodeId: locationState?.nodeId,
      taskId: locationState?.taskId,
      noteId: locationState?.noteId
    };
  }, [
    locationState?.source,
    locationState?.resourceId,
    locationState?.nodeId,
    locationState?.taskId,
    locationState?.noteId
  ]);

  const routeContextKey = `${location.key ?? "study"}:${routeContext?.source ?? ""}:${
    routeContext?.resourceId ?? ""
  }:${routeContext?.nodeId ?? ""}:${routeContext?.taskId ?? ""}:${routeContext?.noteId ?? ""}`;

  const session = useStudySession(routeContext, routeContextKey);
  const journeySteps = [
    { key: "define", label: "内容" },
    { key: "discuss", label: "方式" },
    { key: "plan", label: "计划" },
    { key: "research", label: "资料" },
    { key: "learn", label: "学习" },
  ] as const;
  const activeJourneyIndex = Math.max(
    0,
    journeySteps.findIndex((step) => step.key === session.journeyStage)
  );

  // Inner Chat Sessions Sidebar States
  const [sessions, setSessions] = useState<PersistedStudyConversation[]>(() =>
    listStudyConversations()
  );
  const [activeConversationId, setActiveConversationIdState] = useState<string | null>(() =>
    getActiveStudyConversationId()
  );
  const [isSessionsCollapsed, setIsSessionsCollapsed] = useState(false);

  useEffect(() => {
    const sync = () => {
      setSessions(listStudyConversations());
      setActiveConversationIdState(getActiveStudyConversationId());
    };
    sync();
    window.addEventListener(getStudyConversationChangeEventName(), sync);
    return () => window.removeEventListener(getStudyConversationChangeEventName(), sync);
  }, []);

  const handleNewSession = () => {
    setActiveStudyConversationId(null);
    setActiveConversationIdState(null);
    window.dispatchEvent(new CustomEvent("qizen-study-start-new"));
  };

  const handleSwitchSession = (id: string) => {
    setActiveStudyConversationId(id);
    setActiveConversationIdState(id);
  };

  return (
    <div className="qz-study" data-session-status={session.sessionStatus}>
      <header className="qz-study-header">
        <div className="qz-study-header-inner select-none">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Collapsible Left Sessions toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setIsSessionsCollapsed(!isSessionsCollapsed)}
              className={clsx(
                "p-1.5 rounded-lg border border-black/5 dark:border-white/5 transition-all cursor-pointer hover:bg-qz-primary/10",
                isSessionsCollapsed
                  ? "text-qz-text-muted bg-transparent border-transparent"
                  : "bg-black/[0.04] text-qz-primary border-qz-primary/15 dark:bg-white/[0.04]"
              )}
              title={isSessionsCollapsed ? "展开会话历史" : "收起会话历史"}
            >
              <Columns size={13.5} />
            </motion.button>

            <div className="min-w-0 flex-1">
              <div className="qz-study-title truncate leading-tight">{session.learningGoal}</div>
              {session.sessionSummaryText ? (
                <div className="qz-study-subtitle truncate leading-tight mt-0.5">
                  {session.sessionSummaryText}
                </div>
              ) : null}
            </div>
          </div>
          <div className="qz-study-status shrink-0 ml-4 select-none">
            {session.isGeneratingAnswer ? "整理中" : "就绪"}
          </div>
        </div>
      </header>

      <div className="qz-study-body flex min-h-0 flex-1 w-full overflow-hidden">
        {/* Collapsible Left Chat List Panel inside Study */}
        <aside
          className={clsx(
            "border-r border-qz-divider dark:border-qz-divider-dark bg-black/[0.01] dark:bg-white/[0.01] transition-all duration-300 flex flex-col flex-shrink-0 relative overflow-hidden select-none",
            isSessionsCollapsed ? "w-0 p-0 border-r-0 opacity-0" : "w-[220px] p-4 opacity-100"
          )}
        >
          {/* Minimalist Capsule New Session Button */}
          <motion.button
            whileHover={{ scale: 1.02, y: -0.5 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={handleNewSession}
            className="w-full h-8.5 rounded-xl border border-dashed border-qz-primary/40 bg-qz-primary/[0.02] hover:bg-qz-primary/10 text-qz-primary flex items-center justify-center gap-1.5 text-[12px] font-bold cursor-pointer transition-all duration-200 mb-4 shrink-0"
            title="开始一个全新问题"
          >
            <Plus size={14} className="shrink-0" />
            <span>新建学习会话</span>
          </motion.button>

          {/* Conversation history list */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 scrollbar-thin">
            {sessions.length > 0 ? (
              sessions.map((item) => {
                const isActive = item.id === activeConversationId;
                return (
                  <motion.button
                    whileHover={{ x: 2 }}
                    key={item.id}
                    type="button"
                    onClick={() => handleSwitchSession(item.id)}
                    className={clsx(
                      "w-full text-left rounded-xl p-3 border transition-all duration-300 relative group flex flex-col gap-1 cursor-pointer",
                      isActive
                        ? "bg-[#E2F1EC]/40 dark:bg-[rgba(45,122,107,0.12)] border-qz-primary/20 text-[#1A5C4A] dark:text-[#5BA593] font-semibold shadow-sm"
                        : "bg-transparent border-transparent text-qz-text dark:text-qz-text-dark hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                    )}
                  >
                    {/* Left active border indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-md bg-qz-primary" />
                    )}
                    <div className="flex items-center gap-2 w-full">
                      <MessageSquare
                        size={12.5}
                        className={clsx(
                          "shrink-0",
                          isActive
                            ? "text-qz-primary"
                            : "text-qz-text-muted/70 group-hover:text-qz-primary transition-colors"
                        )}
                      />
                      <div
                        className={clsx(
                          "text-[12.5px] font-medium truncate flex-1 leading-snug",
                          isActive
                            ? "text-qz-primary dark:text-qz-light font-bold"
                            : "text-qz-text-strong dark:text-qz-text-dark group-hover:text-qz-primary transition-colors"
                        )}
                      >
                        {item.title}
                      </div>
                    </div>
                    <div className="text-[10px] text-qz-text-muted/70 self-end font-mono mt-0.5 select-none">
                      {new Date(item.updatedAt).toLocaleDateString(undefined, {
                        month: "2-digit",
                        day: "2-digit"
                      })}
                    </div>
                  </motion.button>
                );
              })
            ) : (
              <div className="h-[180px] flex items-center justify-center text-center px-4 border border-dashed border-black/[0.05] dark:border-white/[0.05] rounded-xl text-[12px] text-qz-text-muted select-none">
                暂无会话。发送消息后自动保存。
              </div>
            )}
          </div>
        </aside>

        {/* Middle: Workspace */}
        <main className="qz-study-workspace">
          <div 
            className="qz-study-scroll transition-all duration-300"
            style={{
              paddingLeft: isSessionsCollapsed ? "48px" : "16px",
              paddingRight: (isSessionsCollapsed ? 48 : 16) + (session.activePanel ? 342 : 0) + "px"
            }}
          >
            <div className="qz-study-content">
              <div className="qz-journey-bar select-none">
                {journeySteps.map((step, index) => (
                  <div
                    key={step.key}
                    className={clsx(
                      "qz-journey-step",
                      index < activeJourneyIndex && "qz-journey-step-done",
                      index === activeJourneyIndex && "qz-journey-step-active"
                    )}
                  >
                    <span>{index + 1}</span>
                    <strong>{step.label}</strong>
                  </div>
                ))}
              </div>
              {session.messages.length === 0 ? (
                <StudyEmptyState onSendPrompt={session.sendMessage} />
              ) : null}
              <MessageList
                messages={session.messages}
                isGenerating={session.isGeneratingAnswer}
                onUnderstood={session.handleUnderstood}
                onSendPrompt={session.sendMessage}
                onSaveNote={session.saveMessageToNote}
                onConfirmPlan={(steps) => void session.confirmPlanAndResearch(steps)}
              />
            </div>
          </div>

          <div 
            className="qz-study-input-zone transition-all duration-300"
            style={{
              paddingLeft: isSessionsCollapsed ? "48px" : "16px",
              paddingRight: isSessionsCollapsed ? "48px" : "16px"
            }}
          >
            <div className="qz-study-input-inner">
              <StudyInput
                value={session.input}
                disabled={session.isGeneratingAnswer}
                onChange={session.setInput}
                onSubmit={() => void session.sendMessage()}
              />
            </div>
          </div>
        </main>

        <RightToolDock
          activePanel={session.activePanel}
          onActivePanelChange={session.setActivePanel}
          renderPanel={(panel) => {
            if (panel === "pomodoro") {
              return (
                <PomodoroPanel
                  seconds={session.pomodoroSeconds}
                  running={session.pomodoroRunning}
                  totalSeconds={session.totalSeconds}
                  progress={session.pomodoroProgress}
                  onToggle={() => session.setPomodoroRunning((v) => !v)}
                  onReset={() => {
                    session.setPomodoroRunning(false);
                    session.setPomodoroSeconds(session.totalSeconds);
                  }}
                />
              );
            }
            if (panel === "resource") {
              return (
                <ResourcePanel
                  selectedResource={session.selectedResource}
                  latestRag={session.latestRag}
                  resourceLeads={session.resourceLeads}
                  practiceSet={session.practiceSet}
                  practiceHint={session.practiceHint}
                  onGeneratePractice={session.generatePracticeFromLatestRag}
                  onCompletePractice={session.completeCurrentPracticeSet}
                  onSelectResource={session.selectResource}
                />
              );
            }
            if (panel === "note") {
              return (
                <NotePanel value={session.noteDraft} onChange={session.handleNoteDraftChange} />
              );
            }
            return (
              <GraphPanel
                selectedNode={session.selectedNode}
                selectedTask={session.selectedTask}
                journeyStage={session.journeyStage}
                onSelectNode={session.selectNode}
              />
            );
          }}
        />
      </div>
    </div>
  );
}
