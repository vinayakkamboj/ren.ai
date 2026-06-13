"use client";

import { useEffect, useRef, useState } from "react";

const DELAYS = [115, 95, 120, 100, 90, 130];

// One-shot: types once, cursor blinks 3× then disappears. Used on login/signup.
export function useTypewriter(text: string, startDelay = 300) {
  const [displayed, setDisplayed] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    setCursorVisible(true);
    let i = 0;

    const typeNext = () => {
      if (i < text.length) {
        const ch = i++;
        setDisplayed(text.slice(0, i));
        timerRef.current = setTimeout(typeNext, DELAYS[ch % DELAYS.length]);
      } else {
        setDone(true);
      }
    };

    timerRef.current = setTimeout(typeNext, startDelay);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [text, startDelay]);

  useEffect(() => {
    if (!done) return;
    let count = 0;
    const blink = setInterval(() => {
      setCursorVisible((v) => !v);
      if (++count >= 6) { clearInterval(blink); setCursorVisible(false); }
    }, 400);
    return () => clearInterval(blink);
  }, [done]);

  return { displayed, cursorVisible };
}

// Looping: types out, holds pauseMs, erases quickly, repeats forever.
// Uses a ref for mutable state so there are no stale closure issues.
export function useTypewriterLoop(text: string, pauseMs = 7000) {
  const [displayed, setDisplayed] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef({ i: 0, phase: "typing" as "typing" | "erasing" });

  useEffect(() => {
    stateRef.current = { i: 0, phase: "typing" };
    setDisplayed("");

    function schedule(ms: number) {
      timerRef.current = setTimeout(tick, ms);
    }

    function tick() {
      const s = stateRef.current;
      if (s.phase === "typing") {
        if (s.i < text.length) {
          const ch = s.i++;
          setDisplayed(text.slice(0, s.i));
          schedule(DELAYS[ch % DELAYS.length]);
        } else {
          // Finished typing — hold before erasing
          s.phase = "erasing";
          schedule(pauseMs);
        }
      } else {
        if (s.i > 0) {
          s.i--;
          setDisplayed(text.slice(0, s.i));
          schedule(38); // erase quickly
        } else {
          // Finished erasing — restart
          s.phase = "typing";
          schedule(320);
        }
      }
    }

    schedule(500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [text, pauseMs]);

  // Cursor blinks continuously while the loop runs
  useEffect(() => {
    const id = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(id);
  }, []);

  return { displayed, cursorVisible };
}
