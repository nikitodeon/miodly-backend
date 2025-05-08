import {
	BadRequestException,
	ForbiddenException,
	Injectable
} from '@nestjs/common'
import * as Upload from 'graphql-upload/Upload.js'
import * as sharp from 'sharp'
import { PrismaService } from 'src/core/prisma/prisma.service'

import { ChatroomRole, ChatroomUsers, Prisma } from '@/prisma/generated'

import { StorageService } from '../libs/storage/storage.service'

import { UpdateUsersRolesResponse } from './chatroom.types'
import { ChangeChatnameInput } from './inputs/change-chatname.input'

@Injectable()
export class ChatroomService {
	constructor(
		private readonly prisma: PrismaService,

		private readonly storageService: StorageService
	) {}

	async getChatroom(id: string) {
		return this.prisma.chatroom.findUnique({
			where: {
				id: parseInt(id)
			}
		})
	}

	async createChatroom(name: string, sub: string) {
		const existingChatroom = await this.prisma.chatroom.findFirst({
			where: {
				name
			}
		})
		if (existingChatroom) {
			throw new BadRequestException({ name: 'Chatroom already exists' })
		}
		return this.prisma.chatroom.create({
			data: {
				name,
				// users: {
				ChatroomUsers: {
					create: [
						{
							userId: sub,
							role: 'ADMIN'
						}
					]
				}
			}
		})
	}

	async addUsersToChatroom(chatroomId: number, userIds: string[]) {
		const existingChatroom = await this.prisma.chatroom.findUnique({
			where: {
				id: chatroomId
			}
		})
		if (!existingChatroom) {
			throw new BadRequestException({
				chatroomId: 'Chatroom does not exist'
			})
		}
		const chatroomUsersData = userIds.map(userId => ({
			user: {
				connect: { id: userId }
			},
			role: ChatroomRole.USER
		}))
		return await this.prisma.chatroom.update({
			where: {
				id: chatroomId
			},
			data: {
				ChatroomUsers: {
					create: chatroomUsersData
				}
			},
			include: {
				ChatroomUsers: true
			}
		})
	}

	async removeUsersFromChatroom(chatroomId: number, userIds: string[]) {
		const existingChatroom = await this.prisma.chatroom.findUnique({
			where: { id: chatroomId }
		})

		if (!existingChatroom) {
			throw new BadRequestException({
				chatroomId: 'Chatroom does not exist'
			})
		}

		return await this.prisma.chatroom.update({
			where: { id: chatroomId },
			data: {
				ChatroomUsers: {
					deleteMany: userIds.map(userId => ({
						userId,
						chatroomId
					}))
				}
			},
			include: {
				ChatroomUsers: true
			}
		})
	}

	async getChatroomsForUser(userId: string) {
		return this.prisma.chatroom.findMany({
			where: {
				ChatroomUsers: {
					some: { userId: userId }
				}
			},
			include: {
				messages: {
					take: 1,
					orderBy: { createdAt: 'desc' },
					select: {
						id: true,
						content: true,
						createdAt: true,
						user: {
							select: {
								id: true,
								username: true
							}
						}
					}
				},
				ChatroomUsers: {
					select: {
						role: true,
						user: {
							select: {
								id: true,
								username: true,
								email: true,
								avatar: true
							}
						}
					}
				}
			}
		})
	}

	async sendMessage(
		chatroomId: number,
		message: string,
		userId: string,
		filename: string | null
	) {
		const newMessage = await this.prisma.message.create({
			data: {
				content: message,
				imageUrl: filename || '',
				chatroomId,
				userId
			},
			include: {
				chatroom: {
					include: {
						ChatroomUsers: {
							include: {
								user: true
							}
						}
					}
				},
				user: true
			}
		})

		return newMessage
	}

	public async saveImage(file: Upload) {
		const chunks: Buffer[] = []

		for await (const chunk of file.createReadStream()) {
			chunks.push(chunk)
		}

		const buffer = Buffer.concat(chunks)

		const fileName = `/chatimages/${Date.now()}.webp`

		if (file.filename && file.filename.endsWith('.gif')) {
			const processedBuffer = await sharp(buffer, { animated: true })
				.resize(512, 512)
				.webp()
				.toBuffer()

			await this.storageService.upload(
				processedBuffer,
				fileName,
				'image/webp'
			)
		} else {
			const processedBuffer = await sharp(buffer)
				.resize(512, 512)
				.webp()
				.toBuffer()

			await this.storageService.upload(
				processedBuffer,
				fileName,
				'image/webp'
			)
		}
		return fileName
	}

