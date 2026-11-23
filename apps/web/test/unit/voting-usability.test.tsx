// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../src/client/i18n/index.js";
import {
  canRevealNow,
  canStartTimerNow,
  canVoteNow,
  miniCards,
  type RoomView,
} from "../../src/features/planning/model.js";

const commands = vi.hoisted(() => ({ selectItem: vi.fn(), reopenItem: vi.fn() }));
vi.mock("../../src/features/planning/commands.js", () => commands);

const { TaskPicker } = await import("../../src/features/planning/TaskPicker.js");

const queue = [
  { id: "a", title: "Aberta", status: "pending", link: null, finalEstimate: null, average: null },
  { id: "b", title: "Votada", status: "estimated", link: null, finalEstimate: "5", average: 4.5 },
];

function view(extra: Record<string, unknown> = {}): RoomView {
  return {
    queue,
    participants: [
      { id: "me", nickname: "Eu", hasVoted: true },
      { id: "ana", nickname: "Ana", hasVoted: true },
      { id: "leo", nickname: "Leo", hasVoted: false },
    ],
    viewer: { kind: "participant", participantId: "me" },
    ownVote: { card: "3", suit: "hearts" },
    permissions: { manageQueue: true, revealRound: true },
    ...extra,
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("voting usability", () => {
  it("shows your own card face up and the others face down until the reveal", () => {
    const cards = miniCards(view());
    expect(cards.me).toEqual({ faceUp: true, card: "3", suit: "hearts" });
    expect(cards.ana).toEqual({ faceUp: false, card: "", suit: "joker" });
    expect(cards.leo).toBeUndefined();
    const revealed = miniCards(view({ votes: [{ participantId: "ana", card: { label: "8" }, suit: { kind: "clubs" } }] }));
    expect(revealed.ana).toEqual({ faceUp: true, card: "8", suit: "clubs" });
  });

  it("only enables reveal, timer and cards when the action can succeed", () => {
    const voting = view({ queue: [{ ...queue[0], status: "current" }], currentRound: { status: "voting" } });
    expect(canRevealNow(voting)).toBe(true);
    expect(canStartTimerNow(voting)).toBe(true);
    expect(canVoteNow(voting)).toBe(true);
    const revealed = view({ queue: [{ ...queue[0], status: "current" }], currentRound: { status: "revealed" } });
    expect(canRevealNow(revealed)).toBe(false);
    expect(canStartTimerNow(revealed)).toBe(false);
    expect(canVoteNow(revealed)).toBe(false);
    const empty = view({ queue: [] });
    expect(canRevealNow(empty)).toBe(false);
    expect(canStartTimerNow(empty)).toBe(false);
    expect(canVoteNow(empty)).toBe(false);
  });

  it("lists open tasks to vote on and reopens a voted one with its average and value", () => {
    render(
      <I18nProvider>
        <TaskPicker code="23456789" view={view()} />
      </I18nProvider>,
    );
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "b" } });
    expect(commands.selectItem).not.toHaveBeenCalled();
    expect(screen.getByRole("group", { name: "Votada" }).textContent).toContain("4.5");
    expect(screen.getByRole("group", { name: "Votada" }).textContent).toContain("5");
    fireEvent.click(screen.getByRole("button", { name: "Reabrir votação" }));
    expect(commands.reopenItem).toHaveBeenCalledWith("23456789", "b");
    fireEvent.change(select, { target: { value: "a" } });
    expect(commands.selectItem).toHaveBeenCalledWith("23456789", "a");
  });

  it("blocks reopening while another task is still open", () => {
    const busy = view({ queue: [{ ...queue[0], status: "current" }, queue[1]] });
    render(
      <I18nProvider>
        <TaskPicker code="23456789" view={busy} />
      </I18nProvider>,
    );
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "b" } });
    expect(screen.getByRole("button", { name: "Reabrir votação" })).toHaveProperty("disabled", true);
  });
});
