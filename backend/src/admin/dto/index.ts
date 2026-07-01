import { IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyDocumentDto {
  @ApiProperty({ example: true, description: 'Aprobar (true) o Rechazar (false) el documento' })
  @IsBoolean()
  @IsNotEmpty()
  isVerified!: boolean;
}
