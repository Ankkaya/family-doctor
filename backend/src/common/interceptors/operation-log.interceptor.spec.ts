import { lastValueFrom, of, throwError } from 'rxjs';
import { OperationLogInterceptor } from './operation-log.interceptor';

function createContext(request: Record<string, any>, response: Record<string, any> = {}) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as any;
}

describe('OperationLogInterceptor', () => {
  it('records failed write operations with path, method, status and sanitized body', async () => {
    const prisma = {
      operationLog: {
        create: jest.fn().mockResolvedValue({}),
      },
    } as any;
    const interceptor = new OperationLogInterceptor(prisma);
    const request = {
      method: 'PATCH',
      originalUrl: '/api/users/12?debug=true',
      url: '/users/12?debug=true',
      params: { id: '12' },
      body: { name: 'A', password: 'secret' },
      user: { userId: 1, username: 'admin' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    };
    const error = Object.assign(new Error('boom'), {
      status: 400,
      response: { message: 'bad request' },
    });

    await expect(
      lastValueFrom(
        interceptor.intercept(
          createContext(request, { statusCode: 400 }),
          { handle: () => throwError(() => error) } as any,
        ),
      ),
    ).rejects.toThrow('boom');

    await new Promise((resolve) => setImmediate(resolve));

    expect(prisma.operationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 1,
        username: 'admin',
        module: 'user',
        method: 'PATCH',
        path: '/api/users/12',
        statusCode: 400,
        targetId: '12',
        requestBody: JSON.stringify({ name: 'A', password: '***' }),
        error: expect.stringContaining('boom'),
      }),
    });
  });

  it('does not write App user string id into integer operation log userId', async () => {
    const prisma = {
      operationLog: {
        create: jest.fn().mockResolvedValue({}),
      },
    } as any;
    const interceptor = new OperationLogInterceptor(prisma);
    const request = {
      method: 'POST',
      originalUrl: '/consultation/ask',
      params: {},
      body: { question: '哈哈' },
      user: { userId: 'cmpge4nac0000pkuje9cf8wex', appUserId: 'cmpge4nac0000pkuje9cf8wex', username: 'admin1' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    };

    await lastValueFrom(
      interceptor.intercept(
        createContext(request, { statusCode: 201 }),
        { handle: () => of({ answer: 'ok' }) } as any,
      ),
    );

    await new Promise((resolve) => setImmediate(resolve));

    expect(prisma.operationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: undefined,
        username: 'admin1',
        module: 'consultation',
        method: 'POST',
        path: '/consultation/ask',
      }),
    });
  });
});
