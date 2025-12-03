export type CreateSessionRequest = {
	amountKobo: number; // in kobo or smallest unit (NGN -> kobo)
	paymentSession: string; // client-side unique id (order id / txn id)
	metadata?: Record<string, any>;
};

export type PaymentSession = {
	paymentSession: string;
	accountNumber?: string;
	accountName?: string;
	bank?: string;
	amountKobo?: number;
	expiresAt?: string; // ISO
	status: 'pending' | 'completed' | 'rejected' | 'expired' | 'unknown';
	providerResponse?: any;
};
