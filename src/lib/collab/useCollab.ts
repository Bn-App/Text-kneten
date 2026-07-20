import { useCallback, useEffect, useRef, useState } from 'react';
import type { DataConnection, Peer as PeerType } from 'peerjs';
import type { TextDocument } from '../../model/document';

export type CollabStatus = 'idle' | 'connecting' | 'waiting' | 'connected' | 'error';

interface CollabMessage {
  t: 'full' | 'upd';
  p: string;
}

interface CollabHookResult {
  status: CollabStatus;
  roomUrl: string | null;
  connectedCount: number;
  isHost: boolean;
  errorMessage: string | null;
  startRoom: () => void;
  leaveRoom: () => void;
}

function genRoomId(): string {
  return 'tk' + Math.random().toString(36).slice(2, 10);
}

function roomUrlFor(id: string): string {
  return location.href.split('#')[0] + '#room=' + id;
}

export function useCollab(
  doc: TextDocument | null,
  onRemoteDocument: (doc: TextDocument) => void,
): CollabHookResult {
  const [status, setStatus] = useState<CollabStatus>('idle');
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [connectedCount, setConnectedCount] = useState(0);
  const [isHost, setIsHost] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const peerRef = useRef<PeerType | null>(null);
  const hostConnsRef = useRef<Map<string, DataConnection>>(new Map());
  const guestConnRef = useRef<DataConnection | null>(null);
  const lastPayloadRef = useRef<string | null>(null);
  const docRef = useRef(doc);
  docRef.current = doc;
  const onRemoteRef = useRef(onRemoteDocument);
  onRemoteRef.current = onRemoteDocument;

  const receiveRemote = useCallback((payload: string) => {
    try {
      const parsed = JSON.parse(payload) as TextDocument;
      lastPayloadRef.current = payload;
      onRemoteRef.current(parsed);
    } catch {
      // ignore malformed payload
    }
  }, []);

  const setupHostConn = useCallback(
    (conn: DataConnection) => {
      conn.on('open', () => {
        hostConnsRef.current.set(conn.peer, conn);
        const currentDoc = docRef.current;
        if (currentDoc) {
          conn.send({ t: 'full', p: JSON.stringify(currentDoc) } satisfies CollabMessage);
        }
        setConnectedCount(hostConnsRef.current.size);
        setStatus('connected');
      });
      conn.on('data', (data) => {
        const msg = data as CollabMessage;
        if (msg.t === 'upd') {
          receiveRemote(msg.p);
          hostConnsRef.current.forEach((c, peerId) => {
            if (peerId !== conn.peer && c.open) c.send(msg);
          });
        }
      });
      conn.on('close', () => {
        hostConnsRef.current.delete(conn.peer);
        const n = hostConnsRef.current.size;
        setConnectedCount(n);
        setStatus(n > 0 ? 'connected' : 'waiting');
      });
      conn.on('error', () => hostConnsRef.current.delete(conn.peer));
    },
    [receiveRemote],
  );

  const startRoom = useCallback(() => {
    setStatus('connecting');
    setErrorMessage(null);
    setIsHost(true);
    void import('peerjs').then(({ Peer }) => {
      const id = genRoomId();
      const peer = new Peer(id);
      peerRef.current = peer;
      peer.on('open', (openedId) => {
        setStatus('waiting');
        setRoomUrl(roomUrlFor(openedId));
      });
      peer.on('connection', (conn) => setupHostConn(conn));
      peer.on('error', (err) => {
        setStatus('error');
        setErrorMessage(err.message || String(err));
      });
    });
  }, [setupHostConn]);

  const joinRoom = useCallback(
    (roomId: string) => {
      setStatus('connecting');
      setErrorMessage(null);
      setIsHost(false);
      void import('peerjs').then(({ Peer }) => {
        const peer = new Peer();
        peerRef.current = peer;
        peer.on('open', () => {
          const conn = peer.connect(roomId, { reliable: true });
          guestConnRef.current = conn;
          setRoomUrl(roomUrlFor(roomId));
          conn.on('open', () => {
            setStatus('connected');
            setConnectedCount(1);
          });
          conn.on('data', (data) => {
            const msg = data as CollabMessage;
            if (msg.t === 'full' || msg.t === 'upd') receiveRemote(msg.p);
          });
          conn.on('close', () => {
            setStatus('error');
            setErrorMessage('Verbindung getrennt');
            setConnectedCount(0);
          });
        });
        peer.on('error', () => {
          setStatus('error');
          setErrorMessage('Verbindungsfehler');
        });
      });
    },
    [receiveRemote],
  );

  const leaveRoom = useCallback(() => {
    peerRef.current?.destroy();
    peerRef.current = null;
    hostConnsRef.current.clear();
    guestConnRef.current = null;
    setIsHost(false);
    setStatus('idle');
    setRoomUrl(null);
    setConnectedCount(0);
    history.replaceState(null, '', location.href.split('#')[0]);
  }, []);

  // Auto-join if the URL already carries a room hash (shared link).
  // Guarded against React StrictMode's double-invoked mount effect in dev,
  // which would otherwise create two Peer connections for one guest.
  const autoJoinedRef = useRef(false);
  useEffect(() => {
    if (autoJoinedRef.current) return;
    const hash = location.hash;
    if (hash.startsWith('#room=')) {
      autoJoinedRef.current = true;
      joinRoom(hash.slice(6));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Broadcast local document changes to connected peers.
  useEffect(() => {
    if (!doc) return;
    const payload = JSON.stringify(doc);
    if (payload === lastPayloadRef.current) return;
    lastPayloadRef.current = payload;

    if (isHost) {
      hostConnsRef.current.forEach((conn) => {
        if (conn.open) conn.send({ t: 'upd', p: payload } satisfies CollabMessage);
      });
    } else if (guestConnRef.current?.open) {
      guestConnRef.current.send({ t: 'upd', p: payload } satisfies CollabMessage);
    }
  }, [doc, isHost]);

  useEffect(() => {
    return () => {
      peerRef.current?.destroy();
    };
  }, []);

  return { status, roomUrl, connectedCount, isHost, errorMessage, startRoom, leaveRoom };
}
