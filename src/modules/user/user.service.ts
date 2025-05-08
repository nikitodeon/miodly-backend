import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/core/prisma/prisma.service'

@Injectable()
export class UserService {
	constructor(private readonly prisma: PrismaService) {}

	async searchUsers(username: string, userId: string) {
		// make sure that users are found that contain part of the fullname
		// and exclude the current user
		return this.prisma.user.findMany({
			where: {
				username: {
					contains: username
				},
				id: {
					not: userId
				}
			}
		})
	}

	async getUsersOfChatroom(chatroomId: number) {
		return this.prisma.user.findMany({
			where: {
				ChatroomUsers: {
					some: {
						chatroomId: chatroomId
					}
				}
			},
			orderBy: {
				createdAt: 'desc'
			}
		})
	}

	async getUser(userId: string) {
		return this.prisma.user.findUnique({
			where: {
				id: userId
			},
			include: {
				socialLinks: true,
				notifications: true,
				notificationSettings: true
			}
		})
	}
}
