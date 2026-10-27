export interface IdGenerator {
  newId(): string;
  newRoomCode(): string;
  newToken(): string;
  sha256(input: string): string;
}
