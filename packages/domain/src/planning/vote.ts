import { createAppError, type AppError } from "../shared/app-error.js";
import { MAX_VOTE_COMMENT_LENGTH } from "../shared/constants.js";
import { err, ok, type Result } from "../shared/result.js";
import type { Card } from "../scales/card.js";
import { isKnownSuit, type Suit } from "../scales/suit.js";

export interface VoteProps {
  readonly roundId: string;
  readonly participantId: string;
  readonly card: Card;
  readonly suit: Suit;
  readonly comment: string | null;
}

function isComment(comment: string | null): boolean {
  if (comment === null) return true;
  return comment.length <= MAX_VOTE_COMMENT_LENGTH;
}

export class Vote {
  readonly roundId: string;
  readonly participantId: string;
  readonly card: Card;
  readonly suit: Suit;
  readonly comment: string | null;

  private constructor(props: VoteProps) {
    this.roundId = props.roundId;
    this.participantId = props.participantId;
    this.card = props.card;
    this.suit = props.suit;
    this.comment = props.comment;
  }

  static rehydrate(input: VoteProps): Result<Vote, AppError> {
    if (!isKnownSuit(input.suit) || !isComment(input.comment)) return err(createAppError("VALIDATION"));
    return ok(new Vote(input));
  }

  static create(props: VoteProps): Vote {
    return new Vote(props);
  }
}
