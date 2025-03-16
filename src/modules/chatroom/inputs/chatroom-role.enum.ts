import { registerEnumType } from '@nestjs/graphql'

export enum ChatroomRole {
	ADMIN = 'ADMIN',
	USER = 'USER',
	MODERATOR = 'MODERATOR'
}

// Регистрируем enum для GraphQL
registerEnumType(ChatroomRole, {
	name: 'ChatroomRole'
})
