import { Request, Response } from 'express';

import { ImportMaterialsService } from '../services/import-materials.service';
import { ProductBundlesManagementService } from '../services/products-bundles-managements.service';
import { ProductsService } from '../services/products.service';
import { RtkQueryError } from './../../../../../frontend/src/types/api.types';
import validators from './validator';
import { NotFoundResponse, SuccessResponse } from '@/utils/apiResponse';
import logger from '@/utils/logger/logger';
import { successResponse } from '@/utils/responseFormatter';

type MemoryUploadedFile = {
	originalname: string;
	fileType?: string;
	buffer: Buffer;
};

type NormalizedUpload = {
	originalname: string;
	mimetype?: string;
	buffer: Buffer;
};

export class ProductsController {
	private static readonly productsService = new ProductsService();
	private static readonly bundlesService =
		new ProductBundlesManagementService();

	private static readonly importMaterialsService =
		new ImportMaterialsService();

	public static async getAllProductsController(req: Request, res: Response) {
		const task = 'GET_ALL_PRODUCTS';
		try {
			const queryParams = validators.ProductListQuerySchema.parse(
				req.query,
			);
			const data =
				await ProductsController.productsService.getAllProducts(
					queryParams,
				);
			return new SuccessResponse(res, data).send();
		} catch (error) {
			logger.error(`ERROR_${task}`, { error });
			throw error;
		}
	}

	public static async getProductBySlugController(
		req: Request,
		res: Response,
	) {
		const task = 'GET_PRODUCT_BY_SLUG';
		try {
			const { slug } = req.params as { slug?: string };
			const data =
				await ProductsController.productsService.getProductBySlug(
					slug ?? '',
				);
			if (!data) {
				return new NotFoundResponse(res, 'Product not found').send();
			}
			return new SuccessResponse(res, { data }).send();
		} catch (error) {
			logger.error(`ERROR_${task}`, { error });
			throw error;
		}
	}

	public static async getBundleDetailsController(
		req: Request,
		res: Response,
	) {
		const task = 'GET_BUNDLE_DETAILS';
		try {
			const { slug } = req.params as { slug?: string };
			const data =
				await ProductsController.bundlesService.getBundleDetails(
					slug ?? '',
				);
			if (!data) {
				return new NotFoundResponse(
					res,
					'Bundle product not found',
				).send();
			}
			return new SuccessResponse(res, { data }).send();
		} catch (error) {
			logger.error(`ERROR_${task}`, { error });
			throw error;
		}
	}

	public static async createBundleController(req: Request, res: Response) {
		const task = 'CREATE_BUNDLE';
		try {
			console.log('Creating bundle with body:', req.body);
			const parsed = validators.CreateBundleSchema.parse(req.body);

			const result =
				await ProductsController.bundlesService.createBundle(parsed);

			return new SuccessResponse(res, result).send();
		} catch (error) {
			logger.error(`ERROR_${task}`, { error });
			throw error;
		}
	}

	public static async getAvailableVariantsController(
		req: Request,
		res: Response,
	) {
		const task = 'GET_AVAILABLE_VARIANTS';
		try {
			const variants =
				await ProductsController.bundlesService.getAvailableVariantsForBundle();

			return new SuccessResponse(res, {
				success: true,
				data: variants,
				count: variants.length,
			}).send();
		} catch (error) {
			logger.error(`ERROR_${task}`, { error });
			throw error;
		}
	}

	public static async updateBundleController(req: Request, res: Response) {
		const task = 'UPDATE_BUNDLE';
		try {
			const { variantId } = req.params as { variantId?: string };

			if (!variantId) {
				return res.status(400).json({
					success: false,
					message: 'variantId is required',
				});
			}

			const parsed = validators.UpdateBundleSchema.parse(req.body);

			const { components } = parsed;

			const result = await ProductsController.bundlesService.updateBundle(
				{
					variantId,
					components,
				},
			);

			return new SuccessResponse(res, result).send();
		} catch (error) {
			logger.error(`ERROR_${task}`, { error });
			throw error;
		}
	}

	public static async deleteBundleController(req: Request, res: Response) {
		const task = 'DELETE_BUNDLE';
		try {
			const { variantId } = req.params as { variantId?: string };

			if (!variantId) {
				return res.status(400).json({
					success: false,
					message: 'variantId is required',
				});
			}

			const result =
				await ProductsController.bundlesService.deleteBundle(variantId);

			return new SuccessResponse(res, result).send();
		} catch (error) {
			logger.error(`ERROR_${task}`, { error });
			throw error;
		}
	}

	public static async importMaterials(req: Request, res: Response) {
		const task = 'IMPORT_MATERIALS';
		try {
			const file = ProductsController.extractUploadedFile(req);
			const summary =
				await ProductsController.importMaterialsService.import(file);
			const result = successResponse(
				summary,
				'Materials imported successfully',
			);
			return res.json(result);
		} catch (error) {
			logger.error(`ERROR_${task}`, { error });
			throw error;
		}
	}

	private static extractUploadedFile(
		req: Request,
	): NormalizedUpload | undefined {
		const bodyFiles = Array.isArray((req.body as any)?.files)
			? ((req.body as any).files as MemoryUploadedFile[])
			: [];

		const memoryFile = bodyFiles[0];
		const multerFiles = (req as any).files as
			| Express.Multer.File[]
			| undefined;
		const multerFile =
			Array.isArray(multerFiles) && multerFiles.length > 0
				? multerFiles[0]
				: undefined;

		const chosen = (memoryFile ?? multerFile) as
			| MemoryUploadedFile
			| Express.Multer.File
			| undefined;

		if (!chosen) {
			return undefined;
		}

		return {
			originalname: chosen.originalname,
			buffer: chosen.buffer,
			mimetype:
				(multerFile && multerFile.mimetype) ?? memoryFile?.fileType,
		};
	}
}
