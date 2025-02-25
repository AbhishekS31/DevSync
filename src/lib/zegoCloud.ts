import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import CryptoJS from 'crypto-js';

const appID = parseInt(import.meta.env.VITE_ZEGO_APP_ID || '0', 10);
const serverSecret = import.meta.env.VITE_ZEGO_SERVER_SECRET || '';

export const generateToken = (
  userId: string,
  roomId: string,
  userName: string
): string => {
  if (!appID || !serverSecret) {
    throw new Error('ZEGO credentials not configured');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = Math.floor(Math.random() * 2147483647);

  // Convert serverSecret to WordArray
  const secretKey = CryptoJS.enc.Utf8.parse(serverSecret);

  const payload = {
    app_id: appID,
    user_id: userId,
    nonce,
    timestamp,
    expire_time: timestamp + 3600,
    payload: '',
  };

  // Sort keys
  const sortedKeys = Object.keys(payload).sort();
  let signContent = '';
  sortedKeys.forEach((key) => {
    if (payload[key as keyof typeof payload] !== '') {
      signContent += `${key}=${payload[key as keyof typeof payload]}`;
    }
  });

  // Generate signature
  const signature = CryptoJS.HmacSHA256(signContent, secretKey).toString(
    CryptoJS.enc.Hex
  );

  return signature;
};

export const initVideoCall = async (
  element: HTMLDivElement,
  roomId: string,
  userId: string,
  userName: string,
  role: 'Host' | 'Cohost'
): Promise<ZegoUIKitPrebuilt> => {
  const token = generateToken(userId, roomId, userName);

  const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
    appID,
    serverSecret,
    roomId,
    userId,
    userName
  );

  const zp = await ZegoUIKitPrebuilt.create(kitToken);

  await zp.joinRoom({
    container: element,
    sharedLinks: [
      {
        name: 'Personal link',
        url: window.location.origin + window.location.pathname + '?roomID=' + roomId,
      },
    ],
    scenario: {
      mode: ZegoUIKitPrebuilt.GroupCall,
    },
    showTurnOffRemoteCameraButton: true,
    showTurnOffRemoteMicrophoneButton: true,
    showRemoveUserButton: role === 'Host',
    maxUsers: 4,
    layout: 'Auto',
    showUserList: false,
    showPreJoinView: false,
    turnOnMicrophoneWhenJoining: true,
    turnOnCameraWhenJoining: true,
    showMyCameraToggleButton: true,
    showMyMicrophoneToggleButton: true,
    showAudioVideoSettingsButton: true,
    showScreenSharingButton: true,
    showTextChat: false,
    showLayoutButton: false,
  });

  return zp;
};
