import { createAppError, type AppError } from "../shared/app-error.js";
import { MAX_PARTICIPANTS } from "../shared/constants.js";
import { err, ok, type Result } from "../shared/result.js";

export interface RoomSettings {
  readonly activeScaleId: string;
  readonly suitAxisEnabled: boolean;
  readonly suitAxisLabelKey: string;
  readonly autoReveal: boolean;
  readonly showAverage: boolean;
  readonly timerSeconds: number | null;
  readonly maxParticipants: number;
  readonly allowObserverComments: boolean;
}

const DEFAULT_ACTIVE_SCALE_ID = "fibonacci";
const DEFAULT_SUIT_AXIS_LABEL_KEY = "risk";

export function defaultRoomSettings(activeScaleId = DEFAULT_ACTIVE_SCALE_ID): RoomSettings {
  return Object.freeze({
    activeScaleId,
    suitAxisEnabled: true,
    suitAxisLabelKey: DEFAULT_SUIT_AXIS_LABEL_KEY,
    autoReveal: false,
    showAverage: true,
    timerSeconds: null,
    maxParticipants: MAX_PARTICIPANTS,
    allowObserverComments: false,
  });
}

export class RoomSettingsBuilder {
  private activeScaleId = DEFAULT_ACTIVE_SCALE_ID;
  private suitAxisEnabled = true;
  private suitAxisLabelKey = DEFAULT_SUIT_AXIS_LABEL_KEY;
  private autoReveal = false;
  private showAverage = true;
  private timerSeconds: number | null = null;
  private maxParticipants = MAX_PARTICIPANTS;
  private allowObserverComments = false;

  withActiveScaleId(id: string): this {
    this.activeScaleId = id;
    return this;
  }

  withSuitAxis(enabled: boolean, labelKey?: string): this {
    this.suitAxisEnabled = enabled;
    if (labelKey !== undefined) this.suitAxisLabelKey = labelKey;
    return this;
  }

  withAutoReveal(autoReveal: boolean): this {
    this.autoReveal = autoReveal;
    return this;
  }

  withShowAverage(showAverage: boolean): this {
    this.showAverage = showAverage;
    return this;
  }

  withTimerSeconds(seconds: number | null): this {
    this.timerSeconds = seconds;
    return this;
  }

  withMaxParticipants(max: number): this {
    this.maxParticipants = max;
    return this;
  }

  withAllowObserverComments(allow: boolean): this {
    this.allowObserverComments = allow;
    return this;
  }

  build(): Result<RoomSettings, AppError> {
    if (this.maxParticipants !== MAX_PARTICIPANTS) {
      return err(createAppError("VALIDATION"));
    }
    return ok(
      Object.freeze({
        activeScaleId: this.activeScaleId,
        suitAxisEnabled: this.suitAxisEnabled,
        suitAxisLabelKey: this.suitAxisLabelKey,
        autoReveal: this.autoReveal,
        showAverage: this.showAverage,
        timerSeconds: this.timerSeconds,
        maxParticipants: this.maxParticipants,
        allowObserverComments: this.allowObserverComments,
      }),
    );
  }
}
