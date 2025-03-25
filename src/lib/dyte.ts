let dyteClient: any | null = null;

/**
 * Dyte API integration for video calls
 */

// Dyte API credentials should be in your environment variables
const DYTE_ORG_ID = import.meta.env.VITE_DYTE_ORG_ID;
const DYTE_API_KEY = import.meta.env.VITE_DYTE_API_KEY;

interface CreateMeetingResponse {
  success: boolean;
  data: {
    id: string;
    title: string;
    roomName: string;
  };
}

interface AddParticipantResponse {
  success: boolean;
  data: {
    id: string;
    name: string;
    clientSpecificId: string;
    authToken: string;
  };
}

/**
 * Creates a new Dyte meeting
 */
export const createMeeting = async (title: string): Promise<string> => {
  try {
    const response = await fetch('https://api.dyte.io/v2/meetings', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(DYTE_ORG_ID + ':' + DYTE_API_KEY)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        preferred_region: 'ap-south-1',
        record_on_start: false,
      }),
    });

    const meetingData: CreateMeetingResponse = await response.json();
    
    if (!meetingData.success) {
      throw new Error('Failed to create meeting');
    }

    return meetingData.data.id;
  } catch (error) {
    console.error('Error creating Dyte meeting:', error);
    throw error;
  }
};

/**
 * Adds a participant to an existing Dyte meeting
 */
export const addParticipant = async (
  meetingId: string,
  name: string,
  userId: string,
  presetName: string = 'group_call_participant'
): Promise<string> => {
  try {
    const response = await fetch(`https://api.dyte.io/v2/meetings/${meetingId}/participants`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(DYTE_ORG_ID + ':' + DYTE_API_KEY)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        client_specific_id: userId,
        preset_name: presetName,
      }),
    });

    const participantData: AddParticipantResponse = await response.json();
    
    if (!participantData.success) {
      throw new Error('Failed to add participant');
    }

    return participantData.data.authToken;
  } catch (error) {
    console.error('Error adding Dyte participant:', error);
    throw error;
  }
};

/**
 * Initialize a Dyte meeting and join as a participant
 */
export const initializeDyteMeeting = async (
  meetingId: string,
  userName: string,
  userId: string
): Promise<any> => {
  try {
    // Add participant to the meeting
    const authToken = await addParticipant(meetingId, userName, userId);
    
    // Initialize DyteClient with the auth token
    const dyteClient = await (window as any).DyteClient.init({
      authToken,
      defaults: {
        audio: true,
        video: true,
      },
    });
    
    return dyteClient;
  } catch (error) {
    console.error('Failed to initialize Dyte meeting:', error);
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

/**
 * Initialize the Dyte client with an auth token
 */
const initDyteClient = async (authToken: string): Promise<any> => {
  dyteClient = await (window as any).DyteClient.init({
    authToken,
    defaults: {
      audio: true,
      video: true,
    },
  });
  
  return dyteClient;
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
