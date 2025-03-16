import { Field, InputType } from '@nestjs/graphql'

@InputType()
export class UpdateUsersRolesInput {
	@Field(() => Number)
	chatroomId: number

	@Field(() => [String]) // Массив userId пользователей, которых нужно повысить
	targetUserIds: string[]
}
