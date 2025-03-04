import { Injectable } from '@nestjs/common'
import Redis from 'ioredis'
import { UserModel } from 'src/modules/auth/account/models/user.model'

import { RedisService } from '@/src/core/redis/redis.service'

@Injectable()
export class LiveChatroomService {
	// private redisClient: Redis

	constructor(private readonly redisService: RedisService) {
		// this.redisClient = new Redis({
		// 	host: process.env.REDIS_HOST || 'localhost',
		// 	port: parseInt(process.env.REDIS_PORT || '6379', 10)
		// })
	}

	async addLiveUserToChatroom(
		chatroomId: number,
		user: UserModel
	): Promise<void> {
		const existingLiveUsers = await this.getLiveUsersForChatroom(chatroomId)

		const existingUser = existingLiveUsers.find(
			liveUser => liveUser.id === user.id
		)
		if (existingUser) {
			return
		}
		await this.redisService.sadd(
			`liveUsers:chatroom:${chatroomId}`,
			JSON.stringify(user)
		)
	}

	async removeLiveUserFromChatroom(
		chatroomId: number,
		user: UserModel
	): Promise<void> {
		await this.redisService
			.srem(`liveUsers:chatroom:${chatroomId}`, JSON.stringify(user))
			.catch(err => {
				console.log('removeLiveUserFromChatroom error', err)
			})
			.then(res => {
				console.log('removeLiveUserFromChatroom res', res)
			})
	}
	async getLiveUsersForChatroom(chatroomId: number): Promise<UserModel[]> {
		const users = await this.redisService.smembers(
			`liveUsers:chatroom:${chatroomId}`
		)

		return users.map(user => JSON.parse(user))
	}
}
