import { UserModel } from '@/src/modules/auth/account/models/user.model'

// src/types/express.d.ts
declare global {
	namespace Express {
		interface Request {
			user: UserModel // Замени 'any' на точный тип для пользователя
		}
	}
}
