import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface SseNotificationEvent {
  recipientId: string;
  recipientType: string;
  notification: any;
}

@Injectable()
export class SseService {
  private readonly logger = new Logger(SseService.name);
  private readonly eventStream$ = new Subject<SseNotificationEvent>();

  /**
   * Emit an event to connected clients.
   */
  emitNotification(event: SseNotificationEvent): void {
    this.logger.debug(`Broadcasting SSE notification to ${event.recipientId}`);
    this.eventStream$.next(event);
  }

  /**
   * Subscribe to live notifications for a specific recipient (or broadcast).
   */
  getRecipientStream(recipientId: string, email?: string): Observable<MessageEvent> {
    const cleanEmail = email ? email.trim().toLowerCase() : null;
    const cleanId = recipientId ? recipientId.trim().toLowerCase() : null;

    return this.eventStream$.asObservable().pipe(
      filter((event) => {
        const notif = event.notification || {};
        const notifType = notif.type || (event as any).type || '';
        const isEntryLeave = [
          'CHECKIN_CONFIRMATION',
          'CHECKOUT_CONFIRMATION',
          'GEOFENCE_EXIT_WARNING',
          'GEOFENCE_RETURN',
        ].includes(notifType);

        const isManagementSubscriber =
          cleanId === 'admin' ||
          cleanId === 'hr' ||
          (cleanEmail ? (cleanEmail.includes('admin') || cleanEmail.includes('hr')) : false);

        if (isEntryLeave && isManagementSubscriber) {
          return false;
        }

        // Broadcasts, HR, or ADMIN
        if (
          event.recipientId === 'ALL' ||
          event.recipientType === 'BROADCAST' ||
          event.recipientType === 'HR' ||
          event.recipientId === 'HR' ||
          event.recipientType === 'ADMIN' ||
          event.recipientId === 'ADMIN'
        ) {
          if (isEntryLeave) return false;
          return true;
        }

        const meta = (notif.metadata || {}) as Record<string, any>;

        const eventRecipient = (event.recipientId || '').toLowerCase();
        if (cleanId && eventRecipient === cleanId) return true;
        if (cleanEmail && eventRecipient === cleanEmail) return true;

        const metaEmpCode = String(meta.employeeCode || '').toLowerCase();
        const metaUserId = String(meta.userId || '').toLowerCase();
        const metaEmail = String(meta.email || '').toLowerCase();
        const metaRecipient = String(meta.recipientId || '').toLowerCase();

        if (cleanId && (metaEmpCode === cleanId || metaUserId === cleanId || metaRecipient === cleanId)) {
          return true;
        }
        if (cleanEmail && (metaEmail === cleanEmail || eventRecipient === cleanEmail)) {
          return true;
        }

        return false;
      }),
      map(
        (event) =>
          ({
            data: event.notification,
            type: 'notification',
          } as MessageEvent),
      ),
    );
  }
}
