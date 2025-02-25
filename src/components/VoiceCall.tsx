import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { initializePeer, makeCall, answerCall, endCall } from '../lib/peer';

export const VoiceCall: React.FC = () => {
  const [isInCall, setIsInCall] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [peerId, setPeerId] = useState<string>('');

  useEffect(() => {
    const peer = initializePeer();
    
    peer.on('open', (id) => {
      setPeerId(id);
    });

    peer.on('call', (call) => {
      if (window.confirm('Incoming call. Accept?')) {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then((stream) => {
            setStream(stream);
            answerCall(call, stream);
            setIsInCall(true);
          });
      }
    });

    return () => {
      peer.destroy();
    };
  }, []);

  const startCall = async () => {
    try {
      const userStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(userStream);
      const remotePeerId = prompt('Enter peer ID to call:');
      if (remotePeerId) {
        makeCall(remotePeerId, userStream);
        setIsInCall(true);
      }
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const handleEndCall = () => {
    endCall();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setIsInCall(false);
  };

  return (
    <div className="flex items-center gap-4">
      {isInCall ? (
        <button
          onClick={handleEndCall}
          className="neo-brutal p-2 bg-red-300"
        >
          <PhoneOff size={24} />
        </button>
      ) : (
        <button
          onClick={startCall}
          className="neo-brutal p-2 bg-green-300"
        >
          <Phone size={24} />
        </button>
      )}
      {peerId && (
        <div className="text-sm">
          Your ID: <span className="font-mono">{peerId}</span>
        </div>
      )}
    </div>
  );
};