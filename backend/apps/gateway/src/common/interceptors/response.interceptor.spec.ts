import { lastValueFrom, of } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';

describe('ResponseInterceptor', () => {
  const contextFor = (statusCode: number) => ({
    switchToHttp: () => ({ getResponse: () => ({ statusCode, getHeader: () => undefined, removeHeader: () => undefined }) }),
  });

  it('wraps the handler result in the success envelope', async () => {
    const interceptor = new ResponseInterceptor<{ id: string }>();
    const result = await lastValueFrom(interceptor.intercept(contextFor(201) as never, { handle: () => of({ id: '1' }) }));
    expect(result).toEqual({ success: true, statusCode: 201, data: { id: '1' } });
  });
});
