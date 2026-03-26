import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common'
import { FastifyReply, FastifyRequest } from 'fastify'

// ANSI color codes
const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const CYAN = '\x1b[36m'
const GRAY = '\x1b[90m'
const BG_RED = '\x1b[41m'
const BG_YELLOW = '\x1b[43m'
const WHITE = '\x1b[37m'

function statusColor(status: number): string {
  if (status >= 500) return `${BG_RED}${WHITE}${BOLD} ${status} ${RESET}`
  if (status >= 400) return `${BG_YELLOW}${WHITE}${BOLD} ${status} ${RESET}`
  return `${CYAN}${status}${RESET}`
}

function timestamp(): string {
  return new Date().toLocaleTimeString('pt-BR', { hour12: false })
}

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

    const msgText = typeof message === 'object' && message !== null
      ? (message as { message?: string }).message ?? JSON.stringify(message)
      : String(message)

    // Log colorido
    if (status >= 500) {
      console.error(
        `${GRAY}${timestamp()}${RESET}  ${statusColor(status)} ${RED}${BOLD}${request.method}${RESET} ${request.url} ${GRAY}→${RESET} ${RED}${msgText}${RESET}`,
      )
      if (!(exception instanceof HttpException) && exception instanceof Error) {
        console.error(`${GRAY}${exception.stack}${RESET}`)
      }
    } else if (status >= 400) {
      console.warn(
        `${GRAY}${timestamp()}${RESET}  ${statusColor(status)} ${YELLOW}${request.method}${RESET} ${request.url} ${GRAY}→${RESET} ${msgText}`,
      )
    }

    reply.status(status).send({
      ...errorBody,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    })
  }
}
