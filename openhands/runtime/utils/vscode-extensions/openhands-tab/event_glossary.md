# OpenHands Agent Event Glossary

This document lists the various actions and observations used in the OpenHands agent communication.

## Source Files

- Actions: `/Users/enyst/repos/play/frontend/src/types/core/actions.ts`
- Observations: `/Users/enyst/repos/play/frontend/src/types/core/observations.ts`

## Base Event Structure

Events generally follow a structure like:
- `id`: string (event identifier)
- `timestamp`: string (ISO timestamp)
- `action`: string (the kind of action or observation, e.g., "run", "message")
- `source`: "user" | "agent" (who initiated or is reporting the event)
- `args` (for Actions) / `extras` (for Observations): object (specific properties for the event type)
- `message`: string (a human-readable message associated with the event)

---

## Actions (from `actions.ts`)

### 1. `UserMessageAction`
- **File:** `actions.ts`
- **Kind (`action`):** `"message"`
- **Source:** `"user"`
- **Properties (`args`):**
    - `content`: string
    - `image_urls`: string[]

### 2. `SystemMessageAction`
- **File:** `actions.ts`
- **Kind (`action`):** `"system"`
- **Source:** `"agent"`
- **Properties (`args`):**
    - `content`: string
    - `tools`: Array<Record<string, unknown>> | null
    - `openhands_version`: string | null
    - `agent_class`: string | null

### 3. `CommandAction`
- **File:** `actions.ts`
- **Kind (`action`):** `"run"`
- **Source:** `"agent"`
- **Properties (`args`):**
    - `command`: string
    - `security_risk`: ActionSecurityRisk
    - `confirmation_state`: "confirmed" | "rejected" | "awaiting_confirmation"
    - `thought`: string
    - `hidden?`: boolean

### 4. `AssistantMessageAction`
- **File:** `actions.ts`
- **Kind (`action`):** `"message"`
- **Source:** `"agent"`
- **Properties (`args`):**
    - `thought`: string
    - `image_urls`: string[] | null
    - `wait_for_response`: boolean

### 5. `IPythonAction`
- **File:** `actions.ts`
- **Kind (`action`):** `"run_ipython"`
- **Source:** `"agent"`
- **Properties (`args`):**
    - `code`: string
    - `security_risk`: ActionSecurityRisk
    - `confirmation_state`: "confirmed" | "rejected" | "awaiting_confirmation"
    - `kernel_init_code`: string
    - `thought`: string

### 6. `ThinkAction`
- **File:** `actions.ts`
- **Kind (`action`):** `"think"`
- **Source:** `"agent"`
- **Properties (`args`):**
    - `thought`: string

### 7. `FinishAction`
- **File:** `actions.ts`
- **Kind (`action`):** `"finish"`
- **Source:** `"agent"`
- **Properties (`args`):**
    - `final_thought`: string
    - `task_completed`: "success" | "failure" | "partial"
    - `outputs`: Record<string, unknown>
    - `thought`: string

### 8. `DelegateAction`
- **File:** `actions.ts`
- **Kind (`action`):** `"delegate"`
- **Source:** `"agent"`
- **Properties (`args`):**
    - `agent`: "BrowsingAgent"
    - `inputs`: Record<string, string>
    - `thought`: string
- **Other Properties:**
    - `timeout`: number

### 9. `BrowseAction`
- **File:** `actions.ts`
- **Kind (`action`):** `"browse"`
- **Source:** `"agent"`
- **Properties (`args`):**
    - `url`: string
    - `thought`: string

### 10. `BrowseInteractiveAction`
- **File:** `actions.ts`
- **Kind (`action`):** `"browse_interactive"`
- **Source:** `"agent"`
- **Properties (`args`):**
    - `browser_actions`: string
    - `thought`: string | null
    - `browsergym_send_msg_to_user`: string
- **Other Properties:**
    - `timeout`: number

### 11. `FileReadAction`
- **File:** `actions.ts`
- **Kind (`action`):** `"read"`
- **Source:** `"agent"`
- **Properties (`args`):**
    - `path`: string
    - `thought`: string
    - `security_risk`: ActionSecurityRisk | null
    - `impl_source?`: string
    - `view_range?`: number[] | null

### 12. `FileWriteAction`
- **File:** `actions.ts`
- **Kind (`action`):** `"write"`
- **Source:** `"agent"`
- **Properties (`args`):**
    - `path`: string
    - `content`: string
    - `thought`: string

### 13. `FileEditAction`
- **File:** `actions.ts`
- **Kind (`action`):** `"edit"`
- **Source:** `"agent"`
- **Properties (`args`):**
    - `path`: string
    - `command?`: string
    - `file_text?`: string | null
    - `view_range?`: number[] | null
    - `old_str?`: string | null
    - `new_str?`: string | null
    - `insert_line?`: number | null
    - `content?`: string
    - `start?`: number
    - `end?`: number
    - `thought`: string
    - `security_risk`: ActionSecurityRisk | null
    - `impl_source?`: string

