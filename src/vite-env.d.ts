/// <reference types="vite/client" />

interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
    recognitionInstance?: any;
}

interface VideoCallConnection {
    localStream: MediaStream;
    peerConnection: RTCPeerConnection;
    remoteStream?: MediaStream;
}