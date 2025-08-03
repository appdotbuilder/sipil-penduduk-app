
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { documentsTable, populationTable, usersTable } from '../db/schema';
import { type UploadDocumentInput, type ValidateDocumentInput } from '../schema';
import { 
  uploadDocument, 
  validateDocument, 
  getDocuments, 
  getDocument, 
  deleteDocument, 
  downloadDocument 
} from '../handlers/documents';
import { eq } from 'drizzle-orm';
import { existsSync } from 'fs';
import { unlink, mkdir } from 'fs/promises';

// Test data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password_hash: 'hashedpassword',
  role: 'PETUGAS' as const
};

const testPopulation = {
  nik: '1234567890123456',
  nama_lengkap: 'Test Person',
  tempat_lahir: 'Jakarta',
  tanggal_lahir: '1990-01-01', // String format for date column
  jenis_kelamin: 'LAKI_LAKI' as const,
  agama: 'ISLAM' as const,
  status_perkawinan: 'BELUM_KAWIN' as const,
  pekerjaan: 'Programmer',
  kewarganegaraan: 'INDONESIA',
  alamat: 'Jl. Test No. 123',
  rt: '001',
  rw: '002',
  kelurahan: 'Test Kelurahan',
  kecamatan: 'Test Kecamatan',
  kabupaten: 'Test Kabupaten',
  provinsi: 'Test Provinsi',
  kode_pos: '12345',
  nomor_kk: '1234567890123456',
  nama_ayah: 'Test Father',
  nama_ibu: 'Test Mother'
};

const testUploadInput: UploadDocumentInput = {
  population_id: 1,
  document_type: 'KTP',
  document_number: '1234567890123456',
  file_name: 'ktp.pdf',
  file_size: 1024,
  mime_type: 'application/pdf',
  file_data: 'JVBERi0xLjQKJdP0zOEKMSAwIG9iago8PAovVGl0bGUgKFRlc3QgUERGKQovQ3JlYXRvciAoVGVzdCBDcmVhdG9yKQo+PgplbmRvYmoKMiAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMyAwIFIKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFs0IDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KPj4KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAzIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNSAwIFIKPj4KZW5kb2JqCjUgMCBvYmoKPDwKL0xlbmd0aCA0NAo+PgpzdHJlYW0KQlQKL0YxIDEyIFRmCjEwMCA3MDAgVGQKKFRlc3QgUERGKSBUagpFVApzdHJlYW0KZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDA2NjUgCjAwMDAwMDAwMTAgCjAwMDAwMDAwNzkgCjAwMDAwMDAxNzMgCjAwMDAwMDAzMDEgCjAwMDAwMDAzODAgCnRyYWlsZXIKPDwKL1NpemUgNgovUm9vdCAyIDAgUgo+PgpzdGFydHhyZWYKNDkyCiUlRU9G' // Simple PDF base64
};

