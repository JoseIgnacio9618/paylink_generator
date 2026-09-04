import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteUser, updateUser } from "@/lib/users";
import { updateUserInputSchema } from "@/lib/validation";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

export async function PATCH(request: Request, context: { params: Params }) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
    }

    if (currentUser.role !== "superadmin") {
      return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateUserInputSchema.safeParse({
      ...body,
      active: Boolean(body.active),
      canViewAllPayments: Boolean(body.canViewAllPayments),
      password: body.password ? String(body.password) : "",
      confirmPassword: body.confirmPassword ? String(body.confirmPassword) : "",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos de usuario inválidos." },
        { status: 400 },
      );
    }

    if (currentUser.id === id && parsed.data.role !== "superadmin") {
      return NextResponse.json(
        { error: "No puedes quitarte a ti mismo el rol de superadministrador." },
        { status: 400 },
      );
    }

    const user = await updateUser(id, {
      username: parsed.data.username,
      displayName: parsed.data.displayName,
      password: parsed.data.password || undefined,
      role: parsed.data.role,
      active: parsed.data.active,
      canViewAllPayments: parsed.data.canViewAllPayments,
    });

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo actualizar el usuario." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: { params: Params }) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
    }

    if (currentUser.role !== "superadmin") {
      return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
    }

    const { id } = await context.params;

    if (currentUser.id === id) {
      return NextResponse.json(
        { error: "No puedes eliminar tu propia cuenta." },
        { status: 400 },
      );
    }

    await deleteUser(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo eliminar el usuario." },
      { status: 500 },
    );
  }
}
