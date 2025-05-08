import { Field, ID, ObjectType } from '@nestjs/graphql'

import { UserModel } from '../auth/account/models/user.model'

@ObjectType()
export class Chatroom {
	@Field(() => ID, { nullable: true })
	id?: string

	@Field({ nullable: true })
	name?: string

	@Field({ nullable: true })
	createdAt?: Date

	@Field({ nullable: true })
	updatedAt?: Date

	@Field(() => [ChatroomUsers], { nullable: true })
	ChatroomUsers?: ChatroomUsers[]

	@Field(() => [Message], { nullable: true })
	messages?: Message[]
}

@ObjectType()
export class Message {
	@Field(() => ID, { nullable: true })
	id?: string

	@Field({ nullable: true })
	imageUrl?: string

	@Field({ nullable: true })
	content?: string

	@Field({ nullable: true })
	createdAt?: Date

	@Field({ nullable: true })
	updatedAt?: Date

	@Field(() => Chatroom, { nullable: true })
	chatroom?: Chatroom

	@Field(() => UserModel, { nullable: true })
	user?: UserModel
}

@ObjectType()
export class UserTyping {
	@Field(() => UserModel, { nullable: true })
	user?: UserModel

	@Field({ nullable: true })
	chatroomId?: number
}

@ObjectType()
export class UserStoppedTyping extends UserTyping {}

@ObjectType()
export class ChatroomUsers {
	@Field(() => ID)
	chatroomId: number

	@Field(() => ID)
	userId: string

	@Field(() => UserModel)
	user: UserModel

	@Field(() => Chatroom)
	chatroom: Chatroom

	@Field({ nullable: true })
	role?: string
}

@ObjectType()
export class UpdatedUserRole {
	@Field(() => ID)
	userId: string

	@Field(() => String)
	role: string
}

@ObjectType()
export class UpdateUsersRolesResponse {
	@Field(() => [UpdatedUserRole])
	updatedUsers: UpdatedUserRole[]
}
