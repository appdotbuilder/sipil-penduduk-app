
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type RegisterInput } from '../schema';
import { login, register, logout, validateToken } from '../handlers/auth';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env['JWT_SECRET'] || 'default-secret-key';

// Simple JWT verification for testing
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
  return payload;
}

const testRegisterInput: RegisterInput = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
  role: 'PENDUDUK'
};

const testLoginInput: LoginInput = {
  username: 'testuser',
  password: 'password123'
};

describe('Auth handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('register', () => {
    it('should create a new user', async () => {
      const result = await register(testRegisterInput);

      expect(result.username).toEqual('testuser');
      expect(result.email).toEqual('test@example.com');
      expect(result.role).toEqual('PENDUDUK');
      expect(result.is_active).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
      expect((result as any).password_hash).toBeUndefined();
    });

    it('should save user to database with hashed password', async () => {
      const result = await register(testRegisterInput);

      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, result.id))
        .execute();

      expect(users).toHaveLength(1);
      const user = users[0];
      expect(user.username).toEqual('testuser');
      expect(user.email).toEqual('test@example.com');
      expect(user.password_hash).toBeDefined();
      expect(user.password_hash).not.toEqual('password123');
      expect(user.role).toEqual('PENDUDUK');
      expect(user.is_active).toBe(true);
    });

    it('should reject duplicate username', async () => {
      await register(testRegisterInput);

      await expect(register({
        ...testRegisterInput,
        email: 'different@example.com'
      })).rejects.toThrow(/username already exists/i);
    });

    it('should reject duplicate email', async () => {
      await register(testRegisterInput);

      await expect(register({
        ...testRegisterInput,
        username: 'differentuser',
      })).rejects.toThrow(/email already exists/i);
    });

    it('should apply default role', async () => {
      const input = {
        username: 'testuser2',
        email: 'test2@example.com',
        password: 'password123',
        role: 'PENDUDUK' as const
      };

      const result = await register(input);
      expect(result.role).toEqual('PENDUDUK');
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await register(testRegisterInput);
    });

    it('should authenticate valid credentials', async () => {
      const result = await login(testLoginInput);

      expect(result.user.username).toEqual('testuser');
      expect(result.user.email).toEqual('test@example.com');
      expect(result.user.role).toEqual('PENDUDUK');
      expect(result.user.is_active).toBe(true);
      expect((result.user as any).password_hash).toBeUndefined();
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
    });

    it('should generate valid JWT token', async () => {
      const result = await login(testLoginInput);

      const decoded = await verifyJWT(result.token);
      expect(decoded.userId).toEqual(result.user.id);
      expect(decoded.username).toEqual('testuser');
      expect(decoded.role).toEqual('PENDUDUK');
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });

    it('should reject invalid username', async () => {
      await expect(login({
        username: 'nonexistent',
        password: 'password123'
      })).rejects.toThrow(/invalid username or password/i);
    });

    it('should reject invalid password', async () => {
      await expect(login({
        username: 'testuser',
        password: 'wrongpassword'
      })).rejects.toThrow(/invalid username or password/i);
    });

    it('should reject deactivated user', async () => {
      // Deactivate user
      await db.update(usersTable)
        .set({ is_active: false })
        .where(eq(usersTable.username, 'testuser'))
        .execute();

      await expect(login(testLoginInput)).rejects.toThrow(/account is deactivated/i);
    });
  });

  describe('logout', () => {
    it('should successfully logout', async () => {
      const result = await logout('some-token');
      expect(result.success).toBe(true);
    });
  });

  describe('validateToken', () => {
    let validToken: string;
    let userId: number;

    beforeEach(async () => {
      const user = await register(testRegisterInput);
      userId = user.id;
      const loginResult = await login(testLoginInput);
      validToken = loginResult.token;
    });

    it('should validate valid token', async () => {
      const result = await validateToken(validToken);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(userId);
      expect(result!.username).toEqual('testuser');
      expect(result!.role).toEqual('PENDUDUK');
      expect((result as any)?.password_hash).toBeUndefined();
    });

    it('should reject invalid token', async () => {
      const result = await validateToken('invalid-token');
      expect(result).toBeNull();
    });

    it('should reject blacklisted token', async () => {
      await logout(validToken);
      const result = await validateToken(validToken);
      expect(result).toBeNull();
    });

    it('should reject token for deactivated user', async () => {
      // Deactivate user
      await db.update(usersTable)
        .set({ is_active: false })
        .where(eq(usersTable.id, userId))
        .execute();

      const result = await validateToken(validToken);
      expect(result).toBeNull();
    });

    it('should reject token for deleted user', async () => {
      // Delete user
      await db.delete(usersTable)
        .where(eq(usersTable.id, userId))
        .execute();

      const result = await validateToken(validToken);
      expect(result).toBeNull();
    });
  });
});
