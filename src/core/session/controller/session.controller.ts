import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { SessionService } from '../services/session.service';
import { successResponse } from '@/utils/responseFormatter';

export class SessionController {
	private static sessionService = new SessionService();

	public static async fetchProfile(req: Request, res: Response) {
		const task = 'GET_SESSION_PROFILE';

		try {
			// req.user_details is populated by protect middleware
			const user = await SessionController.sessionService.getProfile(
				req.user_details,
			);

			const result = successResponse(
				user,
				'Session data fetched successfully',
			);

			return res.status(StatusCodes.OK).json(result);
		} catch (error) {
			console.error(`ERROR_${task}:`, error);
			throw error;
		}
	}
}
