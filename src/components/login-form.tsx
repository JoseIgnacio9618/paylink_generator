"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Field,
  NoticeBanner,
  SectionCard,
  SectionHeading,
  primaryButtonClassName,
} from "@/components/panel-ui";

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
      />

      <form className="mt-6 space-y-4" onSubmit={submit}>
        <Field label="Usuario" name="username" value={username} onChange={setUsername} />
        <Field
          label="Contraseña"
          name="password"
          type="password"
          value={password}
          onChange={setPassword}
        />

        <NoticeBanner notice={notice} />

        <button
          type="submit"
          disabled={isSubmitting}
          className={`${primaryButtonClassName} w-full`}
        >
          {isSubmitting ? "Entrando..." : "Entrar al panel"}
        </button>
      </form>
    </SectionCard>
  );
}
