import { IPaymentGateway } from './IPaymentGateway';
import { StripeGateway } from './stripe/StripeGateway';
import { TractionGateway } from './traction/TractionGateway';
import env from '@/env';

const registry = new Map<string, IPaymentGateway>();

export function registerGateway(gateway: IPaymentGateway) {
	registry.set(gateway.id, gateway);
}

export function getGateway(id: string): IPaymentGateway {
	const gw = registry.get(id);
	if (!gw) throw new Error(`Payment gateway "${id}" not registered`);
	return gw;
}

export class PaymentRegistry {
	constructor() {
		// TRACTION — register only if all env vars exist
		if (
			env.TRACTION_BASE_URL &&
			env.TRACTION_CLIENT_ID &&
			env.TRACTION_CLIENT_SECRET
		) {
			const traction = new TractionGateway({
				baseUrl: env.TRACTION_BASE_URL,
				clientId: env.TRACTION_CLIENT_ID,
				clientSecret: env.TRACTION_CLIENT_SECRET,
				webhookSecret: env.TRACTION_WEBHOOK_SECRET,
			});

			registerGateway(traction);
		}

		// PAYSTACK
		// if (env.PAYSTACK_SECRET) {
		//    registerGateway(new PaystackGateway(env.PAYSTACK_SECRET));
		// }

		// FLUTTERWAVE
		// if (env.FLUTTERWAVE_SECRET) {
		//    registerGateway(new FlutterwaveGateway(env.FLUTTERWAVE_SECRET));
		// }

		// STRIPE
		if (env.STRIPE_SECRET_KEY) {
			const stripe = new StripeGateway({
				secretKey: env.STRIPE_SECRET_KEY,
				webhookSecret: env.STRIPE_WEBHOOK_SECRET,
				successUrl:
					env.STRIPE_SUCCESS_URL ||
					`${env.APP_URI}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
				cancelUrl:
					env.STRIPE_CANCEL_URL || `${env.APP_URI}/checkout/cancel`,
			});
			registerGateway(stripe);
		}
	}

	current() {
		return getGateway(env.PAYMENT_PROVIDER);
	}
}
