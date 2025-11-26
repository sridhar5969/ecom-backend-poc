import { Router } from 'express';
import AuthWebController from '../../components/web/auth/auth-web.controller';
import FileWebController from '../../components/web/file/file-web.controller';

/**
 * Here, you can register routes by instantiating the controller.
 *
 */
export default function webPreAuthRoutes(): Router {
	const router = Router();

	const fileWebController: FileWebController = new FileWebController();
	router.use('/file', fileWebController.register()); // some foldername can be protected

	const authWebController: AuthWebController = new AuthWebController();
	router.use('/auth', authWebController.register());

	return router;
}
