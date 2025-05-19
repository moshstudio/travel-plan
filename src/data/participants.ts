export interface ParticipantType {
  id: number;
  userId: string;
  name: string;
  defaultRole: "organizer" | "participant";
}
