"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Bot,
  ScrollText,
  DollarSign,
  FolderGit2,
  Zap,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/agents", label: "Sub-Agents", icon: Bot },
  { href: "/ops-log", label: "Ops Log", icon: ScrollText },
  { href: "/costs", label: "Cost Analytics", icon: DollarSign },
  { href: "/projects", label: "Projects", icon: FolderGit2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 border-r border-zinc-800 bg-zinc-950">
      <div className="flex h-14 items-center border-b border-zinc-800 px-4">
        <Zap className="mr-2 h-5 w-5 text-amber-400" />
        <span className="text-lg font-semibold text-zinc-100">Jarvis</span>
        <span className="ml-1 text-xs text-zinc-500">ops</span>
      </div>
      <nav className="flex flex-col gap-1 p-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="absolute bottom-4 left-0 right-0 px-4">
        <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-zinc-400">Gateway Online</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
