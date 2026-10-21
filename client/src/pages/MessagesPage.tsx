import React from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getConversation,
  getConversationMessages,
  getMyConversations,
  postConversationMessage,
  type Conversation,
  type ConversationMessage
} from '../api/conversations';
import type { AuthSession } from '../App';

type MessagesPageProps = {
  session: AuthSession;
};

const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const refLabel = (refType: Conversation['ref_type']): string => {
  switch (refType) {
    case 'QUOTE_REQUEST':
      return 'Quote request';
    case 'ORDER':
      return 'Order';
    case 'SUPPLY_GAP_REQUEST':
      return 'Supply gap';
    case 'PROJECT':
      return 'Project';
    default:
      return 'Conversation';
  }
};

const MessagesPage: React.FC<MessagesPageProps> = ({ session }) => {
  const { id } = useParams<{ id: string }>();
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [conversation, setConversation] = React.useState<Conversation | null>(null);
  const [messages, setMessages] = React.useState<ConversationMessage[]>([]);
  const [draft, setDraft] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      setLoading(true);
      setError('');
      try {
        if (id) {
          const [{ conversation: thread }, { messages: threadMessages }] = await Promise.all([
            getConversation(session.token, id),
            getConversationMessages(session.token, id)
          ]);
          if (cancelled) return;
          setConversation(thread);
          setMessages(threadMessages);
        } else {
          const { conversations: mine } = await getMyConversations(session.token);
          if (cancelled) return;
          setConversations(mine);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Could not load messages.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [id, session.token]);

  const sendMessage = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!id || !draft.trim()) return;
    setSending(true);
    setError('');
    try {
      const { message } = await postConversationMessage(session.token, id, draft);
      setMessages((current) => [...current, message]);
      setDraft('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not send the message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="py-8 md:py-12">
      <header className="mb-8 border-b border-green-200 pb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Messages</p>
        <h1 className="mt-2 text-3xl font-bold text-green-950">{id && conversation ? conversation.title : 'Your conversations'}</h1>
        <p className="mt-2 max-w-2xl text-gray-600">
          Conversations are tied to a quote request, order, supply-gap request, or project. Only the people involved
          in that record — and GreenKarachi admins — can read or post here.
        </p>
        {id && (
          <p className="mt-2 text-sm">
            <Link className="font-semibold text-green-800 underline" to="/messages">
              ← All conversations
            </Link>
          </p>
        )}
      </header>

      {error && (
        <p className="mb-4 border-l-4 border-red-700 bg-red-50 p-3 text-red-900" role="alert">
          {error}
        </p>
      )}
      {loading && (
        <p className="py-6 text-gray-600" role="status">
          Loading messages...
        </p>
      )}

      {!loading && !id && conversations.length === 0 && !error && (
        <p className="border-y border-green-200 py-6 text-gray-600">
          No conversations yet. Use the Message button on a quote request, order, supply-gap request, or project to
          start one.
        </p>
      )}
      {!loading && !id && conversations.length > 0 && (
        <div className="divide-y divide-green-200 border-y border-green-200">
          {conversations.map((thread) => (
            <article key={thread.id} className="py-4">
              <Link
                to={`/messages/${thread.id}`}
                className="block focus:outline-none focus:ring-2 focus:ring-green-300"
                aria-label={`Open conversation: ${thread.title}`}
              >
                <span className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold text-green-950">{thread.title}</span>
                  <span className="text-xs text-gray-500">Updated {formatDateTime(thread.updated_at)}</span>
                </span>
                <span className="mt-1 block text-sm text-gray-600">
                  {refLabel(thread.ref_type)} · {thread.participant_ids.length} participant
                  {thread.participant_ids.length === 1 ? '' : 's'}
                </span>
              </Link>
            </article>
          ))}
        </div>
      )}

      {!loading && id && conversation && (
        <div>
          <div className="space-y-4" aria-live="polite">
            {messages.length === 0 && (
              <p className="border-y border-green-200 py-6 text-gray-600">
                No messages yet. Say hello and coordinate the details of this {refLabel(conversation.ref_type).toLowerCase()} here.
              </p>
            )}
            {messages.map((item) => {
              const mine = item.sender_user_id === session.user.id;
              return (
                <article
                  key={item.id}
                  className={`max-w-2xl rounded border p-3 ${mine ? 'ml-auto border-green-300 bg-green-50' : 'border-gray-300 bg-white'}`}
                >
                  <p className="text-xs font-semibold text-gray-600">
                    {mine ? 'You' : 'Other participant'} · {formatDateTime(item.created_at)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{item.body}</p>
                </article>
              );
            })}
          </div>
          <form className="mt-6" onSubmit={(event) => void sendMessage(event)}>
            <label className="block text-sm font-medium text-gray-700" htmlFor="message-body">
              Message
            </label>
            <textarea
              id="message-body"
              required
              rows={3}
              maxLength={2000}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write a message about this record..."
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-200"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="mt-3 rounded bg-green-800 px-4 py-2 font-semibold text-white disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Send message'}
            </button>
          </form>
        </div>
      )}
    </section>
  );
};

export default MessagesPage;
