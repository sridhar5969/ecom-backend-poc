import { Router } from 'express';
import { PaymentsController } from './controller';

const paymentsRouter = Router();

paymentsRouter.post('/webhook/:provider', PaymentsController.handleWebhook);

export default paymentsRouter;
