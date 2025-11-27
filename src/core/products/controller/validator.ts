import { z } from "zod/v4"



const validateGetProductsByCategory = z.object({
    categoryId: z.string().min(1)
})

export default { validateGetProductsByCategory }