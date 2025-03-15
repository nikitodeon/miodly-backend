import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createWriteStream } from 'fs'
import * as Upload from 'graphql-upload/Upload.js'
import * as sharp from 'sharp'
import { PrismaService } from 'src/core/prisma/prisma.service'

import { ChatroomRole } from '@/prisma/generated'

import { StorageService } from '../libs/storage/storage.service'

import { Chatroom, Message } from './chatroom.types'
import { ChangeChatnameInput } from './inputs/change-chatname.input'

@Injectable()
export class ChatroomService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly configService: ConfigService,
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
			// userId,
			user: {
				connect: { id: userId } // Используем connect для связи с существующим пользователем
			},
			role: ChatroomRole.USER // Роль для новых пользователей - USER
		}))
		return await this.prisma.chatroom.update({
			where: {
				id: chatroomId
			},
			data: {
				// users: {
				// 	connect: userIds.map(id => ({ id: id }))
				// }
				ChatroomUsers: {
					create: chatroomUsersData
				}
			},
			include: {
				// users: true // Eager loading users
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
						role: true, // Добавляем роль пользователя
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
				content: message, // Текст сообщения
				imageUrl: filename || '', // Ссылка на файл (если есть)
				chatroomId,
				userId
			},
			include: {
				chatroom: {
					include: {
						ChatroomUsers: {
							include: {
								user: true // Включаем информацию о пользователе, связанном с чатрумом
							}
						}
					}
				},
				user: true // Включаем информацию о пользователе, который отправил сообщение
			}
		})
		return newMessage
	}

	// async saveImage(image: {
	// 	createReadStream: () => any
	// 	filename: string
	// 	mimetype: string
	// }) {
	// 	const validImageTypes = ['image/jpeg', 'image/png', 'image/gif']
	// 	if (!validImageTypes.includes(image.mimetype)) {
	// 		throw new BadRequestException({ image: 'Invalid image type' })
	// 	}

	// 	const imageName = `${Date.now()}-${image.filename}`
	// 	const imagePath = `${this.configService.get('IMAGE_PATH')}/${imageName}`
	// 	const stream = image.createReadStream()
	// 	const outputPath = `public${imagePath}`
	// 	const writeStream = createWriteStream(outputPath)
	// 	stream.pipe(writeStream)

	// 	await new Promise((resolve, reject) => {
	// 		stream.on('end', resolve)
	// 		stream.on('error', reject)
	// 	})

	// 	return imagePath
	// }
	////////////////////////////////////////

	public async saveImage(file: Upload) {
		// if (user.avatar) {
		// 	await this.storageService.remove(user.avatar)
		// }

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
		// await this.prismaService.user.update({
		// 	where: {
		// 		id: user.id
		// 	},
		// 	data: {
		// 		avatar: fileName
		// 	}
		// })

		// return true
	}

	//////////////////////////////////////

	async getMessagesForChatroom(chatroomId: number) {
		return await this.prisma.message.findMany({
			where: {
				chatroomId: chatroomId
			},
			include: {
				chatroom: {
					include: {
						ChatroomUsers: {
							include: {
								user: true // Включаем информацию о пользователе, связанном с этим чатом
							}
						}
						// users: {
						// orderBy: {
						// createdAt: 'asc'
						// 	}
						// } // Eager loading users
					}
				}, // Eager loading Chatroom
				user: true // Eager loading User
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
}
