import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrCreateConversation, type ConversationRefType } from '../api/conversations';

type MessageButtonProps = {
  token: string;
  refType: ConversationRefType;
  refId: string;
  label?: string;
};

/**
 * Opens (or creates) the conversation anchored to a quote request, order,
 * supply-gap request, or project, then navigates to it. The server decides
 * who the participants are; a non-participant gets a clear inline error.
 */
const MessageButton: React.FC<MessageButtonProps> = ({ token, refType, refId, label = 'Message' }) => {
  const navigate = useNavigate();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  const open = async (): Promise<void> => {
    setBusy(true);
    setError('');
    try {
      const { conversation } = await getOrCreateConversation(token, refType, refId);
      navigate(`/messages/${conversation.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not open the conversation.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void open()}
        className="rounded border border-green-800 px-3 py-2 text-sm font-semibold text-green-900 disabled:opacity-50"
      >
        {busy ? 'Opening...' : label}
      </button>
      {error && (
        <span role="alert" className="text-xs text-red-700">
          {error}
        </span>
      )}
    </span>
  );
};

export default MessageButton;
