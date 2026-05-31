import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
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
  active: number;
  can_view_admin_scope: number;
  created_at: string;
  updated_at: string;
};

type UserSummaryRow = UserRow & {
  paylinks_count: number;
};

function mapUserRow(row: UserRow): UserRecord {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    active: Boolean(row.active),
    canViewAllPayments: Boolean(row.can_view_admin_scope),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapUserSummaryRow(row: UserSummaryRow): UserSummary {
  return {
    ...mapUserRow(row),
    paylinksCount: row.paylinks_count,
  };
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

  if (!username) {
    throw new Error("El usuario es obligatorio.");
  }

  if (!displayName) {
    throw new Error("El nombre visible es obligatorio.");
  }

  if (input.password && input.password.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres.");
  }

  return {
    username,
    displayName,
    canViewAllPayments: input.role === "user" ? input.canViewAllPayments : false,
  };
}

function countSuperadmins(excludingUserId?: string) {
  const row = db
    .prepare(
      excludingUserId
        ? "SELECT COUNT(*) as total FROM users WHERE role = 'superadmin' AND active = 1 AND id != ?"
        : "SELECT COUNT(*) as total FROM users WHERE role = 'superadmin' AND active = 1",
    )
    .get(...(excludingUserId ? [excludingUserId] : [])) as { total: number };

  return row.total;
}

export function listUsers() {
  const rows = db
    .prepare(`
      SELECT users.*, COUNT(paylinks.id) as paylinks_count
      FROM users
      LEFT JOIN paylinks ON paylinks.owner_user_id = users.id
      GROUP BY users.id
      ORDER BY users.role = 'superadmin' DESC, users.display_name ASC, users.username ASC
    `)
    .all() as UserSummaryRow[];

  return rows.map(mapUserSummaryRow);
}

export function listUsersPaginated(input?: {
  page?: number;
  pageSize?: number;
}): PaginatedUsersResult {
  const pageSize = clampPageSize(input?.pageSize ?? 10);
  const requestedPage = Math.max(1, Math.trunc(input?.page ?? 1));
  const totalRow = db.prepare("SELECT COUNT(*) as total FROM users").get() as { total: number };
  const total = totalRow.total;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * pageSize;

  const rows = db
    .prepare(`
      SELECT users.*, COUNT(paylinks.id) as paylinks_count
      FROM users
      LEFT JOIN paylinks ON paylinks.owner_user_id = users.id
      GROUP BY users.id
      ORDER BY users.role = 'superadmin' DESC, users.display_name ASC, users.username ASC
      LIMIT ? OFFSET ?
    `)
    .all(pageSize, offset) as UserSummaryRow[];

  return {
    items: rows.map(mapUserSummaryRow),
    total,
    page,
    pageSize,
    totalPages,
  };
}

export function getUserById(id: string) {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  return row ? mapUserRow(row) : null;
}

export function getUserSummaryById(id: string) {
  const row = db
    .prepare(`
      SELECT users.*, COUNT(paylinks.id) as paylinks_count
      FROM users
      LEFT JOIN paylinks ON paylinks.owner_user_id = users.id
      WHERE users.id = ?
      GROUP BY users.id
      LIMIT 1
    `)
    .get(id) as UserSummaryRow | undefined;

  return row ? mapUserSummaryRow(row) : null;
}

export function getUserByUsername(username: string) {
  const row = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(normalizeUsername(username)) as UserRow | undefined;
  return row ? mapUserRow(row) : null;
}

function getUserAuthRowByUsername(username: string) {
  return db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(normalizeUsername(username)) as UserRow | undefined;
}

export function authenticateUser(username: string, password: string) {
  const row = getUserAuthRowByUsername(username);

  if (!row || !row.active) {
    return null;
  }

  if (!verifyPassword(password, row.password_hash)) {
    return null;
  }

  return mapUserRow(row);
}

export function createUser(input: {
  username: string;
  displayName: string;
  password: string;
  role: UserRole;
  active: boolean;
  canViewAllPayments: boolean;
}) {
  const normalized = normalizeUserInput(input);
  const now = nowIso();

  const existing = getUserByUsername(normalized.username);
  if (existing) {
    throw new Error("Ya existe un usuario con ese nombre.");
  }

  db.prepare(`
    INSERT INTO users (
      id, username, display_name, password_hash, role, active,
      admin_user_id, can_view_admin_scope, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, ?)
  `).run(
    randomUUID(),
    normalized.username,
    normalized.displayName,
    hashPassword(input.password),
    input.role,
    input.active ? 1 : 0,
    normalized.canViewAllPayments ? 1 : 0,
    now,
    now,
  );

  return getUserByUsername(normalized.username)!;
}

export function updateUser(
  id: string,
  input: {
    username: string;
    displayName: string;
    password?: string;
    role: UserRole;
    active: boolean;
    canViewAllPayments: boolean;
  },
) {
  const existingRow = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;

  if (!existingRow) {
    throw new Error("Usuario no encontrado.");
  }

  const normalized = normalizeUserInput(input);

  const duplicate = db
    .prepare("SELECT id FROM users WHERE username = ? AND id != ?")
    .get(normalized.username, id) as { id: string } | undefined;

  if (duplicate) {
    throw new Error("Ya existe un usuario con ese nombre.");
  }

  if ((existingRow.role === "superadmin" && input.role !== "superadmin") || !input.active) {
    if (countSuperadmins(id) === 0) {
      throw new Error("Debe existir al menos un superadministrador activo.");
    }
  }

  db.prepare(`
    UPDATE users
    SET
      username = @username,
      display_name = @displayName,
      password_hash = @passwordHash,
      role = @role,
      active = @active,
      admin_user_id = '',
      can_view_admin_scope = @canViewAllPayments,
      updated_at = @updatedAt
    WHERE id = @id
  `).run({
    id,
    username: normalized.username,
    displayName: normalized.displayName,
    passwordHash: input.password ? hashPassword(input.password) : existingRow.password_hash,
    role: input.role,
    active: input.active ? 1 : 0,
    canViewAllPayments: normalized.canViewAllPayments ? 1 : 0,
    updatedAt: nowIso(),
  });

  return getUserById(id)!;
}

export function deleteUser(id: string) {
  const existing = getUserById(id);

  if (!existing) {
    throw new Error("Usuario no encontrado.");
  }

  if (existing.role === "superadmin" && countSuperadmins(id) === 0) {
    throw new Error("No puedes eliminar al último superadministrador.");
  }

  const fallbackOwner = db
    .prepare(
      "SELECT id FROM users WHERE role = 'superadmin' AND active = 1 AND id != ? ORDER BY datetime(created_at) ASC LIMIT 1",
    )
    .get(id) as { id: string } | undefined;

  if (fallbackOwner) {
    db.prepare("UPDATE paylinks SET owner_user_id = ? WHERE owner_user_id = ?").run(
      fallbackOwner.id,
      id,
    );
  }

  db.prepare("DELETE FROM user_sessions WHERE user_id = ?").run(id);
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
}

export function getVisiblePaylinkOwnerIds(user: UserRecord) {
  if (user.role === "superadmin" || user.canViewAllPayments) {
    return undefined;
  }

  return [user.id];
}

export function getPaylinkScopeDescription(user: UserRecord) {
  if (user.role === "superadmin") {
    return "Consulta todos los links creados en la plataforma.";
  }

  if (user.canViewAllPayments) {
    return "Consulta todos los links creados por el superadministrador y el resto de usuarios.";
  }

  return "Consulta únicamente tus links y sus estados.";
}

export function createUserSession(userId: string, maxAgeSeconds = 60 * 60 * 24 * 7) {
  const token = generateSessionToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + maxAgeSeconds * 1000).toISOString();

  db.prepare(`
    INSERT INTO user_sessions (
      id, user_id, token_hash, expires_at, created_at
    )
    VALUES (?, ?, ?, ?, ?)
  `).run(randomUUID(), userId, hashSessionToken(token), expiresAt, now.toISOString());

  return {
    token,
    expiresAt,
    maxAgeSeconds,
  };
}

export function deleteSessionByToken(token: string) {
  db.prepare("DELETE FROM user_sessions WHERE token_hash = ?").run(hashSessionToken(token));
}

export function deleteSessionsForUser(userId: string) {
  db.prepare("DELETE FROM user_sessions WHERE user_id = ?").run(userId);
}

export function getUserBySessionToken(token: string) {
  const row = db
    .prepare(`
      SELECT users.*, user_sessions.expires_at
      FROM user_sessions
      INNER JOIN users ON users.id = user_sessions.user_id
      WHERE user_sessions.token_hash = ?
      LIMIT 1
    `)
    .get(hashSessionToken(token)) as (UserRow & { expires_at: string }) | undefined;

  if (!row) {
    return null;
  }

  if (new Date(row.expires_at).getTime() <= Date.now() || !row.active) {
    deleteSessionByToken(token);
    return null;
  }

  return mapUserRow(row);
}

function clampPageSize(pageSize: number) {
  if (!Number.isFinite(pageSize)) {
    return 10;
  }

  return Math.min(50, Math.max(5, Math.trunc(pageSize)));
}
