import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createUser, listUsers } from "@/lib/users";
import { createUserInputSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  if (currentUser.role !== "superadmin") {
    return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
  }

  return NextResponse.json({ users: await listUsers() });
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
    }

    if (currentUser.role !== "superadmin") {
      return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createUserInputSchema.safeParse({
      ...body,
      confirmPassword: String(body.confirmPassword ?? ""),
      active: Boolean(body.active),
      canViewAllPayments: Boolean(body.canViewAllPayments),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos de usuario inválidos." },
        { status: 400 },
      );
    }

    const user = await createUser({
      username: parsed.data.username,
      displayName: parsed.data.displayName,
      password: parsed.data.password,
      role: parsed.data.role,
      active: parsed.data.active,
      canViewAllPayments: parsed.data.canViewAllPayments,
    });
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo crear el usuario." },
      { status: 500 },
    );
  }
}
