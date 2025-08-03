
import { db } from '../db';
import { auditLogsTable } from '../db/schema';
import { type AuditLog } from '../schema';
import { eq, desc, count, and } from 'drizzle-orm';

export async function logAudit(
  userId: number,
  action: string,
  tableName: string,
  recordId?: number,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<AuditLog> {
  try {
    const result = await db.insert(auditLogsTable)
      .values({
        user_id: userId,
        action: action,
        table_name: tableName,
        record_id: recordId || null,
        old_values: oldValues || null,
        new_values: newValues || null,
        ip_address: ipAddress || null,
        user_agent: userAgent || null
      })
      .returning()
      .execute();

    const auditLog = result[0];
    return {
      ...auditLog,
      old_values: auditLog.old_values as Record<string, any> | null,
      new_values: auditLog.new_values as Record<string, any> | null
    };
  } catch (error) {
    console.error('Audit log creation failed:', error);
    throw error;
  }
}

export async function getAuditLogs(page: number = 1, limit: number = 50): Promise<{ data: AuditLog[]; total: number }> {
  try {
    const offset = (page - 1) * limit;

    // Get total count
    const totalResult = await db.select({ count: count() })
      .from(auditLogsTable)
      .execute();
    
    const total = totalResult[0].count;

    // Get paginated data
    const results = await db.select()
      .from(auditLogsTable)
      .orderBy(desc(auditLogsTable.created_at))
      .limit(limit)
      .offset(offset)
      .execute();

    const data = results.map(auditLog => ({
      ...auditLog,
      old_values: auditLog.old_values as Record<string, any> | null,
      new_values: auditLog.new_values as Record<string, any> | null
    }));

    return { data, total };
  } catch (error) {
    console.error('Audit logs retrieval failed:', error);
    throw error;
  }
}

export async function getAuditLogsByUser(userId: number, page: number = 1, limit: number = 50): Promise<{ data: AuditLog[]; total: number }> {
  try {
    const offset = (page - 1) * limit;

    // Get total count for the user
    const totalResult = await db.select({ count: count() })
      .from(auditLogsTable)
      .where(eq(auditLogsTable.user_id, userId))
      .execute();
    
    const total = totalResult[0].count;

    // Get paginated data for the user
    const results = await db.select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.user_id, userId))
      .orderBy(desc(auditLogsTable.created_at))
      .limit(limit)
      .offset(offset)
      .execute();

    const data = results.map(auditLog => ({
      ...auditLog,
      old_values: auditLog.old_values as Record<string, any> | null,
      new_values: auditLog.new_values as Record<string, any> | null
    }));

    return { data, total };
  } catch (error) {
    console.error('User audit logs retrieval failed:', error);
    throw error;
  }
}

export async function getAuditLogsByTable(tableName: string, recordId?: number): Promise<AuditLog[]> {
  try {
    // Build the query based on whether recordId is provided
    const results = recordId !== undefined
      ? await db.select()
          .from(auditLogsTable)
          .where(and(
            eq(auditLogsTable.table_name, tableName),
            eq(auditLogsTable.record_id, recordId)
          ))
          .orderBy(desc(auditLogsTable.created_at))
          .execute()
      : await db.select()
          .from(auditLogsTable)
          .where(eq(auditLogsTable.table_name, tableName))
          .orderBy(desc(auditLogsTable.created_at))
          .execute();
    
    return results.map(auditLog => ({
      ...auditLog,
      old_values: auditLog.old_values as Record<string, any> | null,
      new_values: auditLog.new_values as Record<string, any> | null
    }));
  } catch (error) {
    console.error('Table audit logs retrieval failed:', error);
    throw error;
  }
}
