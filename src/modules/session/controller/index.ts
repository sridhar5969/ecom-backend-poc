import { Router } from 'express';
import { SessionController } from './session.controller';

const sessionRouter = Router();

// Login (email/password or Azure Token)
sessionRouter.get('/', SessionController.fetchProfile);

export default sessionRouter;
