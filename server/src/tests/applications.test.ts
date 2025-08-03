
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, populationTable, applicationsTable } from '../db/schema';
import { 
  type CreateApplicationInput, 
  type UpdateApplicationStatusInput,
  type ApplicationQuery
} from '../schema';
import {
  createApplication,
  updateApplicationStatus,
  getApplication,
  getApplications,
  getMyApplications,
  submitApplication,
  cancelApplication
} from '../handlers/applications';
import { eq } from 'drizzle-orm';

describe('Applications Handlers', () => {
  let testUserId: number;
  let testAdminId: number;
  let testPopulationId: number;

  beforeEach(async () => {
    await createDB();

    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'PENDUDUK'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test admin
    const adminResult = await db.insert(usersTable)
      .values({
        username: 'testadmin',
        email: 'admin@example.com',
        password_hash: 'hashedpassword',
        role: 'ADMIN'
      })
      .returning()
      .execute();
    testAdminId = adminResult[0].id;

    // Create test population record
    const populationResult = await db.insert(populationTable)
      .values({
        nik: '1234567890123456',
        nama_lengkap: 'Test Person',
        tempat_lahir: 'Jakarta',
        tanggal_lahir: '1990-01-01',
        jenis_kelamin: 'LAKI_LAKI',
        agama: 'ISLAM',
        status_perkawinan: 'BELUM_KAWIN',
        pekerjaan: 'Software Engineer',
        kewarganegaraan: 'INDONESIA',
        alamat: 'Jl. Test No. 123',
        rt: '001',
        rw: '002',
        kelurahan: 'Test Kelurahan',
        kecamatan: 'Test Kecamatan',
        kabupaten: 'Test Kabupaten',
        provinsi: 'Test Provinsi',
        kode_pos: '12345',
        created_by: testUserId
      })
      .returning()
      .execute();
    testPopulationId = populationResult[0].id;
  });

  afterEach(resetDB);

  describe('createApplication', () => {
    const testInput: CreateApplicationInput = {
      application_type: 'AKTA_KELAHIRAN',
      population_id: 0, // Will be set in test
      application_data: {
        father_name: 'John Doe',
        mother_name: 'Jane Doe',
        birth_place: 'Jakarta'
      },
      notes: 'Test application'
    };

    it('should create a new application', async () => {
      const input = { ...testInput, population_id: testPopulationId };
      const result = await createApplication(input, testUserId);

      expect(result.application_type).toEqual('AKTA_KELAHIRAN');
      expect(result.applicant_id).toEqual(testUserId);
      expect(result.population_id).toEqual(testPopulationId);
      expect(result.status).toEqual('DRAFT');
      expect(result.application_data).toEqual(input.application_data);
      expect(result.notes).toEqual('Test application');
      expect(result.application_number).toBeDefined();
      expect(result.application_number).toMatch(/^APP\d+[A-Z0-9]{5}$/);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create application without population_id', async () => {
      const input = { ...testInput, population_id: undefined };
      const result = await createApplication(input, testUserId);

      expect(result.population_id).toBeNull();
      expect(result.application_type).toEqual('AKTA_KELAHIRAN');
      expect(result.applicant_id).toEqual(testUserId);
      expect(result.status).toEqual('DRAFT');
    });

    it('should save application to database', async () => {
      const input = { ...testInput, population_id: testPopulationId };
      const result = await createApplication(input, testUserId);

      const applications = await db.select()
        .from(applicationsTable)
        .where(eq(applicationsTable.id, result.id))
        .execute();

      expect(applications).toHaveLength(1);
      expect(applications[0].application_type).toEqual('AKTA_KELAHIRAN');
      expect(applications[0].applicant_id).toEqual(testUserId);
      expect(applications[0].status).toEqual('DRAFT');
    });

    it('should reject invalid user', async () => {
      const input = { ...testInput, population_id: testPopulationId };
      
      await expect(createApplication(input, 999)).rejects.toThrow(/user not found/i);
    });

    it('should reject invalid population_id', async () => {
      const input = { ...testInput, population_id: 999 };
      
      await expect(createApplication(input, testUserId)).rejects.toThrow(/population record not found/i);
    });
  });

  describe('updateApplicationStatus', () => {
    let testApplicationId: number;

    beforeEach(async () => {
      const application = await db.insert(applicationsTable)
        .values({
          application_number: 'APP123456789',
          application_type: 'AKTA_KELAHIRAN',
          applicant_id: testUserId,
          population_id: testPopulationId,
          status: 'SUBMITTED',
          application_data: {}
        })
        .returning()
        .execute();
      testApplicationId = application[0].id;
    });

    it('should update application status by admin', async () => {
      const input: UpdateApplicationStatusInput = {
        application_id: testApplicationId,
        status: 'APPROVED',
        notes: 'Application approved'
      };

      const result = await updateApplicationStatus(input, testAdminId);

      expect(result.status).toEqual('APPROVED');
      expect(result.notes).toEqual('Application approved');
      expect(result.processed_by).toEqual(testAdminId);
      expect(result.processed_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should reject non-admin users', async () => {
      const input: UpdateApplicationStatusInput = {
        application_id: testApplicationId,
        status: 'APPROVED'
      };

      await expect(updateApplicationStatus(input, testUserId)).rejects.toThrow(/insufficient permissions/i);
    });

    it('should reject invalid application', async () => {
      const input: UpdateApplicationStatusInput = {
        application_id: 999,
        status: 'APPROVED'
      };

      await expect(updateApplicationStatus(input, testAdminId)).rejects.toThrow(/application not found/i);
    });

    it('should reject invalid user', async () => {
      const input: UpdateApplicationStatusInput = {
        application_id: testApplicationId,
        status: 'APPROVED'
      };

      await expect(updateApplicationStatus(input, 999)).rejects.toThrow(/user not found/i);
    });
  });

  describe('getApplication', () => {
    let testApplicationId: number;

    beforeEach(async () => {
      const application = await db.insert(applicationsTable)
        .values({
          application_number: 'APP123456789',
          application_type: 'AKTA_KELAHIRAN',
          applicant_id: testUserId,
          status: 'DRAFT',
          application_data: { test: 'data' }
        })
        .returning()
        .execute();
      testApplicationId = application[0].id;
    });

    it('should get application by id', async () => {
      const result = await getApplication(testApplicationId);

      expect(result).toBeDefined();
      expect(result!.id).toEqual(testApplicationId);
      expect(result!.application_number).toEqual('APP123456789');
      expect(result!.application_type).toEqual('AKTA_KELAHIRAN');
      expect(result!.applicant_id).toEqual(testUserId);
      expect(result!.status).toEqual('DRAFT');
    });

    it('should return null for non-existent application', async () => {
      const result = await getApplication(999);
      expect(result).toBeNull();
    });
  });

  describe('getApplications', () => {
    beforeEach(async () => {
      // Create multiple test applications
      await db.insert(applicationsTable)
        .values([
          {
            application_number: 'APP001',
            application_type: 'AKTA_KELAHIRAN',
            applicant_id: testUserId,
            status: 'DRAFT',
            application_data: {}
          },
          {
            application_number: 'APP002',
            application_type: 'KTP_BARU',
            applicant_id: testUserId,
            status: 'SUBMITTED',
            application_data: {}
          },
          {
            application_number: 'APP003',
            application_type: 'AKTA_KELAHIRAN',
            applicant_id: testAdminId,
            status: 'APPROVED',
            application_data: {}
          }
        ])
        .execute();
    });

    it('should get all applications with pagination', async () => {
      const query: ApplicationQuery = {
        page: 1,
        limit: 10
      };

      const result = await getApplications(query);

      expect(result.data).toHaveLength(3);
      expect(result.total).toEqual(3);
      expect(result.data[0]).toBeDefined();
    });

    it('should filter by status', async () => {
      const query: ApplicationQuery = {
        page: 1,
        limit: 10,
        status: 'DRAFT'
      };

      const result = await getApplications(query);

      expect(result.data).toHaveLength(1);
      expect(result.total).toEqual(1);
      expect(result.data[0].status).toEqual('DRAFT');
    });

    it('should filter by application type', async () => {
      const query: ApplicationQuery = {
        page: 1,
        limit: 10,
        application_type: 'AKTA_KELAHIRAN'
      };

      const result = await getApplications(query);

      expect(result.data).toHaveLength(2);
      expect(result.total).toEqual(2);
      result.data.forEach(app => {
        expect(app.application_type).toEqual('AKTA_KELAHIRAN');
      });
    });

    it('should filter by applicant', async () => {
      const query: ApplicationQuery = {
        page: 1,
        limit: 10,
        applicant_id: testUserId
      };

      const result = await getApplications(query);

      expect(result.data).toHaveLength(2);
      expect(result.total).toEqual(2);
      result.data.forEach(app => {
        expect(app.applicant_id).toEqual(testUserId);
      });
    });

    it('should handle pagination correctly', async () => {
      const query: ApplicationQuery = {
        page: 2,
        limit: 2
      };

      const result = await getApplications(query);

      expect(result.data).toHaveLength(1);
      expect(result.total).toEqual(3);
    });
  });

  describe('getMyApplications', () => {
    beforeEach(async () => {
      await db.insert(applicationsTable)
        .values([
          {
            application_number: 'APP001',
            application_type: 'AKTA_KELAHIRAN',
            applicant_id: testUserId,
            status: 'DRAFT',
            application_data: {}
          },
          {
            application_number: 'APP002',
            application_type: 'KTP_BARU',
            applicant_id: testAdminId,
            status: 'SUBMITTED',
            application_data: {}
          }
        ])
        .execute();
    });

    it('should get only user\'s applications', async () => {
      const query: ApplicationQuery = {
        page: 1,
        limit: 10
      };

      const result = await getMyApplications(testUserId, query);

      expect(result.data).toHaveLength(1);
      expect(result.total).toEqual(1);
      expect(result.data[0].applicant_id).toEqual(testUserId);
    });
  });

  describe('submitApplication', () => {
    let testApplicationId: number;

    beforeEach(async () => {
      const application = await db.insert(applicationsTable)
        .values({
          application_number: 'APP123456789',
          application_type: 'AKTA_KELAHIRAN',
          applicant_id: testUserId,
          status: 'DRAFT',
          application_data: {}
        })
        .returning()
        .execute();
      testApplicationId = application[0].id;
    });

    it('should submit draft application', async () => {
      const result = await submitApplication(testApplicationId);

      expect(result.status).toEqual('SUBMITTED');
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should reject non-existent application', async () => {
      await expect(submitApplication(999)).rejects.toThrow(/application not found/i);
    });

    it('should reject non-draft application', async () => {
      // Update application to submitted status
      await db.update(applicationsTable)
        .set({ status: 'SUBMITTED' })
        .where(eq(applicationsTable.id, testApplicationId))
        .execute();

      await expect(submitApplication(testApplicationId)).rejects.toThrow(/only draft applications/i);
    });
  });

  describe('cancelApplication', () => {
    let testApplicationId: number;

    beforeEach(async () => {
      const application = await db.insert(applicationsTable)
        .values({
          application_number: 'APP123456789',
          application_type: 'AKTA_KELAHIRAN',
          applicant_id: testUserId,
          status: 'DRAFT',
          application_data: {}
        })
        .returning()
        .execute();
      testApplicationId = application[0].id;
    });

    it('should cancel own application', async () => {
      const result = await cancelApplication(testApplicationId, testUserId);

      expect(result.success).toBe(true);

      // Verify application is deleted
      const applications = await db.select()
        .from(applicationsTable)
        .where(eq(applicationsTable.id, testApplicationId))
        .execute();

      expect(applications).toHaveLength(0);
    });

    it('should reject canceling other user\'s application', async () => {
      await expect(cancelApplication(testApplicationId, testAdminId)).rejects.toThrow(/not found or access denied/i);
    });

    it('should reject canceling non-existent application', async () => {
      await expect(cancelApplication(999, testUserId)).rejects.toThrow(/not found or access denied/i);
    });

    it('should reject canceling processed application', async () => {
      // Update application to approved status
      await db.update(applicationsTable)
        .set({ status: 'APPROVED' })
        .where(eq(applicationsTable.id, testApplicationId))
        .execute();

      await expect(cancelApplication(testApplicationId, testUserId)).rejects.toThrow(/cannot cancel application/i);
    });
  });
});
