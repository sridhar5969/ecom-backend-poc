import { Router } from 'express';
import { HealthCheckController } from './controller';

const healthRouter= Router();

healthRouter.get('/verify',HealthCheckController.verify)

export default healthRouter