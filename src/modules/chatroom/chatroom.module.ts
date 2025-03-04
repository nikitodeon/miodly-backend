import { Module } from '@nestjs/common'

import { Prisma } from '@/prisma/generated'
import { PrismaService } from '@/src/core/prisma/prisma.service'

import { UserService } from '../user/user.service'

import { ChatroomResolver } from './chatroom.resolver'
import { ChatroomService } from './chatroom.service'

@Module({
	providers: [ChatroomResolver, ChatroomService, PrismaService, UserService]
})
export class ChatroomModule {}
