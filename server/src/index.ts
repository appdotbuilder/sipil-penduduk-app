
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';
import { 
  loginInputSchema, 
  registerInputSchema,
  createPopulationInputSchema,
  updatePopulationInputSchema,
  populationQuerySchema,
  uploadDocumentInputSchema,
  validateDocumentInputSchema,
  createApplicationInputSchema,
  updateApplicationStatusInputSchema,
  applicationQuerySchema
} from './schema';

// Import handlers
import { login, register, logout, validateToken } from './handlers/auth';
import { 
  createPopulation, 
  updatePopulation, 
  getPopulation, 
  getPopulations, 
  deletePopulation,
  searchPopulationByNIK 
} from './handlers/population';
import { 
  uploadDocument, 
  validateDocument, 
  getDocuments, 
  getDocument, 
  deleteDocument,
  downloadDocument 
} from './handlers/documents';
import { 
  createApplication, 
  updateApplicationStatus, 
  getApplication, 
  getApplications, 
  getMyApplications,
  submitApplication,
  cancelApplication 
} from './handlers/applications';
import { logAudit, getAuditLogs, getAuditLogsByUser, getAuditLogsByTable } from './handlers/audit';
import { 
  getDashboardStats, 
  getApplicationStatsByType, 
  getPopulationStatsByRegion,
  exportApplicationsReport,
  exportPopulationReport 
} from './handlers/dashboard';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),
  
  register: publicProcedure
    .input(registerInputSchema)
    .mutation(({ input }) => register(input)),
  
  logout: publicProcedure
    .input(z.string())
    .mutation(({ input }) => logout(input)),
  
  validateToken: publicProcedure
    .input(z.string())
    .query(({ input }) => validateToken(input)),

  // Population management routes
  createPopulation: publicProcedure
    .input(createPopulationInputSchema)
    .mutation(({ input }) => createPopulation(input, 1)), // TODO: Get actual user ID from context
  
  updatePopulation: publicProcedure
    .input(updatePopulationInputSchema)
    .mutation(({ input }) => updatePopulation(input)),
  
  getPopulation: publicProcedure
    .input(z.number())
    .query(({ input }) => getPopulation(input)),
  
  getPopulations: publicProcedure
    .input(populationQuerySchema)
    .query(({ input }) => getPopulations(input)),
  
  deletePopulation: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deletePopulation(input)),
  
  searchPopulationByNIK: publicProcedure
    .input(z.string())
    .query(({ input }) => searchPopulationByNIK(input)),

  // Document management routes
  uploadDocument: publicProcedure
    .input(uploadDocumentInputSchema)
    .mutation(({ input }) => uploadDocument(input, 1)), // TODO: Get actual user ID from context
  
  validateDocument: publicProcedure
    .input(validateDocumentInputSchema)
    .mutation(({ input }) => validateDocument(input, 1)), // TODO: Get actual user ID from context
  
  getDocuments: publicProcedure
    .input(z.number())
    .query(({ input }) => getDocuments(input)),
  
  getDocument: publicProcedure
    .input(z.number())
    .query(({ input }) => getDocument(input)),
  
  deleteDocument: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteDocument(input)),
  
  downloadDocument: publicProcedure
    .input(z.number())
    .query(({ input }) => downloadDocument(input)),

  // Application management routes
  createApplication: publicProcedure
    .input(createApplicationInputSchema)
    .mutation(({ input }) => createApplication(input, 1)), // TODO: Get actual user ID from context
  
  updateApplicationStatus: publicProcedure
    .input(updateApplicationStatusInputSchema)
    .mutation(({ input }) => updateApplicationStatus(input, 1)), // TODO: Get actual user ID from context
  
  getApplication: publicProcedure
    .input(z.number())
    .query(({ input }) => getApplication(input)),
  
  getApplications: publicProcedure
    .input(applicationQuerySchema)
    .query(({ input }) => getApplications(input)),
  
  getMyApplications: publicProcedure
    .input(applicationQuerySchema)
    .query(({ input }) => getMyApplications(1, input)), // TODO: Get actual user ID from context
  
  submitApplication: publicProcedure
    .input(z.number())
    .mutation(({ input }) => submitApplication(input)),
  
  cancelApplication: publicProcedure
    .input(z.number())
    .mutation(({ input }) => cancelApplication(input, 1)), // TODO: Get actual user ID from context

  // Audit routes
  getAuditLogs: publicProcedure
    .input(z.object({ page: z.number().default(1), limit: z.number().default(50) }))
    .query(({ input }) => getAuditLogs(input.page, input.limit)),
  
  getAuditLogsByUser: publicProcedure
    .input(z.object({ userId: z.number(), page: z.number().default(1), limit: z.number().default(50) }))
    .query(({ input }) => getAuditLogsByUser(input.userId, input.page, input.limit)),
  
  getAuditLogsByTable: publicProcedure
    .input(z.object({ tableName: z.string(), recordId: z.number().optional() }))
    .query(({ input }) => getAuditLogsByTable(input.tableName, input.recordId)),

  // Dashboard and reporting routes
  getDashboardStats: publicProcedure
    .query(() => getDashboardStats()),
  
  getApplicationStatsByType: publicProcedure
    .query(() => getApplicationStatsByType()),
  
  getPopulationStatsByRegion: publicProcedure
    .query(() => getPopulationStatsByRegion()),
  
  exportApplicationsReport: publicProcedure
    .input(z.object({ format: z.enum(['pdf', 'excel']), filters: z.any().optional() }))
    .mutation(({ input }) => exportApplicationsReport(input.format, input.filters)),
  
  exportPopulationReport: publicProcedure
    .input(z.object({ format: z.enum(['pdf', 'excel']), filters: z.any().optional() }))
    .mutation(({ input }) => exportPopulationReport(input.format, input.filters))
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
