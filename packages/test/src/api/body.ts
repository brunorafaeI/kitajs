import { Body, RouteContext } from '@kita/runtime';

export function post(this: RouteContext, body: Body<{ a: 1 }>) {
  return {
    a: 2,
    b: 3
  } as const;
}
