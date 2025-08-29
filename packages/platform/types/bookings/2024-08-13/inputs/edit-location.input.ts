import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export type EditLocationInput = EditLocationInput_2024_08_13;

export class EditLocationInput_2024_08_13 {
  @IsString()
  @IsNotEmpty()
  @ApiPropertyOptional({
    example: "New location",
    description: "New location for the booking",
  })
  newLocation!: string;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({
    example: "Credentials",
    description: "Credentials for the new location",
  })
  credentialId?: number | null;
}
