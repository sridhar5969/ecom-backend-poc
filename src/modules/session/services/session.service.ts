import { eq } from 'drizzle-orm';
import AppError from '@/abstractions/AppError';
import { db } from '@/database';
import { users } from '@/database/schema';

export class SessionService {
	public async getProfile(userDetails: any) {
		if (!userDetails?.userId) {
			throw new AppError('Unauthorized', 401);
		}

		const [user] = await db
			.select({
				id: users.id,
				name: users.name,
				email: users.email,
				role: users.role,
				primaryAuthMethod: users.primaryAuthMethod,
				emailVerifiedAt: users.emailVerifiedAt,
				phoneVerifiedAt: users.phoneVerifiedAt,
			})
			.from(users)
			.where(eq(users.id, userDetails.userId));

		if (!user) throw new AppError('User not found', 404);

		return user;
	}
}
