export interface NotificationPayload {
  chatId: string;
  text: string;
  [key: string]: unknown;
}

export interface OutboundMessage<T = NotificationPayload> {
  messageId: string;
  type: string;
  timestamp: string;
  payload: T;
}

export interface PublishResult {
  messageId: string;
  exchange: string;
  routingKey: string;
  confirmed: boolean;
}
