import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/connection.js';

const SALT_ROUNDS = 12;

export async function findUserByEmail(email) {
  const rows = await query('SELECT * FROM users WHERE email = ? AND is_active = TRUE', [email]);
  return rows[0] || null;
}

export async function findUserById(id) {
  const rows = await query(
    'SELECT id, email, first_name, last_name, role, department, created_at, last_login_at FROM users WHERE id = ? AND is_active = TRUE',
    [id]
  );
  return rows[0] || null;
}

export async function createUser({ email, password, firstName, lastName, role = 'USER', department = null }) {
  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await query(
    'INSERT INTO users (id, email, password_hash, first_name, last_name, role, department) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, email, passwordHash, firstName, lastName, role, department]
  );
  return findUserById(id);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export async function updateLastLogin(userId) {
  await query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [userId]);
}

export async function userHasDocumentAccess(userId, documentId, requiredPermission = 'READ') {
  const rows = await query(
    `SELECT d.id FROM documents d
     LEFT JOIN document_permissions dp ON d.id = dp.document_id AND dp.user_id = ?
     WHERE d.id = ? AND d.deleted_at IS NULL
       AND (d.owner_id = ? OR dp.user_id = ? OR EXISTS (
         SELECT 1 FROM users u WHERE u.id = ? AND u.role = 'ADMIN'
       ))`,
    [userId, documentId, userId, userId, userId]
  );
  return rows.length > 0;
}

export async function getAccessibleDocumentIds(userId) {
  const rows = await query(
    `SELECT DISTINCT d.id FROM documents d
     LEFT JOIN document_permissions dp ON d.id = dp.document_id AND dp.user_id = ?
     WHERE d.deleted_at IS NULL AND d.status = 'INDEXED'
       AND (d.owner_id = ? OR dp.user_id = ? OR EXISTS (
         SELECT 1 FROM users u WHERE u.id = ? AND u.role = 'ADMIN'
       ))`,
    [userId, userId, userId, userId]
  );
  return rows.map((r) => r.id);
}
