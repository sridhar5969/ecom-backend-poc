import { eq, inArray } from 'drizzle-orm';
import { StatusCodes } from 'http-status-codes';
import AppError from '@/abstractions/AppError';
import { db } from '@/database';
import {
	brands,
	categories,
	productCategories,
	productVariants,
	products,
} from '@/database/schema/products';
import { currencies } from '@/database/schema/system';
import { normalizeString } from '@/utils/general';
import logger from '@/utils/logger/logger';
import { handleServiceError } from '@/utils/serviceErrorHandler';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type UploadFilePayload = {
	originalname: string;
	mimetype?: string;
	buffer: Buffer;
};

type MaterialRecord = {
	materialCode: string;
	description: string;
	baseUnit?: string;
	materialGroup?: string;
	plant?: string;
	valuationClass?: string;
	valuationType?: string;
	mrpType?: string;
	purchasingGroup?: string;
	lastChange?: string;
	abcIndicator?: string;
	materialType?: string;
	priceUnit: number;
	rawPrice?: string;
	priceAmountMinor: number;
	priceControl?: string;
	currency: string;
	createdBy?: string;
};

type MaterialGroup = {
	materialCode: string;
	description: string;
	title: string;
	slug: string;
	brandSlug?: string;
	baseUnit?: string;
	materialType?: string;
	abcIndicators: string[];
	plants: string[];
	currencies: string[];
	mrpTypes: string[];
	purchasingGroups: string[];
	priceUnits: number[];
	rows: MaterialRecord[];
};

type CategoryResolution = {
	canonicalCategoryId: string | null;
	categoryIds: string[];
};

type MaterialsImportSummary = {
	totalRows: number;
	createdProducts: number;
	updatedProducts: number;
	createdVariants: number;
	updatedVariants: number;
	skippedRows: number;
};

type CurrencyCache = {
	codes: Set<string>;
	expiresAt: number;
};

export class ImportMaterialsService {
	private readonly supportedMimeTypes = new Set([
		'text/csv',
		'application/csv',
		'application/vnd.ms-excel',
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	]);

	private allowedCurrencyCodes: Set<string> = new Set(['NGN']);

	private static currencyCodesCache: CurrencyCache | null = null;

	private static readonly currencyCacheTtlMs = 15 * 60 * 1000;

	public async import(
		file?: UploadFilePayload,
	): Promise<MaterialsImportSummary> {
		try {
			if (!file?.buffer?.length) {
				throw new AppError(
					'Please upload a CSV export from SAP.',
					StatusCodes.BAD_REQUEST,
				);
			}

			if (!this.isSupportedMimeType(file.mimetype)) {
				throw new AppError(
					'Unsupported file type. Upload a valid CSV file.',
					StatusCodes.BAD_REQUEST,
				);
			}

			const { rows, skippedRows: skippedDuringParse } = this.parseCsv(
				file.buffer,
			);

			if (!rows.length) {
				throw new AppError(
					'Uploaded file does not contain material rows.',
					StatusCodes.BAD_REQUEST,
				);
			}

			const groupedMaterials = this.groupByMaterial(rows);
			this.allowedCurrencyCodes = await this.getAllowedCurrencyCodes();
			const rowSkuMap = this.createRowSkuMap(rows);

			const summary = await db.transaction(async (tx) => {
				const brandMap = await this.resolveBrandMap(
					tx,
					groupedMaterials
						.map((group) => group.brandSlug)
						.filter(Boolean) as string[],
				);

				const categoryResolution = await this.resolveCategories(tx);
				const existingProductsMap = await this.loadExistingProducts(
					tx,
					groupedMaterials.map((group) => group.slug),
				);

				const existingVariantsMap = await this.loadExistingVariants(
					tx,
					Array.from(new Set(rowSkuMap.values())),
				);

				const now = new Date();
				const accumulator: MaterialsImportSummary = {
					totalRows: rows.length,
					createdProducts: 0,
					updatedProducts: 0,
					createdVariants: 0,
					updatedVariants: 0,
					skippedRows: skippedDuringParse,
				};

				for (const group of groupedMaterials) {
					const brandId = group.brandSlug
						? (brandMap.get(group.brandSlug) ?? null)
						: null;
					const productPayload = this.buildProductPayload({
						group,
						now,
						brandId,
						canonicalCategoryId:
							categoryResolution.canonicalCategoryId,
					});

					const existingProduct = existingProductsMap.get(group.slug);
					let productId: string | undefined;

					if (existingProduct) {
						await tx
							.update(products)
							.set(productPayload)
							.where(eq(products.id, existingProduct.id));
						productId = existingProduct.id;
						accumulator.updatedProducts += 1;
					} else {
						const [inserted] = await tx
							.insert(products)
							.values({ ...productPayload, createdAt: now })
							.returning({ id: products.id });

						if (!inserted) {
							accumulator.skippedRows += group.rows.length;
							continue;
						}

						productId = inserted.id;
						accumulator.createdProducts += 1;
					}

					if (productId && categoryResolution.categoryIds.length) {
						await tx
							.insert(productCategories)
							.values(
								categoryResolution.categoryIds.map(
									(categoryId) => ({
										productId,
										categoryId,
									}),
								),
							)
							.onConflictDoNothing();
					}

					for (const row of group.rows) {
						const sku =
							rowSkuMap.get(row) ?? this.buildVariantSku(row);
						const variantPayload = this.buildVariantPayload({
							row,
							productId,
							now,
						});

						const existingVariant = existingVariantsMap.get(sku);

						if (existingVariant) {
							await tx
								.update(productVariants)
								.set(variantPayload)
								.where(
									eq(productVariants.id, existingVariant.id),
								);
							accumulator.updatedVariants += 1;
						} else {
							await tx
								.insert(productVariants)
								.values({ ...variantPayload, sku })
								.onConflictDoNothing();
							accumulator.createdVariants += 1;
						}
					}
				}

				return accumulator;
			});

			logger.info('SAP materials import completed', {
				fileName: file.originalname,
				...summary,
			});

			return summary;
		} catch (error) {
			logger.error(error);
			return handleServiceError(
				error,
				'Unable to import SAP materials data',
			);
		}
	}

