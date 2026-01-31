"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Play,
  CheckCircle2,
  ArrowRightCircle,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { BOARD_COLUMNS } from "@/lib/constants";
import type { CalendarItem, ItemStatus } from "@/types";

interface BoardCardActionsProps {
  item: CalendarItem;
  onStatusChange: (id: string, status: ItemStatus) => void;
  onDelete: (id: string) => void;
}

export function BoardCardActions({
  item,
  onStatusChange,
  onDelete,
}: BoardCardActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {item.status === "pending" && (
          <DropdownMenuItem
            onClick={() => onStatusChange(item.id, "in_progress")}
          >
            <Play className="h-4 w-4 mr-2" />
            Start
          </DropdownMenuItem>
        )}
        {item.status !== "completed" && (
          <DropdownMenuItem
            onClick={() => onStatusChange(item.id, "completed")}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Complete
          </DropdownMenuItem>
        )}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <ArrowRightCircle className="h-4 w-4 mr-2" />
            Move to...
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {BOARD_COLUMNS.filter((col) => col.id !== item.status).map(
              (col) => (
                <DropdownMenuItem
                  key={col.id}
                  onClick={() => onStatusChange(item.id, col.id)}
                >
                  {col.title}
                </DropdownMenuItem>
              )
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {item.source_url && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Source
              </a>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDelete(item.id)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
