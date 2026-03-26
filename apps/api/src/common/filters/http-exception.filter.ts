import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { FastifyReply, FastifyRequest } from 'fastify'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpException')

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const reply = ctx.getResponse<FastifyReply>()
    const request = ctx.getRequest<FastifyRequest>()

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR

    // Logar erros 500 (não-HTTP) para diagnóstico
    if (!(exception instanceof HttpException)) {
      this.logger.error(
        `${request.method} ${request.url} → 500`,
        exception instanceof Error ? exception.stack : String(exception),
      )
    }

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Erro interno do servidor'

    const errorBody =
      typeof message === 'object' && message !== null
        ? message
        : { message, error: HttpStatus[status] }

    reply.status(status).send({
      ...errorBody,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    })
  }
}
