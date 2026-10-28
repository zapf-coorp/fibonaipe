import {
  AddItem,
  CastVote,
  CloseRoom,
  CreateRoom,
  DeferItem,
  ExportRoomSummary,
  GetRoomSnapshot,
  Heartbeat,
  ImportItems,
  JoinRoom,
  NewRound,
  PurgeExpiredRooms,
  ReconnectParticipant,
  RemoveItem,
  ReorderItems,
  RetractVote,
  RevealRound,
  SetCurrentItem,
  SetFinalEstimate,
  SkipItem,
  TransferHost,
  UpdateRoomSettings,
  type UseCaseDependencies,
} from "@fibonaipe/application";
import type { AppContainer } from "./composition.js";

export interface RoomUseCases {
  readonly deps: UseCaseDependencies;
  readonly createRoom: CreateRoom;
  readonly joinRoom: JoinRoom;
  readonly reconnect: ReconnectParticipant;
  readonly heartbeat: Heartbeat;
  readonly snapshot: GetRoomSnapshot;
  readonly updateSettings: UpdateRoomSettings;
  readonly transferHost: TransferHost;
  readonly closeRoom: CloseRoom;
  readonly purge: PurgeExpiredRooms;
  readonly exportSummary: ExportRoomSummary;
  readonly addItem: AddItem;
  readonly importItems: ImportItems;
  readonly reorderItems: ReorderItems;
  readonly setCurrentItem: SetCurrentItem;
  readonly skipItem: SkipItem;
  readonly deferItem: DeferItem;
  readonly removeItem: RemoveItem;
  readonly castVote: CastVote;
  readonly retractVote: RetractVote;
  readonly revealRound: RevealRound;
  readonly newRound: NewRound;
  readonly setFinalEstimate: SetFinalEstimate;
}

export function createRoomUseCases(container: AppContainer): RoomUseCases {
  const deps: UseCaseDependencies = {
    persistence: container.persistence,
    realtime: container.realtime,
    ids: container.idGenerator,
    clock: container.clock,
    rateLimiter: container.rateLimiter,
    issueTracker: container.issueTracker,
    exporter: container.exporter,
    logger: container.logger,
  };
  return {
    deps,
    createRoom: new CreateRoom(deps),
    joinRoom: new JoinRoom(deps),
    reconnect: new ReconnectParticipant(deps),
    heartbeat: new Heartbeat(deps),
    snapshot: new GetRoomSnapshot(deps),
    updateSettings: new UpdateRoomSettings(deps),
    transferHost: new TransferHost(deps),
    closeRoom: new CloseRoom(deps),
    purge: new PurgeExpiredRooms(deps),
    exportSummary: new ExportRoomSummary(deps),
    addItem: new AddItem(deps),
    importItems: new ImportItems(deps),
    reorderItems: new ReorderItems(deps),
    setCurrentItem: new SetCurrentItem(deps),
    skipItem: new SkipItem(deps),
    deferItem: new DeferItem(deps),
    removeItem: new RemoveItem(deps),
    castVote: new CastVote(deps),
    retractVote: new RetractVote(deps),
    revealRound: new RevealRound(deps),
    newRound: new NewRound(deps),
    setFinalEstimate: new SetFinalEstimate(deps),
  };
}
