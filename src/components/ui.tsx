"use client";

import { X } from "lucide-react";

export function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return <div className="section-heading"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2></div>{action}</div>;
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "teal" | "gold" | "red" | "blue" | "green" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Progress({ value, tone = "teal" }: { value: number; tone?: "teal" | "gold" | "blue" | "red" }) {
  return <div className="progress-track" aria-label={`${value}% complete`}><span className={`progress-fill ${tone}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}

export function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: React.ReactNode; onClose(): void }) {
  if (!open) return null;
  return <div className="modal-layer" role="dialog" aria-modal="true" aria-label={title}>
    <button className="modal-backdrop" onClick={onClose} aria-label="Close modal" />
    <div className="modal-card"><div className="modal-header"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close"><X size={20} /></button></div>{children}</div>
  </div>;
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return <div className="empty-state"><strong>{title}</strong><span>{message}</span></div>;
}