### 14. `RejectAction`
- **File:** `actions.ts`
- **Kind (`action`):** `"reject"`
- **Source:** `"agent"`
- **Properties (`args`):**
    - `thought`: string

### 15. `RecallAction`
- **File:** `actions.ts`
- **Kind (`action`):** `"recall"`
- **Source:** `"agent"`
- **Properties (`args`):**
    - `recall_type`: "workspace_context" | "knowledge"
    - `query`: string
    - `thought`: string

### 16. `MCPAction`
- **File:** `actions.ts`
- **Kind (`action`):** `"call_tool_mcp"`
- **Source:** `"agent"`
- **Properties (`args`):**
    - `name`: string
    - `arguments`: Record<string, unknown>
    - `thought?`: string

---

## Observations (from `observations.ts`)

### 1. `AgentStateChangeObservation`
- **File:** `observations.ts`
- **Kind (`action`):** `"agent_state_changed"`
- **Source:** `"agent"`
- **Properties (`extras`):**
    - `agent_state`: AgentState (type imported from "../agent-state")

### 2. `CommandObservation`
- **File:** `observations.ts`
- **Kind (`action`):** `"run"`
- **Source:** `"agent"`
- **Properties (`extras`):**
    - `command`: string
    - `hidden?`: boolean
    - `metadata`: Record<string, unknown>
    - `content`: string (Note: This property is typically present in the actual event data for command output, even if not explicitly in this TS interface's `extras`. It's the observation content itself.)

### 3. `IPythonObservation`
- **File:** `observations.ts`
- **Kind (`action`):** `"run_ipython"`
- **Source:** `"agent"`
- **Properties (`extras`):**
    - `code`: string
    - `image_urls?`: string[]
    - `content`: string (Note: This property is typically present for the output, similar to CommandObservation.)

### 4. `DelegateObservation`
- **File:** `observations.ts`
- **Kind (`action`):** `"delegate"`
- **Source:** `"agent"`
- **Properties (`extras`):**
    - `outputs`: Record<string, unknown>
    - `content`: string (Note: This property is typically present for the output.)


### 5. `BrowseObservation`
- **File:** `observations.ts`
- **Kind (`action`):** `"browse"`
- **Source:** `"agent"`
- **Properties (`extras`):**
    - `url`: string
    - `screenshot`: string
    - `error`: boolean
    - `open_page_urls`: string[]
    - `active_page_index`: number
    - `dom_object`: Record<string, unknown>
    - `axtree_object`: Record<string, unknown>
    - `extra_element_properties`: Record<string, unknown>
    - `last_browser_action`: string
    - `last_browser_action_error`: unknown
    - `focused_element_bid`: string
    - `content`: string (Note: This property is typically present for the observation content.)

### 6. `BrowseInteractiveObservation`
- **File:** `observations.ts`
- **Kind (`action`):** `"browse_interactive"`
- **Source:** `"agent"`
- **Properties (`extras`):**
    - (Similar to `BrowseObservation`)
    - `content`: string (Note: This property is typically present for the observation content.)

### 7. `WriteObservation`
- **File:** `observations.ts`
- **Kind (`action`):** `"write"`
- **Source:** `"agent"`
- **Properties (`extras`):**
    - `path`: string
    - `content`: string (This is the observation content itself, confirming the write.)

### 8. `ReadObservation`
- **File:** `observations.ts`
- **Kind (`action`):** `"read"`
- **Source:** `"agent"`
- **Properties (`extras`):**
    - `path`: string
    - `impl_source`: string
    - `content`: string (Note: This property is typically present with the file content.)

### 9. `EditObservation`
- **File:** `observations.ts`
- **Kind (`action`):** `"edit"`
- **Source:** `"agent"`
- **Properties (`extras`):**
    - `path`: string
    - `diff`: string
    - `impl_source`: string
    - `content`: string (Note: This property is typically present, often the diff or a confirmation.)

### 10. `ErrorObservation`
- **File:** `observations.ts`
- **Kind (`action`):** `"error"`
- **Source:** `"user"`
- **Properties (`extras`):**
    - `error_id?`: string
    - `content`: string (Note: This property is typically present with the error message.)

### 11. `AgentThinkObservation`
- **File:** `observations.ts`
- **Kind (`action`):** `"think"`
- **Source:** `"agent"`
- **Properties (`extras`):**
    - `thought`: string
    - `content`: string (Note: This property is typically present, often the thought itself.)


### 12. `RecallObservation`
- **File:** `observations.ts`
- **Kind (`action`):** `"recall"`
- **Source:** `"agent"`
- **Properties (`extras`):**
    - `recall_type?`: "workspace_context" | "knowledge"
    - `repo_name?`: string
    // ... (other recall-specific fields)
    - `content`: string (Note: This property is typically present with the recalled information.)

