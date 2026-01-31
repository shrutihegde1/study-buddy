"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useCalendarItems } from "@/hooks/use-calendar-items";
import { useCategorizationRules } from "@/hooks/use-categorization-rules";
import { ITEM_TYPE_LABELS, ITEM_PRIORITY_LABELS, EFFORT_OPTIONS } from "@/lib/constants";
import { StepsEditor } from "@/components/board/steps-editor";
import type { CalendarItem, CreateCalendarItemInput, ItemType, ItemPriority, EffortEstimate, Step } from "@/types";

interface ItemModalProps {
  open: boolean;
  onClose: () => void;
  item?: CalendarItem;
  initialDate?: Date | null;
}

export function ItemModal({ open, onClose, item, initialDate }: ItemModalProps) {
  const { createItem, updateItem, isCreating, isUpdating } = useCalendarItems();
  const { createRule } = useCategorizationRules();
  const isEditing = !!item;

  // Track original course_name to detect changes
  const originalCourseNameRef = useRef<string | null>(null);
  const [showRulePrompt, setShowRulePrompt] = useState(false);
  const [pendingCourseName, setPendingCourseName] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    item_type: ItemType;
    due_date: Date | undefined;
    all_day: boolean;
    course_name: string;
    priority: ItemPriority;
    notes: string;
    effort_estimate: EffortEstimate | "";
    steps: Step[];
  }>({
    title: "",
    description: "",
    item_type: "assignment",
    due_date: undefined,
    all_day: false,
    course_name: "",
    priority: "medium",
    notes: "",
    effort_estimate: "",
    steps: [],
  });

  useEffect(() => {
    if (item) {
      originalCourseNameRef.current = item.course_name || "";
      setFormData({
        title: item.title,
        description: item.description || "",
        item_type: item.item_type,
        due_date: item.due_date ? new Date(item.due_date) : undefined,
        all_day: item.all_day,
        course_name: item.course_name || "",
        priority: item.priority,
        notes: item.notes || "",
        effort_estimate: item.effort_estimate || "",
        steps: item.steps || [],
      });
    } else {
      originalCourseNameRef.current = null;
      if (initialDate) {
        setFormData((prev) => ({
          ...prev,
          due_date: initialDate,
        }));
      }
    }
  }, [item, initialDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const input: CreateCalendarItemInput = {
      title: formData.title,
      description: formData.description || null,
      item_type: formData.item_type,
      due_date: formData.due_date?.toISOString() || null,
      all_day: formData.all_day,
      course_name: formData.course_name || null,
      priority: formData.priority,
      notes: formData.notes || null,
      effort_estimate: formData.effort_estimate || null,
      steps: formData.steps,
      source: "manual",
    };

    if (isEditing && item) {
      await updateItem({ id: item.id, ...input });

      // Check if course_name changed from empty/different to a new value
      const oldName = originalCourseNameRef.current || "";
      const newName = formData.course_name || "";
      if (newName && newName !== oldName) {
        setPendingCourseName(newName);
        setShowRulePrompt(true);
        return; // Don't close yet — show rule prompt
      }
    } else {
      await createItem(input);
    }

    handleClose();
  };

  const handleRuleConfirm = async () => {
    if (pendingCourseName && item) {
      // Extract the most distinctive keyword from the title (longest word > 3 chars)
      const words = item.title
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .sort((a, b) => b.length - a.length);
      const keyword = words[0];
      if (keyword) {
        try {
          await createRule({
            match_type: "title_contains",
            match_value: keyword.toLowerCase(),
            course_name: pendingCourseName,
          });
        } catch {
          // Best-effort; ignore duplicate errors
        }
      }
    }
    setShowRulePrompt(false);
    setPendingCourseName(null);
    handleClose();
  };

  const handleRuleDismiss = () => {
    setShowRulePrompt(false);
    setPendingCourseName(null);
    handleClose();
  };

  const handleClose = () => {
    setShowRulePrompt(false);
    setPendingCourseName(null);
    setFormData({
      title: "",
      description: "",
      item_type: "assignment",
      due_date: undefined,
      all_day: false,
      course_name: "",
      priority: "medium",
      notes: "",
      effort_estimate: "",
      steps: [],
    });
    onClose();
  };

  // Rule creation prompt view
  if (showRulePrompt) {
    return (
      <Dialog open={open} onOpenChange={handleRuleDismiss}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Apply to similar items?</DialogTitle>
            <DialogDescription>
              You changed the course to &ldquo;{pendingCourseName}&rdquo;. Would you like to automatically categorize similar items the same way?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleRuleDismiss}>
              No thanks
            </Button>
            <Button type="button" onClick={handleRuleConfirm}>
              Yes, create rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Item" : "Add New Item"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details of this item"
              : "Add a new item to your calendar"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Enter title"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="item_type">Type</Label>
              <Select
                value={formData.item_type}
                onValueChange={(value: ItemType) =>
                  setFormData((prev) => ({ ...prev, item_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ITEM_TYPE_LABELS) as ItemType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {ITEM_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: ItemPriority) =>
                  setFormData((prev) => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ITEM_PRIORITY_LABELS) as ItemPriority[]).map(
                    (priority) => (
                      <SelectItem key={priority} value={priority}>
                        {ITEM_PRIORITY_LABELS[priority]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.due_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.due_date ? (
                    format(formData.due_date, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.due_date}
                  onSelect={(date) =>
                    setFormData((prev) => ({ ...prev, due_date: date }))
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="all_day"
              checked={formData.all_day}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, all_day: checked as boolean }))
              }
            />
            <Label htmlFor="all_day" className="text-sm font-normal">
              All day event
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="course_name">Course/Category</Label>
            <Input
              id="course_name"
              value={formData.course_name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, course_name: e.target.value }))
              }
              placeholder="e.g., Math 101, CS 201"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Add details..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="effort_estimate">Effort Estimate</Label>
            <Select
              value={formData.effort_estimate}
              onValueChange={(value: EffortEstimate) =>
                setFormData((prev) => ({ ...prev, effort_estimate: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select effort" />
              </SelectTrigger>
              <SelectContent>
                {EFFORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Steps</Label>
            <StepsEditor
              steps={formData.steps}
              onChange={(steps) =>
                setFormData((prev) => ({ ...prev, steps }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Personal notes..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating || isUpdating}>
              {isCreating || isUpdating
                ? "Saving..."
                : isEditing
                ? "Update"
                : "Add Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
