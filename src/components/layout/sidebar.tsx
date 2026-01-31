"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Calendar, ListTodo, LayoutGrid, Settings, GraduationCap } from "lucide-react";

const navigation = [
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Due List", href: "/due-list", icon: ListTodo },
  { name: "Board", href: "/board", icon: LayoutGrid },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r bg-white px-6 pb-4">
        <div className="flex h-16 shrink-0 items-center">
          <Link href="/calendar" className="flex items-center gap-2">
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
    </aside>
  );
}
