"use client";

import { LayoutGrid } from "lucide-react";

export function BoardEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <LayoutGrid className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-1">
        No items yet
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Add items using the button above or sync from your integrations to see
        them organized by course on the board.
      </p>
    </div>
  );
}
