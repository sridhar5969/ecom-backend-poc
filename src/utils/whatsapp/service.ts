import axios from 'axios';
import logger from '../logger/logger';
import env from '@/env';

export class WhatsAppService {
	private apiUrl: string;
	private accessToken: string;
	private phoneNumberId: string = env.WHATSAPP_PHONE_NUMBER_ID || '';
	private apiVersion: string = env.WHATSAPP_API_VERSION || 'v15.0';
	constructor() {
		this.apiUrl = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;

		this.accessToken = env.WHATSAPP_ACCESS_TOKEN || '';
	}
	public async sendPaymentConfirmation(
		to: string,
		customerName: string,
		orderNo: string,
		orderAmount: string,
		currency: string = 'NGN',
		items: { name: string; quantity: number; price: number }[] = [],
		deliveryDays: number = 3,
	): Promise<void> {
		try {
			const itemsList = items
				.map(
					(item) =>
						`• ${item.name} (x${item.quantity}) - ${item.price.toLocaleString()} ${currency}`,
				)
				.join('\n');

			const bodyText = `🎉 *Payment Successful!*\n\nHi *${customerName}*,\n\nYour payment has been confirmed successfully! ✅\n\n*Order Details:*\n📦 Order Number: ${orderNo}\n💰 Total Amount: ${orderAmount} ${currency}\n\n*Items Purchased:*\n${itemsList}\n\n🚚 Your order will be delivered in *${deliveryDays} days*.\n\nThank you for your purchase! We appreciate your business. 💚`;

			const footerText = `🌼 Powered by ${env.APPLICATION_NAME}`;

			const payload = {
				messaging_product: 'whatsapp',
				to,
				type: 'interactive',
				interactive: {
					type: 'button',
					body: {
						text: bodyText,
					},
					footer: {
						text: footerText,
					},
					action: {
						buttons: [
							{
								type: 'reply',
								reply: {
									id: 'BACK',
									title: '🔙 Back',
								},
							},
						],
					},
				},
			};
			//https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages

			const response = await axios.post(this.apiUrl, payload, {
				headers: {
					Authorization: `Bearer ${this.accessToken}`,
					'Content-Type': 'application/json',
				},
			});

			logger.info('Payment confirmation message sent successfully', {
				to,
				orderNo,
				messageId: response.data?.messages?.[0]?.id,
			});
		} catch (error) {
			logger.error('Failed to send payment confirmation message', {
				error: error instanceof Error ? error.message : error,
				errorResponse: (error as any)?.response?.data,
				to,
				orderNo,
			});
			throw error;
		}
	}
}
