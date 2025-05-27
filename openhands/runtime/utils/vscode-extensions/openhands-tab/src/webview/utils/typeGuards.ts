import { SocketMessage, ActionMessage, ObservationMessage, StatusMessage } from "../../shared/types";

export function isActionMessage(event: SocketMessage): event is ActionMessage {
  return 'action' in event && typeof event.action === 'string';
}

export function isObservationMessage(event: SocketMessage): event is ObservationMessage {
  return 'observation' in event && typeof event.observation === 'string';
}

export function isStatusMessage(event: SocketMessage): event is StatusMessage {
  return 'status_update' in event && event.status_update === true;
}