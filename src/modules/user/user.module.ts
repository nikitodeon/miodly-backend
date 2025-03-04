import { Module } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'src/core/prisma/prisma.service'

import { UserResolver } from './user.resolver'
import { UserService } from './user.service'

// import { JwtService } from '@nestjs/jwt';

@Module({
	providers: [
		UserService,
		UserResolver,
		PrismaService
		// , JwtService
	]
})
export class UserModule {}
