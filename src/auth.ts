import { createSession, getSession, deleteSession, getUserByEmail, createUser, type User, type Session } from "./db";

// Session duration: 7 days
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

// Hash password using Bun's built-in password hashing (bcrypt)
export async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: 10,
  });
}

// Verify password against hash
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await Bun.password.verify(password, hash);
}

// Generate a secure session ID
export function generateSessionId(): string {
  return crypto.randomUUID();
}

// Register a new user
export async function registerUser(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
  // Check if user already exists
  const existingUser = getUserByEmail(email);
  if (existingUser) {
    return { success: false, error: "Email already registered" };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: "Invalid email format" };
  }

  // Validate password strength
  if (password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }

  try {
    const passwordHash = await hashPassword(password);
    const user = createUser(email, passwordHash);
    return { success: true, user };
  } catch (error) {
    console.error("Failed to register user:", error);
    return { success: false, error: "Failed to create account" };
  }
}

// Login user and create session
export async function loginUser(email: string, password: string): Promise<{ success: boolean; sessionId?: string; user?: User; error?: string }> {
  const user = getUserByEmail(email);
  if (!user) {
    return { success: false, error: "Invalid email or password" };
  }

  const validPassword = await verifyPassword(password, user.password_hash);
  if (!validPassword) {
    return { success: false, error: "Invalid email or password" };
  }

  try {
    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    createSession(sessionId, user.id, expiresAt);
    return { success: true, sessionId, user };
  } catch (error) {
    console.error("Failed to create session:", error);
    return { success: false, error: "Failed to create session" };
  }
}

// Validate session and get user
export function validateSession(sessionId: string | undefined): { valid: boolean; user?: User; session?: Session } {
  if (!sessionId) {
    return { valid: false };
  }

  const sessionData = getSession(sessionId);
  if (!sessionData) {
    return { valid: false };
  }

  return { valid: true, user: sessionData.user, session: sessionData };
}

// Logout user
export function logoutUser(sessionId: string): void {
  deleteSession(sessionId);
}

// Parse session cookie from request
export function getSessionFromCookie(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined;

  const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split("=");
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  return cookies["session"];
}

// Create session cookie header
export function createSessionCookie(sessionId: string): string {
  const expires = new Date(Date.now() + SESSION_DURATION_MS).toUTCString();
  return `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires}`;
}

// Create logout cookie header (clears session)
export function createLogoutCookie(): string {
  return `session=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
