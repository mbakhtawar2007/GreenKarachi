import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification
} from '../api/notifications';
import type { AuthSession } from '../App';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

type NotificationsPageProps = {
  session: AuthSession;
};

const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const NotificationsPage: React.FC<NotificationsPageProps> = ({ session }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [unreadOnly, setUnreadOnly] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  // Silent refresh updates the list and unread count in place, without
  // a spinner; a failed silent refresh keeps the previous list.
  const load = React.useCallback(
    async (targetPage: number, onlyUnread: boolean, silent = false) => {
      if (!silent) {
        setLoading(true);
        setError('');
      }
      try {
        const data = await getMyNotifications(session.token, targetPage, onlyUnread);
        setNotifications(data.notifications);
        setPage(data.pagination.page);
        setTotalPages(data.pagination.totalPages);
        setUnreadCount(data.unreadCount);
        setError('');
      } catch (caught) {
        if (!silent) setError(caught instanceof Error ? caught.message : 'Could not load notifications.');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [session.token]
  );

  React.useEffect(() => {
    void load(1, unreadOnly);
  }, [load, unreadOnly]);

  useAutoRefresh(() => { void load(page, unreadOnly, true); }, 30000);

  const openNotification = async (notification: AppNotification): Promise<void> => {
    if (!notification.is_read) {
      try {
        await markNotificationRead(session.token, notification.id);
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, is_read: true, read_at: new Date().toISOString() } : item
          )
        );
        setUnreadCount((current) => Math.max(0, current - 1));
      } catch {
        setError('Could not mark the notification as read.');
        return;
      }
    }
    if (notification.link) navigate(notification.link);
  };

  const markAllRead = async (): Promise<void> => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const { updated } = await markAllNotificationsRead(session.token);
      setMessage(updated > 0 ? `Marked ${updated} notification${updated === 1 ? '' : 's'} as read.` : 'No unread notifications.');
      await load(page, unreadOnly);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not mark notifications as read.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="py-8 md:py-12">
      <header className="mb-8 border-b border-green-200 pb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Notifications</p>
        <h1 className="mt-2 text-3xl font-bold text-green-950">Your notifications</h1>
        <p className="mt-2 max-w-2xl text-gray-600">
          Updates about your quotes, orders, supply offers, pledges, and account. Notifications never include pledge
          amounts, verification notes, or message text — open the linked record to see details you are allowed to see.
        </p>
      </header>

      {error && (
        <p className="mb-6 rounded-r-xl border-l-4 border-red-700 bg-red-50 p-4 text-red-900" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="mb-6 rounded-r-xl border-l-4 border-green-700 bg-green-50 p-4 text-green-900" role="status">
          {message}
        </p>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <label className="flex cursor-pointer items-center gap-2 py-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(event) => setUnreadOnly(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 accent-green-800"
          />
          Unread only
        </label>
        <button
          type="button"
          disabled={busy || unreadCount === 0}
          onClick={() => void markAllRead()}
          className="btn-secondary px-3 py-2 text-sm"
        >
          Mark all as read
        </button>
        <span className="text-sm text-gray-600" role="status">
          {unreadCount} unread
        </span>
      </div>

      {loading && (
        <p className="py-12 text-center text-gray-600" role="status">
          Loading notifications...
        </p>
      )}
      {!loading && notifications.length === 0 && (
        <p className="border-y border-green-200 py-12 text-center text-gray-600">
          {unreadOnly ? 'No unread notifications.' : 'No notifications yet. Quote, order, offer, and pledge updates will appear here.'}
        </p>
      )}
      {!loading && notifications.length > 0 && (
        <div className="card divide-y divide-green-100 overflow-hidden">
          {notifications.map((notification) => (
            <article key={notification.id} className={`px-4 py-4 sm:px-5 ${notification.is_read ? '' : 'bg-green-50'}`}>
              <button
                type="button"
                onClick={() => void openNotification(notification)}
                className="block w-full rounded-xl px-2 py-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
                aria-label={`${notification.is_read ? '' : 'Unread: '}${notification.title}`}
              >
                <span className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className={`min-w-0 break-words text-green-950 ${notification.is_read ? 'font-medium' : 'font-bold'}`}>
                    {!notification.is_read && (
                      <span aria-hidden="true" className="mr-2 inline-block h-2 w-2 shrink-0 rounded-full bg-green-700" />
                    )}
                    {notification.title}
                  </span>
                  <span className="shrink-0 text-xs text-gray-500">{formatDateTime(notification.created_at)}</span>
                </span>
                <span className="mt-1 block break-words text-sm text-gray-700">{notification.body}</span>
                {notification.link && <span className="mt-1 block text-sm font-semibold text-green-800">Open →</span>}
              </button>
            </article>
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <nav className="mt-6 flex flex-wrap items-center gap-4" aria-label="Notifications pages">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => void load(page - 1, unreadOnly)}
            className="btn-secondary px-4 py-2"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => void load(page + 1, unreadOnly)}
            className="btn-secondary px-4 py-2"
          >
            Next
          </button>
        </nav>
      )}

      <p className="mt-8 text-sm text-gray-600">
        Looking for a conversation? <Link className="font-semibold text-green-800 underline underline-offset-4 hover:text-green-950" to="/messages">Open your messages</Link>.
      </p>
    </section>
  );
};

export default NotificationsPage;
