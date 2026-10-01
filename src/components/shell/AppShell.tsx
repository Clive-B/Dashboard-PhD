"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bot, BrainCircuit, CalendarDays, ChevronLeft, CloudDownload, Command, GraduationCap, Headphones, Library, LibraryBig,
  LogOut, Menu, Settings, ShieldCheck, Target, X
} from "lucide-react";
import { useEffect, useState } from "react";
import { ScholarProvider } from "@/components/providers/ScholarProvider";

const navItems = [
  { href: "/command-center", label: "Command Center", icon: Command },
  { href: "/courses", label: "Courses", icon: LibraryBig },
  { href: "/otter-inbox", label: "Otter Inbox", icon: CloudDownload },
  { href: "/knowledge-vault", label: "Knowledge Vault", icon: Library },
  { href: "/revision", label: "Revision", icon: BrainCircuit },
  { href: "/podcast", label: "Study Podcast", icon: Headphones },
  { href: "/mastery", label: "Mastery", icon: Target },
  { href: "/phd-planner", label: "PhD Planner", icon: GraduationCap },
  { href: "/work-watchdog", label: "Work Watchdog", icon: ShieldCheck },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/aic-assistant", label: "AIC Tutor", icon: Bot },
  { href: "/settings", label: "Settings", icon: Settings }
];

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const active = navItems.find((item) => pathname.startsWith(item.href));

  useEffect(() => setMobileOpen(false), [pathname]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={22} /></button>
      {mobileOpen && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="brand-block">
          <Image src="/brand/aic-scholar-logo.png" alt="AIC Scholar Command Center" width={180} height={180} priority className="brand-logo" />
          {!collapsed && <div><strong>AIC Scholar</strong><span>Command Center</span></div>}
          <button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={20} /></button>
        </div>
        <nav className="primary-nav" aria-label="Primary navigation">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={pathname.startsWith(href) ? "active" : ""} title={collapsed ? label : undefined}>
              <Icon size={19} strokeWidth={1.8} /><span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          {!collapsed && <div className="human-primary"><span className="status-dot" />Human-primary intelligence</div>}
          <button onClick={signOut}><LogOut size={18} /><span>Sign out</span></button>
          <button className="collapse-button" onClick={() => setCollapsed((value) => !value)} aria-label="Toggle sidebar"><ChevronLeft size={18} /><span>Collapse</span></button>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="eyebrow">Academic · Work · Life</span>
            <h1>{active?.label || "AIC Scholar"}</h1>
          </div>
          <div className="profile-chip"><span>CB</span><div><strong>Clive</strong><small>PhD · Information Technology</small></div></div>
        </header>
        <div className="page-content">{children}</div>
      </main>
      {!pathname.startsWith("/aic-assistant") && <Link href="/aic-assistant" className="aic-launcher" aria-label="Open AIC Tutor"><span><Bot size={21} /></span><div><strong>Ask AIC</strong><small>Learning tutor</small></div></Link>}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return <ScholarProvider><Shell>{children}</Shell></ScholarProvider>;
}
