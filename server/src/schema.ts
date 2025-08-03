
import { z } from 'zod';

// User roles enum
export const userRoleSchema = z.enum(['SUPER_ADMIN', 'ADMIN', 'PETUGAS', 'PENDUDUK']);
export type UserRole = z.infer<typeof userRoleSchema>;

// Document types enum
export const documentTypeSchema = z.enum(['KTP', 'KARTU_KELUARGA', 'AKTA_KELAHIRAN', 'AKTA_KEMATIAN']);
export type DocumentType = z.infer<typeof documentTypeSchema>;

// Application types enum
export const applicationTypeSchema = z.enum([
  'AKTA_KELAHIRAN',
  'AKTA_KEMATIAN',
  'PERUBAHAN_DATA',
  'PINDAH_DATANG',
  'KK_BARU',
  'KTP_BARU'
]);
export type ApplicationType = z.infer<typeof applicationTypeSchema>;

// Application status enum
export const applicationStatusSchema = z.enum(['DRAFT', 'SUBMITTED', 'PROCESSING', 'APPROVED', 'REJECTED']);
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

// Gender enum
export const genderSchema = z.enum(['LAKI_LAKI', 'PEREMPUAN']);
export type Gender = z.infer<typeof genderSchema>;

// Religion enum
export const religionSchema = z.enum(['ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU']);
export type Religion = z.infer<typeof religionSchema>;

// Marital status enum
export const maritalStatusSchema = z.enum(['BELUM_KAWIN', 'KAWIN', 'CERAI_HIDUP', 'CERAI_MATI']);
export type MaritalStatus = z.infer<typeof maritalStatusSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  password_hash: z.string(),
  role: userRoleSchema,
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type User = z.infer<typeof userSchema>;

