import { Module } from '@nestjs/common'
import { PrismaService } from 'src/core/prisma/prisma.service'

import { UserService } from '../user/user.service'

import { LiveChatroomResolver } from './live-chatroom.resolver'
import { LiveChatroomService } from './live-chatroom.service'

// import { JwtService } from '@nestjs/jwt';

@Module({
	providers: [
		LiveChatroomResolver,
		LiveChatroomService,
		UserService,
		PrismaService
		// JwtService,
	]
})
export class LiveChatroomModule {}
