"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX, Pause } from "lucide-react";
import {
  speak,
  pause,
  resume,
  stop,
  isSpeaking,
  isPaused,
  htmlToPlainText,
  getPreferredVoice,
  loadSpeechPreferences,
  saveSpeechPreferences,
} from "@/lib/speech-synthesis-util";

type SpeechControlsProps = {
  htmlContent: string;
};

export function SpeechControls({ htmlContent }: SpeechControlsProps) {
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState(1);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    // Check if speech synthesis is supported
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setSupported(false);
      return;
    }

    // Load saved preferences
    const prefs = loadSpeechPreferences();
    if (prefs.rate) {
      setRate(prefs.rate);
    }

    // Poll for speaking state
    const interval = setInterval(() => {
      setSpeaking(isSpeaking());
      setPaused(isPaused());
    }, 250);

    return () => {
      clearInterval(interval);
      stop();
    };
  }, []);

  const handleSpeak = async () => {
    if (!supported) return;

    if (speaking && !paused) {
      // Currently speaking -> pause
      pause();
      setPaused(true);
    } else if (paused) {
      // Currently paused -> resume
      resume();
      setPaused(false);
    } else {
      // Not speaking -> start
      const text = htmlToPlainText(htmlContent);
      const voice = await getPreferredVoice();

      speak(text, {
        voice,
        rate,
        onEnd: () => {
          setSpeaking(false);
          setPaused(false);
        },
        onError: (error) => {
          console.error("Speech synthesis error:", error);
          setSpeaking(false);
          setPaused(false);
        },
      });

      setSpeaking(true);
      setPaused(false);
    }
  };

  const handleStop = () => {
    stop();
    setSpeaking(false);
    setPaused(false);
  };

  const handleRateChange = (newRate: number) => {
    setRate(newRate);
    saveSpeechPreferences({ rate: newRate });

    // If currently speaking, restart with new rate
    if (speaking) {
      handleStop();
      setTimeout(() => handleSpeak(), 100);
    }
  };

  if (!supported) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      {/* Play/Pause Button */}
      <button
        onClick={handleSpeak}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted hover:bg-muted/80 transition-colors"
        aria-label={
          speaking && !paused
            ? "Pause narration"
            : paused
            ? "Resume narration"
            : "Listen to this page"
        }
      >
        {speaking && !paused ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">
          {speaking && !paused
            ? "Pause"
            : paused
            ? "Resume"
            : "Listen"}
        </span>
      </button>

      {/* Stop Button (only when speaking) */}
      {speaking && (
        <button
          onClick={handleStop}
          className="p-1.5 rounded-md bg-muted hover:bg-muted/80 transition-colors"
          aria-label="Stop narration"
        >
          <VolumeX className="h-4 w-4" />
        </button>
      )}

      {/* Speed Control */}
      {speaking && (
        <div className="flex items-center gap-2 ml-2 px-3 py-1.5 rounded-md bg-muted">
          <span className="text-xs text-foreground/60">Speed:</span>
          <select
            value={rate}
            onChange={(e) => handleRateChange(parseFloat(e.target.value))}
            className="text-xs bg-transparent border-none outline-none cursor-pointer"
            aria-label="Speech rate"
          >
            <option value="0.5">0.5x</option>
            <option value="0.75">0.75x</option>
            <option value="1">1x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="1.75">1.75x</option>
            <option value="2">2x</option>
          </select>
        </div>
      )}
    </div>
  );
}
