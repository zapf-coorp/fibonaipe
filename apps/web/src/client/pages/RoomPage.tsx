import { useEffect } from "react";
import { JoinRoomPage } from "./JoinRoomPage.js";
import { linkGuestSeatToAccount } from "../../features/auth/link-account.js";
import { ClaimRoomControl } from "../../features/planning/ClaimRoomControl.js";
import { Table } from "../../features/planning/Table.js";
import { isHostSeat } from "../../features/planning/model.js";
import { startRoomPulse, useLoadRoom, useRoomView } from "../../features/planning/room-store.js";

export function RoomPage() {
  const code = window.location.pathname.split("/")[2] ?? "";
  const pendingJoin = useLoadRoom(code);
  const view = useRoomView(code);
  const seated = Boolean(view) && !pendingJoin;
  useEffect(() => {
    if (!code || !seated) return undefined;
    void linkGuestSeatToAccount(code);
    return startRoomPulse(code);
  }, [code, seated]);
  if (pendingJoin || !view) return <JoinRoomPage />;
  const claimable = view.kind === "guest" && isHostSeat(view);
  return (
    <>
      {claimable ? <ClaimRoomControl code={code} /> : null}
      <Table code={code} view={view} />
    </>
  );
}
