"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Calendar, ListTodo, LayoutGrid, Settings, GraduationCap, X } from "lucide-react";

const navigation = [
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Due List", href: "/due-list", icon: ListTodo },
  { name: "Board", href: "/board", icon: LayoutGrid },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const pathname = usePathname();

  if (!open) return null;

  return (
    <div className="relative z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/80 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed inset-0 flex">
        <div className="relative mr-16 flex w-full max-w-xs flex-1">
          <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
            <button type="button" className="-m-2.5 p-2.5" onClick={onClose}>
              <span className="sr-only">Close sidebar</span>
              <X className="h-6 w-6 text-white" />
            </button>
          </div>

          <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
            <div className="flex h-16 shrink-0 items-center">
              <Link
                href="/calendar"
                className="flex items-center gap-2"
                onClick={onClose}
              >
                <GraduationCap className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold">Study Buddy</span>
              </Link>
            </div>
            <nav className="flex flex-1 flex-col">
              <ul role="list" className="flex flex-1 flex-col gap-y-7">
                <li>
                  <ul role="list" className="-mx-2 space-y-1">
                    {navigation.map((item) => (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={cn(
                            pathname === item.href
                              ? "bg-primary/10 text-primary"
                              : "text-gray-700 hover:bg-gray-50 hover:text-primary",
                            "group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6"
                          )}
                        >
                          <item.icon
                            className={cn(
                              pathname === item.href
                                ? "text-primary"
                                : "text-gray-400 group-hover:text-primary",
                              "h-6 w-6 shrink-0"
                            )}
                          />
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
