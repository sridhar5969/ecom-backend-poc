import { eq } from 'drizzle-orm';
import { StatusCodes } from 'http-status-codes';
import jwt from 'jsonwebtoken';

import {
	LoginWebPostParser,
	RegisterWebPostParser,
} from '../controller/validator';
import {
	getUserProfileFromMicrosoft,
	verifyPassword,
} from '../utils/auth.utils';
import AppError from '@/abstractions/AppError';
import { db } from '@/database';
import { User, users, userSessions } from '@/database/schema';
import env from '@/env';
import Hash from '@/utils/hash';

export class AuthWebService {
	// ----------------------------------------------------------------
	// REGISTER
	// ----------------------------------------------------------------
	public async registerUser(body: any) {
		const parsed = RegisterWebPostParser.safeParse(body);
		if (!parsed.success) throw parsed.error;

		const { firstName, lastName, email, password } = parsed.data;

		// Check if user exists
		const [existing] = await db
			.select()
			.from(users)
			.where(eq(users.email, email.toLowerCase()))
			.execute();

		if (existing) {
			throw new AppError('User already exists', StatusCodes.CONFLICT);
		}

		// Hash password
		const passwordHash = await Hash.hash(password);

		// Create user
		const [newUser] = await db
			.insert(users)
			.values({
				email: email.toLowerCase(),
				name: `${firstName} ${lastName}`,
				passwordHash,
				role: 'customer',
				isActive: true,
				primaryAuthMethod: 'email_password',
			})
			.returning();

		// Issue tokens
		const accessToken = this.generateAccessToken(newUser);
		const refreshToken = await this.createSession(newUser);

		return {
			accessToken,
			refreshToken,
			role: newUser.role,
			authMethod: newUser.primaryAuthMethod,
			mode: env.AUTH_MODE,
		};
	}

	// ----------------------------------------------------------------
	// LOGIN
	// ----------------------------------------------------------------
	public async loginUser(bearerToken: string | undefined, body: any) {
		let user: User;

		// Azure login
		if (bearerToken && bearerToken !== 'undefined') {
			user = await this.handleAzureLogin(bearerToken);
		}

		// Local login
		else {
			if (!body)
				throw new AppError(
					'Missing login data',
					StatusCodes.BAD_REQUEST,
				);

			const parsed = LoginWebPostParser.safeParse(body);
			if (!parsed.success) throw parsed.error;

			const { email, password } = parsed.data;
			user = await this.verifyEmailPasswordUser(email, password);
		}

		if (!user.isActive)
			throw new AppError(
				'Your account is inactive',
				StatusCodes.BAD_REQUEST,
			);

		// Issue tokens
		const accessToken = this.generateAccessToken(user);
		const refreshToken = await this.createSession(user);

		return {
			accessToken,
			refreshToken,
			role: user.role,
			authMethod: user.primaryAuthMethod,
			mode: env.AUTH_MODE,
		};
	}

	// ----------------------------------------------------------------
	// EMAIL + PASSWORD LOGIN
	// ----------------------------------------------------------------
	private async verifyEmailPasswordUser(email: string, password: string) {
		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.email, email.toLowerCase()))
			.execute();

		if (!user || !user.passwordHash)
			throw new AppError(
				'Incorrect Email/Password',
				StatusCodes.BAD_REQUEST,
			);

		const valid = await verifyPassword(password, user.passwordHash);
		if (!valid)
			throw new AppError(
				'Incorrect Email/Password',
				StatusCodes.BAD_REQUEST,
			);

		return user;
	}

	// ----------------------------------------------------------------
	// AZURE LOGIN → Creates user if not exists
	// ----------------------------------------------------------------
	private async handleAzureLogin(token: string) {
		const azureUser = await getUserProfileFromMicrosoft(token);
		if (!azureUser)
			throw new AppError('Invalid Azure token', StatusCodes.UNAUTHORIZED);

		const email =
			azureUser.mail?.toLowerCase() ||
			azureUser.userPrincipalName?.toLowerCase();

		const [existing] = await db
			.select()
			.from(users)
			.where(eq(users.email, email));

		if (existing) return existing;

		// New user
		const [newUser] = await db
			.insert(users)
			.values({
				email,
				name: azureUser.displayName,
				role: 'customer',
				isActive: true,
				primaryAuthMethod: 'email_password',
				emailVerifiedAt: new Date(),
			})
			.returning();

		return newUser;
	}

	// ----------------------------------------------------------------
	// CREATE USER SESSION (Refresh token)
	// ----------------------------------------------------------------
	private async createSession(user: User) {
		const refreshToken = crypto.randomUUID();

		await db.insert(userSessions).values({
			userId: user.id,
			sessionToken: refreshToken,
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
		});

		return refreshToken;
	}

	// ----------------------------------------------------------------
	// GENERATE ACCESS TOKEN (JWT)
	// ----------------------------------------------------------------
	private generateAccessToken(user: User) {
		return jwt.sign(
			{
				userId: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
			},
			env.JWT_SECRET,
			{ expiresIn: '15m' },
		);
	}

	// ----------------------------------------------------------------
	// REFRESH TOKENS
	// ----------------------------------------------------------------
	public async refreshTokens(refreshToken: string) {
		if (!refreshToken) throw new AppError('Refresh token missing', 401);

		// Validate session
		const [session] = await db
			.select()
			.from(userSessions)
			.where(eq(userSessions.sessionToken, refreshToken))
			.execute();

		if (!session) throw new AppError('Invalid refresh token', 401);

		// Delete expired sessions
		if (session.expiresAt && session.expiresAt < new Date()) {
			await db
				.delete(userSessions)
				.where(eq(userSessions.id, session.id))
				.execute();

			throw new AppError('Session expired', 401);
		}

		// Get user
		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.id, session.userId))
			.execute();

		if (!user) throw new AppError('User not found', 401);

		// Issue new tokens
		const accessToken = this.generateAccessToken(user);
		const newRefreshToken = await this.rotateSession(session);

		return {
			accessToken,
			refreshToken: newRefreshToken,
			role: user.role,
		};
	}

	// ----------------------------------------------------------------
	// ROTATE / REPLACE SESSION TOKEN
	// ----------------------------------------------------------------
	private async rotateSession(session: any) {
		const newToken = crypto.randomUUID();

		await db
			.update(userSessions)
			.set({
				sessionToken: newToken,
				expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			})
			.where(eq(userSessions.id, session.id))
			.execute();

		return newToken;
	}

	// ----------------------------------------------------------------
	// LOGOUT (delete session)
	// ----------------------------------------------------------------
	public async logoutUser(refreshToken?: string) {
		if (!refreshToken) return {};

		await db
			.delete(userSessions)
			.where(eq(userSessions.sessionToken, refreshToken))
			.execute();

		return {};
	}
}
