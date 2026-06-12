import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';

function pickMessage(rawMessage: string | string[], fallback: string) {
  if (!Array.isArray(rawMessage)) {
    return localizeMessage(rawMessage || fallback);
  }

  const preferredMessage = rawMessage.find((item) => item.startsWith('请输入'));
  return localizeMessage(preferredMessage || rawMessage[0] || fallback);
}

function localizeMessage(message: string) {
  if (
    message.includes('Unexpected token') ||
    message.includes('Expected property name') ||
    message.includes('JSON at position')
  ) {
    return '请求参数格式不正确';
  }

  return message;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message = exception.message || '请求异常';

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse
    ) {
      const rawMessage = (exceptionResponse as { message?: string | string[] }).message;
      if (rawMessage) {
        message = pickMessage(rawMessage, message);
      }
    }

    response.status(status).json({
      code: status,
      message,
      data: null,
      path: request.url,
      timestamp: new Date().toISOString()
    });
  }
}
