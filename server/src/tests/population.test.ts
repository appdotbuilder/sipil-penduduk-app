
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { populationTable, usersTable } from '../db/schema';
import { 
  type CreatePopulationInput, 
  type UpdatePopulationInput,
  type PopulationQuery
} from '../schema';
import { 
  createPopulation, 
  updatePopulation, 
  getPopulation, 
  getPopulations,
  deletePopulation,
  searchPopulationByNIK
} from '../handlers/population';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password_hash: 'hashed_password',
  role: 'ADMIN' as const
};

const testPopulationInput: CreatePopulationInput = {
  nik: '1234567890123456',
  nama_lengkap: 'John Doe',
  tempat_lahir: 'Jakarta',
  tanggal_lahir: new Date('1990-01-01'),
  jenis_kelamin: 'LAKI_LAKI',
  agama: 'ISLAM',
  status_perkawinan: 'BELUM_KAWIN',
  pekerjaan: 'Software Developer',
  kewarganegaraan: 'INDONESIA',
  alamat: 'Jl. Sudirman No. 123',
  rt: '001',
  rw: '002',
  kelurahan: 'Menteng',
  kecamatan: 'Menteng',
  kabupaten: 'Jakarta Pusat',
  provinsi: 'DKI Jakarta',
  kode_pos: '10310',
  nomor_kk: '1234567890123450',
  nama_ayah: 'John Senior',
  nama_ibu: 'Jane Doe'
};

