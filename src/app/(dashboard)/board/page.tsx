"use client";

import { useState } from "react";
import { BoardView } from "@/components/board/board-view";
import { ItemModal } from "@/components/items/item-modal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { BOARD_VIEW_MODES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { BoardViewMode } from "@/types";

export default function BoardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<BoardViewMode>("by_course");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Board</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border bg-muted/50 p-0.5">
            {BOARD_VIEW_MODES.map((mode) => (
              <button
                key={mode.value}
                onClick={() => setViewMode(mode.value)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  viewMode === mode.value
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      <BoardView viewMode={viewMode} />

      <ItemModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
