import { Router } from 'express';
import { AuthController } from './auth.controller';

const authRouter = Router();

// Login (email/password or Azure Token)
authRouter.post('/login', AuthController.login);

// Refresh Token
authRouter.post('/refresh', AuthController.refresh);

// Logout
authRouter.post('/logout', AuthController.logout);

export default authRouter;
