import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

const DEFAULT_DURATION_MS = 6000;

/**
 * Avisos temporales visibles en cualquier pantalla. Los muestra `ToastContainerComponent`,
 * que vive una sola vez en el shell de la aplicación.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly state = signal<Toast[]>([]);
  private nextId = 1;

  readonly toasts = this.state.asReadonly();

  success(title: string, message?: string, durationMs = DEFAULT_DURATION_MS): number {
    return this.show('success', title, message, durationMs);
  }

  error(title: string, message?: string, durationMs = DEFAULT_DURATION_MS): number {
    return this.show('error', title, message, durationMs);
  }

  info(title: string, message?: string, durationMs = DEFAULT_DURATION_MS): number {
    return this.show('info', title, message, durationMs);
  }

  dismiss(id: number): void {
    this.state.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  private show(type: ToastType, title: string, message: string | undefined, durationMs: number) {
    const id = this.nextId++;
    this.state.update((toasts) => [...toasts, { id, type, title, message }]);
    if (durationMs > 0) {
      setTimeout(() => this.dismiss(id), durationMs);
    }
    return id;
  }
}
