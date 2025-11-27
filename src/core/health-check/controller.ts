import { Request, Response } from "express";

import { testConnection } from "@/database";
import { formatUptime } from "@/utils/general";


export class HealthCheckController {
    static async verify(
        _req: Request,
        res: Response,
    ) {
        const health = {
            uptime: formatUptime(process.uptime()),
            timestamp: new Date().toISOString(),
            status: 'ok' as const,
            checks: { db: 'ok' },
        };

        try {
            await testConnection();
            health.checks.db = 'ok';
        } catch {
            health.checks.db = 'error';
            return res.status(503).json(health);
        }

        return res.json(health);
    };

}