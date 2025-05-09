import { UseFilters, UseGuards } from '@nestjs/common'
import {
	Args,
	Context,
	Mutation,
	Query,
	Resolver,
	Subscription
} from '@nestjs/graphql'
import { ApolloError } from 'apollo-server-express'
import { Request } from 'express'
import { PubSub } from 'graphql-subscriptions'
import * as GraphQLUpload from 'graphql-upload/GraphQLUpload.js'
import * as Upload from 'graphql-upload/Upload.js'
import { GraphQLErrorFilter } from 'src/filters/custom-exception.filter'
import { UserModel } from 'src/modules/auth/account/models/user.model'
import { UserService } from 'src/modules/user/user.service'
import { GqlAuthGuard } from 'src/shared/guards/gql-auth.guard'

import { PrismaService } from '@/src/core/prisma/prisma.service'
import { MessageFileValidationPipe } from '@/src/shared/pipes/message-file-validation.pipe'

import { ChatroomService } from './chatroom.service'
import { Chatroom, Message, UpdateUsersRolesResponse } from './chatroom.types'
import { ChangeChatnameInput } from './inputs/change-chatname.input'
import { UpdateUsersRolesInput } from './inputs/chatroom-role.input'

@Resolver()
export class ChatroomResolver {
	public pubSub: PubSub
	constructor(
		private readonly chatroomService: ChatroomService,
		private readonly userService: UserService,
		private readonly prisma: PrismaService
	) {
		this.pubSub = new PubSub()
	}

	@Subscription(() => Message, {
		filter: (payload, variables) => {
			// Проверка: если новое сообщение пришло в чат, в котором находится подписчик
			return payload.newMessage.chatroom.id === variables.chatroomId
		}
	})
	newMessage(
		@Args('userId') userId: string,
		@Args('chatroomId') chatroomId: number
	) {
		return this.pubSub.asyncIterableIterator(`newMessage.${userId}`)
	}

	@Subscription(() => Message, {
		filter: (payload, variables) => {
			if (!payload || typeof payload !== 'object') return false
			if (!payload.newMessageForAllChats) return false
			if (!payload.newMessageForAllChats.chatroom) return false

			const chatroomUsers =
				payload.newMessageForAllChats.chatroom.ChatroomUsers
			if (!Array.isArray(chatroomUsers)) return false

			for (const user of chatroomUsers) {
				if (user?.user?.id === variables.userId) {
					return true
				}
			}
			return false
		},
		resolve: payload => payload.newMessageForAllChats
	})
	newMessageForAllChats(@Args('userId') userId: string) {
		return this.pubSub.asyncIterableIterator(`newMessageForAllChats`)
	}

	@Subscription(() => UserModel, {
		nullable: true,
		resolve: value => value.user,
		filter: (payload, variables) => {
			console.log('payload1', variables, payload.typingUserId)
			return variables.userId !== payload.typingUserId
		}
	})
	userStartedTyping(
		@Args('chatroomId') chatroomId: number,
		@Args('userId') userId: string
	) {
		return this.pubSub.asyncIterableIterator(
			`userStartedTyping.${chatroomId}`
		)
	}

	@Subscription(() => UserModel, {
		nullable: true,
		resolve: value => value.user,
		filter: (payload, variables) => {
			return variables.userId !== payload.typingUserId
		}
	})
	userStoppedTyping(
		@Args('chatroomId') chatroomId: number,
		@Args('userId') userId: string
	) {
		return this.pubSub.asyncIterableIterator(
			`userStoppedTyping.${chatroomId}`
		)
	}

	@UseFilters(GraphQLErrorFilter)
	@UseGuards(GqlAuthGuard)
	@Mutation(returns => UserModel)
	async userStartedTypingMutation(
		@Args('chatroomId') chatroomId: number,
		@Context() context: { req: Request }
	) {
		if (!context.req.user) {
			throw new Error('User is not authenticated')
		}

		const user = await this.userService.getUser(context.req.user.id)
		await this.pubSub.publish(`userStartedTyping.${chatroomId}`, {
			user,
			typingUserId: user?.id
		})
		return user
	}
	@UseFilters(GraphQLErrorFilter)
	@UseGuards(GqlAuthGuard)
	@Mutation(() => UserModel, {})
	async userStoppedTypingMutation(
		@Args('chatroomId') chatroomId: number,
		@Context() context: { req: Request }
	) {
		if (!context.req.user) {
			throw new Error('User is not authenticated')
		}

		const user = await this.userService.getUser(context.req.user.id)

		await this.pubSub.publish(`userStoppedTyping.${chatroomId}`, {
			user,
			typingUserId: user?.id
		})

		return user
	}