	async getMessagesForChatroom(chatroomId: number) {
		return await this.prisma.message.findMany({
			where: {
				chatroomId: chatroomId
			},
			include: {
				chatroom: {
					include: {
						ChatroomUsers: {
							select: {
								role: true,
								user: true
							}
						}
					}
				},
				user: true
			}
		})
	}

	async deleteChatroom(chatroomId: number) {
		const messages: any = await this.prisma.message.findMany({
			where: {
				chatroomId: chatroomId
			}
		})

		for (const message of messages) {
			if (message.imageUrl) {
				await this.storageService.remove(message.imageUrl)
			}
		}
		return this.prisma.chatroom.delete({
			where: {
				id: chatroomId
			}
		})
	}

	async changeChatName(chatroomId: number, input: ChangeChatnameInput) {
		const { name } = input

		return this.prisma.chatroom.update({
			where: {
				id: chatroomId
			},
			data: {
				name
			}
		})
	}

	async promoteUsers(
		adminId: string,
		chatroomId: number,
		targetUserIds: string[]
	): Promise<UpdateUsersRolesResponse> {
		// Проверка админа
		const admin = await this.prisma.chatroomUsers.findFirst({
			where: { userId: adminId, chatroomId, role: ChatroomRole.ADMIN }
		})

		if (!admin) {
			throw new ForbiddenException(
				'Только администратор может повышать роли.'
			)
		}

		// Получаем текущие роли пользователей
		const targetUsers = await this.prisma.chatroomUsers.findMany({
			where: { chatroomId, userId: { in: targetUserIds } },
			select: { userId: true, role: true }
		})

		// Всегда возвращаем объект с updatedUsers
		if (targetUsers.length === 0) {
			return { updatedUsers: [] }
		}

		// Создаём массив обновлений
		const updates = targetUsers
			.map(user => {
				let newRole: ChatroomRole | undefined
				if (user.role === ChatroomRole.USER)
					newRole = ChatroomRole.MODERATOR
				else if (user.role === ChatroomRole.MODERATOR)
					newRole = ChatroomRole.ADMIN
				if (!newRole) return null

				return this.prisma.chatroomUsers.update({
					where: {
						chatroomId_userId: { chatroomId, userId: user.userId }
					},
					data: { role: newRole }
				})
			})
			.filter(
				(
					update
				): update is Prisma.Prisma__ChatroomUsersClient<ChatroomUsers> =>
					update !== null
			)

		const updatedUsers =
			updates.length > 0 ? await this.prisma.$transaction(updates) : []

		return {
			updatedUsers: updatedUsers.map(user => ({
				userId: user.userId,
				role: user.role
			}))
		}
	}
	async demoteUsers(
		adminId: string,
		chatroomId: number,
		targetUserIds: string[]
	): Promise<UpdateUsersRolesResponse> {
		// Изменяем возвращаемый тип
		// Проверка админа
		const admin = await this.prisma.chatroomUsers.findFirst({
			where: { userId: adminId, chatroomId, role: ChatroomRole.ADMIN }
		})

		if (!admin) {
			throw new ForbiddenException(
				'Только администратор может понижать роли.'
			)
		}

		// Получаем текущие роли пользователей
		const targetUsers = await this.prisma.chatroomUsers.findMany({
			where: { chatroomId, userId: { in: targetUserIds } },
			select: { userId: true, role: true }
		})

		// Всегда возвращаем объект с updatedUsers
		if (targetUsers.length === 0) {
			return { updatedUsers: [] }
		}

		// Создаём массив обновлений
		const updates = targetUsers
			.map(user => {
				let newRole: ChatroomRole | undefined
				if (user.role === ChatroomRole.ADMIN)
					newRole = ChatroomRole.MODERATOR
				else if (user.role === ChatroomRole.MODERATOR)
					newRole = ChatroomRole.USER
				if (!newRole) return null

				return this.prisma.chatroomUsers.update({
					where: {
						chatroomId_userId: { chatroomId, userId: user.userId }
					},
					data: { role: newRole }
				})
			})
			.filter(
				(
					update
				): update is Prisma.Prisma__ChatroomUsersClient<ChatroomUsers> =>
					update !== null
			)

		const updatedUsers =
			updates.length > 0 ? await this.prisma.$transaction(updates) : []

		return {
			updatedUsers: updatedUsers.map(user => ({
				userId: user.userId,
				role: user.role
			}))
		}
	}
}
