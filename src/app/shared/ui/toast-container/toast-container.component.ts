import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '@core/notifications/toast.service';

@Component({
  selector: 'app-toast-container',
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastContainerComponent {
  protected readonly toastService = inject(ToastService);
}
