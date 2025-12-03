import {
	CreateSessionRequest,
	PaymentSession,
} from '@/modules/payments/types/payments';

export interface IPaymentGateway {
	id: string; // e.g. 'traction'
	createSession(opts: CreateSessionRequest): Promise<PaymentSession>;
	requerySession(paymentSession: string): Promise<PaymentSession>;
	// verify webhook returns parsed object (null if verification fails)
	verifyWebhookPayload(
		headers: Record<string, string>,
		body: any,
	): Promise<{ valid: boolean; payload?: any }>;
}
