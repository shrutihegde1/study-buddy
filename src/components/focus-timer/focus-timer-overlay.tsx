"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Pause,
  Play,
  Square,
  RotateCcw,
  X,
  Volume2,
  VolumeX,
  GripHorizontal,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useFocusTimer } from "./focus-timer-context";
import { cn } from "@/lib/utils";

type SoundType = "none" | "whitenoise" | "ticking";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Audio context and nodes for sounds
let audioContext: AudioContext | null = null;
let whiteNoiseNode: AudioBufferSourceNode | null = null;
let tickingInterval: ReturnType<typeof setInterval> | null = null;
let gainNode: GainNode | null = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

function createWhiteNoise(ctx: AudioContext): AudioBufferSourceNode {
  const bufferSize = 2 * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  const node = ctx.createBufferSource();
  node.buffer = buffer;
  node.loop = true;
  return node;
}

function playTick(ctx: AudioContext, gain: GainNode) {
  const osc = ctx.createOscillator();
  const tickGain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(800, ctx.currentTime);

  tickGain.gain.setValueAtTime(gain.gain.value * 0.3, ctx.currentTime);
  tickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

  osc.connect(tickGain);
  tickGain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.1);
}

export function FocusTimerOverlay() {
  const {
    taskId,
    taskTitle,
    secondsRemaining,
    isRunning,
    isPaused,
    pause,
    resume,
    stop,
    restart,
    close,
  } = useFocusTimer();

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [soundType, setSoundType] = useState<SoundType>("none");
  const [volume, setVolume] = useState(50);
  const [isCentered, setIsCentered] = useState(true);

  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Handle dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isCentered) {
      // First drag: calculate current center position
      const rect = cardRef.current?.getBoundingClientRect();
      if (rect) {
        setPosition({
          x: rect.left,
          y: rect.top,
        });
        setIsCentered(false);
      }
    }
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };
  }, [isCentered, position]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragRef.current) return;

      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;

      setPosition({
        x: dragRef.current.startPosX + dx,
        y: dragRef.current.startPosY + dy,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragRef.current = null;
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Sound management
  useEffect(() => {
    if (!taskId) {
      // Clean up sounds when timer closes
      if (whiteNoiseNode) {
        whiteNoiseNode.stop();
        whiteNoiseNode = null;
      }
      if (tickingInterval) {
        clearInterval(tickingInterval);
        tickingInterval = null;
      }
      return;
    }

    const ctx = getAudioContext();

    // Create gain node if needed
    if (!gainNode) {
      gainNode = ctx.createGain();
      gainNode.connect(ctx.destination);
    }
    gainNode.gain.setValueAtTime(volume / 100, ctx.currentTime);

    // Stop current sounds
    if (whiteNoiseNode) {
      whiteNoiseNode.stop();
      whiteNoiseNode = null;
    }
    if (tickingInterval) {
      clearInterval(tickingInterval);
      tickingInterval = null;
    }

    // Start new sound if running and not paused
    if (isRunning && !isPaused && soundType !== "none") {
      if (soundType === "whitenoise") {
        whiteNoiseNode = createWhiteNoise(ctx);
        whiteNoiseNode.connect(gainNode);
        whiteNoiseNode.start();
      } else if (soundType === "ticking") {
        tickingInterval = setInterval(() => {
          if (gainNode) playTick(ctx, gainNode);
        }, 1000);
      }
    }

    return () => {
      if (whiteNoiseNode) {
        whiteNoiseNode.stop();
        whiteNoiseNode = null;
      }
      if (tickingInterval) {
        clearInterval(tickingInterval);
        tickingInterval = null;
      }
    };
  }, [taskId, soundType, volume, isRunning, isPaused]);

  // Update volume
  useEffect(() => {
    if (gainNode && audioContext) {
      gainNode.gain.setValueAtTime(volume / 100, audioContext.currentTime);
    }
  }, [volume]);

  // Reset position when closed
  useEffect(() => {
    if (!taskId) {
      setIsCentered(true);
      setPosition({ x: 0, y: 0 });
    }
  }, [taskId]);

  if (!taskId) return null;

  const timesUp = secondsRemaining === 0 && !isRunning;
  const stopped = !isRunning && !timesUp && secondsRemaining > 0;
  const underOneMinute = secondsRemaining > 0 && secondsRemaining < 60;

  const totalSeconds = 30 * 60;
  const progress = 1 - secondsRemaining / totalSeconds;

  const positionStyle = isCentered
    ? { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
    : { top: position.y, left: position.x };

  return (
    <Card
      ref={cardRef}
      className={cn(
        "fixed z-50 w-80 shadow-2xl border backdrop-blur-sm bg-white/90 dark:bg-gray-900/90",
        timesUp && "animate-pulse",
        isDragging && "cursor-grabbing"
      )}
      style={positionStyle}
    >
      {/* Drag handle */}
      <div
        className="flex items-center justify-center py-1 cursor-grab active:cursor-grabbing border-b bg-gray-50/50"
        onMouseDown={handleMouseDown}
      >
        <GripHorizontal className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="text-sm font-medium text-foreground truncate max-w-[180px]">
          {taskTitle}
        </span>
        <div className="flex items-center gap-1">
          {/* Sound control */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              >
                {soundType === "none" ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Background Sound</p>
                  <div className="flex gap-1">
                    <Button
                      variant={soundType === "none" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSoundType("none")}
                      className="flex-1 text-xs"
                    >
                      Off
                    </Button>
                    <Button
                      variant={soundType === "whitenoise" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSoundType("whitenoise")}
                      className="flex-1 text-xs"
                    >
                      White Noise
                    </Button>
                    <Button
                      variant={soundType === "ticking" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSoundType("ticking")}
                      className="flex-1 text-xs"
                    >
                      Ticking
                    </Button>
                  </div>
                </div>
                {soundType !== "none" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Volume</p>
                      <span className="text-xs text-muted-foreground">{volume}%</span>
                    </div>
                    <Slider
                      value={[volume]}
                      onValueChange={(v: number[]) => setVolume(v[0])}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={close}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Timer display */}
      <div className="px-4 py-4">
        {timesUp ? (
          <p className="text-4xl font-bold text-center text-primary">
            Time&apos;s up!
          </p>
        ) : stopped ? (
          <p className="text-4xl font-bold text-center text-muted-foreground">
            Stopped
          </p>
        ) : (
          <p
            className={cn(
              "text-5xl font-mono font-bold text-center tracking-tight",
              underOneMinute && "text-red-600"
            )}
          >
            {formatTime(secondsRemaining)}
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-3">
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-1000 ease-linear",
              timesUp ? "bg-primary" : underOneMinute ? "bg-red-500" : "bg-blue-500"
            )}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 px-4 pb-4">
        {isRunning && !isPaused && (
          <Button variant="outline" size="sm" onClick={pause} className="gap-1.5">
            <Pause className="h-4 w-4" />
            Pause
          </Button>
        )}
        {isRunning && isPaused && (
          <Button variant="outline" size="sm" onClick={resume} className="gap-1.5">
            <Play className="h-4 w-4" />
            Resume
          </Button>
        )}
        {isRunning && (
          <Button variant="outline" size="sm" onClick={stop} className="gap-1.5">
            <Square className="h-4 w-4" />
            Stop
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={restart} className="gap-1.5">
          <RotateCcw className="h-4 w-4" />
          Restart
        </Button>
      </div>
    </Card>
  );
}