### 13. `MCPObservation`
- **File:** `observations.ts`
- **Kind (`action`):** `"mcp"`
- **Source:** `"agent"`
- **Properties (`extras`):**
    - `name`: string
    - `arguments`: Record<string, unknown>
    - `content`: string (Note: This property is typically present with the MCP result.)

### 14. `UserRejectedObservation`
- **File:** `observations.ts`
- **Kind (`action`):** `"user_rejected"`
- **Source:** `"agent"`
- **Properties (`extras`):** Record<string, unknown>
- **Content:** string (Note: Typically a message indicating user rejection.)

---

## Known Issues

### ✅ RESOLVED: Frontend Type Compatibility
**Issue:** The extension was using a custom interface that didn't match the frontend's proper types.

**Resolution:** Replaced custom interface with proper frontend-compatible types:
- `ActionMessage` - for agent actions (includes `id`, `source`, `action`, `args`, `message`, `timestamp`)
- `ObservationMessage` - for observations (includes `id`, `cause`, `observation`, `content`, `extras`, `message`, `timestamp`)  
- `StatusMessage` - for status updates
- `SocketMessage` - union type of the above three

**Location:** `src/shared/types/message.ts` - Now uses proper frontend types
**Status:** ✅ COMPLETED - Extension now uses frontend-compatible types

### ✅ RESOLVED: Error Handling Logic
**Issue:** How to detect errors.

**Resolution:** Fixed error handling to detect errors using frontend-compatible patterns:
- `ErrorObservation`: Check `isObservationMessage(event) && event.observation === "error"`
- `Error ID`: Check `event.extras?.error_id` for observations with error identifiers
- **Type Safety**: Created shared type guards in `src/webview/utils/typeGuards.ts`
- **Runtime Checking**: Replaced unsafe type assertions with proper runtime type checking

**Location:** 
- `src/webview/components/App.tsx` - Fixed error detection logic
- `src/webview/utils/typeGuards.ts` - Shared type guard functions
- `src/shared/types/message.ts` - ActionMessage.args now properly typed as `Record<string, string>`

**Status:** ✅ COMPLETED - Error handling with type-safe patterns

---

## Error Handling Patterns

The OpenHands system uses **3 distinct patterns** for communicating errors. Each serves a different purpose and requires different handling logic.

### 1. ErrorObservation (Formal Agent Errors)

**Type:** `ObservationMessage` with `observation: "error"`

**Detection Pattern:**
```typescript
if (isObservationMessage(event) && event.observation === "error") {
  // Handle formal error observation
}
```

**Structure:**
- `observation`: `"error"`
- `content`: string (error message)
- `extras.error_id?`: string (optional error identifier)
- `message`: string (human-readable error description)

**Purpose:** Formal error reporting when the agent system itself encounters an error.

**Source Reference:** 
- Type definition: `src/shared/types/message.ts` (ObservationMessage interface)
- Detection logic: `src/webview/components/App.tsx` lines 89-92
- Event glossary: Line 276-282 (ErrorObservation section)

### 2. Failed Operations (Observations with Error IDs)

**Type:** Any `ObservationMessage` with `extras.error_id` present

**Detection Pattern:**
```typescript
if (isObservationMessage(event) && typeof event.extras?.error_id === 'string' && event.extras.error_id) {
  // Handle operation that failed
}
```

**Structure:**
- `observation`: any observation type (e.g., "run", "read", "write")
- `extras.error_id`: string (indicates this operation failed)
- `content`: string (may contain error details or partial results)
- `message`: string (human-readable description)

**Purpose:** Indicates a specific operation (command, file read, etc.) failed, but still reports what was attempted.

**Source Reference:**
- Type definition: `src/shared/types/message.ts` lines 64-68 (ObservationMessage.extras)
- Detection logic: `src/webview/components/App.tsx` lines 95-98

### 3. System Status Errors (StatusMessage)

**Type:** `StatusMessage` 

**Detection Pattern:**
```typescript
if (isStatusMessage(event)) {
  // Handle system status update (may include errors)
}
```

**Structure:**
- `status_update`: `true`
- `type`: string (status type)
- `message`: string (status message, may indicate errors)
- `id?`: string (optional identifier)

**Purpose:** System-level status updates including connection issues, server problems, or other infrastructure errors.

**Source Reference:**
- Type definition: `src/shared/types/message.ts` lines 80-86 (StatusMessage interface)
- Type guard: `src/webview/utils/typeGuards.ts` lines 11-13
- Handling logic: `src/webview/components/App.tsx` lines 101-104

### Error Handling Implementation

**Current Implementation Location:** `src/webview/components/App.tsx` lines 87-98

**Type Guards Used:** `src/webview/utils/typeGuards.ts`
- `isObservationMessage()` - detects ObservationMessage types
- `isStatusMessage()` - detects StatusMessage types

**Error State Management:** App-level error state is set for ErrorObservation and failed operations, while StatusMessage errors are handled as status updates.
