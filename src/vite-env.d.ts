/// <reference types="vite/client" />

interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
    recognitionInstance?: any;
  }