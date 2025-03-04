import { UseGuards } from '@nestjs/common'
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql'
import { Request } from 'express'
import { createWriteStream } from 'fs'
import * as GraphQLUpload from 'graphql-upload/GraphQLUpload.js'
import { join } from 'path'
import { UserModel } from 'src/modules/auth/account/models/user.model'
import { GqlAuthGuard } from 'src/shared/guards/gql-auth.guard'
import { v4 as uuidv4 } from 'uuid'

import { UserService } from './user.service'

@Resolver()
export class UserResolver {
	constructor(private readonly userService: UserService) {}

	// @UseGuards(GraphqlAuthGuard)
	// @Mutation(() => User)
	// async updateProfile(
	//   @Args('fullname') fullname: string,
	//   @Args('file', { type: () => GraphQLUpload, nullable: true })
	//   file: GraphQLUpload.FileUpload,
	//   @Context() context: { req: Request },
	// ) {
	//   const imageUrl = file ? await this.storeImageAndGetUrl(file) : null;
	//   const userId = context.req.user?.sub;
	//   return this.userService.updateProfile(
	//     userId as number,
	//     fullname,
	//     imageUrl as string,
	//   );
	// }

	// private async storeImageAndGetUrl(file: GraphQLUpload) {
	//   const { createReadStream, filename } = await file;
	//   const uniqueFilename = `${uuidv4()}_${filename}`;
	//   const imagePath = join(process.cwd(), 'public', 'images', uniqueFilename);
	//   const imageUrl = `${process.env.APP_URL}/images/${uniqueFilename}`;
	//   const readStream = createReadStream();
	//   readStream.pipe(createWriteStream(imagePath));
	//   return imageUrl;
	// }

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
