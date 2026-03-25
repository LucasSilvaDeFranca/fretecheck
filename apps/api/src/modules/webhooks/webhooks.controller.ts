import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtPayload } from '@fretecheck/types'
import { WebhooksService, WebhookEventType } from './webhooks.service'

@Controller('webhooks')
@UseGuards(JwtAuthGuard)
export class WebhooksController {
  constructor(private webhooks: WebhooksService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.webhooks.listConfigs(user.sub)
  }

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() body: { url: string; events: WebhookEventType[] },
  ) {
    return this.webhooks.createConfig(user.sub, user.empresaId ?? null, body.url, body.events)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.webhooks.deleteConfig(id, user.sub)
  }
}
