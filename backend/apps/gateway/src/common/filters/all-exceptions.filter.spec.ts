import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

const hostFor = (url = '/api/v1/test') => {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }), getRequest: () => ({ url, method: 'GET' }) }),
  };
  return { host, status, json };
};

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('formats validation errors into the standard envelope', () => {
    const { host, status, json } = hostFor('/api/v1/auth/login');
    filter.catch(new BadRequestException(['email must be an email', 'password should not be empty']), host as never);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 400,
        message: 'Validation failed',
        errors: ['email must be an email', 'password should not be empty'],
        path: '/api/v1/auth/login',
      }),
    );
  });

  it('keeps the message of a plain http exception', () => {
    const { host, status, json } = hostFor();
    filter.catch(new NotFoundException('Student not found'), host as never);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Student not found', errors: [] }));
  });

  it('hides internals of unexpected errors', () => {
    const { host, status, json } = hostFor();
    filter.catch(new Error('db password is hunter2'), host as never);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Internal server error' }));
    expect(JSON.stringify(json.mock.calls[0][0])).not.toContain('hunter2');
  });
});
