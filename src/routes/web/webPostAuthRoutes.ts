import { Router } from 'express';
import protect from '@/middleware/protect';

export default function webPostAuthRoutes(): Router {
	const router = Router();
	// Protected route example
	router.use(protect);

	return router;
}
