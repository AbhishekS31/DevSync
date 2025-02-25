import Peer from 'peerjs';

let peer: Peer | null = null;
let currentCall: any = null;

export const initializePeer = () => {
  peer = new Peer();
  return peer;
};

export const makeCall = (remotePeerId: string, stream: MediaStream) => {
  if (!peer) return;
  currentCall = peer.call(remotePeerId, stream);
  return currentCall;
};

export const answerCall = (call: any, stream: MediaStream) => {
  call.answer(stream);
  currentCall = call;
  return call;
};

export const endCall = () => {
  if (currentCall) {
    currentCall.close();
    currentCall = null;
  }
};