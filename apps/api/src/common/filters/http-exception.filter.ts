import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common'
import { FastifyReply, FastifyRequest } from 'fastify'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const reply = ctx.getResponse<FastifyReply>()
    const request = ctx.getRequest<FastifyRequest>()

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR

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
