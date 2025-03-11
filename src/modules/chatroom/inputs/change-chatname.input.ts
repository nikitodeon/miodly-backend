import { Field, InputType } from '@nestjs/graphql'
import { IsNotEmpty, IsString } from 'class-validator'

@InputType()
export class ChangeChatnameInput {
	@Field(() => String)
	@IsString()
	@IsNotEmpty()
	public name: string
}
