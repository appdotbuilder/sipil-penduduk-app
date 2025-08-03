
import { db } from '../db';
import { populationTable } from '../db/schema';
import { 
  type CreatePopulationInput, 
  type UpdatePopulationInput, 
  type Population,
  type PopulationQuery
} from '../schema';
import { eq, ilike, or, and, count, desc } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

// Helper function to convert database record to Population type
function convertToPopulation(record: any): Population {
  return {
    ...record,
    tanggal_lahir: new Date(record.tanggal_lahir)
  };
}

// Helper function to format date for database
function formatDateForDB(date: Date): string {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

export async function createPopulation(input: CreatePopulationInput, userId: number): Promise<Population> {
  try {
    const result = await db.insert(populationTable)
      .values({
        nik: input.nik,
        nama_lengkap: input.nama_lengkap,
        tempat_lahir: input.tempat_lahir,
        tanggal_lahir: formatDateForDB(input.tanggal_lahir),
        jenis_kelamin: input.jenis_kelamin,
        agama: input.agama,
        status_perkawinan: input.status_perkawinan,
        pekerjaan: input.pekerjaan,
        kewarganegaraan: input.kewarganegaraan,
        alamat: input.alamat,
        rt: input.rt,
        rw: input.rw,
        kelurahan: input.kelurahan,
        kecamatan: input.kecamatan,
        kabupaten: input.kabupaten,
        provinsi: input.provinsi,
        kode_pos: input.kode_pos,
        nomor_kk: input.nomor_kk || null,
        nama_ayah: input.nama_ayah || null,
        nama_ibu: input.nama_ibu || null,
        created_by: userId
      })
      .returning()
      .execute();

    return convertToPopulation(result[0]);
  } catch (error) {
    console.error('Population creation failed:', error);
    throw error;
  }
}

export async function updatePopulation(input: UpdatePopulationInput): Promise<Population> {
  try {
    const updateData: any = {};
    
    // Only include defined fields in update
    if (input.nik !== undefined) updateData.nik = input.nik;
    if (input.nama_lengkap !== undefined) updateData.nama_lengkap = input.nama_lengkap;
    if (input.tempat_lahir !== undefined) updateData.tempat_lahir = input.tempat_lahir;
    if (input.tanggal_lahir !== undefined) updateData.tanggal_lahir = formatDateForDB(input.tanggal_lahir);
    if (input.jenis_kelamin !== undefined) updateData.jenis_kelamin = input.jenis_kelamin;
    if (input.agama !== undefined) updateData.agama = input.agama;
    if (input.status_perkawinan !== undefined) updateData.status_perkawinan = input.status_perkawinan;
    if (input.pekerjaan !== undefined) updateData.pekerjaan = input.pekerjaan;
    if (input.kewarganegaraan !== undefined) updateData.kewarganegaraan = input.kewarganegaraan;
    if (input.alamat !== undefined) updateData.alamat = input.alamat;
    if (input.rt !== undefined) updateData.rt = input.rt;
    if (input.rw !== undefined) updateData.rw = input.rw;
    if (input.kelurahan !== undefined) updateData.kelurahan = input.kelurahan;
    if (input.kecamatan !== undefined) updateData.kecamatan = input.kecamatan;
    if (input.kabupaten !== undefined) updateData.kabupaten = input.kabupaten;
    if (input.provinsi !== undefined) updateData.provinsi = input.provinsi;
    if (input.kode_pos !== undefined) updateData.kode_pos = input.kode_pos;
    if (input.nomor_kk !== undefined) updateData.nomor_kk = input.nomor_kk;
    if (input.nama_ayah !== undefined) updateData.nama_ayah = input.nama_ayah;
    if (input.nama_ibu !== undefined) updateData.nama_ibu = input.nama_ibu;

    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    const result = await db.update(populationTable)
      .set(updateData)
      .where(eq(populationTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Population record not found');
    }

    return convertToPopulation(result[0]);
  } catch (error) {
    console.error('Population update failed:', error);
    throw error;
  }
}

export async function getPopulation(id: number): Promise<Population | null> {
  try {
    const result = await db.select()
      .from(populationTable)
      .where(eq(populationTable.id, id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    return convertToPopulation(result[0]);
  } catch (error) {
    console.error('Population retrieval failed:', error);
    throw error;
  }
}

export async function getPopulations(query: PopulationQuery): Promise<{ data: Population[]; total: number }> {
  try {
    const offset = (query.page - 1) * query.limit;
    const conditions: SQL<unknown>[] = [];

    // Build search conditions
    if (query.search) {
      conditions.push(
        or(
          ilike(populationTable.nama_lengkap, `%${query.search}%`),
          ilike(populationTable.nik, `%${query.search}%`)
        )!
      );
    }

    if (query.kelurahan) {
      conditions.push(eq(populationTable.kelurahan, query.kelurahan));
    }

    if (query.kecamatan) {
      conditions.push(eq(populationTable.kecamatan, query.kecamatan));
    }

    if (query.kabupaten) {
      conditions.push(eq(populationTable.kabupaten, query.kabupaten));
    }

    // Build where clause
    const whereClause = conditions.length === 0 
      ? undefined 
      : conditions.length === 1 
        ? conditions[0] 
        : and(...conditions);

    // Execute data query
    const dataQuery = db.select()
      .from(populationTable)
      .orderBy(desc(populationTable.created_at))
      .limit(query.limit)
      .offset(offset);

    const data = whereClause 
      ? await dataQuery.where(whereClause).execute()
      : await dataQuery.execute();

    // Execute count query
    const countQuery = db.select({ count: count() }).from(populationTable);
    const totalResult = whereClause 
      ? await countQuery.where(whereClause).execute()
      : await countQuery.execute();

    // Convert dates
    const convertedData = data.map(convertToPopulation);

    return {
      data: convertedData,
      total: totalResult[0].count
    };
  } catch (error) {
    console.error('Population search failed:', error);
    throw error;
  }
}

export async function deletePopulation(id: number): Promise<{ success: boolean }> {
  try {
    const result = await db.delete(populationTable)
      .where(eq(populationTable.id, id))
      .returning()
      .execute();

    return { success: result.length > 0 };
  } catch (error) {
    console.error('Population deletion failed:', error);
    throw error;
  }
}

export async function searchPopulationByNIK(nik: string): Promise<Population | null> {
  try {
    const result = await db.select()
      .from(populationTable)
      .where(eq(populationTable.nik, nik))
      .execute();

    if (result.length === 0) {
      return null;
    }

    return convertToPopulation(result[0]);
  } catch (error) {
    console.error('Population NIK search failed:', error);
    throw error;
  }
}
