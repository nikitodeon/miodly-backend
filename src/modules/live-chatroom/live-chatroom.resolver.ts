import { UseFilters, UseGuards } from '@nestjs/common'
import { Int, Resolver } from '@nestjs/graphql'
import { Args, Context, Mutation, Subscription } from '@nestjs/graphql'
import { Request } from 'express'
import { PubSub } from 'graphql-subscriptions'
import { GraphQLErrorFilter } from 'src/filters/custom-exception.filter'
import { UserModel } from 'src/modules/auth/account/models/user.model'
import { GqlAuthGuard } from 'src/shared/guards/gql-auth.guard'

import { UserService } from '../user/user.service'

import { LiveChatroomService } from './live-chatroom.service'

@Resolver()
export class LiveChatroomResolver {
	private pubSub: PubSub
	constructor(
		private readonly liveChatroomService: LiveChatroomService,
		private readonly userService: UserService
	) {
		this.pubSub = new PubSub()
	}

	@Subscription(() => [UserModel], {
		nullable: true,
		resolve: value => value.liveUsers,
		filter: (payload, variables) => {
			return payload.chatroomId === variables.chatroomId
		}
	})
	liveUsersInChatroom(
		@Args('chatroomId', { type: () => Int }) chatroomId: number
	) {
		return this.pubSub.asyncIterableIterator(
			`liveUsersInChatroom.${chatroomId}`
		)
	}

	@UseFilters(GraphQLErrorFilter)
	@UseGuards(GqlAuthGuard)
	@Mutation(() => Boolean)
	async enterChatroom(
		@Args('chatroomId', { type: () => Int }) chatroomId: number,
		@Context() context: { req: Request }
	) {
		if (!context.req.user) {
			throw new Error('User is not authenticated')
		}

		const user = await this.userService.getUser(context.req.user.id)
		if (!user) {
			throw new Error('User not found')
		}

		const sanitizedUser: any = {
			...user,
			avatar: user.avatar ?? '',
			bio: user.bio ?? '',
			telegramId: user.telegramId ?? '',
			socialLinks: user.socialLinks
				.filter(link => link.userId !== null)
				.map(link => ({
					...link,
					userId: link.userId ?? ''
				})),
			notifications: user.notifications.map(notification => ({
				...notification,
				user: {
					...user,
					avatar: user.avatar ?? '' // Убедитесь, что avatar не null
				}
			})),
			notificationSettings: user.notificationSettings
				? {
						...user.notificationSettings,
						user: {
							...user,
							avatar: user.avatar ?? '' // Убедитесь, что avatar не null
						}
					}
				: {
						id: '',
						siteNotifications: false,
						telegramNotifications: false,
						user: {
							...user,
							avatar: user.avatar ?? '' // Убедитесь, что avatar не null
						},
						userId: user.id,
						createdAt: new Date(),
						updatedAt: new Date()
					},
			totpSecret: user.totpSecret ?? '',
			deactivatedAt: user.deactivatedAt ?? new Date(0) // Устанавливаем значение по умолчанию
		}

		await this.liveChatroomService.addLiveUserToChatroom(
			chatroomId,
			sanitizedUser
		)

		const liveUsers = await this.liveChatroomService
			.getLiveUsersForChatroom(chatroomId)
			.catch(err => {
				console.log('getLiveUsersForChatroom error', err)
			})

		await this.pubSub
			.publish(`liveUsersInChatroom.${chatroomId}`, {
				liveUsers,
				chatroomId
			})
			.catch(err => {
				console.log('pubSub error', err)
			})

		return true
	}

	@UseFilters(GraphQLErrorFilter)
	@UseGuards(GqlAuthGuard)
	@Mutation(() => Boolean)
	async leaveChatroom(
		@Args('chatroomId', { type: () => Int }) chatroomId: number,
		@Context() context: { req: Request }
	) {
		if (!context.req.user) {
			throw new Error('User is not authenticated')
		}

		const user = await this.userService.getUser(context.req.user.id)

		if (!user) {
			throw new Error('User not found')
		}

		const sanitizedUser: any = {
			...user,
			avatar: user.avatar ?? '', // Ensure avatar is never null
			bio: String(user.bio ?? ''), // Преобразуем в строку, если null
			telegramId: String(user.telegramId ?? ''), // Преобразуем в строку
			socialLinks: user.socialLinks
				.filter(link => link.userId !== null)
				.map(link => ({
					...link,
					userId: String(link.userId ?? '') // Преобразуем в строку
				})),
			notifications: user.notifications.map(notification => ({
				...notification,
				user: {
					...user,
					avatar: user.avatar ?? '' // Ensure avatar is never null
				}
			})),
			notificationSettings: user.notificationSettings
				? {
						...user.notificationSettings,
						user: {
							...user,
							avatar: user.avatar ?? '' // Ensure avatar is never null
						}
					}
				: {
						id: '',
						siteNotifications: false,
						telegramNotifications: false,
						user: {
							...user,
							avatar: user.avatar ?? '' // Ensure avatar is never null
						},
						userId: String(user.id), // Преобразуем в строку
						createdAt: new Date(),
						updatedAt: new Date()
					},
			totpSecret: String(user.totpSecret ?? ''), // Преобразуем в строку
			deactivatedAt: user.deactivatedAt ?? new Date(0) // Default to zero date if null
		}

		await this.liveChatroomService.removeLiveUserFromChatroom(
			chatroomId,
			sanitizedUser
		)

		const liveUsers =
			await this.liveChatroomService.getLiveUsersForChatroom(chatroomId)

		await this.pubSub.publish(`liveUsersInChatroom.${chatroomId}`, {
			liveUsers,
			chatroomId
		})

		return true
	}
}
