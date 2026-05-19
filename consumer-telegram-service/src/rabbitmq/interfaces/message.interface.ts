export interface NotificationPayload {
  chatId: string;
  text: string;
  [key: string]: unknown;
}

export interface InboundMessage<T = NotificationPayload> {
  messageId: string;
  type: string;
  timestamp: string;
  payload: T;
}

export type ProcessingOutcome = 'success' | 'duplicate' | 'failed';

export interface ProcessingResult {
  outcome: ProcessingOutcome;
  messageId: string;
  error?: string;
}
