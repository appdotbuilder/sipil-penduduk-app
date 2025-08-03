
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, auditLogsTable } from '../db/schema';
import { logAudit, getAuditLogs, getAuditLogsByUser, getAuditLogsByTable } from '../handlers/audit';
import { eq } from 'drizzle-orm';

describe('Audit Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        role: 'PENDUDUK'
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;
  });

  describe('logAudit', () => {
    it('should create an audit log entry', async () => {
      const oldValues = { name: 'Old Name' };
      const newValues = { name: 'New Name' };

      const result = await logAudit(
        testUserId,
        'UPDATE',
        'population',
        123,
        oldValues,
        newValues,
        '192.168.1.1',
        'Mozilla/5.0'
      );

      expect(result.user_id).toEqual(testUserId);
      expect(result.action).toEqual('UPDATE');
      expect(result.table_name).toEqual('population');
      expect(result.record_id).toEqual(123);
      expect(result.old_values).toEqual(oldValues);
      expect(result.new_values).toEqual(newValues);
      expect(result.ip_address).toEqual('192.168.1.1');
      expect(result.user_agent).toEqual('Mozilla/5.0');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create audit log with minimal data', async () => {
      const result = await logAudit(
        testUserId,
        'CREATE',
        'users'
      );

      expect(result.user_id).toEqual(testUserId);
      expect(result.action).toEqual('CREATE');
      expect(result.table_name).toEqual('users');
      expect(result.record_id).toBeNull();
      expect(result.old_values).toBeNull();
      expect(result.new_values).toBeNull();
      expect(result.ip_address).toBeNull();
      expect(result.user_agent).toBeNull();
    });

    it('should save audit log to database', async () => {
      const result = await logAudit(testUserId, 'DELETE', 'documents', 456);

      const logs = await db.select()
        .from(auditLogsTable)
        .where(eq(auditLogsTable.id, result.id))
        .execute();

      expect(logs).toHaveLength(1);
      expect(logs[0].user_id).toEqual(testUserId);
      expect(logs[0].action).toEqual('DELETE');
      expect(logs[0].table_name).toEqual('documents');
      expect(logs[0].record_id).toEqual(456);
    });
  });

  describe('getAuditLogs', () => {
    beforeEach(async () => {
      // Create test audit logs
      await logAudit(testUserId, 'CREATE', 'users', 1);
      await logAudit(testUserId, 'UPDATE', 'population', 2);
      await logAudit(testUserId, 'DELETE', 'documents', 3);
    });

    it('should return paginated audit logs', async () => {
      const result = await getAuditLogs(1, 2);

      expect(result.data).toHaveLength(2);
      expect(result.total).toEqual(3);
      expect(result.data[0].created_at >= result.data[1].created_at).toBe(true); // Ordered by created_at desc
    });

    it('should return correct page of results', async () => {
      const result = await getAuditLogs(2, 2);

      expect(result.data).toHaveLength(1);
      expect(result.total).toEqual(3);
    });

    it('should return empty results for page beyond data', async () => {
      const result = await getAuditLogs(10, 10);

      expect(result.data).toHaveLength(0);
      expect(result.total).toEqual(3);
    });
  });

  describe('getAuditLogsByUser', () => {
    let otherUserId: number;

    beforeEach(async () => {
      // Create another test user
      const userResult = await db.insert(usersTable)
        .values({
          username: 'otheruser',
          email: 'other@example.com',
          password_hash: 'hashed_password',
          role: 'ADMIN'
        })
        .returning()
        .execute();
      
      otherUserId = userResult[0].id;

      // Create audit logs for both users
      await logAudit(testUserId, 'CREATE', 'users', 1);
      await logAudit(testUserId, 'UPDATE', 'population', 2);
      await logAudit(otherUserId, 'DELETE', 'documents', 3);
    });

    it('should return audit logs for specific user', async () => {
      const result = await getAuditLogsByUser(testUserId);

      expect(result.data).toHaveLength(2);
      expect(result.total).toEqual(2);
      result.data.forEach(log => {
        expect(log.user_id).toEqual(testUserId);
      });
    });

    it('should return paginated results for user', async () => {
      const result = await getAuditLogsByUser(testUserId, 1, 1);

      expect(result.data).toHaveLength(1);
      expect(result.total).toEqual(2);
      expect(result.data[0].user_id).toEqual(testUserId);
    });

    it('should return empty results for user with no logs', async () => {
      // Create a user with no audit logs
      const userResult = await db.insert(usersTable)
        .values({
          username: 'nologsuser',
          email: 'nologs@example.com',
          password_hash: 'hashed_password',
          role: 'PETUGAS'
        })
        .returning()
        .execute();

      const result = await getAuditLogsByUser(userResult[0].id);

      expect(result.data).toHaveLength(0);
      expect(result.total).toEqual(0);
    });
  });

  describe('getAuditLogsByTable', () => {
    beforeEach(async () => {
      // Create audit logs for different tables and records
      await logAudit(testUserId, 'CREATE', 'users', 1);
      await logAudit(testUserId, 'UPDATE', 'users', 1);
      await logAudit(testUserId, 'UPDATE', 'users', 2);
      await logAudit(testUserId, 'DELETE', 'population', 1);
    });

    it('should return audit logs for specific table', async () => {
      const result = await getAuditLogsByTable('users');

      expect(result).toHaveLength(3);
      result.forEach(log => {
        expect(log.table_name).toEqual('users');
      });
      // Should be ordered by created_at desc
      expect(result[0].created_at >= result[1].created_at).toBe(true);
    });

    it('should return audit logs for specific table and record', async () => {
      const result = await getAuditLogsByTable('users', 1);

      expect(result).toHaveLength(2);
      result.forEach(log => {
        expect(log.table_name).toEqual('users');
        expect(log.record_id).toEqual(1);
      });
    });

    it('should return empty results for non-existent table', async () => {
      const result = await getAuditLogsByTable('nonexistent');

      expect(result).toHaveLength(0);
    });

    it('should return empty results for non-existent record', async () => {
      const result = await getAuditLogsByTable('users', 999);

      expect(result).toHaveLength(0);
    });
  });
});
