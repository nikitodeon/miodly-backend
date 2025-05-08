import { UseGuards } from '@nestjs/common'
import { Args, Context, Query, Resolver } from '@nestjs/graphql'
import { Request } from 'express'
import { UserModel } from 'src/modules/auth/account/models/user.model'
import { GqlAuthGuard } from 'src/shared/guards/gql-auth.guard'

import { UserService } from './user.service'

@Resolver()
export class UserResolver {
	constructor(private readonly userService: UserService) {}

	@UseGuards(GqlAuthGuard)
	@Query(() => [UserModel])
	async searchUsers(
		@Args('fullname') fullname: string,
		@Context() context: { req: Request }
	) {
		return this.userService.searchUsers(
			fullname,
			context.req.user.id as string
		)
	}

	@UseGuards(GqlAuthGuard)
	@Query(() => [UserModel])
	getUsersOfChatroom(@Args('chatroomId') chatroomId: number) {
		return this.userService.getUsersOfChatroom(chatroomId)
	}
}
