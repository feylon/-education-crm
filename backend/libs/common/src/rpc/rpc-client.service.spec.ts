import { HttpException, ServiceUnavailableException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { RpcClientService } from './rpc-client.service';

describe('RpcClientService', () => {
  const client = { send: jest.fn(), emit: jest.fn() };
  const service = new RpcClientService(client as never);

  afterEach(() => jest.clearAllMocks());

  it('returns the service response', async () => {
    client.send.mockReturnValue(of({ ok: true }));
    await expect(service.send('x.y', { a: 1 })).resolves.toEqual({ ok: true });
    expect(client.send).toHaveBeenCalledWith('x.y', { a: 1 });
  });

  it('translates an RpcHttpException payload into an HttpException with the same status', async () => {
    client.send.mockReturnValue(throwError(() => ({ statusCode: 404, message: 'Student not found', errors: [] })));
    const error = await service.send('students.findOne', {}).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(404);
    expect((error as HttpException).getResponse()).toMatchObject({ message: 'Student not found' });
  });

  it('maps unknown failures to a 500 without leaking details', async () => {
    client.send.mockReturnValue(throwError(() => new Error('connection reset')));
    const error = await service.send('x', {}).catch((caught: unknown) => caught);
    expect((error as HttpException).getStatus()).toBe(500);
    expect((error as HttpException).getResponse()).toMatchObject({ message: 'Internal server error' });
  });

  it('turns a timeout into 503', async () => {
    jest.useFakeTimers();
    client.send.mockReturnValue(new (require('rxjs').Observable)(() => undefined));
    const pending = service.send('slow.pattern', {}).catch((caught: unknown) => caught);
    jest.advanceTimersByTime(16000);
    const error = await pending;
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    jest.useRealTimers();
  });

  it('emits events fire-and-forget', () => {
    client.emit.mockReturnValue(of(undefined));
    service.emit('student.created', { id: '1' });
    expect(client.emit).toHaveBeenCalledWith('student.created', { id: '1' });
  });
});
