import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());

// jsdom has no Popover API. Model visibility/toggle events only; native focus and
// light-dismiss behavior are verified in Chrome rather than inferred from this stub.
function toggleEvent(element: HTMLElement, open: boolean) {
  const event = new Event('toggle');
  Object.defineProperties(event, {
    oldState: { value: open ? 'closed' : 'open' },
    newState: { value: open ? 'open' : 'closed' },
  });
  element.dispatchEvent(event);
}

if (typeof HTMLElement.prototype.togglePopover !== 'function') {
  Object.defineProperties(HTMLElement.prototype, {
    showPopover: {
      configurable: true,
      value: function (this: HTMLElement) {
        for (const other of document.querySelectorAll<HTMLElement>('[data-test-popover-open]')) {
          if (other !== this) other.hidePopover();
        }
        this.setAttribute('data-test-popover-open', '');
        this.style.display = 'block';
        toggleEvent(this, true);
      },
    },
    hidePopover: {
      configurable: true,
      value: function (this: HTMLElement) {
        this.removeAttribute('data-test-popover-open');
        this.style.display = 'none';
        toggleEvent(this, false);
      },
    },
    togglePopover: {
      configurable: true,
      value: function (this: HTMLElement) {
        if (this.hasAttribute('data-test-popover-open')) this.hidePopover();
        else this.showPopover();
      },
    },
  });
}
