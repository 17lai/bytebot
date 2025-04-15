import { MessageContentBlock } from "../../../shared/types/messageContent.types";

export enum MessageRole {
  USER = "USER",
  ASSISTANT = "ASSISTANT",
}

// Message interface
export interface Message {
  id: string;
  content: MessageContentBlock[];
  role: MessageRole;
  createdAt?: string;
}
