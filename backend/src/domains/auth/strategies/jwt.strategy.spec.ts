import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const user = {
    id: 1,
    username: 'admin',
    roles: [],
  };

  function createStrategy() {
    const usersService = {
      findById: jest.fn().mockResolvedValue(user),
    };
    const redis = {
      validateToken: jest.fn().mockResolvedValue(true),
    };

    const strategy = new JwtStrategy(usersService as any, redis as any);
    return { strategy, usersService, redis };
  }

  it('accepts the request when the access token is cached in redis', async () => {
    const { strategy, redis } = createStrategy();
    const req = {
      headers: {
        authorization: 'Bearer access-token',
      },
    };

    await expect(strategy.validate(req as any, { sub: 1 })).resolves.toMatchObject({
      ...user,
      sub: 1,
      userId: 1,
    });
    expect(redis.validateToken).toHaveBeenCalledWith(1, 'access-token', 'access');
  });

  it('rejects the request when the access token is missing from redis', async () => {
    const { strategy, redis } = createStrategy();
    redis.validateToken.mockResolvedValueOnce(false);
    const req = {
      headers: {
        authorization: 'Bearer stale-token',
      },
    };

    await expect(strategy.validate(req as any, { sub: 1 })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
