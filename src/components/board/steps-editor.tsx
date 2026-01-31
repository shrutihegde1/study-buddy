"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { generateStepId } from "@/lib/board-utils";
import type { Step } from "@/types";

interface StepsEditorProps {
  steps: Step[];
  onChange: (steps: Step[]) => void;
}

export function StepsEditor({ steps, onChange }: StepsEditorProps) {
  const [newLabel, setNewLabel] = useState("");

  const addStep = () => {
    const label = newLabel.trim();
    if (!label) return;
    onChange([...steps, { id: generateStepId(), label, done: false }]);
    setNewLabel("");
  };

  const toggleStep = (id: string) => {
    onChange(
      steps.map((s) => (s.id === id ? { ...s, done: !s.done } : s))
    );
  };

  const removeStep = (id: string) => {
    onChange(steps.filter((s) => s.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addStep();
    }
  };

  return (
    <div className="space-y-2">
      {steps.map((step) => (
        <div key={step.id} className="flex items-center gap-2">
          <Checkbox
            checked={step.done}
            onCheckedChange={() => toggleStep(step.id)}
          />
          <span
            className={
              step.done
                ? "flex-1 text-sm line-through text-muted-foreground"
                : "flex-1 text-sm"
            }
          >
            {step.label}
          </span>
          <button
            type="button"
            onClick={() => removeStep(step.id)}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a step..."
          className="h-8 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addStep}
          disabled={!newLabel.trim()}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
