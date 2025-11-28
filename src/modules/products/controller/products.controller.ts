import { Request, Response } from 'express';
import { ImportMaterialsService } from '../services/import-materials.service';
import { ProductsService } from '../services/products.service';
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

	private static readonly importMaterialsService =
		new ImportMaterialsService();

	public static async getAllProductsController(req: Request, res: Response) {
		const task = 'GET_ALL_PRODUCTS';
		try {
			const { limit = 10, page = 1 } = req.query;
			const params = {
				limit: Number(limit),
				page: Number(page),
			};
			const data =
				await ProductsController.productsService.getAllProducts(params);
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
