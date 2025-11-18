import AsyncStorage from '@react-native-async-storage/async-storage';

export const PLAYER_STATE_KEY = 'mlap_player_state_v1';

export interface PersistedQueueState {
  queue: {
    id: string;
    title: string;
    artist?: string;
    album?: string;
    path: string;
    picture?: string;
  }[];
  currentTrackId: string | null;
  position: number;
  volume: number;
  shuffle?: boolean;
  loopMode?: 'off' | 'all' | 'one';
}

export interface PersistedState {
  [queueId: string]: PersistedQueueState;
}

export async function savePlayerState(state: PersistedState) {
  try {
    await AsyncStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    // ignore
  }
}

export async function loadPlayerState(): Promise<PersistedState | null> {
  try {
    const raw = await AsyncStorage.getItem(PLAYER_STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export async function clearPlayerState() {
  try {
    await AsyncStorage.removeItem(PLAYER_STATE_KEY);
  } catch (e) {}
}