describe('Population Handlers', () => {
  let userId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;
  });

  afterEach(resetDB);

  describe('createPopulation', () => {
    it('should create a population record', async () => {
      const result = await createPopulation(testPopulationInput, userId);

      expect(result.id).toBeDefined();
      expect(result.nik).toEqual('1234567890123456');
      expect(result.nama_lengkap).toEqual('John Doe');
      expect(result.tempat_lahir).toEqual('Jakarta');
      expect(result.tanggal_lahir).toEqual(new Date('1990-01-01'));
      expect(result.jenis_kelamin).toEqual('LAKI_LAKI');
      expect(result.agama).toEqual('ISLAM');
      expect(result.status_perkawinan).toEqual('BELUM_KAWIN');
      expect(result.pekerjaan).toEqual('Software Developer');
      expect(result.kewarganegaraan).toEqual('INDONESIA');
      expect(result.alamat).toEqual('Jl. Sudirman No. 123');
      expect(result.rt).toEqual('001');
      expect(result.rw).toEqual('002');
      expect(result.kelurahan).toEqual('Menteng');
      expect(result.kecamatan).toEqual('Menteng');
      expect(result.kabupaten).toEqual('Jakarta Pusat');
      expect(result.provinsi).toEqual('DKI Jakarta');
      expect(result.kode_pos).toEqual('10310');
      expect(result.nomor_kk).toEqual('1234567890123450');
      expect(result.nama_ayah).toEqual('John Senior');
      expect(result.nama_ibu).toEqual('Jane Doe');
      expect(result.created_by).toEqual(userId);
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
      expect(result.tanggal_lahir).toBeInstanceOf(Date);
    });

    it('should save population to database', async () => {
      const result = await createPopulation(testPopulationInput, userId);

      const saved = await db.select()
        .from(populationTable)
        .where(eq(populationTable.id, result.id))
        .execute();

      expect(saved).toHaveLength(1);
      expect(saved[0].nik).toEqual('1234567890123456');
      expect(saved[0].nama_lengkap).toEqual('John Doe');
      expect(saved[0].created_by).toEqual(userId);
      expect(saved[0].tanggal_lahir).toEqual('1990-01-01'); // DB stores as string
    });

    it('should handle nullable fields correctly', async () => {
      const inputWithNulls = {
        ...testPopulationInput,
        nomor_kk: null,
        nama_ayah: null,
        nama_ibu: null
      };

      const result = await createPopulation(inputWithNulls, userId);

      expect(result.nomor_kk).toBeNull();
      expect(result.nama_ayah).toBeNull();
      expect(result.nama_ibu).toBeNull();
    });

    it('should throw error for duplicate NIK', async () => {
      await createPopulation(testPopulationInput, userId);

      await expect(createPopulation(testPopulationInput, userId))
        .rejects.toThrow();
    });
  });

  describe('updatePopulation', () => {
    it('should update population record', async () => {
      const created = await createPopulation(testPopulationInput, userId);

      const updateInput: UpdatePopulationInput = {
        id: created.id,
        nama_lengkap: 'Jane Doe Updated',
        alamat: 'New Address 456'
      };

      const result = await updatePopulation(updateInput);

      expect(result.id).toEqual(created.id);
      expect(result.nama_lengkap).toEqual('Jane Doe Updated');
      expect(result.alamat).toEqual('New Address 456');
      expect(result.nik).toEqual(testPopulationInput.nik); // Should remain unchanged
      expect(result.tanggal_lahir).toBeInstanceOf(Date);
      expect(result.updated_at.getTime()).toBeGreaterThan(created.updated_at.getTime());
    });

    it('should update only provided fields', async () => {
      const created = await createPopulation(testPopulationInput, userId);

      const updateInput: UpdatePopulationInput = {
        id: created.id,
        pekerjaan: 'Teacher'
      };

      const result = await updatePopulation(updateInput);

      expect(result.pekerjaan).toEqual('Teacher');
      expect(result.nama_lengkap).toEqual(testPopulationInput.nama_lengkap); // Should remain unchanged
      expect(result.alamat).toEqual(testPopulationInput.alamat); // Should remain unchanged
      expect(result.tanggal_lahir).toBeInstanceOf(Date);
    });

    it('should update date fields correctly', async () => {
      const created = await createPopulation(testPopulationInput, userId);
      const newDate = new Date('1995-06-15');

      const updateInput: UpdatePopulationInput = {
        id: created.id,
        tanggal_lahir: newDate
      };

      const result = await updatePopulation(updateInput);

      expect(result.tanggal_lahir).toBeInstanceOf(Date);
      expect(result.tanggal_lahir).toEqual(newDate);
    });

    it('should throw error for non-existent record', async () => {
      const updateInput: UpdatePopulationInput = {
        id: 99999,
        nama_lengkap: 'Non Existent'
      };

      await expect(updatePopulation(updateInput))
        .rejects.toThrow(/not found/i);
    });
  });

  describe('getPopulation', () => {
    it('should retrieve population by id', async () => {
      const created = await createPopulation(testPopulationInput, userId);

      const result = await getPopulation(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.nik).toEqual('1234567890123456');
      expect(result!.nama_lengkap).toEqual('John Doe');
      expect(result!.tanggal_lahir).toBeInstanceOf(Date);
      expect(result!.tanggal_lahir).toEqual(new Date('1990-01-01'));
    });

    it('should return null for non-existent id', async () => {
      const result = await getPopulation(99999);

      expect(result).toBeNull();
    });
  });

  describe('getPopulations', () => {
    beforeEach(async () => {
      // Create multiple test populations
      const populations = [
        { ...testPopulationInput, nik: '1111111111111111', nama_lengkap: 'Alice Smith', kelurahan: 'Kemang' },
        { ...testPopulationInput, nik: '2222222222222222', nama_lengkap: 'Bob Jones', kecamatan: 'Kebayoran' },
        { ...testPopulationInput, nik: '3333333333333333', nama_lengkap: 'Charlie Brown', kabupaten: 'Jakarta Selatan' }
      ];

      for (const pop of populations) {
        await createPopulation(pop, userId);
      }
    });

    it('should return paginated results', async () => {
      const query: PopulationQuery = {
        page: 1,
        limit: 2
      };

      const result = await getPopulations(query);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBeGreaterThanOrEqual(3);
      result.data.forEach(pop => {
        expect(pop.tanggal_lahir).toBeInstanceOf(Date);
      });
    });

    it('should search by name', async () => {
      const query: PopulationQuery = {
        page: 1,
        limit: 10,
        search: 'Alice'
      };

      const result = await getPopulations(query);

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0].nama_lengkap).toContain('Alice');
      expect(result.data[0].tanggal_lahir).toBeInstanceOf(Date);
    });

    it('should search by NIK', async () => {
      const query: PopulationQuery = {
        page: 1,
        limit: 10,
        search: '1111111111111111'
      };

      const result = await getPopulations(query);

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0].nik).toEqual('1111111111111111');
      expect(result.data[0].tanggal_lahir).toBeInstanceOf(Date);
    });

    it('should filter by kelurahan', async () => {
      const query: PopulationQuery = {
        page: 1,
        limit: 10,
        kelurahan: 'Kemang'
      };

      const result = await getPopulations(query);

      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach(pop => {
        expect(pop.kelurahan).toEqual('Kemang');
        expect(pop.tanggal_lahir).toBeInstanceOf(Date);
      });
    });

    it('should filter by multiple criteria', async () => {
      const query: PopulationQuery = {
        page: 1,
        limit: 10,
        search: 'Bob',
        kecamatan: 'Kebayoran'
      };

      const result = await getPopulations(query);

      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach(pop => {
        expect(pop.nama_lengkap).toContain('Bob');
        expect(pop.kecamatan).toEqual('Kebayoran');
        expect(pop.tanggal_lahir).toBeInstanceOf(Date);
      });
    });

    it('should return empty results for non-matching search', async () => {
      const query: PopulationQuery = {
        page: 1,
        limit: 10,
        search: 'NonExistentName'
      };

      const result = await getPopulations(query);

      expect(result.data).toHaveLength(0);
      expect(result.total).toEqual(0);
    });
  });

  describe('deletePopulation', () => {
    it('should delete population record', async () => {
      const created = await createPopulation(testPopulationInput, userId);

      const result = await deletePopulation(created.id);

      expect(result.success).toBe(true);

      // Verify record is deleted
      const deleted = await getPopulation(created.id);
      expect(deleted).toBeNull();
    });

    it('should return false for non-existent record', async () => {
      const result = await deletePopulation(99999);

      expect(result.success).toBe(false);
    });
  });

  describe('searchPopulationByNIK', () => {
    it('should find population by exact NIK match', async () => {
      const created = await createPopulation(testPopulationInput, userId);

      const result = await searchPopulationByNIK('1234567890123456');

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.nik).toEqual('1234567890123456');
      expect(result!.nama_lengkap).toEqual('John Doe');
      expect(result!.tanggal_lahir).toBeInstanceOf(Date);
      expect(result!.tanggal_lahir).toEqual(new Date('1990-01-01'));
    });

    it('should return null for non-existent NIK', async () => {
      const result = await searchPopulationByNIK('9999999999999999');

      expect(result).toBeNull();
    });
  });
});
