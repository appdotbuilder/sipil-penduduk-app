
import { db } from '../db';
import { documentsTable, populationTable, usersTable } from '../db/schema';
import { 
  type UploadDocumentInput, 
  type ValidateDocumentInput, 
  type Document 
} from '../schema';
import { eq, and } from 'drizzle-orm';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const UPLOAD_DIR = 'uploads/documents';

// Ensure upload directory exists
const ensureUploadDir = async () => {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
};

export async function uploadDocument(input: UploadDocumentInput, userId: number): Promise<Document> {
  try {
    // Verify population exists
    const population = await db.select()
      .from(populationTable)
      .where(eq(populationTable.id, input.population_id))
      .execute();

    if (population.length === 0) {
      throw new Error('Population record not found');
    }

    // Validate file type
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];
    
    if (!allowedMimeTypes.includes(input.mime_type)) {
      throw new Error('Invalid file type. Only PDF and image files are allowed');
    }

    // Validate file size (max 5MB)
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    if (input.file_size > maxFileSize) {
      throw new Error('File size exceeds maximum limit of 5MB');
    }

    // Ensure upload directory exists
    await ensureUploadDir();

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = input.file_name.split('.').pop();
    const uniqueFileName = `${timestamp}_${input.population_id}_${input.document_type}.${fileExtension}`;
    const filePath = join(UPLOAD_DIR, uniqueFileName);

    // Decode base64 and save file
    const fileBuffer = Buffer.from(input.file_data, 'base64');
    await writeFile(filePath, fileBuffer);

    // Insert document record
    const result = await db.insert(documentsTable)
      .values({
        population_id: input.population_id,
        document_type: input.document_type,
        document_number: input.document_number || null,
        file_path: filePath,
        file_name: input.file_name,
        file_size: input.file_size,
        mime_type: input.mime_type,
        uploaded_by: userId
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Document upload failed:', error);
    throw error;
  }
}

export async function validateDocument(input: ValidateDocumentInput, userId: number): Promise<Document> {
  try {
    // Verify document exists
    const existingDoc = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, input.document_id))
      .execute();

    if (existingDoc.length === 0) {
      throw new Error('Document not found');
    }

    // Update document validation status
    const result = await db.update(documentsTable)
      .set({
        is_validated: input.is_valid,
        validated_by: userId,
        validated_at: new Date()
      })
      .where(eq(documentsTable.id, input.document_id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Document validation failed:', error);
    throw error;
  }
}

export async function getDocuments(population_id: number): Promise<Document[]> {
  try {
    const documents = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.population_id, population_id))
      .execute();

    return documents;
  } catch (error) {
    console.error('Failed to get documents:', error);
    throw error;
  }
}

export async function getDocument(id: number): Promise<Document | null> {
  try {
    const documents = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, id))
      .execute();

    return documents.length > 0 ? documents[0] : null;
  } catch (error) {
    console.error('Failed to get document:', error);
    throw error;
  }
}

export async function deleteDocument(id: number): Promise<{ success: boolean }> {
  try {
    // Get document info first
    const document = await getDocument(id);
    if (!document) {
      throw new Error('Document not found');
    }

    // Delete file from filesystem
    try {
      await unlink(document.file_path);
    } catch (fileError) {
      console.warn('Failed to delete file from filesystem:', fileError);
      // Continue with database deletion even if file deletion fails
    }

    // Delete database record
    await db.delete(documentsTable)
      .where(eq(documentsTable.id, id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Document deletion failed:', error);
    throw error;
  }
}

export async function downloadDocument(id: number): Promise<{ file_path: string; file_name: string } | null> {
  try {
    const document = await getDocument(id);
    if (!document) {
      return null;
    }

    // Verify file exists
    if (!existsSync(document.file_path)) {
      throw new Error('File not found on filesystem');
    }

    return {
      file_path: document.file_path,
      file_name: document.file_name
    };
  } catch (error) {
    console.error('Document download failed:', error);
    throw error;
  }
}
