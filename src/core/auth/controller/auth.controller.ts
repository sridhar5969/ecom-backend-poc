import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AuthWebService } from '../services/auth.service';
import env from '@/env';
import { successResponse } from '@/utils/responseFormatter';

export class AuthController {
	private static authService: AuthWebService = new AuthWebService();

	constructor() {}
	// ---------------------------------
	// LOGIN
	// ---------------------------------
	public static async login(req: Request, res: Response) {
		const task = 'AUTH_LOGIN';

		try {
			const { bearerToken, body } = extractLoginInputs(req);

			const data = await AuthController.authService.loginUser(
				bearerToken,
				body,
			);

			// ----------------------------------------
			// SET COOKIES HERE
			// ----------------------------------------
			setAuthCookies(res, data.accessToken, data.refreshToken);

			const result = successResponse(
				{ role: data.role, authMethod: data.authMethod },
				'Login successful',
			);

			return res.status(StatusCodes.OK).json(result);
		} catch (error) {
			console.error(`ERROR_${task}:`, error);
			throw error;
		}
	}

	public static async refresh(req: Request, res: Response) {
		const task = 'AUTH_REFRESH';

		try {
			const refreshToken =
				req.cookies['refreshToken'] ?? req.body.refreshToken;

			const data =
				await AuthController.authService.refreshTokens(refreshToken);

			setAuthCookies(res, data.accessToken, data.refreshToken);

			return res
				.status(StatusCodes.OK)
				.json(successResponse({ role: data.role }, 'Tokens refreshed'));
		} catch (error) {
			console.error(`ERROR_${task}:`, error);
			throw error;
		}
	}

	public static async logout(req: Request, res: Response) {
		const task = 'AUTH_LOGOUT';

		try {
			const refreshToken =
				req.cookies['refreshToken'] ?? req.body.refreshToken;

			await AuthController.authService.logoutUser(refreshToken);

			clearAuthCookies(res);

			return res
				.status(StatusCodes.OK)
				.json(successResponse({}, 'Logged out successfully'));
		} catch (error) {
			console.error(`ERROR_${task}:`, error);
			throw error;
		}
	}
}

function extractLoginInputs(req: Request) {
	return {
		bearerToken: req.headers.authorization?.split(' ')[1],
		body: req.body,
	};
}

function setAuthCookies(
	res: Response,
	accessToken: string,
	refreshToken: string,
) {
	const isLocal = env.NODE_ENV === 'local';
	const domain = !isLocal ? env.COOKIE_DOMAIN : undefined;

	// Access Token cookie
	res.cookie('accessToken', accessToken, {
		httpOnly: false, // readable in frontend
		// secure: !isLocal, // only https in prod
		// sameSite: !isLocal ? 'none' : 'lax',
		domain,
		maxAge: 15 * 60 * 1000, // 15 minutes
	});

	// Refresh Token cookie
	res.cookie('refreshToken', refreshToken, {
		httpOnly: true, // http-only
		// secure: !isLocal,
		// sameSite: !isLocal ? 'none' : 'lax',
		domain,
		maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
	});
}

function clearAuthCookies(res: Response) {
	res.clearCookie('accessToken', {
		httpOnly: false,
		secure: env.NODE_ENV !== 'local',
		sameSite: env.NODE_ENV !== 'local' ? 'none' : 'lax',
	});

	res.clearCookie('refreshToken', {
		httpOnly: true,
		secure: env.NODE_ENV !== 'local',
		sameSite: env.NODE_ENV !== 'local' ? 'none' : 'lax',
	});
}
