import type { HttpClient, HttpRequest, HttpResponse } from '../../services/http/HttpClient';

type Step = HttpResponse<unknown> | Error | DOMException;

/** Plays a fixed script of responses or errors and records every request it receives. */
export class FakeHttpClient implements HttpClient {
  readonly requests: HttpRequest[] = [];
  private readonly script: Step[];

  constructor(...script: Step[]) {
    this.script = [...script];
  }

  request<T>(request: HttpRequest): Promise<HttpResponse<T>> {
    this.requests.push(request);
    const step = this.script.shift();
    if (step === undefined) {
      return Promise.reject(new Error('FakeHttpClient script exhausted'));
    }
    return isResponse(step) ? Promise.resolve(step as HttpResponse<T>) : Promise.reject(step);
  }
}

function isResponse(step: Step): step is HttpResponse<unknown> {
  // ApiError has `status` and `requestId` too, but no `body`.
  return 'body' in step && 'status' in step;
}

export function okResponse<T>(body: T, requestId: string | null = null): HttpResponse<T> {
  return { status: 200, body, requestId };
}