	private isSupportedMimeType(mime?: string) {
		if (!mime) return true;
		return this.supportedMimeTypes.has(mime);
	}

	private parseCsv(buffer: Buffer): {
		rows: MaterialRecord[];
		skippedRows: number;
	} {
		const content = buffer.toString('utf-8');
		const lines = content
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter((line) => line.length > 0);

		if (!lines.length) {
			return { rows: [], skippedRows: 0 };
		}

		const headers = this.tokenizeLine(lines.shift()!);
		const normalizedHeaders = headers.map((header) =>
			header.replace(/^\ufeff/, '').trim(),
		);

		const rows: MaterialRecord[] = [];
		let skippedRows = 0;

		for (const line of lines) {
			const values = this.tokenizeLine(line);
			if (values.length !== normalizedHeaders.length) {
				skippedRows += 1;
				continue;
			}

			const rawRecord: Record<string, string> = {};
			normalizedHeaders.forEach((header, index) => {
				rawRecord[header] = values[index]?.trim() ?? '';
			});

			const materialRecord = this.mapRow(rawRecord);
			if (!materialRecord) {
				skippedRows += 1;
				continue;
			}

			rows.push(materialRecord);
		}

		return { rows, skippedRows };
	}

	private tokenizeLine(line: string): string[] {
		const tokens: string[] = [];
		let current = '';
		let inQuotes = false;

		for (let i = 0; i < line.length; i++) {
			const char = line[i];

			if (char === '"') {
				if (inQuotes && line[i + 1] === '"') {
					current += '"';
					i += 1;
					continue;
				}

				inQuotes = !inQuotes;
				continue;
			}

			if (char === ',' && !inQuotes) {
				tokens.push(current);
				current = '';
				continue;
			}

			current += char;
		}

		tokens.push(current);
		return tokens.map((token) => token.replace(/^\ufeff/, '').trim());
	}

	private mapRow(raw: Record<string, string>): MaterialRecord | null {
		const materialCode = raw['Material']?.trim();
		const description = raw['Material Description']?.trim();

		if (!materialCode || !description) {
			return null;
		}

		const priceUnit = this.parseInteger(raw['Price unit']) || 1;
		const priceAmountMinor = this.parsePrice(raw['Price']);

		return {
			materialCode,
			description,
			baseUnit: raw['Base Unit of Measure']?.trim(),
			materialGroup: raw['Material Group']?.trim(),
			plant: raw['Plant']?.trim(),
			valuationClass: raw['Valuation Class']?.trim(),
			valuationType: raw['Valuation Type']?.trim(),
			mrpType: raw['MRP Type']?.trim(),
			purchasingGroup: raw['Purchasing Group']?.trim(),
			lastChange: this.parseDate(raw['Last Change']),
			abcIndicator: raw['ABC Indicator']?.trim(),
			materialType: raw['Material type']?.trim(),
			priceUnit,
			rawPrice: raw['Price'],
			priceAmountMinor,
			priceControl: raw['Price control']?.trim(),
			currency: this.normalizeCurrency(raw['Currency']),
			createdBy: raw['Created By']?.trim(),
		};
	}

