"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, NoticeBanner, SectionCard, SectionHeading } from "@/components/panel-ui";

type Notice = {
  tone: "success" | "error";
  text: string;
} | null;

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setNotice(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "No se pudo iniciar sesión.");
      }

      setNotice({ tone: "success", text: "Acceso correcto. Redirigiendo..." });
      router.push("/");
      router.refresh();
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "No se pudo iniciar sesión.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SectionCard className="w-full max-w-md">
      <SectionHeading
        eyebrow="Acceso"
        title="Inicia sesión"
        description="Accede con tu usuario y contraseña para entrar al panel."
      />

      <form className="mt-6 space-y-4" onSubmit={submit}>
        <Field
          label="Usuario"
          name="username"
          value={username}
          onChange={setUsername}
        />
        <div className="space-y-2">
          <label className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted">
            <span>Contraseña</span>
          </label>
          <input
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground shadow-[0_1px_0_rgba(18,34,38,0.02)] outline-none focus:border-accent focus:ring-4 focus:ring-accent/10"
          />
        </div>

        <NoticeBanner notice={notice} />

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-accent px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-65"
        >
          {isSubmitting ? "Entrando..." : "Entrar al panel"}
        </button>
      </form>
    </SectionCard>
  );
}
