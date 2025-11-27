import { kafkaConfig, KafkaTopic } from './kafka.config';

class KafkaProducer {
	private enabled: boolean;

	constructor() {
		this.enabled = kafkaConfig.KAFKA_ENABLED === 'true';
	}

	async publish(topic: KafkaTopic, message: any): Promise<void> {
		if (!this.enabled) {
			console.log(`[Kafka Disabled] Would publish to ${topic}:`, message);
			return;
		}

		console.log(`[Kafka] Publishing to ${topic}:`, message);
	}

	async publishBatch(topic: KafkaTopic, messages: any[]): Promise<void> {
		if (!this.enabled) {
			console.log(
				`[Kafka Disabled] Would publish batch to ${topic}:`,
				messages.length,
				'messages',
			);
			return;
		}

		console.log(
			`[Kafka] Publishing batch to ${topic}:`,
			messages.length,
			'messages',
		);
	}
}

export const kafkaProducer = new KafkaProducer();
