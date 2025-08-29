import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString } from "class-validator";

export type RequestRescheduleInput = RequestRescheduleInput_2024_08_13;

export class RequestRescheduleInput_2024_08_13 {
  @IsString()
  @ApiPropertyOptional({
    example: "I can't make it to the meeting",
    description: "Reason for the reschedule",
  })
  reason?: string;
}
