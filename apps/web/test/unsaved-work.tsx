import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeAll, afterAll } from 'vitest';
import { UnsavedWorkProvider } from '../src/features/unsaved-work/UnsavedWorkProvider';

export function installDialogStub() {
  // jsdom does not implement native modal behavior; browser focus handling is separate QA.
  const originalModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
  const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
  beforeAll(() => {
    Object.defineProperties(HTMLDialogElement.prototype, {
      showModal: {
        configurable: true,
        value: function (this: HTMLDialogElement) {
          this.setAttribute('open', '');
        },
      },
      close: {
        configurable: true,
        value: function (this: HTMLDialogElement) {
          this.removeAttribute('open');
        },
      },
    });
  });
  afterAll(() => {
    for (const [name, descriptor] of [
      ['showModal', originalModal],
      ['close', originalClose],
    ] as const) {
      if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor);
      else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
    }
  });
}

export function renderWithUnsavedWork(children: ReactNode) {
  const router = createMemoryRouter([
    { path: '*', element: <UnsavedWorkProvider>{children}</UnsavedWorkProvider> },
  ]);
  return { ...render(<RouterProvider router={router} />), router };
}
