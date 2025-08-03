
import { db } from '../db';
import { applicationsTable, usersTable, populationTable } from '../db/schema';
import { 
  type CreateApplicationInput, 
  type UpdateApplicationStatusInput, 
  type Application,
  type ApplicationQuery
} from '../schema';
import { eq, and, desc, SQL, count } from 'drizzle-orm';

export async function createApplication(input: CreateApplicationInput, userId: number): Promise<Application> {
  try {
    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    // Verify population exists if provided
    if (input.population_id) {
      const population = await db.select()
        .from(populationTable)
        .where(eq(populationTable.id, input.population_id))
        .execute();

      if (population.length === 0) {
        throw new Error('Population record not found');
      }
    }

    // Generate unique application number
    const applicationNumber = `APP${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    const result = await db.insert(applicationsTable)
      .values({
        application_number: applicationNumber,
        application_type: input.application_type,
        applicant_id: userId,
        population_id: input.population_id || null,
        status: 'DRAFT',
        application_data: input.application_data,
        notes: input.notes || null
      })
      .returning()
      .execute();

    return {
      ...result[0],
      application_data: result[0].application_data as Record<string, any>
    };
  } catch (error) {
    console.error('Application creation failed:', error);
    throw error;
  }
}

export async function updateApplicationStatus(input: UpdateApplicationStatusInput, userId: number): Promise<Application> {
  try {
    // Verify user exists and has permission (admin/petugas/super_admin)
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    if (!['ADMIN', 'PETUGAS', 'SUPER_ADMIN'].includes(user[0].role)) {
      throw new Error('Insufficient permissions to update application status');
    }

    // Verify application exists
    const application = await db.select()
      .from(applicationsTable)
      .where(eq(applicationsTable.id, input.application_id))
      .execute();

    if (application.length === 0) {
      throw new Error('Application not found');
    }

    const updateData: any = {
      status: input.status,
      updated_at: new Date()
    };

    if (input.notes) {
      updateData.notes = input.notes;
    }

    // Set processed_by and processed_at for non-draft statuses
    if (input.status !== 'DRAFT') {
      updateData.processed_by = userId;
      updateData.processed_at = new Date();
    }

    const result = await db.update(applicationsTable)
      .set(updateData)
      .where(eq(applicationsTable.id, input.application_id))
      .returning()
      .execute();

    return {
      ...result[0],
      application_data: result[0].application_data as Record<string, any>
    };
  } catch (error) {
    console.error('Application status update failed:', error);
    throw error;
  }
}

export async function getApplication(id: number): Promise<Application | null> {
  try {
    const result = await db.select()
      .from(applicationsTable)
      .where(eq(applicationsTable.id, id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    return {
      ...result[0],
      application_data: result[0].application_data as Record<string, any>
    };
  } catch (error) {
    console.error('Get application failed:', error);
    throw error;
  }
}

export async function getApplications(query: ApplicationQuery): Promise<{ data: Application[]; total: number }> {
  try {
    const conditions: SQL<unknown>[] = [];

    if (query.status) {
      conditions.push(eq(applicationsTable.status, query.status));
    }

    if (query.application_type) {
      conditions.push(eq(applicationsTable.application_type, query.application_type));
    }

    if (query.applicant_id) {
      conditions.push(eq(applicationsTable.applicant_id, query.applicant_id));
    }

    const offset = (query.page - 1) * query.limit;

    // Execute queries based on whether we have conditions
    let rawData: any[];
    let totalResult: any[];

    if (conditions.length === 0) {
      // No filters
      const [dataRes, countRes] = await Promise.all([
        db.select()
          .from(applicationsTable)
          .orderBy(desc(applicationsTable.created_at))
          .limit(query.limit)
          .offset(offset)
          .execute(),
        db.select({ count: count() })
          .from(applicationsTable)
          .execute()
      ]);
      rawData = dataRes;
      totalResult = countRes;
    } else {
      // With filters
      const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
      const [dataRes, countRes] = await Promise.all([
        db.select()
          .from(applicationsTable)
          .where(whereClause)
          .orderBy(desc(applicationsTable.created_at))
          .limit(query.limit)
          .offset(offset)
          .execute(),
        db.select({ count: count() })
          .from(applicationsTable)
          .where(whereClause)
          .execute()
      ]);
      rawData = dataRes;
      totalResult = countRes;
    }

    const data: Application[] = rawData.map(item => ({
      ...item,
      application_data: item.application_data as Record<string, any>
    }));

    return {
      data,
      total: totalResult[0].count
    };
  } catch (error) {
    console.error('Get applications failed:', error);
    throw error;
  }
}

export async function getMyApplications(userId: number, query: ApplicationQuery): Promise<{ data: Application[]; total: number }> {
  try {
    // Create modified query with applicant_id filter
    const userQuery: ApplicationQuery = {
      ...query,
      applicant_id: userId
    };

    return await getApplications(userQuery);
  } catch (error) {
    console.error('Get my applications failed:', error);
    throw error;
  }
}

export async function submitApplication(id: number): Promise<Application> {
  try {
    // Verify application exists and is in DRAFT status
    const application = await db.select()
      .from(applicationsTable)
      .where(eq(applicationsTable.id, id))
      .execute();

    if (application.length === 0) {
      throw new Error('Application not found');
    }

    if (application[0].status !== 'DRAFT') {
      throw new Error('Only draft applications can be submitted');
    }

    const result = await db.update(applicationsTable)
      .set({
        status: 'SUBMITTED',
        updated_at: new Date()
      })
      .where(eq(applicationsTable.id, id))
      .returning()
      .execute();

    return {
      ...result[0],
      application_data: result[0].application_data as Record<string, any>
    };
  } catch (error) {
    console.error('Submit application failed:', error);
    throw error;
  }
}

export async function cancelApplication(id: number, userId: number): Promise<{ success: boolean }> {
  try {
    // Verify application exists and belongs to user
    const application = await db.select()
      .from(applicationsTable)
      .where(and(
        eq(applicationsTable.id, id),
        eq(applicationsTable.applicant_id, userId)
      ))
      .execute();

    if (application.length === 0) {
      throw new Error('Application not found or access denied');
    }

    // Only allow cancellation of draft or submitted applications
    if (!['DRAFT', 'SUBMITTED'].includes(application[0].status)) {
      throw new Error('Cannot cancel application in current status');
    }

    await db.delete(applicationsTable)
      .where(eq(applicationsTable.id, id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Cancel application failed:', error);
    throw error;
  }
}
