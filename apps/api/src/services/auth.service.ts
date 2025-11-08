import { prisma, AuthProvider } from '@flagkit/database';
import { hashPassword, verifyPassword } from '@/utils/password';

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  async register(input: RegisterInput) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(input.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        name: input.name,
        authProvider: AuthProvider.EMAIL,
        emailVerified: false, // Will be verified later via email
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        authProvider: true,
        createdAt: true,
      },
    });

    return user;
  }

  /**
   * Login user with email and password
   */
  async login(input: LoginInput) {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if user registered with email/password
    if (user.authProvider !== AuthProvider.EMAIL) {
      throw new Error(
        `This account is linked with ${user.authProvider}. Please use ${user.authProvider} to login.`
      );
    }

    // Verify password
    if (!user.password) {
      throw new Error('Invalid email or password');
    }

    const isValidPassword = await verifyPassword(input.password, user.password);

    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        emailVerified: true,
        authProvider: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        emailVerified: true,
        authProvider: true,
        createdAt: true,
      },
    });
  }
}

export const authService = new AuthService();
