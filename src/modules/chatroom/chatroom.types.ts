import { Field, ID, ObjectType } from '@nestjs/graphql'

// import { User } from 'src/user/user.type';
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

	@Field(() => [UserModel], { nullable: true }) // array of user IDs
	users?: UserModel[]

	@Field(() => [Message], { nullable: true }) // array of message IDs
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

	@Field(() => Chatroom, { nullable: true }) // array of user IDs
	chatroom?: Chatroom

	@Field(() => UserModel, { nullable: true }) // array of user IDs
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
