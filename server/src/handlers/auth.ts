
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type RegisterInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env['JWT_SECRET'] || 'default-secret-key';
const JWT_EXPIRES_IN = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Simple JWT implementation using Bun's crypto
async function createJWT(payload: any): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Date.now();
  const exp = now + JWT_EXPIRES_IN;
  
  const jwtPayload = { ...payload, iat: now, exp };
  
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(jwtPayload));
  
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
  );
  
  const signature = btoa(
    Array.from(new Uint8Array(signatureBuffer))
      .map(b => String.fromCharCode(b))
      .join('')
  );
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

async function verifyJWT(token: string): Promise<any> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }
  
  const [encodedHeader, encodedPayload, signature] = parts;
  
  // Verify signature
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
  );
  
  const expectedSignature = btoa(
    Array.from(new Uint8Array(signatureBuffer))
      .map(b => String.fromCharCode(b))
      .join('')
  );
  
  if (signature !== expectedSignature) {
    throw new Error('Invalid token signature');
  }
  
  // Decode payload
  const payload = JSON.parse(atob(encodedPayload));
  
  // Check expiration
  if (payload.exp && Date.now() > payload.exp) {
    throw new Error('Token expired');
  }
  
  return payload;
}

// Token blacklist (in production, use Redis or database)
const tokenBlacklist = new Set<string>();

export async function login(input: LoginInput): Promise<{ user: User; token: string }> {
  try {
    // Find user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid username or password');
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // Verify password (using Bun's built-in password verification)
    const isPasswordValid = await Bun.password.verify(input.password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid username or password');
    }

    // Generate JWT token
    const token = await createJWT({
      userId: user.id,
      username: user.username,
      role: user.role
    });

    // Return user without password hash
    const { password_hash, ...userWithoutPassword } = user;
    
    return {
      user: userWithoutPassword as User,
      token
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

export async function register(input: RegisterInput): Promise<User> {
  try {
    // Check if username already exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (existingUsers.length > 0) {
      throw new Error('Username already exists');
    }

    // Check if email already exists
    const existingEmails = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (existingEmails.length > 0) {
      throw new Error('Email already exists');
    }

    // Hash password
    const password_hash = await Bun.password.hash(input.password);

    // Insert new user
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        email: input.email,
        password_hash,
        role: input.role,
        is_active: true
      })
      .returning()
      .execute();

    const newUser = result[0];
    
    // Return user without password hash
    const { password_hash: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword as User;
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
}

export async function logout(token: string): Promise<{ success: boolean }> {
  try {
    // Add token to blacklist
    tokenBlacklist.add(token);
    return { success: true };
  } catch (error) {
    console.error('Logout failed:', error);
    throw error;
  }
}

export async function validateToken(token: string): Promise<User | null> {
  try {
    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      return null;
    }

    // Verify JWT token
    const decoded = await verifyJWT(token);

    // Find user in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, decoded.userId))
      .execute();

    if (users.length === 0) {
      return null;
    }

    const user = users[0];

    // Check if user is still active
    if (!user.is_active) {
      return null;
    }

    // Return user without password hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  } catch (error) {
    console.error('Token validation failed:', error);
    return null;
  }
}
