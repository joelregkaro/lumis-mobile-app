import { useEffect, useState } from "react";
import { Platform } from "react-native";

let NetInfo: any = null;
if (Platform.OS !== "web") {
  try {
    NetInfo = require("@react-native-community/netinfo").default;
  } catch {
    // NetInfo not available
  }
}

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    if (!NetInfo) return;

    const unsubscribe = NetInfo.addEventListener((state: any) => {
      setIsConnected(state.isConnected ?? true);
    });

    return () => unsubscribe();
  }, []);

  return isConnected;
}

export async function isOnline(): Promise<boolean> {
  if (!NetInfo) return true;
  try {
    const state = await NetInfo.fetch();
    return state.isConnected ?? true;
  } catch {
    return true;
  }
}
