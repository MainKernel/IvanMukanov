import { useEffect, useState } from "react";

function remainingSeconds(deadlineIso: string): number {
  const diffMs = new Date(deadlineIso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / 1000));
}

/**
 * Повертає кількість секунд, що залишилися до holdExpiresAt (з відповіді сервера).
 * Таймер носить суто інформаційний характер — остаточне рішення завжди ухвалює сервер.
 */
export function useCountdown(deadlineIso: string): number {
  const [secondsLeft, setSecondsLeft] = useState<number>(() =>
    remainingSeconds(deadlineIso),
  );

  useEffect(() => {
    setSecondsLeft(remainingSeconds(deadlineIso));

    const timer = window.setInterval(() => {
      setSecondsLeft(remainingSeconds(deadlineIso));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [deadlineIso]);

  return secondsLeft;
}

export function formatCountdown(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

