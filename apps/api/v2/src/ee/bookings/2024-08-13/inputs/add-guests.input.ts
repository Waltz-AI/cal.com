import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsString } from "class-validator";

export class AddGuestsInput_2024_08_13 {
  @ApiProperty({
    description: "The guests to add to the booking",
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  guests!: string[];
}
