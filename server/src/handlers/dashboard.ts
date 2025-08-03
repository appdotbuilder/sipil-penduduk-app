
import { db } from '../db';
import { populationTable, applicationsTable, documentsTable } from '../db/schema';
import { count, sql, eq, desc } from 'drizzle-orm';

export interface DashboardStats {
  totalPopulation: number;
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  documentsUploaded: number;
  documentsValidated: number;
  recentApplications: any[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Get total population count
    const totalPopulationResult = await db.select({ count: count() })
      .from(populationTable)
      .execute();
    const totalPopulation = totalPopulationResult[0]?.count ?? 0;

    // Get total applications count
    const totalApplicationsResult = await db.select({ count: count() })
      .from(applicationsTable)
      .execute();
    const totalApplications = totalApplicationsResult[0]?.count ?? 0;

    // Get pending applications count
    const pendingApplicationsResult = await db.select({ count: count() })
      .from(applicationsTable)
      .where(eq(applicationsTable.status, 'SUBMITTED'))
      .execute();
    const pendingApplications = pendingApplicationsResult[0]?.count ?? 0;

    // Get approved applications count
    const approvedApplicationsResult = await db.select({ count: count() })
      .from(applicationsTable)
      .where(eq(applicationsTable.status, 'APPROVED'))
      .execute();
    const approvedApplications = approvedApplicationsResult[0]?.count ?? 0;

    // Get rejected applications count
    const rejectedApplicationsResult = await db.select({ count: count() })
      .from(applicationsTable)
      .where(eq(applicationsTable.status, 'REJECTED'))
      .execute();
    const rejectedApplications = rejectedApplicationsResult[0]?.count ?? 0;

    // Get total documents uploaded count
    const documentsUploadedResult = await db.select({ count: count() })
      .from(documentsTable)
      .execute();
    const documentsUploaded = documentsUploadedResult[0]?.count ?? 0;

    // Get validated documents count
    const documentsValidatedResult = await db.select({ count: count() })
      .from(documentsTable)
      .where(eq(documentsTable.is_validated, true))
      .execute();
    const documentsValidated = documentsValidatedResult[0]?.count ?? 0;

    // Get recent applications (last 10)
    const recentApplications = await db.select()
      .from(applicationsTable)
      .orderBy(desc(applicationsTable.created_at))
      .limit(10)
      .execute();

    return {
      totalPopulation,
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      documentsUploaded,
      documentsValidated,
      recentApplications
    };
  } catch (error) {
    console.error('Dashboard stats retrieval failed:', error);
    throw error;
  }
}

export async function getApplicationStatsByType(): Promise<Record<string, number>> {
  try {
    const results = await db.select({
      application_type: applicationsTable.application_type,
      count: count()
    })
      .from(applicationsTable)
      .groupBy(applicationsTable.application_type)
      .execute();

    // Initialize all application types with 0
    const stats: Record<string, number> = {
      'AKTA_KELAHIRAN': 0,
      'AKTA_KEMATIAN': 0,
      'PERUBAHAN_DATA': 0,
      'PINDAH_DATANG': 0,
      'KK_BARU': 0,
      'KTP_BARU': 0
    };

    // Fill in actual counts
    results.forEach(result => {
      stats[result.application_type] = result.count;
    });

    return stats;
  } catch (error) {
    console.error('Application stats by type retrieval failed:', error);
    throw error;
  }
}

export async function getPopulationStatsByRegion(): Promise<Record<string, number>> {
  try {
    const results = await db.select({
      region: populationTable.kabupaten,
      count: count()
    })
      .from(populationTable)
      .groupBy(populationTable.kabupaten)
      .execute();

    const stats: Record<string, number> = {};
    results.forEach(result => {
      stats[result.region] = result.count;
    });

    return stats;
  } catch (error) {
    console.error('Population stats by region retrieval failed:', error);
    throw error;
  }
}

export async function exportApplicationsReport(format: 'pdf' | 'excel', filters?: any): Promise<{ file_path: string; file_name: string }> {
  try {
    // In a real implementation, this would:
    // 1. Query applications data with filters
    // 2. Generate PDF/Excel file using libraries like puppeteer/exceljs
    // 3. Save file to exports directory
    // 4. Return file information

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = format === 'pdf' ? 'pdf' : 'xlsx';
    const fileName = `applications_report_${timestamp}.${extension}`;
    const filePath = `/exports/${fileName}`;

    // Placeholder - would contain actual file generation logic
    return {
      file_path: filePath,
      file_name: fileName
    };
  } catch (error) {
    console.error('Applications report export failed:', error);
    throw error;
  }
}

export async function exportPopulationReport(format: 'pdf' | 'excel', filters?: any): Promise<{ file_path: string; file_name: string }> {
  try {
    // In a real implementation, this would:
    // 1. Query population data with filters
    // 2. Generate PDF/Excel file using libraries like puppeteer/exceljs
    // 3. Save file to exports directory
    // 4. Return file information

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = format === 'pdf' ? 'pdf' : 'xlsx';
    const fileName = `population_report_${timestamp}.${extension}`;
    const filePath = `/exports/${fileName}`;

    // Placeholder - would contain actual file generation logic
    return {
      file_path: filePath,
      file_name: fileName
    };
  } catch (error) {
    console.error('Population report export failed:', error);
    throw error;
  }
}
