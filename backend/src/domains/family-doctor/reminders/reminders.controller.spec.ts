import { ForbiddenException } from '@nestjs/common';
import { RemindersController } from './reminders.controller';

describe('RemindersController Agent authentication', () => {
  afterEach(() => {
    delete process.env.AGENT_INTERNAL_TOKEN;
  });

  it('fails closed when AGENT_INTERNAL_TOKEN is not configured', () => {
    const reminders = { create: jest.fn() };
    const controller = new RemindersController(reminders as any, {} as any);

    expect(() => controller.createAgentJob(undefined, {} as any))
      .toThrow(ForbiddenException);
    expect(reminders.create).not.toHaveBeenCalled();
  });

  it('accepts only the configured internal token', () => {
    process.env.AGENT_INTERNAL_TOKEN = 'expected-token';
    const reminders = { create: jest.fn().mockReturnValue({ id: 'job-1' }) };
    const controller = new RemindersController(reminders as any, {} as any);

    expect(() => controller.createAgentJob('wrong-token', {} as any))
      .toThrow(ForbiddenException);
    expect(controller.createAgentJob('expected-token', {} as any)).toEqual({ id: 'job-1' });
  });
});
