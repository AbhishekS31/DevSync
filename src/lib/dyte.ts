import { useDyteClient, DyteClientParams } from '@dytesdk/react-web-core';

let dyteClient: any | null = null;

interface CreateMeetingResponse {
  success: boolean;
  data: {
    id: string;
    title: string;
  };
}

interface AddParticipantResponse {
  success: boolean;
  data: {
    authToken: string;
  };
}

export const createMeeting = async (title: string): Promise<string> => {
  const response = await fetch('https://api.dyte.io/v2/meetings', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(import.meta.env.VITE_DYTE_ORG_ID + ':' + import.meta.env.VITE_DYTE_API_KEY)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      preferred_region: 'ap-south-1',
      record_on_start: false,
    }),
  });

  const data: CreateMeetingResponse = await response.json();
  if (!data.success) {
    throw new Error('Failed to create meeting');
  }

  return data.data.id;
};

export const addParticipant = async (
  meetingId: string,
  clientId: string,
  name: string
): Promise<string> => {
  const response = await fetch(`https://api.dyte.io/v2/meetings/${meetingId}/participants`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(import.meta.env.VITE_DYTE_ORG_ID + ':' + import.meta.env.VITE_DYTE_API_KEY)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      client_specific_id: clientId,
      preset_name: 'group_call_participant',
    }),
  });

  const data: AddParticipantResponse = await response.json();
  if (!data.success) {
    throw new Error('Failed to add participant');
  }

  return data.data.authToken;
};

export const initDyteClient = async (authToken: string): Promise<any> => {
  try {
    // Request permissions first
    await requestMediaPermissions();

    if (!dyteClient) {
      // Replace DyteClient.init() with useDyteClient hook if applicable
      dyteClient = useDyteClient({
        authToken,
        defaults: {
          audio: true,
          video: true,
        },
      } as DyteClientParams & { authToken: string });
    }
    return dyteClient;
  } catch (error) {
    console.error('Failed to initialize Dyte client:', error);
    throw error;
  }
};

const requestMediaPermissions = async (): Promise<void> => {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  } catch (error) {
    console.error('Failed to get media permissions:', error);
    throw new Error('Please allow camera and microphone access to join the call');
  }
};

export const joinMeeting = async (meetingId: string, clientId: string, name: string): Promise<any> => {
  try {
    // Get auth token for the participant
    const authToken = await addParticipant(meetingId, clientId, name);
    
    // Initialize and return the Dyte client
    const meeting = await initDyteClient(authToken);
    await meeting.joinRoom();
    return meeting;
  } catch (error) {
    console.error('Failed to join meeting:', error);
    throw error;
  }
};

export const leaveMeeting = async (): Promise<void> => {
  if (dyteClient) {
    await dyteClient.leaveRoom();
    dyteClient = null;
  }
};

export const toggleVideo = async (enabled: boolean): Promise<void> => {
  if (dyteClient) {
    if (enabled) {
      await dyteClient.video.enable();
    } else {
      await dyteClient.video.disable();
    }
  }
};

export const toggleAudio = async (enabled: boolean): Promise<void> => {
  if (dyteClient) {
    if (enabled) {
      await dyteClient.audio.enable();
    } else {
      await dyteClient.audio.disable();
    }
  }
};
