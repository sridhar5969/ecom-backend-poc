import { Request, Response } from 'express';
import { BrandsService } from '../service/brands.service';
import validator from './validator';
import { SuccessResponse } from '@/utils/apiResponse';
import logger from '@/utils/logger/logger';

export class BrandsController {
	private static readonly brandsService = new BrandsService();

	public static async getAllBrandsController(req: Request, res: Response) {
		const task = 'GET_ALL_BRANDS';
		try {
			const queryParams = validator.BrandsListQuerySchema.parse(
				req.query,
			);
			const data =
				await BrandsController.brandsService.getAllBrands(queryParams);
			return new SuccessResponse(res, data).send();
		} catch (error) {
			logger.error(`ERROR_${task}`, { error });
			throw error;
		}
	}

	public static async getBrandBySlugController(req: Request, res: Response) {
		const task = 'GET_BRAND_BY_SLUG';
		try {
			const { slug } = req.params as { slug?: string };
			const data = await BrandsController.brandsService.findBrandsBySlug(
				slug ?? '',
			);

			return new SuccessResponse(res, { data }).send();
		} catch (error) {
			logger.error(`ERROR_${task}`, { error });
			throw error;
		}
	}
}
