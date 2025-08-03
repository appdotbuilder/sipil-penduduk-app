
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, populationTable, applicationsTable, documentsTable } from '../db/schema';
import { 
  getDashboardStats, 
  getApplicationStatsByType, 
  getPopulationStatsByRegion,
  exportApplicationsReport,
  exportPopulationReport
} from '../handlers/dashboard';

describe('Dashboard Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('getDashboardStats', () => {
    it('should return empty stats for empty database', async () => {
      const stats = await getDashboardStats();

      expect(stats.totalPopulation).toBe(0);
      expect(stats.totalApplications).toBe(0);
      expect(stats.pendingApplications).toBe(0);
      expect(stats.approvedApplications).toBe(0);
      expect(stats.rejectedApplications).toBe(0);
      expect(stats.documentsUploaded).toBe(0);
      expect(stats.documentsValidated).toBe(0);
      expect(stats.recentApplications).toHaveLength(0);
    });

    it('should return correct stats with test data', async () => {
      // Create test user
      const userResult = await db.insert(usersTable)
        .values({
          username: 'testuser',
          email: 'test@example.com',
          password_hash: 'hashed_password',
          role: 'ADMIN'
        })
        .returning()
        .execute();
      const userId = userResult[0].id;

      // Create test population records
      const populationResult = await db.insert(populationTable)
        .values({
          nik: '1234567890123456',
          nama_lengkap: 'Test User 1',
          tempat_lahir: 'Jakarta',
          tanggal_lahir: '1990-01-01',
          jenis_kelamin: 'LAKI_LAKI',
          agama: 'ISLAM',
          status_perkawinan: 'BELUM_KAWIN',
          pekerjaan: 'Software Engineer',
          alamat: 'Jl. Test No. 1',
          rt: '001',
          rw: '002',
          kelurahan: 'Test Kelurahan',
          kecamatan: 'Test Kecamatan',
          kabupaten: 'Test Kabupaten',
          provinsi: 'Test Provinsi',
          kode_pos: '12345',
          created_by: userId
        })
        .returning()
        .execute();

      const populationResult2 = await db.insert(populationTable)
        .values({
          nik: '1234567890123457',
          nama_lengkap: 'Test User 2',
          tempat_lahir: 'Bandung',
          tanggal_lahir: '1985-05-15',
          jenis_kelamin: 'PEREMPUAN',
          agama: 'KRISTEN',
          status_perkawinan: 'KAWIN',
          pekerjaan: 'Teacher',
          alamat: 'Jl. Test No. 2',
          rt: '002',
          rw: '003',
          kelurahan: 'Test Kelurahan 2',
          kecamatan: 'Test Kecamatan 2',
          kabupaten: 'Test Kabupaten 2',
          provinsi: 'Test Provinsi 2',
          kode_pos: '54321',
          created_by: userId
        })
        .returning()
        .execute();

      // Create test applications with different statuses
      await db.insert(applicationsTable)
        .values({
          application_number: 'APP001',
          application_type: 'KTP_BARU',
          applicant_id: userId,
          population_id: populationResult[0].id,
          status: 'SUBMITTED',
          application_data: { test: 'data' }
        })
        .execute();

      await db.insert(applicationsTable)
        .values({
          application_number: 'APP002',
          application_type: 'AKTA_KELAHIRAN',
          applicant_id: userId,
          population_id: populationResult2[0].id,
          status: 'APPROVED',
          application_data: { test: 'data' }
        })
        .execute();

      await db.insert(applicationsTable)
        .values({
          application_number: 'APP003',
          application_type: 'KK_BARU',
          applicant_id: userId,
          status: 'REJECTED',
          application_data: { test: 'data' }
        })
        .execute();

      // Create test documents
      await db.insert(documentsTable)
        .values({
          population_id: populationResult[0].id,
          document_type: 'KTP',
          file_path: '/uploads/doc1.pdf',
          file_name: 'doc1.pdf',
          file_size: 1024,
          mime_type: 'application/pdf',
          is_validated: true,
          uploaded_by: userId
        })
        .execute();

      await db.insert(documentsTable)
        .values({
          population_id: populationResult2[0].id,
          document_type: 'KARTU_KELUARGA',
          file_path: '/uploads/doc2.pdf',
          file_name: 'doc2.pdf',
          file_size: 2048,
          mime_type: 'application/pdf',
          is_validated: false,
          uploaded_by: userId
        })
        .execute();

      const stats = await getDashboardStats();

      expect(stats.totalPopulation).toBe(2);
      expect(stats.totalApplications).toBe(3);
      expect(stats.pendingApplications).toBe(1);
      expect(stats.approvedApplications).toBe(1);
      expect(stats.rejectedApplications).toBe(1);
      expect(stats.documentsUploaded).toBe(2);
      expect(stats.documentsValidated).toBe(1);
      expect(stats.recentApplications).toHaveLength(3);
      expect(stats.recentApplications[0].application_number).toBe('APP003');
    });
  });

  describe('getApplicationStatsByType', () => {
    it('should return zero counts for all types when no applications exist', async () => {
      const stats = await getApplicationStatsByType();

      expect(stats['AKTA_KELAHIRAN']).toBe(0);
      expect(stats['AKTA_KEMATIAN']).toBe(0);
      expect(stats['PERUBAHAN_DATA']).toBe(0);
      expect(stats['PINDAH_DATANG']).toBe(0);
      expect(stats['KK_BARU']).toBe(0);
      expect(stats['KTP_BARU']).toBe(0);
    });

    it('should return correct counts by application type', async () => {
      // Create test user
      const userResult = await db.insert(usersTable)
        .values({
          username: 'testuser',
          email: 'test@example.com',
          password_hash: 'hashed_password',
          role: 'ADMIN'
        })
        .returning()
        .execute();
      const userId = userResult[0].id;

      // Create applications of different types
      await db.insert(applicationsTable)
        .values({
          application_number: 'APP001',
          application_type: 'KTP_BARU',
          applicant_id: userId,
          status: 'SUBMITTED',
          application_data: { test: 'data' }
        })
        .execute();

      await db.insert(applicationsTable)
        .values({
          application_number: 'APP002',
          application_type: 'KTP_BARU',
          applicant_id: userId,
          status: 'APPROVED',
          application_data: { test: 'data' }
        })
        .execute();

      await db.insert(applicationsTable)
        .values({
          application_number: 'APP003',
          application_type: 'AKTA_KELAHIRAN',
          applicant_id: userId,
          status: 'SUBMITTED',
          application_data: { test: 'data' }
        })
        .execute();

      const stats = await getApplicationStatsByType();

      expect(stats['KTP_BARU']).toBe(2);
      expect(stats['AKTA_KELAHIRAN']).toBe(1);
      expect(stats['AKTA_KEMATIAN']).toBe(0);
      expect(stats['PERUBAHAN_DATA']).toBe(0);
      expect(stats['PINDAH_DATANG']).toBe(0);
      expect(stats['KK_BARU']).toBe(0);
    });
  });

  describe('getPopulationStatsByRegion', () => {
    it('should return empty stats when no population exists', async () => {
      const stats = await getPopulationStatsByRegion();

      expect(Object.keys(stats)).toHaveLength(0);
    });

    it('should return correct counts by region', async () => {
      // Create test user
      const userResult = await db.insert(usersTable)
        .values({
          username: 'testuser',
          email: 'test@example.com',
          password_hash: 'hashed_password',
          role: 'ADMIN'
        })
        .returning()
        .execute();
      const userId = userResult[0].id;

      // Create population in different regions
      await db.insert(populationTable)
        .values({
          nik: '1234567890123456',
          nama_lengkap: 'Test User 1',
          tempat_lahir: 'Jakarta',
          tanggal_lahir: '1990-01-01',
          jenis_kelamin: 'LAKI_LAKI',
          agama: 'ISLAM',
          status_perkawinan: 'BELUM_KAWIN',
          pekerjaan: 'Software Engineer',
          alamat: 'Jl. Test No. 1',
          rt: '001',
          rw: '002',
          kelurahan: 'Test Kelurahan',
          kecamatan: 'Test Kecamatan',
          kabupaten: 'Jakarta Pusat',
          provinsi: 'DKI Jakarta',
          kode_pos: '12345',
          created_by: userId
        })
        .execute();

      await db.insert(populationTable)
        .values({
          nik: '1234567890123457',
          nama_lengkap: 'Test User 2',
          tempat_lahir: 'Jakarta',
          tanggal_lahir: '1985-05-15',
          jenis_kelamin: 'PEREMPUAN',
          agama: 'KRISTEN',
          status_perkawinan: 'KAWIN',
          pekerjaan: 'Teacher',
          alamat: 'Jl. Test No. 2',
          rt: '002',
          rw: '003',
          kelurahan: 'Test Kelurahan 2',
          kecamatan: 'Test Kecamatan 2',
          kabupaten: 'Jakarta Pusat',
          provinsi: 'DKI Jakarta',
          kode_pos: '54321',
          created_by: userId
        })
        .execute();

      await db.insert(populationTable)
        .values({
          nik: '1234567890123458',
          nama_lengkap: 'Test User 3',
          tempat_lahir: 'Bandung',
          tanggal_lahir: '1988-03-10',
          jenis_kelamin: 'LAKI_LAKI',
          agama: 'ISLAM',
          status_perkawinan: 'BELUM_KAWIN',
          pekerjaan: 'Designer',
          alamat: 'Jl. Test No. 3',
          rt: '003',
          rw: '004',
          kelurahan: 'Test Kelurahan 3',
          kecamatan: 'Test Kecamatan 3',
          kabupaten: 'Bandung',
          provinsi: 'Jawa Barat',
          kode_pos: '40123',
          created_by: userId
        })
        .execute();

      const stats = await getPopulationStatsByRegion();

      expect(stats['Jakarta Pusat']).toBe(2);
      expect(stats['Bandung']).toBe(1);
    });
  });

  describe('exportApplicationsReport', () => {
    it('should return file information for PDF export', async () => {
      const result = await exportApplicationsReport('pdf');

      expect(result.file_path).toMatch(/^\/exports\/applications_report_.*\.pdf$/);
      expect(result.file_name).toMatch(/^applications_report_.*\.pdf$/);
    });

    it('should return file information for Excel export', async () => {
      const result = await exportApplicationsReport('excel');

      expect(result.file_path).toMatch(/^\/exports\/applications_report_.*\.xlsx$/);
      expect(result.file_name).toMatch(/^applications_report_.*\.xlsx$/);
    });
  });

  describe('exportPopulationReport', () => {
    it('should return file information for PDF export', async () => {
      const result = await exportPopulationReport('pdf');

      expect(result.file_path).toMatch(/^\/exports\/population_report_.*\.pdf$/);
      expect(result.file_name).toMatch(/^population_report_.*\.pdf$/);
    });

    it('should return file information for Excel export', async () => {
      const result = await exportPopulationReport('excel');

      expect(result.file_path).toMatch(/^\/exports\/population_report_.*\.xlsx$/);
      expect(result.file_name).toMatch(/^population_report_.*\.xlsx$/);
    });
  });
});
