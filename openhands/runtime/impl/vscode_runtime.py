import asyncio
import uuid

from openhands.core.config import OpenHandsConfig  # Corrected case
from openhands.core.event_stream import EventStream
from openhands.core.logger import openhands_logger as logger
from openhands.events.action import (
    Action,
    AgentFinishAction,
    BrowseURLAction,
    CmdRunAction,
    FileReadAction,
    FileWriteAction,
    IPythonRunCellAction,
    MessageAction,
    RecallAction,
    # MkdirAction, RmdirAction, RemoveAction - specific types not used for now
)
from openhands.events.observation import (
    CmdOutputObservation,
    ErrorObservation,
    FileReadObservation,
    FileWriteObservation,
    NullObservation,
    Observation,
)
from openhands.runtime.base import Runtime

GLOBAL_SOCKET_IO_CLIENT = None


class VsCodeRuntime(Runtime):
    """
    A runtime that delegates action execution to a VS Code extension.
    This class sends actions to the VS Code extension via a communication channel
    (e.g., Socket.IO) and receives observations in return.
    """

    def __init__(
        self,
        config: OpenHandsConfig,  # Corrected case
        event_stream: EventStream,
        sid: str = 'default_sid',
    ):
        super().__init__(config=config, event_stream=event_stream)
        self.sid = sid
        self._running_actions: dict[str, asyncio.Future[Observation]] = {}
        logger.info('VsCodeRuntime initialized')

    async def _send_action_to_vscode(self, action: Action) -> Observation:
        if GLOBAL_SOCKET_IO_CLIENT is None:
            logger.error(
                'Socket.IO client is not available. Cannot send action to VS Code.'
            )
            obs = ErrorObservation(
                content='Socket.IO client not configured. VsCodeRuntime cannot operate.'
            )
            return obs

        event_id = str(uuid.uuid4())  # type: ignore[unreachable]

        oh_event_payload = {
            'id': event_id,
            'action': action.action,
            'args': action.args,
            'message': f'Action delegate: {action.message}'
            if hasattr(action, 'message') and action.message
            else f'Delegating {action.action} to VSCode',
            'source': 'agent',
        }

        if hasattr(action, 'thought') and action.thought:
            if not isinstance(oh_event_payload['args'], dict):
                oh_event_payload['args'] = {}
            oh_event_payload['args']['thought'] = action.thought

        future: asyncio.Future[Observation] = asyncio.get_event_loop().create_future()
        self._running_actions[event_id] = future

        logger.info(f'Sending action to VSCode (event_id: {event_id}): {action.action}')
        logger.debug(f'Action details: {oh_event_payload}')

        print(
            f"SIMULATING: Emitting 'oh_event' to VSCode extension: {oh_event_payload}"
        )

        try:
            observation = await asyncio.wait_for(
                future, timeout=self.config.sandbox.timeout
            )
            logger.info(f'Received observation for event_id {event_id}')
            return observation
        except asyncio.TimeoutError:
            logger.error(f'Timeout waiting for observation for event_id {event_id}')
            obs = ErrorObservation(
                content=f'Timeout waiting for VS Code extension response for action: {action.action}'
            )
            # Cannot set obs.cause = event_id due to read-only property
            return obs
        finally:
            self._running_actions.pop(event_id, None)

    def handle_observation_from_vscode(self, observation_event: dict):
        cause_event_id = observation_event.get('cause')
        if not cause_event_id:
            logger.error(
                f"Received observation event from VSCode without a 'cause' ID: {observation_event}"
            )
            return

        if cause_event_id in self._running_actions:
            future = self._running_actions[cause_event_id]
            obs_type = observation_event.get('observation')
            obs_content = observation_event.get('content', '')
            obs_extras = observation_event.get('extras', {})

            observation: Observation
            if obs_type == 'run':
                observation = CmdOutputObservation(
                    command_id=-1,
                    command=obs_extras.get('command', ''),
                    exit_code=obs_extras.get('exit_code', -1),
                    content=obs_content,
                )
                # Cannot set observation.cause due to read-only property
            elif obs_type == 'read':
                observation = FileReadObservation(
                    path=obs_extras.get('path', ''), content=obs_content
                )
                # Cannot set observation.cause due to read-only property
            elif obs_type == 'write':
                observation = FileWriteObservation(
                    path=obs_extras.get('path', ''), content=obs_content
                )
                # Cannot set observation.cause due to read-only property
            else:
                logger.warn(
                    f"Received unknown observation type '{obs_type}' from VSCode for cause {cause_event_id}"
                )
                observation = ErrorObservation(
                    content=f"Unknown observation type '{obs_type}' received from VSCode. Content: {obs_content}"
                )
                # Cannot set observation.cause due to read-only property

            if not future.done():
                future.set_result(observation)
            else:
                logger.warn(f'Future for event_id {cause_event_id} was already done.')
        else:
            logger.warn(
                f'Received observation for unknown event_id or already handled: {cause_event_id}'
            )

    async def run(self, action: CmdRunAction) -> Observation:  # type: ignore[override]
        return await self._send_action_to_vscode(action)

    async def read(self, action: FileReadAction) -> Observation:  # type: ignore[override]
        return await self._send_action_to_vscode(action)

    async def write(self, action: FileWriteAction) -> Observation:  # type: ignore[override]
        return await self._send_action_to_vscode(action)

    async def mkdir(self, action: Action) -> Observation:  # type: ignore[override]
        # TODO: Use specific MkdirAction type if/when defined
        logger.warn(
            'mkdir not fully implemented for VsCodeRuntime, using generic send.'
        )
        return await self._send_action_to_vscode(action)

    async def rmdir(self, action: Action) -> Observation:  # type: ignore[override]
        # TODO: Use specific RmdirAction type if/when defined
        logger.warn(
            'rmdir not fully implemented for VsCodeRuntime, using generic send.'
        )
        return await self._send_action_to_vscode(action)

    async def rm(self, action: Action) -> Observation:  # type: ignore[override]
        # TODO: Use specific RemoveAction type if/when defined
        logger.warn('rm not fully implemented for VsCodeRuntime, using generic send.')
        return await self._send_action_to_vscode(action)

    async def browse(self, action: BrowseURLAction) -> Observation:  # type: ignore[override]
        logger.info(f'Executing browse action: {action.url}')
        return NullObservation(
            content='Browse action is not directly executable in VSCode terminal via this runtime yet.'
        )

    async def recall(self, action: RecallAction) -> Observation:
        return NullObservation(content='Recall action not handled by VsCodeRuntime.')

    async def finish(self, action: AgentFinishAction) -> Observation:
        return NullObservation(
            content='AgentFinish action not handled by VsCodeRuntime.'
        )

    async def run_ipython(self, action: IPythonRunCellAction) -> Observation:  # type: ignore[override]
        logger.warn(
            'run_ipython (e.g. for Jupyter) not fully implemented for VsCodeRuntime, using generic send.'
        )
        return await self._send_action_to_vscode(action)

    async def send_message(self, action: MessageAction) -> Observation:
        return NullObservation(
            content='MessageAction not directly handled by VsCodeRuntime execution logic.'
        )

    async def close(self):
        logger.info('Closing VsCodeRuntime. Outstanding actions will be cancelled.')
        for event_id, future in self._running_actions.items():
            if not future.done():
                future.cancel()
                logger.info(f'Cancelled pending action: {event_id}')
        self._running_actions.clear()
        logger.info('VsCodeRuntime closed.')
