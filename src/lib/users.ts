import { randomUUID } from "node:crypto";
import { execute, query, queryOne } from "@/lib/db";
import {
  generateSessionToken,
  hashPassword,
  hashSessionToken,
  verifyPassword,
} from "@/lib/auth-crypto";
import type { PaginatedUsersResult, UserRecord, UserRole, UserSummary } from "@/lib/types";
import { nowIso, trimToEmpty } from "@/lib/utils";

type UserRow = {
  id: string;
  username: string;
  display_name: string;
  password_hash: string;
  role: UserRole;
  active: boolean;
  can_view_admin_scope: boolean;
  created_at: string;
  updated_at: string;
};

type UserSummaryRow = UserRow & { paylinks_count: number };

function mapUserRow(row: UserRow): UserRecord {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    active: row.active,
    canViewAllPayments: row.can_view_admin_scope,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapUserSummaryRow(row: UserSummaryRow): UserSummary {
  return { ...mapUserRow(row), paylinksCount: Number(row.paylinks_count) };
}

function normalizeUsername(username: string) {
  return trimToEmpty(username).toLowerCase();
}

function normalizeUserInput(input: {
  username: string;
  displayName: string;
  password?: string;
  role: UserRole;
  active: boolean;
  canViewAllPayments: boolean;
}) {
  const username = normalizeUsername(input.username);
  const displayName = trimToEmpty(input.displayName);

  if (!username) throw new Error("El usuario es obligatorio.");
  if (!displayName) throw new Error("El nombre visible es obligatorio.");
  if (input.password && input.password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres.");

  return {
    username,
    displayName,
    canViewAllPayments: input.role === "user" ? input.canViewAllPayments : false,
  };
}

async function countSuperadmins(excludingUserId?: string) {
  const row = await queryOne<{ total: number }>(
    excludingUserId
      ? "SELECT COUNT(*)::int AS total FROM users WHERE role = 'superadmin' AND active = TRUE AND id != $1"
      : "SELECT COUNT(*)::int AS total FROM users WHERE role = 'superadmin' AND active = TRUE",
    excludingUserId ? [excludingUserId] : [],
  );
  return row?.total ?? 0;
}

export async function listUsers() {
  const rows = await query<UserSummaryRow>(`
    SELECT users.*, COUNT(paylinks.id)::int AS paylinks_count
    FROM users
    LEFT JOIN paylinks ON paylinks.owner_user_id = users.id
    GROUP BY users.id
    ORDER BY (users.role = 'superadmin') DESC, users.display_name ASC, users.username ASC
  `);
  return rows.map(mapUserSummaryRow);
}

export async function listUsersPaginated(input?: { page?: number; pageSize?: number }): Promise<PaginatedUsersResult> {
  const pageSize = clampPageSize(input?.pageSize ?? 10);
  const requestedPage = Math.max(1, Math.trunc(input?.page ?? 1));
  const total = (await queryOne<{ total: number }>("SELECT COUNT(*)::int AS total FROM users"))?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * pageSize;
  const rows = await query<UserSummaryRow>(`
    SELECT users.*, COUNT(paylinks.id)::int AS paylinks_count
    FROM users
    LEFT JOIN paylinks ON paylinks.owner_user_id = users.id
    GROUP BY users.id
    ORDER BY (users.role = 'superadmin') DESC, users.display_name ASC, users.username ASC
    LIMIT $1 OFFSET $2
  `, [pageSize, offset]);

  return { items: rows.map(mapUserSummaryRow), total, page, pageSize, totalPages };
}

export async function getUserById(id: string) {
  const row = await queryOne<UserRow>("SELECT * FROM users WHERE id = $1", [id]);
  return row ? mapUserRow(row) : null;
}

export async function getUserSummaryById(id: string) {
  const row = await queryOne<UserSummaryRow>(`
    SELECT users.*, COUNT(paylinks.id)::int AS paylinks_count
    FROM users LEFT JOIN paylinks ON paylinks.owner_user_id = users.id
    WHERE users.id = $1 GROUP BY users.id LIMIT 1
  `, [id]);
  return row ? mapUserSummaryRow(row) : null;
}

export async function getUserByUsername(username: string) {
  const row = await queryOne<UserRow>("SELECT * FROM users WHERE username = $1", [normalizeUsername(username)]);
  return row ? mapUserRow(row) : null;
}

export async function authenticateUser(username: string, password: string) {
  const row = await queryOne<UserRow>("SELECT * FROM users WHERE username = $1", [normalizeUsername(username)]);
  if (!row || !row.active || !verifyPassword(password, row.password_hash)) return null;
  return mapUserRow(row);
}

export async function createUser(input: {
  username: string; displayName: string; password: string; role: UserRole; active: boolean; canViewAllPayments: boolean;
}) {
  const normalized = normalizeUserInput(input);
  if (await getUserByUsername(normalized.username)) throw new Error("Ya existe un usuario con ese nombre.");
  const now = nowIso();
  await execute(
    `INSERT INTO users (id, username, display_name, password_hash, role, active, admin_user_id, can_view_admin_scope, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, '', $7, $8, $9)`,
    [randomUUID(), normalized.username, normalized.displayName, hashPassword(input.password), input.role, input.active, normalized.canViewAllPayments, now, now],
  );
  return getUserByUsername(normalized.username).then((user) => {
    if (!user) throw new Error("No se pudo crear el usuario.");
    return user;
  });
}

export async function updateUser(id: string, input: {
  username: string; displayName: string; password?: string; role: UserRole; active: boolean; canViewAllPayments: boolean;
}) {
  const existing = await queryOne<UserRow>("SELECT * FROM users WHERE id = $1", [id]);
  if (!existing) throw new Error("Usuario no encontrado.");
  const normalized = normalizeUserInput(input);
  const duplicate = await queryOne<{ id: string }>("SELECT id FROM users WHERE username = $1 AND id != $2", [normalized.username, id]);
  if (duplicate) throw new Error("Ya existe un usuario con ese nombre.");
  if (((existing.role === "superadmin" && input.role !== "superadmin") || !input.active) && await countSuperadmins(id) === 0) {
    throw new Error("Debe existir al menos un superadministrador activo.");
  }
  await execute(
    `UPDATE users SET username = $1, display_name = $2, password_hash = $3, role = $4, active = $5,
      admin_user_id = '', can_view_admin_scope = $6, updated_at = $7 WHERE id = $8`,
    [normalized.username, normalized.displayName, input.password ? hashPassword(input.password) : existing.password_hash, input.role, input.active, normalized.canViewAllPayments, nowIso(), id],
  );
  const user = await getUserById(id);
  if (!user) throw new Error("No se pudo actualizar el usuario.");
  return user;
}

export async function deleteUser(id: string) {
  const existing = await getUserById(id);
  if (!existing) throw new Error("Usuario no encontrado.");
  if (existing.role === "superadmin" && await countSuperadmins(id) === 0) throw new Error("No puedes eliminar al último superadministrador.");
  const fallback = await queryOne<{ id: string }>(
    "SELECT id FROM users WHERE role = 'superadmin' AND active = TRUE AND id != $1 ORDER BY created_at ASC LIMIT 1", [id],
  );
  if (fallback) await execute("UPDATE paylinks SET owner_user_id = $1 WHERE owner_user_id = $2", [fallback.id, id]);
  await execute("DELETE FROM user_sessions WHERE user_id = $1", [id]);
  await execute("DELETE FROM users WHERE id = $1", [id]);
}

export function getVisiblePaylinkOwnerIds(user: UserRecord) {
  return user.role === "superadmin" || user.canViewAllPayments ? undefined : [user.id];
}

export function getPaylinkScopeDescription(user: UserRecord) {
  if (user.role === "superadmin") return "Consulta todos los links creados en la plataforma.";
  return user.canViewAllPayments
    ? "Consulta todos los links creados en la plataforma."
    : "Consulta únicamente tus links y sus estados.";
}

export async function createUserSession(userId: string, maxAgeSeconds = 60 * 60 * 24 * 7) {
  const token = generateSessionToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + maxAgeSeconds * 1000).toISOString();
  await execute(
    "INSERT INTO user_sessions (id, user_id, token_hash, expires_at, created_at) VALUES ($1, $2, $3, $4, $5)",
    [randomUUID(), userId, hashSessionToken(token), expiresAt, now.toISOString()],
  );
  return { token, expiresAt, maxAgeSeconds };
}

export async function deleteSessionByToken(token: string) {
  await execute("DELETE FROM user_sessions WHERE token_hash = $1", [hashSessionToken(token)]);
}

export async function deleteSessionsForUser(userId: string) {
  await execute("DELETE FROM user_sessions WHERE user_id = $1", [userId]);
}

export async function getUserBySessionToken(token: string) {
  const row = await queryOne<UserRow & { expires_at: string }>(`
    SELECT users.*, user_sessions.expires_at FROM user_sessions
    INNER JOIN users ON users.id = user_sessions.user_id
    WHERE user_sessions.token_hash = $1 LIMIT 1
  `, [hashSessionToken(token)]);
  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= Date.now() || !row.active) {
    await deleteSessionByToken(token);
    return null;
  }
  return mapUserRow(row);
}

function clampPageSize(pageSize: number) {
  return Number.isFinite(pageSize) ? Math.min(50, Math.max(5, Math.trunc(pageSize))) : 10;
}