	@UseGuards(GqlAuthGuard)
	@Mutation(() => Message)
	async sendMessage(
		@Args('chatroomId') chatroomId: number,
		@Args('content') content: string,
		@Context() context: { req: Request },

		@Args(
			'file',
			{ type: () => GraphQLUpload, nullable: true },
			MessageFileValidationPipe
		)
		file?: Upload
	) {
		let imagePath: string | null = null

		if (
			file &&
			file.promise &&
			typeof file.createReadStream === 'function'
		) {
			console.log('file received:', file)

			// Преобразование файла, если он был передан
			try {
				imagePath = await this.chatroomService.saveImage(file)
			} catch (error) {
				console.log('Error saving image:', error)
				throw new ApolloError('Ошибка при сохранении изображения')
			}
		}

		if (!context.req.user) {
			throw new Error('User is not authenticated')
		}

		const newMessage = await this.chatroomService.sendMessage(
			chatroomId,
			content,
			context.req.user.id,
			imagePath || ''
		)

		const chatroomUsers = await this.prisma.chatroomUsers.findMany({
			where: { chatroomId },
			select: { userId: true }
		})

		try {
			await Promise.all(
				chatroomUsers.map(user =>
					this.pubSub.publish(`newMessage.${user.userId}`, {
						newMessage,
						userId: user.userId
					})
				)
			)

			const chatroomWithUsers = await this.prisma.chatroom.findUnique({
				where: { id: chatroomId },
				include: {
					ChatroomUsers: {
						include: { user: true }
					}
				}
			})

			const safePayload = {
				newMessageForAllChats: {
					...newMessage,
					chatroom: {
						id: chatroomId,
						ChatroomUsers:
							chatroomWithUsers?.ChatroomUsers?.map(cu => ({
								user: { id: cu.user.id }
							})) || []
					}
				}
			}

			await this.pubSub.publish(`newMessageForAllChats`, safePayload)
		} catch (error) {
			console.log('Error publishing message:', error)
		}

		return newMessage
	}

	@UseFilters(GraphQLErrorFilter)
	@UseGuards(GqlAuthGuard)
	@Mutation(() => Chatroom)
	async createChatroom(
		@Args('name') name: string,
		@Context() context: { req: Request }
	) {
		if (!context.req.user) {
			throw new Error('User is not authenticated')
		}

		return this.chatroomService.createChatroom(name, context.req.user.id)
	}

	@Mutation(() => Chatroom)
	async addUsersToChatroom(
		@Args('chatroomId') chatroomId: number,
		@Args('userIds', { type: () => [String] }) userIds: string[]
	) {
		return this.chatroomService.addUsersToChatroom(chatroomId, userIds)
	}

	@Mutation(() => Chatroom)
	async removeUsersFromChatroom(
		@Args('chatroomId') chatroomId: number,
		@Args('userIds', { type: () => [String] }) userIds: string[]
	) {
		return this.chatroomService.removeUsersFromChatroom(chatroomId, userIds)
	}

	@Query(() => [Chatroom])
	async getChatroomsForUser(@Args('userId') userId: string) {
		return this.chatroomService.getChatroomsForUser(userId)
	}

	@Query(() => [Message])
	async getMessagesForChatroom(@Args('chatroomId') chatroomId: number) {
		return this.chatroomService.getMessagesForChatroom(chatroomId)
	}
	@Mutation(() => String)
	async deleteChatroom(@Args('chatroomId') chatroomId: number) {
		await this.chatroomService.deleteChatroom(chatroomId)
		return 'Chatroom deleted successfully'
	}

	@Mutation(() => Chatroom, { name: 'changeChatName' })
	async changeChatName(
		@Args('chatroomId') chatroomId: number,
		@Args('data') input: ChangeChatnameInput
	) {
		return this.chatroomService.changeChatName(chatroomId, input)
	}

	@UseGuards(GqlAuthGuard)
	@Mutation(() => UpdateUsersRolesResponse)
	async promoteUsersRoles(
		@Args('data') data: UpdateUsersRolesInput,
		@Context() context: { req: Request }
	) {
		if (!context.req.user) {
			throw new Error('Пользователь не аутентифицирован')
		}

		try {
			return await this.chatroomService.promoteUsers(
				context.req.user.id,
				data.chatroomId,
				data.targetUserIds
			)
		} catch (error) {
			throw new ApolloError(error.message)
		}
	}

	@UseGuards(GqlAuthGuard)
	@Mutation(() => UpdateUsersRolesResponse) // Изменяем возвращаемый тип
	async demoteUsersRoles(
		@Args('data') data: UpdateUsersRolesInput,
		@Context() context: { req: Request }
	) {
		if (!context.req.user) {
			throw new Error('Пользователь не аутентифицирован')
		}

		try {
			return await this.chatroomService.demoteUsers(
				context.req.user.id,
				data.chatroomId,
				data.targetUserIds
			)
		} catch (error) {
			throw new ApolloError(error.message)
		}
	}
}
