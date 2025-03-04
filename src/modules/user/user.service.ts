import { Injectable } from '@nestjs/common'
import * as fs from 'fs'
import { join } from 'path'
import { PrismaService } from 'src/core/prisma/prisma.service'

@Injectable()
export class UserService {
	constructor(private readonly prisma: PrismaService) {}

	//   async updateProfile(userId: number, fullname: string, avatarUrl: string) {
	//     if (avatarUrl) {
	//       const oldUser = await this.prisma.user.findUnique({
	//         where: { id: userId },
	//       });
	//       const updatedUser = await this.prisma.user.update({
	//         where: { id: userId },
	//         data: {
	//           fullname,
	//           avatarUrl,
	//         },
	//       });

	//       if (oldUser?.avatarUrl) {
	//         const imageName = oldUser.avatarUrl.split('/').pop();
	//         const imagePath = join(
	//           __dirname,
	//           '..',
	//           '..',
	//           'public',
	//           'images',
	//           imageName || '',
	//         );
	//         if (fs.existsSync(imagePath)) {
	//           fs.unlinkSync(imagePath);
	//         }
	//       }

	//       return updatedUser;
	//     }
	//     return await this.prisma.user.update({
	//       where: { id: userId },
	//       data: {
	//         fullname,
	//       },
	//     });
	//   }
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
				chatrooms: {
					some: {
						id: chatroomId
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
				socialLinks: true, // Включаем связанные социальные ссылки
				notifications: true, // Включаем связанные уведомления
				notificationSettings: true // Включаем настройки уведомлений
			}
		})
	}
}
