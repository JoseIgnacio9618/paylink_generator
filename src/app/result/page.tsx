type ResultPageProps = {
  searchParams: Promise<{
    status?: string;
    message?: string;
    cr?: string;
  }>;
};

const messages: Record<string, { title: string; text: string }> = {
  complete: {
    title: "Pago procesado",
    text: "La operación ha terminado y estamos esperando la confirmación definitiva del webhook de MONEI.",
  },
  failed: {
    title: "Pago no completado",
    text: "El intento de cobro ha fallado. Si lo necesitas, puedes volver a abrir el link y probar de nuevo.",
  },
  cancelled: {
    title: "Pago cancelado",
    text: "El cliente ha cancelado el proceso antes de completar el checkout.",
  },
};

function normalizeStatus(status: string | undefined) {
  const normalized = (status ?? "").trim().toLowerCase();

  if (normalized === "failed" || normalized === "fail") {
    return "failed";
  }

  if (normalized === "cancelled" || normalized === "canceled" || normalized === "cancel") {
    return "cancelled";
  }

  if (normalized === "complete" || normalized === "completed" || normalized === "success") {
    return "complete";
  }

  return "complete";
}

export default async function ResultPage({ searchParams }: ResultPageProps) {
  const params = await searchParams;
  const status = normalizeStatus(params.status);
  const message = messages[status] ?? messages.complete;
  const providerMessage = params.message ? decodeURIComponent(params.message) : "";
  const challengeResult = (params.cr ?? "").trim().toUpperCase();

  return (
    <main className="mx-auto flex w-full max-w-[96rem] flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-10">
      <div className="w-full max-w-2xl rounded-[2.4rem] border border-border/70 bg-[linear-gradient(145deg,rgba(255,249,241,0.94),rgba(234,223,207,0.76))] p-8 text-center shadow-[var(--shadow)] dark:bg-[linear-gradient(145deg,rgba(24,29,36,0.95),rgba(36,42,51,0.9))]">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">
          Estado del checkout
        </p>
        <h1 className="mt-5 font-[family:var(--font-display)] text-5xl font-semibold tracking-[-0.05em] text-foreground">
          {message.title}
        </h1>
        <p className="mt-5 text-base leading-8 text-muted">{message.text}</p>
        {challengeResult === "SUCCESS" ? (
          <p className="mt-5 text-sm leading-7 text-muted">
            La autenticación 3DS o el challenge del banco terminó correctamente, pero eso no garantiza por sí solo que el pago final se haya aprobado.
          </p>
        ) : null}
        {providerMessage ? (
          <p className="mt-6 rounded-[1.5rem] border border-border/70 bg-surface/88 px-4 py-3.5 text-sm leading-7 text-muted">
            Mensaje devuelto por MONEI: {providerMessage}
          </p>
        ) : null}
      </div>
    </main>
  );
}
