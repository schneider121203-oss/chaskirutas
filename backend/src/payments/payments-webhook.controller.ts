import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';

/**
 * Controller PÚBLICO (sin guard JWT) para recibir notificaciones de Culqi.
 * Culqi hace POST server-to-server, por eso no lleva token de usuario.
 * En producción se debe validar la firma/origen del webhook.
 */
@ApiTags('Payments')
@Controller('payments')
export class PaymentsWebhookController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('culqi-webhook')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Webhook de notificaciones de Culqi (público)' })
  culqiWebhook(@Body() event: any) {
    return this.paymentsService.handleCulqiWebhook(event);
  }
}
