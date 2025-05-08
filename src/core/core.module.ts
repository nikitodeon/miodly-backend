import { ApolloDriver } from '@nestjs/apollo'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { GraphQLModule } from '@nestjs/graphql'

import { AccountModule } from '../modules/auth/account/account.module'
import { DeactivateModule } from '../modules/auth/deactivate/deactivate.module'
import { PasswordRecoveryModule } from '../modules/auth/password-recovery/password-recovery.module'
import { ProfileModule } from '../modules/auth/profile/profile.module'
import { SessionModule } from '../modules/auth/session/session.module'
import { TotpModule } from '../modules/auth/totp/totp.module'
import { VerificationModule } from '../modules/auth/verification/verification.module'
import { ChatroomModule } from '../modules/chatroom/chatroom.module'
import { CronModule } from '../modules/cron/cron.module'
import { MailModule } from '../modules/libs/mail/mail.module'
import { StorageModule } from '../modules/libs/storage/storage.module'
import { TelegramModule } from '../modules/libs/telegram/telegram.module'
import { LiveChatroomModule } from '../modules/live-chatroom/live-chatroom.module'
import { NotificationModule } from '../modules/notification/notification.module'
import { UserModule } from '../modules/user/user.module'
import { IS_DEV_ENV } from '../shared/utils/is-dev.util'

import { getGraphQLConfig } from './config/graphql.config'
import { PrismaModule } from './prisma/prisma.module'
import { RedisModule } from './redis/redis.module'

@Module({
	imports: [
		ConfigModule.forRoot({
			ignoreEnvFile: !IS_DEV_ENV,
			isGlobal: true
		}),
		GraphQLModule.forRootAsync({
			driver: ApolloDriver,
			imports: [ConfigModule],
			useFactory: getGraphQLConfig,
			inject: [ConfigService]
		}),

		PrismaModule,
		RedisModule,
		MailModule,
		StorageModule,

		TelegramModule,

		CronModule,
		AccountModule,
		SessionModule,
		ProfileModule,
		VerificationModule,
		PasswordRecoveryModule,
		TotpModule,
		DeactivateModule,

		NotificationModule,

		ChatroomModule,
		LiveChatroomModule,
		UserModule
	]
})
export class CoreModule {}