	private normalizeCurrency(value?: string) {
		const fallback = 'NGN'; // default nigirian currency
		if (!value) return fallback;
		const trimmed = value.trim();
		if (!trimmed) return fallback;
		const uppercased = trimmed.toUpperCase();
		const sanitized = uppercased.replace(/[^A-Z]/g, '');
		if (this.allowedCurrencyCodes.has(sanitized)) return sanitized;
		return fallback;
	}

	private parseInteger(value?: string, fallback = 1) {
		if (!value) return fallback;
		const normalized = value.replace(/[^0-9.-]/g, '');
		if (!normalized) return fallback;
		const parsed = Number.parseInt(normalized, 10);
		return Number.isNaN(parsed) ? fallback : parsed;
	}

	private parsePrice(value?: string) {
		if (!value) return 0;
		const normalized = value.replace(/[^0-9.-]/g, '');
		if (!normalized) return 0;
		const parsed = Number.parseFloat(normalized);
		if (Number.isNaN(parsed)) return 0;
		return Math.round(parsed * 100);
	}

	private parseDate(value?: string) {
		if (!value) return undefined;
		const parsed = new Date(value);
		if (Number.isNaN(parsed.getTime())) {
			return undefined;
		}
		return parsed.toISOString();
	}

	private groupByMaterial(rows: MaterialRecord[]): MaterialGroup[] {
		const grouped = new Map<string, MaterialRecord[]>();

		for (const row of rows) {
			const current = grouped.get(row.materialCode) ?? [];
			current.push(row);
			grouped.set(row.materialCode, current);
		}

		return Array.from(grouped.entries()).map(([materialCode, records]) => {
			const base = records[0];
			return {
				materialCode,
				description: base.description,
				title: normalizeString(base.description) || base.description,
				slug: this.buildProductSlug(base),
				brandSlug: this.slugify(base.materialGroup),
				baseUnit: base.baseUnit,
				materialType: base.materialType,
				abcIndicators: this.toUniqueList(
					records.map((record) => record.abcIndicator),
				),
				plants: this.toUniqueList(
					records.map((record) => record.plant),
				),
				currencies: this.toUniqueList(
					records.map((record) => record.currency),
				),
				mrpTypes: this.toUniqueList(
					records.map((record) => record.mrpType),
				),
				purchasingGroups: this.toUniqueList(
					records.map((record) => record.purchasingGroup),
				),
				priceUnits: this.toUniqueNumberList(
					records.map((record) => record.priceUnit),
				),
				rows: records,
			};
		});
	}

	private toUniqueList(values: Array<string | undefined>) {
		return Array.from(
			new Set(
				values.filter((value): value is string =>
					Boolean(value?.length),
				),
			),
		);
	}

	private toUniqueNumberList(values: number[]) {
		return Array.from(new Set(values));
	}

	private buildProductSlug(row: MaterialRecord) {
		const baseSlug = this.slugify(row.description) || 'material';
		return `${baseSlug}-${this.slugify(row.materialCode)}`;
	}

