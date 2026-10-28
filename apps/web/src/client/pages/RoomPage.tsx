import { JoinRoomPage } from "./JoinRoomPage.js";
import { Table } from "../../features/planning/Table.js";
import { useLoadRoom, useRoomView } from "../../features/planning/room-store.js";

export function RoomPage() {
  const code = window.location.pathname.split("/")[2] ?? "";
  const pendingJoin = useLoadRoom(code);
  const view = useRoomView(code);
  if (pendingJoin || !view) return <JoinRoomPage />;
  return <Table code={code} view={view} />;
}
