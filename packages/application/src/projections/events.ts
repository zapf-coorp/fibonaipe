import type { ItemId, ParticipantId, RoomId, RoundId, TeamId } from "@fibonaipe/domain";

export interface RoomEventEnvelope<TType extends string, TPayload> {
  readonly type: TType;
  readonly roomId: RoomId;
  readonly version: number;
  readonly at: string;
  readonly payload: TPayload;
}

export interface RoomSettingsUpdatedPayload {
  readonly name: string;
}

export interface ParticipantJoinedPayload {
  readonly participantId: ParticipantId;
}

export interface ParticipantUpdatedPayload {
  readonly participantId: ParticipantId;
}

export interface ParticipantDisconnectedPayload {
  readonly participantId: ParticipantId;
}

export interface HostTransferredPayload {
  readonly fromParticipantId: ParticipantId;
  readonly toParticipantId: ParticipantId;
}

export interface ItemQueueUpdatedPayload {
  readonly itemIds: readonly ItemId[];
}

export interface RoundStartedPayload {
  readonly roundId: RoundId;
  readonly itemId: ItemId;
}

export interface VoteChangedPayload {
  readonly participantId: ParticipantId;
  readonly hasVoted: boolean;
}

export interface RoundRevealedPayload {
  readonly roundId: RoundId;
}

export interface ItemEstimateFinalizedPayload {
  readonly itemId: ItemId;
}

export interface TimerUpdatedPayload {
  readonly endsAt: string | null;
}

export interface RoomClaimedPayload {
  readonly teamId: TeamId;
}

export type RoomEvent =
  | RoomEventEnvelope<"room.settings_updated", RoomSettingsUpdatedPayload>
  | RoomEventEnvelope<"participant.joined", ParticipantJoinedPayload>
  | RoomEventEnvelope<"participant.updated", ParticipantUpdatedPayload>
  | RoomEventEnvelope<"participant.disconnected", ParticipantDisconnectedPayload>
  | RoomEventEnvelope<"host.transferred", HostTransferredPayload>
  | RoomEventEnvelope<"item.queue_updated", ItemQueueUpdatedPayload>
  | RoomEventEnvelope<"round.started", RoundStartedPayload>
  | RoomEventEnvelope<"vote.changed", VoteChangedPayload>
  | RoomEventEnvelope<"round.revealed", RoundRevealedPayload>
  | RoomEventEnvelope<"item.estimate_finalized", ItemEstimateFinalizedPayload>
  | RoomEventEnvelope<"timer.updated", TimerUpdatedPayload>
  | RoomEventEnvelope<"room.claimed", RoomClaimedPayload>;
