import { Request, Response } from 'express';
import { CategoryListService } from '../service/category-list.service';
import validator from './validator';
import { SuccessResponse } from '@/utils/apiResponse';
import logger from '@/utils/logger/logger';

export class CategoryController {
	private static categoryListService = new CategoryListService();

	public static async getAllCategoriesController(
		req: Request,
		res: Response,
	) {
		const task = 'GET_ALL_CATEGORIES';
		try {
			const queryParams = validator.CategoryListQuerySchema.parse(
				req.query,
			);
			const data =
				await CategoryController.categoryListService.getAllCategories(
					queryParams,
				);
			return new SuccessResponse(res, data).send();
		} catch (error) {
			logger.error(`ERROR_${task}`, { error });
			throw error;
		}
	}

	public static async getCategoryBySlug(req: Request, res: Response) {
		const task = 'GET_CATEGORY_BY_SLUG';
		try {
			const { slug } = req.params as { slug?: string };
			const data =
				await CategoryController.categoryListService.findCategoryBySlug(
					slug,
				);
			return new SuccessResponse(res, { data }).send();
		} catch (error) {
			logger.error(`ERROR_${task}`, { error });
			throw error;
		}
	}
}
