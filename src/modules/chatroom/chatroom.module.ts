import { Module } from '@nestjs/common'

import { Prisma } from '@/prisma/generated'
import { PrismaService } from '@/src/core/prisma/prisma.service'

import { SessionService } from '../auth/session/session.service'
import { VerificationService } from '../auth/verification/verification.service'
import { UserService } from '../user/user.service'

import { ChatroomResolver } from './chatroom.resolver'
import { ChatroomService } from './chatroom.service'
import { Chatroom } from './chatroom.types'

@Module({
	providers: [
		ChatroomResolver,
		ChatroomService,
		PrismaService,
		UserService,
		SessionService,

		VerificationService
	]
})
export class ChatroomModule {}
