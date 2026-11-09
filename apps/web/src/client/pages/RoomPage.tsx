import { useEffect } from "react";
import { JoinRoomPage } from "./JoinRoomPage.js";
import { Table } from "../../features/planning/Table.js";
import { startRoomPulse, useLoadRoom, useRoomView } from "../../features/planning/room-store.js";

export function RoomPage() {
  const code = window.location.pathname.split("/")[2] ?? "";
  const pendingJoin = useLoadRoom(code);
  const view = useRoomView(code);
  const seated = Boolean(view) && !pendingJoin;
  useEffect(() => {
    if (!code || !seated) return undefined;
    return startRoomPulse(code);
  }, [code, seated]);
  if (pendingJoin || !view) return <JoinRoomPage />;
  return <Table code={code} view={view} />;
}