// Population data schema
export const populationSchema = z.object({
  id: z.number(),
  nik: z.string(),
  nama_lengkap: z.string(),
  tempat_lahir: z.string(),
  tanggal_lahir: z.coerce.date(),
  jenis_kelamin: genderSchema,
  agama: religionSchema,
  status_perkawinan: maritalStatusSchema,
  pekerjaan: z.string(),
  kewarganegaraan: z.string(),
  alamat: z.string(),
  rt: z.string(),
  rw: z.string(),
  kelurahan: z.string(),
  kecamatan: z.string(),
  kabupaten: z.string(),
  provinsi: z.string(),
  kode_pos: z.string(),
  nomor_kk: z.string().nullable(),
  nama_ayah: z.string().nullable(),
  nama_ibu: z.string().nullable(),
  created_by: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type Population = z.infer<typeof populationSchema>;

// Document schema
export const documentSchema = z.object({
  id: z.number(),
  population_id: z.number(),
  document_type: documentTypeSchema,
  document_number: z.string().nullable(),
  file_path: z.string(),
  file_name: z.string(),
  file_size: z.number(),
  mime_type: z.string(),
  is_validated: z.boolean(),
  validated_by: z.number().nullable(),
  validated_at: z.coerce.date().nullable(),
  uploaded_by: z.number(),
  created_at: z.coerce.date()
});
export type Document = z.infer<typeof documentSchema>;

// Application schema
export const applicationSchema = z.object({
  id: z.number(),
  application_number: z.string(),
  application_type: applicationTypeSchema,
  applicant_id: z.number(),
  population_id: z.number().nullable(),
  status: applicationStatusSchema,
  application_data: z.record(z.any()),
  notes: z.string().nullable(),
  processed_by: z.number().nullable(),
  processed_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type Application = z.infer<typeof applicationSchema>;

// Audit log schema
export const auditLogSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  action: z.string(),
  table_name: z.string(),
  record_id: z.number().nullable(),
  old_values: z.record(z.any()).nullable(),
  new_values: z.record(z.any()).nullable(),
  ip_address: z.string().nullable(),
  user_agent: z.string().nullable(),
  created_at: z.coerce.date()
});
export type AuditLog = z.infer<typeof auditLogSchema>;

// Input schemas for authentication
export const loginInputSchema = z.object({
  username: z.string(),
  password: z.string()
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const registerInputSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
  role: userRoleSchema.default('PENDUDUK')
});
export type RegisterInput = z.infer<typeof registerInputSchema>;

// Input schemas for population management
export const createPopulationInputSchema = z.object({
  nik: z.string().length(16),
  nama_lengkap: z.string().min(2).max(255),
  tempat_lahir: z.string().min(2).max(100),
  tanggal_lahir: z.coerce.date(),
  jenis_kelamin: genderSchema,
  agama: religionSchema,
  status_perkawinan: maritalStatusSchema,
  pekerjaan: z.string().max(100),
  kewarganegaraan: z.string().max(50).default('INDONESIA'),
  alamat: z.string().max(500),
  rt: z.string().max(3),
  rw: z.string().max(3),
  kelurahan: z.string().max(100),
  kecamatan: z.string().max(100),
  kabupaten: z.string().max(100),
  provinsi: z.string().max(100),
  kode_pos: z.string().max(5),
  nomor_kk: z.string().length(16).nullable(),
  nama_ayah: z.string().max(255).nullable(),
  nama_ibu: z.string().max(255).nullable().optional()
});
export type CreatePopulationInput = z.infer<typeof createPopulationInputSchema>;

export const updatePopulationInputSchema = z.object({
  id: z.number(),
  nik: z.string().length(16).optional(),
  nama_lengkap: z.string().min(2).max(255).optional(),
  tempat_lahir: z.string().min(2).max(100).optional(),
  tanggal_lahir: z.coerce.date().optional(),
  jenis_kelamin: genderSchema.optional(),
  agama: religionSchema.optional(),
  status_perkawinan: maritalStatusSchema.optional(),
  pekerjaan: z.string().max(100).optional(),
  kewarganegaraan: z.string().max(50).optional(),
  alamat: z.string().max(500).optional(),
  rt: z.string().max(3).optional(),
  rw: z.string().max(3).optional(),
  kelurahan: z.string().max(100).optional(),
  kecamatan: z.string().max(100).optional(),
  kabupaten: z.string().max(100).optional(),
  provinsi: z.string().max(100).optional(),
  kode_pos: z.string().max(5).optional(),
  nomor_kk: z.string().length(16).nullable().optional(),
  nama_ayah: z.string().max(255).nullable().optional(),
  nama_ibu: z.string().max(255).nullable().optional()
});
export type UpdatePopulationInput = z.infer<typeof updatePopulationInputSchema>;

// Input schemas for document management
export const uploadDocumentInputSchema = z.object({
  population_id: z.number(),
  document_type: documentTypeSchema,
  document_number: z.string().nullable().optional(),
  file_name: z.string(),
  file_size: z.number().positive(),
  mime_type: z.string(),
  file_data: z.string() // Base64 encoded file data
});
export type UploadDocumentInput = z.infer<typeof uploadDocumentInputSchema>;

export const validateDocumentInputSchema = z.object({
  document_id: z.number(),
  is_valid: z.boolean(),
  notes: z.string().nullable().optional()
});
export type ValidateDocumentInput = z.infer<typeof validateDocumentInputSchema>;

// Input schemas for applications
export const createApplicationInputSchema = z.object({
  application_type: applicationTypeSchema,
  population_id: z.number().nullable().optional(),
  application_data: z.record(z.any()),
  notes: z.string().nullable().optional()
});
export type CreateApplicationInput = z.infer<typeof createApplicationInputSchema>;

export const updateApplicationStatusInputSchema = z.object({
  application_id: z.number(),
  status: applicationStatusSchema,
  notes: z.string().nullable().optional()
});
export type UpdateApplicationStatusInput = z.infer<typeof updateApplicationStatusInputSchema>;

// Query schemas
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10)
});
export type PaginationInput = z.infer<typeof paginationSchema>;

export const populationQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  kelurahan: z.string().optional(),
  kecamatan: z.string().optional(),
  kabupaten: z.string().optional()
});
export type PopulationQuery = z.infer<typeof populationQuerySchema>;

export const applicationQuerySchema = paginationSchema.extend({
  status: applicationStatusSchema.optional(),
  application_type: applicationTypeSchema.optional(),
  applicant_id: z.number().optional()
});
export type ApplicationQuery = z.infer<typeof applicationQuerySchema>;
