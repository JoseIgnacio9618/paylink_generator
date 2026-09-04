import { NextResponse } from "next/server";
import { authenticateUser } from "@/lib/users";
import { loginInputSchema } from "@/lib/validation";
import { setUserSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Credenciales inválidas." },
        { status: 400 },
      );
    }

    const user = await authenticateUser(parsed.data.username, parsed.data.password);

    if (!user) {
      return NextResponse.json(
        { error: "Usuario o contraseña incorrectos." },
        { status: 401 },
      );
    }

    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
    });
    await setUserSessionCookie(response, user);

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo iniciar sesión." },
      { status: 500 },
    );
  }
}
