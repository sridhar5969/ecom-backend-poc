import crypto from 'node:crypto';
import axios, { AxiosInstance } from 'axios';
import { IPaymentGateway } from '../IPaymentGateway';
import {
	CreateSessionRequest,
	PaymentSession,
} from '@/modules/payments/types/payments';

type TractionConfig = {
	baseUrl: string;
	clientId: string;
	clientSecret: string;
	webhookSecret?: string; // if Traction supports HMAC or signature header
};

export class TractionGateway implements IPaymentGateway {
	id = 'traction';
	private http: AxiosInstance;
	private cfg: TractionConfig;

	constructor(cfg: TractionConfig) {
		this.cfg = cfg;
		this.http = axios.create({
			baseURL: cfg.baseUrl,
			headers: {
				'Content-Type': 'application/json',
				'X-Client-ID': cfg.clientId,
				'X-Client-Secret': cfg.clientSecret,
			},
			timeout: 10_000,
		});
	}

	async createSession(opts: CreateSessionRequest): Promise<PaymentSession> {
		// Traction expects "amount" (kobo) and "payment_session"
		const body = {
			amount: opts.amountKobo,
			payment_session: opts.paymentSession,
			metadata: opts.metadata ?? {},
		};
		const resp = await this.http.post('/v1/dynamic-accounts', body);
		const d = resp.data?.data ?? {};
		// Normalize shape
		const session: PaymentSession = {
			paymentSession: d.payment_session ?? opts.paymentSession,
			accountNumber: d.account_number,
			accountName: d.account_name,
			bank: d.bank,
			amountKobo: d.amount,
			expiresAt: d.expires,
			status: 'pending',
			providerResponse: resp.data,
		};
		return session;
	}

	async requerySession(paymentSession: string) {
		const resp = await this.http.get(
			`/v1/dynamic-accounts/session/${encodeURIComponent(paymentSession)}`,
		);
		const body = resp.data ?? {};
		// Map per doc's response variants
		const statusMap = (paymentStatus) => {
			if (!body) return 'unknown';
			switch (paymentStatus) {
				case 'not_received':
					return 'pending';
				case 'received':
					return 'completed';
				case 'rejected':
					return 'rejected';
				case 'received_after_expiry':
					return 'rejected';
				default:
					return body.status === 'failed'
						? 'rejected'
						: body.status === 'success'
							? 'completed'
							: 'unknown';
			}
		};

		const session: PaymentSession = {
			paymentSession: body.payment_session ?? paymentSession,
			status: statusMap(body.payment_status),
			amountKobo: body.paid_amount ?? body.amount,
			// other fields optional
			providerResponse: body,
		};
		return session;
	}

	async verifyWebhookPayload(
		headers: Record<string, string>,
		body: any,
	): Promise<{ valid: boolean; payload?: any }> {
		// The Traction doc mentions validating webhook signatures if enabled.
		// If Traction sets a signature header (e.g. x-traction-signature) and you have webhookSecret,
		// verify with HMAC SHA256. If no signature available, you may choose to validate shape + idempotency.
		try {
			const sigHeader =
				headers['x-traction-signature'] || headers['x-signature'];
			if (
				this.cfg.webhookSecret &&
				sigHeader &&
				typeof body === 'string'
			) {
				const expected = crypto
					.createHmac('sha256', this.cfg.webhookSecret)
					.update(body)
					.digest('hex');
				const valid = crypto.timingSafeEqual(
					Buffer.from(expected),
					Buffer.from(sigHeader),
				);
				if (!valid) return { valid: false };
			}
			// parse body if string
			const payload = typeof body === 'string' ? JSON.parse(body) : body;
			// basic shape validation
			if (!payload?.payment_session) return { valid: false };
			return { valid: true, payload };
		} catch (err) {
			return { valid: false };
		}
	}
}
