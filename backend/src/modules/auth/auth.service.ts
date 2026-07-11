import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { prisma } from "@/config/database";
import { env } from "@/config/env";

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

function signAccessToken(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

async function signRefreshToken(userId: string) {
  const token = randomUUID() + randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await prisma.refreshToken.create({
    data: { token, userId, expiresAt },
  });

  return token;
}

export const authService = {
  async register({ name, email, password }: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw Object.assign(new Error("Este email já está registado."), { statusCode: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
    });

    const accessToken = signAccessToken(user.id);
    const refreshToken = await signRefreshToken(user.id);

    return { user: sanitizeUser(user), accessToken, refreshToken };
  },

  async login({ email, password }: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw Object.assign(new Error("Credenciais inválidas."), { statusCode: 401 });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      throw Object.assign(new Error("Credenciais inválidas."), { statusCode: 401 });
    }

    const accessToken = signAccessToken(user.id);
    const refreshToken = await signRefreshToken(user.id);

    return { user: sanitizeUser(user), accessToken, refreshToken };
  },

  async refresh(refreshToken: string) {
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      throw Object.assign(new Error("Refresh token inválido ou expirado."), { statusCode: 401 });
    }

    const accessToken = signAccessToken(stored.userId);
    return { accessToken };
  },

  async logout(refreshToken: string) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  },
};

function sanitizeUser(user: { passwordHash: string; [key: string]: unknown }) {
  const { passwordHash, ...rest } = user;
  return rest;
}
