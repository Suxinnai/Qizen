import { useMemo } from "react";
import { useLocation } from "react-router-dom";
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

export default function Study() {
  const location = useLocation();
  const locationState = (location.state ?? null) as StudyLocationState | null;
  const routeContext = useMemo<StudyLocationState | null>(() => {
    if (!locationState?.resourceId && !locationState?.nodeId && !locationState?.taskId && !locationState?.noteId) return null;
    return {
      source: locationState?.source,
      resourceId: locationState?.resourceId,
      nodeId: locationState?.nodeId,
      taskId: locationState?.taskId,
      noteId: locationState?.noteId,
    };
  }, [locationState?.source, locationState?.resourceId, locationState?.nodeId, locationState?.taskId, locationState?.noteId]);
  const routeContextKey = `${location.key ?? "study"}:${routeContext?.source ?? ""}:${routeContext?.resourceId ?? ""}:${routeContext?.nodeId ?? ""}:${routeContext?.taskId ?? ""}:${routeContext?.noteId ?? ""}`;

  const session = useStudySession(routeContext, routeContextKey);

  return (
    <div className="qz-study" data-session-status={session.sessionStatus}>
      <header className="qz-study-header">
        <div className="qz-study-header-inner">
          <div className="min-w-0 flex-1">
            <div className="qz-study-title">{session.learningGoal}</div>
            {session.sessionSummaryText ? <div className="qz-study-subtitle">{session.sessionSummaryText}</div> : null}
          </div>
          <div className="qz-study-status">{session.isGeneratingAnswer ? "整理中" : "就绪"}</div>
        </div>
      </header>

      <div className="qz-study-body">
        <main className="qz-study-workspace">
          <div className="qz-study-scroll">
            <div className="qz-study-content">
              {session.messages.length === 0 ? <StudyEmptyState /> : null}
              <MessageList messages={session.messages} onUnderstood={session.handleUnderstood} />
            </div>
          </div>

          <div className="qz-study-input-zone">
            <div className="qz-study-input-inner">
              <StudyInput value={session.input} disabled={session.isGeneratingAnswer} onChange={session.setInput} onSubmit={() => void session.sendMessage()} />
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
                  practiceSet={session.practiceSet}
                  practiceHint={session.practiceHint}
                  onGeneratePractice={session.generatePracticeFromLatestRag}
                  onCompletePractice={session.completeCurrentPracticeSet}
                />
              );
            }
            if (panel === "note") {
              return <NotePanel value={session.noteDraft} onChange={session.handleNoteDraftChange} />;
            }
            return <GraphPanel selectedNode={session.selectedNode} />;
          }}
        />
      </div>
    </div>
  );
}
