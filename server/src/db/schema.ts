
import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  boolean, 
  integer,
  jsonb,
  pgEnum,
  date,
  varchar
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums
export const userRoleEnum = pgEnum('user_role', ['SUPER_ADMIN', 'ADMIN', 'PETUGAS', 'PENDUDUK']);
export const documentTypeEnum = pgEnum('document_type', ['KTP', 'KARTU_KELUARGA', 'AKTA_KELAHIRAN', 'AKTA_KEMATIAN']);
export const applicationTypeEnum = pgEnum('application_type', [
  'AKTA_KELAHIRAN',
  'AKTA_KEMATIAN', 
  'PERUBAHAN_DATA',
  'PINDAH_DATANG',
  'KK_BARU',
  'KTP_BARU'
]);
export const applicationStatusEnum = pgEnum('application_status', ['DRAFT', 'SUBMITTED', 'PROCESSING', 'APPROVED', 'REJECTED']);
export const genderEnum = pgEnum('gender', ['LAKI_LAKI', 'PEREMPUAN']);
export const religionEnum = pgEnum('religion', ['ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU']);
export const maritalStatusEnum = pgEnum('marital_status', ['BELUM_KAWIN', 'KAWIN', 'CERAI_HIDUP', 'CERAI_MATI']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('PENDUDUK'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Population table
export const populationTable = pgTable('population', {
  id: serial('id').primaryKey(),
  nik: varchar('nik', { length: 16 }).notNull().unique(),
  nama_lengkap: varchar('nama_lengkap', { length: 255 }).notNull(),
  tempat_lahir: varchar('tempat_lahir', { length: 100 }).notNull(),
  tanggal_lahir: date('tanggal_lahir').notNull(),
  jenis_kelamin: genderEnum('jenis_kelamin').notNull(),
  agama: religionEnum('agama').notNull(),
  status_perkawinan: maritalStatusEnum('status_perkawinan').notNull(),
  pekerjaan: varchar('pekerjaan', { length: 100 }).notNull(),
  kewarganegaraan: varchar('kewarganegaraan', { length: 50 }).notNull().default('INDONESIA'),
  alamat: text('alamat').notNull(),
  rt: varchar('rt', { length: 3 }).notNull(),
  rw: varchar('rw', { length: 3 }).notNull(),
  kelurahan: varchar('kelurahan', { length: 100 }).notNull(),
  kecamatan: varchar('kecamatan', { length: 100 }).notNull(),
  kabupaten: varchar('kabupaten', { length: 100 }).notNull(),
  provinsi: varchar('provinsi', { length: 100 }).notNull(),
  kode_pos: varchar('kode_pos', { length: 5 }).notNull(),
  nomor_kk: varchar('nomor_kk', { length: 16 }),
  nama_ayah: varchar('nama_ayah', { length: 255 }),
  nama_ibu: varchar('nama_ibu', { length: 255 }),
  created_by: integer('created_by').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Documents table
export const documentsTable = pgTable('documents', {
  id: serial('id').primaryKey(),
  population_id: integer('population_id').notNull(),
  document_type: documentTypeEnum('document_type').notNull(),
  document_number: varchar('document_number', { length: 50 }),
  file_path: text('file_path').notNull(),
  file_name: varchar('file_name', { length: 255 }).notNull(),
  file_size: integer('file_size').notNull(),
  mime_type: varchar('mime_type', { length: 100 }).notNull(),
  is_validated: boolean('is_validated').notNull().default(false),
  validated_by: integer('validated_by'),
  validated_at: timestamp('validated_at'),
  uploaded_by: integer('uploaded_by').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Applications table
export const applicationsTable = pgTable('applications', {
  id: serial('id').primaryKey(),
  application_number: varchar('application_number', { length: 50 }).notNull().unique(),
  application_type: applicationTypeEnum('application_type').notNull(),
  applicant_id: integer('applicant_id').notNull(),
  population_id: integer('population_id'),
  status: applicationStatusEnum('status').notNull().default('DRAFT'),
  application_data: jsonb('application_data').notNull(),
  notes: text('notes'),
  processed_by: integer('processed_by'),
  processed_at: timestamp('processed_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Audit logs table
export const auditLogsTable = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  table_name: varchar('table_name', { length: 50 }).notNull(),
  record_id: integer('record_id'),
  old_values: jsonb('old_values'),
  new_values: jsonb('new_values'),
  ip_address: varchar('ip_address', { length: 45 }),
  user_agent: text('user_agent'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  createdPopulation: many(populationTable),
  uploadedDocuments: many(documentsTable),
  validatedDocuments: many(documentsTable, { relationName: 'validator' }),
  applications: many(applicationsTable),
  processedApplications: many(applicationsTable, { relationName: 'processor' }),
  auditLogs: many(auditLogsTable)
}));

export const populationRelations = relations(populationTable, ({ one, many }) => ({
  createdBy: one(usersTable, {
    fields: [populationTable.created_by],
    references: [usersTable.id]
  }),
  documents: many(documentsTable),
  applications: many(applicationsTable)
}));

export const documentsRelations = relations(documentsTable, ({ one }) => ({
  population: one(populationTable, {
    fields: [documentsTable.population_id],
    references: [populationTable.id]
  }),
  uploadedBy: one(usersTable, {
    fields: [documentsTable.uploaded_by],
    references: [usersTable.id]
  }),
  validatedBy: one(usersTable, {
    fields: [documentsTable.validated_by],
    references: [usersTable.id],
    relationName: 'validator'
  })
}));

export const applicationsRelations = relations(applicationsTable, ({ one }) => ({
  applicant: one(usersTable, {
    fields: [applicationsTable.applicant_id],
    references: [usersTable.id]
  }),
  population: one(populationTable, {
    fields: [applicationsTable.population_id],
    references: [populationTable.id]
  }),
  processedBy: one(usersTable, {
    fields: [applicationsTable.processed_by],
    references: [usersTable.id],
    relationName: 'processor'
  })
}));

export const auditLogsRelations = relations(auditLogsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [auditLogsTable.user_id],
    references: [usersTable.id]
  })
}));

// Export all tables for relation queries
export const tables = {
  users: usersTable,
  population: populationTable,
  documents: documentsTable,
  applications: applicationsTable,
  auditLogs: auditLogsTable
};

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Population = typeof populationTable.$inferSelect;
export type NewPopulation = typeof populationTable.$inferInsert;
export type Document = typeof documentsTable.$inferSelect;
export type NewDocument = typeof documentsTable.$inferInsert;
export type Application = typeof applicationsTable.$inferSelect;
export type NewApplication = typeof applicationsTable.$inferInsert;
export type AuditLog = typeof auditLogsTable.$inferSelect;
export type NewAuditLog = typeof auditLogsTable.$inferInsert;
