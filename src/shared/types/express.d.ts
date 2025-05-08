import { UserModel } from '@/src/modules/auth/account/models/user.model'

declare global {
	namespace Express {
		interface Request {
			user: UserModel
		}
	}
}
