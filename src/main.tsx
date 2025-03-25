import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Buffer } from 'buffer';

// Polyfills for WebRTC compatibility
(window as any).global = window;
(window as any).process = { env: {} };
(window as any).Buffer = Buffer;

// Required for some WebRTC implementations
if (!window.RTCPeerConnection) {
  (window as any).RTCPeerConnection = 
    window.webkitRTCPeerConnection || 
    window.mozRTCPeerConnection;
}

if (!window.RTCSessionDescription) {
  (window as any).RTCSessionDescription = 
    window.webkitRTCSessionDescription || 
    window.mozRTCSessionDescription;
}

if (!window.RTCIceCandidate) {
  (window as any).RTCIceCandidate = 
    window.webkitRTCIceCandidate || 
    window.mozRTCIceCandidate;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);