	private slugify(value?: string) {
		if (!value) return '';
		return value
			.toString()
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	private buildVariantSku(row: MaterialRecord) {
		const parts = [
			row.materialCode,
			row.plant || 'GEN',
			row.currency,
			row.valuationType || 'STD',
			row.valuationClass || 'BASE',
		];

		return parts
			.map(
				(part) =>
					part.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'GEN',
			)
			.join('-');
	}

	private buildProductPayload({
		group,
		now,
		brandId,
		canonicalCategoryId,
	}: {
		group: MaterialGroup;
		now: Date;
		brandId: string | null;
		canonicalCategoryId: string | null;
	}) {
		return {
			title: group.title,
			slug: group.slug,
			description: group.description,
			brandId,
			canonicalCategoryId,
			metadata: {
				source: 'sap_zfin',
				materialCode: group.materialCode,
				baseUnit: group.baseUnit,
				materialType: group.materialType,
				abcIndicators: group.abcIndicators,
				plants: group.plants,
				currencies: group.currencies,
				mrpTypes: group.mrpTypes,
				purchasingGroups: group.purchasingGroups,
				priceUnits: group.priceUnits,
				lastSyncedAt: now.toISOString(),
			},
			type: 'simple' as const,
			status: 'active',
			updatedAt: now,
		};
	}

	private buildVariantPayload({
		row,
		productId,
		now,
	}: {
		row: MaterialRecord;
		productId: string;
		now: Date;
	}) {
		const compareAt =
			row.priceAmountMinor > 0
				? Math.round(row.priceAmountMinor * 1.05)
				: null;

		return {
			productId,
			name: this.buildVariantName(row),
			priceAmount: row.priceAmountMinor,
			priceCurrency: row.currency,
			compareAtAmount: compareAt,
			costPriceAmount: row.priceAmountMinor,
			weightKg: null,
			attributes: {
				plant: row.plant,
				valuationClass: row.valuationClass,
				valuationType: row.valuationType,
				mrpType: row.mrpType,
				purchasingGroup: row.purchasingGroup,
				priceUnit: row.priceUnit,
				baseUnit: row.baseUnit,
				priceControl: row.priceControl,
				lastChange: row.lastChange,
				rawPrice: row.rawPrice,
				createdBy: row.createdBy,
			},
			isActive: true,
			updatedAt: now,
		};
	}

	private buildVariantName(row: MaterialRecord) {
		const segments = [normalizeString(row.description) || row.description];
		if (row.plant) {
			segments.push(`Plant ${row.plant}`);
		}
		segments.push(row.currency);
		return segments.join(' Â· ');
	}

	private async resolveBrandMap(client: Transaction, slugs: string[]) {
		const uniqueSlugs = Array.from(new Set(slugs.filter(Boolean)));
		if (!uniqueSlugs.length) {
			return new Map<string, string>();
		}

		const records = await client
			.select({ id: brands.id, slug: brands.slug })
			.from(brands)
			.where(inArray(brands.slug, uniqueSlugs));

		return new Map(
			records
				.filter((record) => record.slug)
				.map((record) => [record.slug as string, record.id]),
		);
	}

	private async resolveCategories(client: Transaction) {
		const records = await client
			.select({ id: categories.id })
			.from(categories)
			.orderBy(categories.createdAt ?? categories.slug)
			.limit(3);

		const categoryIds = records
			.map((record) => record.id)
			.filter((id): id is string => Boolean(id));

		return {
			canonicalCategoryId: categoryIds[0] ?? null,
			categoryIds,
		} satisfies CategoryResolution;
	}

	private async loadExistingProducts(client: Transaction, slugs: string[]) {
		const uniqueSlugs = Array.from(new Set(slugs.filter(Boolean)));
		if (!uniqueSlugs.length) {
			return new Map<string, { id: string; slug: string | null }>();
		}

		const records = await client
			.select({ id: products.id, slug: products.slug })
			.from(products)
			.where(inArray(products.slug, uniqueSlugs));

		return new Map(
			records
				.filter((record) => record.slug)
				.map((record) => [record.slug as string, record]),
		);
	}

	private async loadExistingVariants(client: Transaction, skus: string[]) {
		const uniqueSkus = Array.from(new Set(skus.filter(Boolean)));
		if (!uniqueSkus.length) {
			return new Map<string, { id: string; sku: string | null }>();
		}

		const records = await client
			.select({ id: productVariants.id, sku: productVariants.sku })
			.from(productVariants)
			.where(inArray(productVariants.sku, uniqueSkus));

		return new Map(
			records
				.filter((record) => record.sku)
				.map((record) => [record.sku as string, record]),
		);
	}

	private async getAllowedCurrencyCodes() {
		const now = Date.now();
		const cache = ImportMaterialsService.currencyCodesCache;
		if (cache && cache.expiresAt > now) {
			return cache.codes;
		}

		const records = await db
			.select({ code: currencies.code })
			.from(currencies);
		const codes = new Set<string>(
			records
				.map((record) => record.code?.trim().toUpperCase())
				.filter((code): code is string => Boolean(code)),
		);

		if (!codes.size) {
			codes.add('NGN');
		}

		ImportMaterialsService.currencyCodesCache = {
			codes,
			expiresAt: now + ImportMaterialsService.currencyCacheTtlMs,
		};

		return codes;
	}

	private createRowSkuMap(rows: MaterialRecord[]) {
		const map = new Map<MaterialRecord, string>();
		for (const row of rows) {
			map.set(row, this.buildVariantSku(row));
		}
		return map;
	}
}