describe('Documents Handlers', () => {
  let userId: number;
  let populationId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create test population
    const populationResult = await db.insert(populationTable)
      .values({ ...testPopulation, created_by: userId })
      .returning()
      .execute();
    populationId = populationResult[0].id;

    // Update test input with actual population ID
    testUploadInput.population_id = populationId;

    // Ensure upload directory exists
    try {
      await mkdir('uploads/documents', { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  });

  afterEach(async () => {
    // Clean up any uploaded files
    try {
      const documents = await db.select().from(documentsTable).execute();
      for (const doc of documents) {
        if (existsSync(doc.file_path)) {
          await unlink(doc.file_path);
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
    
    await resetDB();
  });

  describe('uploadDocument', () => {
    it('should upload a document successfully', async () => {
      const result = await uploadDocument(testUploadInput, userId);

      expect(result.id).toBeDefined();
      expect(result.population_id).toEqual(populationId);
      expect(result.document_type).toEqual('KTP');
      expect(result.document_number).toEqual('1234567890123456');
      expect(result.file_name).toEqual('ktp.pdf');
      expect(result.file_size).toEqual(1024);
      expect(result.mime_type).toEqual('application/pdf');
      expect(result.is_validated).toEqual(false);
      expect(result.uploaded_by).toEqual(userId);
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.file_path).toContain('uploads/documents');
    });

    it('should save document to database', async () => {
      const result = await uploadDocument(testUploadInput, userId);

      const documents = await db.select()
        .from(documentsTable)
        .where(eq(documentsTable.id, result.id))
        .execute();

      expect(documents).toHaveLength(1);
      expect(documents[0].population_id).toEqual(populationId);
      expect(documents[0].document_type).toEqual('KTP');
      expect(documents[0].uploaded_by).toEqual(userId);
    });

    it('should create physical file', async () => {
      const result = await uploadDocument(testUploadInput, userId);
      expect(existsSync(result.file_path)).toBe(true);
    });

    it('should throw error for non-existent population', async () => {
      const invalidInput = { ...testUploadInput, population_id: 999 };
      
      await expect(uploadDocument(invalidInput, userId)).rejects.toThrow(/Population record not found/i);
    });

    it('should throw error for invalid file type', async () => {
      const invalidInput = { ...testUploadInput, mime_type: 'text/plain' };
      
      await expect(uploadDocument(invalidInput, userId)).rejects.toThrow(/Invalid file type/i);
    });

    it('should throw error for file size too large', async () => {
      const invalidInput = { ...testUploadInput, file_size: 6 * 1024 * 1024 }; // 6MB
      
      await expect(uploadDocument(invalidInput, userId)).rejects.toThrow(/File size exceeds maximum limit/i);
    });
  });

  describe('validateDocument', () => {
    let documentId: number;

    beforeEach(async () => {
      const document = await uploadDocument(testUploadInput, userId);
      documentId = document.id;
    });

    it('should validate document successfully', async () => {
      const validateInput: ValidateDocumentInput = {
        document_id: documentId,
        is_valid: true
      };

      const result = await validateDocument(validateInput, userId);

      expect(result.id).toEqual(documentId);
      expect(result.is_validated).toEqual(true);
      expect(result.validated_by).toEqual(userId);
      expect(result.validated_at).toBeInstanceOf(Date);
    });

    it('should update document in database', async () => {
      const validateInput: ValidateDocumentInput = {
        document_id: documentId,
        is_valid: false
      };

      await validateDocument(validateInput, userId);

      const documents = await db.select()
        .from(documentsTable)
        .where(eq(documentsTable.id, documentId))
        .execute();

      expect(documents[0].is_validated).toEqual(false);
      expect(documents[0].validated_by).toEqual(userId);
      expect(documents[0].validated_at).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent document', async () => {
      const validateInput: ValidateDocumentInput = {
        document_id: 999,
        is_valid: true
      };

      await expect(validateDocument(validateInput, userId)).rejects.toThrow(/Document not found/i);
    });
  });

  describe('getDocuments', () => {
    beforeEach(async () => {
      // Upload multiple documents
      await uploadDocument(testUploadInput, userId);
      await uploadDocument({ 
        ...testUploadInput, 
        document_type: 'KARTU_KELUARGA',
        file_name: 'kk.pdf'
      }, userId);
    });

    it('should return all documents for population', async () => {
      const documents = await getDocuments(populationId);

      expect(documents).toHaveLength(2);
      expect(documents[0].population_id).toEqual(populationId);
      expect(documents[1].population_id).toEqual(populationId);
    });

    it('should return empty array for non-existent population', async () => {
      const documents = await getDocuments(999);
      expect(documents).toHaveLength(0);
    });
  });

  describe('getDocument', () => {
    let documentId: number;

    beforeEach(async () => {
      const document = await uploadDocument(testUploadInput, userId);
      documentId = document.id;
    });

    it('should return document by ID', async () => {
      const document = await getDocument(documentId);

      expect(document).not.toBeNull();
      expect(document!.id).toEqual(documentId);
      expect(document!.population_id).toEqual(populationId);
      expect(document!.document_type).toEqual('KTP');
    });

    it('should return null for non-existent document', async () => {
      const document = await getDocument(999);
      expect(document).toBeNull();
    });
  });

  describe('deleteDocument', () => {
    let documentId: number;
    let filePath: string;

    beforeEach(async () => {
      const document = await uploadDocument(testUploadInput, userId);
      documentId = document.id;
      filePath = document.file_path;
    });

    it('should delete document successfully', async () => {
      const result = await deleteDocument(documentId);

      expect(result.success).toBe(true);

      // Verify document removed from database
      const document = await getDocument(documentId);
      expect(document).toBeNull();

      // Verify file removed from filesystem
      expect(existsSync(filePath)).toBe(false);
    });

    it('should throw error for non-existent document', async () => {
      await expect(deleteDocument(999)).rejects.toThrow(/Document not found/i);
    });
  });

  describe('downloadDocument', () => {
    let documentId: number;

    beforeEach(async () => {
      const document = await uploadDocument(testUploadInput, userId);
      documentId = document.id;
    });

    it('should return download info for existing document', async () => {
      const result = await downloadDocument(documentId);

      expect(result).not.toBeNull();
      expect(result!.file_name).toEqual('ktp.pdf');
      expect(result!.file_path).toContain('uploads/documents');
      expect(existsSync(result!.file_path)).toBe(true);
    });

    it('should return null for non-existent document', async () => {
      const result = await downloadDocument(999);
      expect(result).toBeNull();
    });
  });
});
