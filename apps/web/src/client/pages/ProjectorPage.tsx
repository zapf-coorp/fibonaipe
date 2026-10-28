import { Projector } from "../../features/planning/Projector.js";
import { useLoadRoom, useRoomView } from "../../features/planning/room-store.js";

export function ProjectorPage() {
  const code = window.location.pathname.split("/")[2] ?? "";
  const pendingJoin = useLoadRoom(code);
  const view = useRoomView(code);
  if (pendingJoin || !view) return null;
  return <Projector code={code} view={view} />;
}
