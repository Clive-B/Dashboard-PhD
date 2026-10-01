"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: data.get("email"), password: data.get("password") }) });
    setLoading(false);
    if (!response.ok) { setError("The email or password is incorrect."); return; }
    router.push("/command-center"); router.refresh();
  }
  return <main className="login-page"><section className="login-brand"><div className="login-brand-content"><Image src="/brand/aic-scholar-logo.png" alt="AIC Scholar Command Center" width={390} height={390} priority /><span className="eyebrow gold-text">Academic · Work · Life</span><h1>Learn deeper.<br />Revise smarter.<br />Plan better.<br />Achieve more.</h1><p>Your human-led command center for PhD mastery and professional accountability.</p></div></section><section className="login-form-side"><form action="/api/auth/login" method="post" onSubmit={submit} className="login-card"><div className="login-icon"><LockKeyhole size={23} /></div><span className="eyebrow">Welcome back</span><h2>Sign in to your command center</h2><p>First Edition is prepared for Clive while retaining a multi-user data architecture.</p><label>Email<input name="email" type="email" defaultValue="clive@example.com" required autoComplete="email" /></label><label>Password<input name="password" type="password" defaultValue="AicScholar!2026" required autoComplete="current-password" /></label>{error && <div className="form-error">{error}</div>}<button className="button button-primary login-button" disabled={loading}>{loading ? "Signing in…" : <>Enter command center <ArrowRight size={18} /></>}</button><small>Development credentials are shown for local First Edition use. Change them before deployment.</small></form></section></main>;
}
