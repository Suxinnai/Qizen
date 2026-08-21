import { useEffect, useState } from "react";

export function useStudyPomodoro(pomodoroMinutes: number) {
  const totalSeconds = pomodoroMinutes * 60;
  const [pomodoroSeconds, setPomodoroSeconds] = useState(totalSeconds);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);

  useEffect(() => {
    if (!pomodoroRunning) return;
    const timer = window.setInterval(() => {
      setPomodoroSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [pomodoroRunning]);

  useEffect(() => {
    if (pomodoroSeconds === 0) setPomodoroRunning(false);
  }, [pomodoroSeconds]);

  const pomodoroProgress =
    totalSeconds > 0 ? Math.max(0, Math.min(1, 1 - pomodoroSeconds / totalSeconds)) : 0;

  return {
    pomodoroSeconds,
    pomodoroRunning,
    pomodoroProgress,
    totalSeconds,
    setPomodoroRunning,
    setPomodoroSeconds,
  };
}
