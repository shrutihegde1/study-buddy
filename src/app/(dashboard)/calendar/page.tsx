"use client";

import { useState, useEffect } from "react";
import { CalendarView } from "@/components/calendar/calendar-view";
import { ItemModal } from "@/components/items/item-modal";
import { useSync } from "@/hooks/use-sync";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus } from "lucide-react";

export default function CalendarPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const { sync, isSyncing, lastSyncResults } = useSync();

  const handleAddClick = () => {
    setSelectedDate(new Date());
    setIsModalOpen(true);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const handleSync = async () => {
    setSyncMessage(null);
    const results = await sync("all");

    // Calculate total items synced
    const totalSynced = Object.values(results).reduce(
      (acc, r) => acc + (r.itemsSynced || 0),
      0
    );

    const errors = Object.entries(results)
      .filter(([, r]) => !r.success)
      .map(([source]) => source);

    if (errors.length === 0) {
      setSyncMessage(`Synced ${totalSynced} items successfully!`);
    } else if (totalSynced > 0) {
      setSyncMessage(`Synced ${totalSynced} items. Some sources failed: ${errors.join(", ")}`);
    } else {
      setSyncMessage("No items synced. Check your integrations in Settings.");
    }

    // Clear message after 5 seconds
    setTimeout(() => setSyncMessage(null), 5000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing..." : "Sync All"}
          </Button>
          <Button onClick={handleAddClick}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {syncMessage && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          syncMessage.includes("failed") || syncMessage.includes("No items")
            ? "bg-yellow-50 text-yellow-800 border border-yellow-200"
            : "bg-green-50 text-green-800 border border-green-200"
        }`}>
          {syncMessage}
        </div>
      )}

      <CalendarView onDateSelect={handleDateSelect} />

      <ItemModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialDate={selectedDate}
      />
    </div>
  );
}
