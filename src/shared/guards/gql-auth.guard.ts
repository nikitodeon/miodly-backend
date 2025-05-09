import {
	type CanActivate,
	type ExecutionContext,
	Injectable,
	UnauthorizedException
} from '@nestjs/common'
import { GqlExecutionContext } from '@nestjs/graphql'

import { PrismaService } from '@/src/core/prisma/prisma.service'

@Injectable()
export class GqlAuthGuard implements CanActivate {
	public constructor(private readonly prismaService: PrismaService) {}

	public async canActivate(context: ExecutionContext): Promise<boolean> {
		const ctx = GqlExecutionContext.create(context)
		const request = ctx.getContext().req

		const req = ctx.getContext().req
		console.log('Запрос в GraphQL Guard:', {
			cookies: req.headers.cookie,
			session: req.session // Проверяем, есть ли сессия в объекте запроса
		})
		if (typeof request.session.userId === 'undefined') {
			console.log('Пользователь не авторизован')

			return false
		}

		const user = await this.prismaService.user.findUnique({
			where: {
				id: request.session.userId
			}
		})

		request.user = user

		return true
	}
}
