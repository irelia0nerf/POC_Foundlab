
# Changelog

All notable changes to the "FoundLab IA Lobby" project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.5] - YYYY-MM-DD
*Actual date to be filled upon release*

### Added
- **Conversation Summarization (`FV12_SUMMARIZE`)**:
    - A "Sumarizar Conversa" button is now available in the interaction header when an AI chat is active.
    - Clicking this button triggers the active AI to generate a summary of the current chat history (from `localStorage`).
    - The summary is streamed and displayed directly in the chat log, clearly marked with a "Resumo da Conversa" prefix and distinct styling. Summaries are *not* saved to the persistent `localStorage` chat history to avoid clutter and recursive summarization.
    - The summarization process uses the same model as the active AI.
    - Relevant interactions (request and reception of summary) are logged via `logInteraction` (`summary request`, `summary received`).
- **Additional Export Formats (Markdown & PDF) (`FV12_EXPORT_PLUS`)**:
    - Expanded export functionality beyond JSON for the active AI's chat history from `localStorage`.
    - "Exportar MD" button: Allows users to download the chat history as a Markdown (`.md`) file. HTML tags in messages are converted/stripped for plain Markdown.
    - "Exportar PDF" button: Allows users to download the chat history as a PDF (`.pdf`) file. PDF generation is handled client-side using `jsPDF`, with basic formatting for readability. HTML tags are converted/stripped.
    - The existing "Exportar Histórico" button is now explicitly "Exportar JSON".
    - Export actions are logged via `logInteraction`, specifying the format and number of messages.
- **UI Enhancements for New Actions**:
    - The interaction header now includes the "Sumarizar Conversa" button and grouped export buttons (JSON, MD, PDF).
    - CSS styles updated to accommodate these new buttons and ensure a consistent look and feel.
    - Specific styling for summary messages in the chat log to differentiate them.

### Changed
- **`index.html`**: Updated to include new buttons in the `interaction-header`.
- **`index.css`**: Added styles for the new summarization and export buttons, and for summary messages. Grouped export buttons are styled. Responsive adjustments for new header buttons.
- **`index.tsx`**:
    - Implemented logic for `summarizeChatButton` event listener, including forming the summarization prompt from chat history and making an API call via `generateContentStream`.
    - Implemented `exportHistoryMdButton` and `exportHistoryPdfButton` event listeners, including text processing for Markdown and PDF document construction with `jsPDF`.
    - Updated `logInteraction` types to include `'summary request'`, `'summary received'`. Export logs now include message count.
    - Refined `ChatMessage` interface with `'summary'` sender type and updated `appendMessageToChatLog` and `displayStoredMessage` to handle it.
    - Ensured custom prompt user inputs are saved to history and displayed correctly before the AI response.
- **Improved PDF Export**: Refined PDF text formatting, including sender/timestamp display and basic line/page break handling for better readability.
- **Improved Markdown Export**: Basic HTML stripping from messages for cleaner Markdown output.

### Fixed
- Ensured that when a custom prompt is executed, the user's prompt text is first saved to history and displayed as a user message before the AI's response is processed.
- Buttons for summarization and PDF export are disabled during their respective operations to prevent multiple clicks and provide user feedback.

## [1.2.0] - YYYY-MM-DD 
*Actual date to be filled upon release*

### Added
- **Persistent Chat History (localStorage)**:
    - Chat conversations with each AI are now saved to the browser's `localStorage`.
    - When an AI is activated, its previous chat history is loaded and displayed.
    - History includes user messages, AI responses, timestamps, and context (e.g., if it was a custom prompt response).
    - History is capped at `MAX_HISTORY_ITEMS` (currently 100) messages per AI to manage storage.
- **Custom Prompt Templates (localStorage)**:
    - Users can now save and reuse custom prompts for each AI.
    - An AI card now includes:
        - A `select` dropdown to choose from saved templates for that AI. Selecting a template populates the "Custom Prompt" textarea.
        - A "Salvar Template" button that saves the current content of the "Custom Prompt" textarea under a user-provided name.
    - Templates are stored per AI in `localStorage`.
- **Export Chat History (.json)**:
    - An "Exportar Histórico" (now "Exportar JSON") button is now available in the chat interaction header when an AI is active.
    - Clicking this button allows the user to download the complete `localStorage` chat history for the currently active AI as a JSON file.
- **File Upload UI Placeholder**:
    - A UI section for file uploading (label and disabled file input) has been added to the chat interaction area.
    - This is a visual placeholder for a future feature; file processing logic is not yet implemented.
    - The UI elements are shown when a chat is active.

### Changed
- **`activateAI` Logic**: Modified to load and display stored chat history from `localStorage` when an AI is activated.
- **`appendMessageToChatLog` Logic**: Now also saves the message object (text, sender, timestamp, etc.) to `localStorage` for the active AI.
- **`renderAICard`**: Updated to include the new UI elements for prompt template management (dropdown, save button) and their associated event listeners.
- **UI Styling**: `index.css` updated to style new elements like template controls, export button, and file upload area, maintaining the institutional look and feel.
- **Console Logging**: `logInteraction` types were refined for clarity.
- **Initialization**: If an AI is loaded via URL parameter (`?ia=...`), it is now automatically activated.

### Fixed
- Improved handling of message display during streaming to correctly associate with the active AI for history saving.
- Ensured custom prompt executions (both user input and AI response) are also saved to the respective AI's chat history in `localStorage`.

## [1.1.0] - YYYY-MM-DD 
*Actual date to be filled upon release*

### Added
- **External AI Profiles**: AI agent configurations (ID, name, role, prompt, model) are now loaded from an external `aiProfiles.json` file, making them easier to manage and update without code changes.
- **Custom Prompt Execution**:
    - Each AI card now includes a `textarea` for users to input a custom prompt.
    - An "Executar Prompt Customizado" button allows users to send this custom prompt directly to the selected AI for a one-time execution.
    - The custom prompt, if provided, overrides the base prompt for this specific execution.
    - Responses from custom prompts are displayed in the main interaction area, clearly marked.
    - This feature does not interfere with ongoing chat sessions initiated by "Ativar IA".
- **Interaction Logging (Client-Side)**:
    - Basic logging of key interactions to the browser's developer console.
    - Logged events include:
        - AI activation for chat (type: `base chat activation`), including the AI's ID/name and the base prompt used.
        - Custom prompt execution (type: `custom prompt execution`), including the AI's ID/name and the custom prompt sent.
        - Custom prompt response (type: `custom prompt response`), including the AI's ID/name and a snippet of the response.
    - Each log entry includes a timestamp.
- **URL Parameter for Specific AI**:
    - The application now supports loading a specific AI profile directly via a URL parameter (e.g., `?ia=fernanda` or `?ia=ops-fernanda`).
    - If a valid `ia` parameter (matching an AI's `fullName` (case-insensitive) or `id`) is provided, only the card for that AI will be displayed.
    - If the parameter is missing or invalid, all AI profiles are loaded as usual.
- **Enhanced UI Feedback**:
    - Clearer distinction on buttons (e.g., "Ativar IA (Chat)").
    - Visual feedback (temporary border change) on custom prompt textarea if "Executar Customizado" is clicked with an empty prompt.

### Changed
- **Card Layout**: AI cards were updated to include the new custom prompt `textarea` and "Executar Prompt Customizado" button, maintaining a responsive and institutional design.
- **Button Grouping**: Action buttons within cards ("Ativar IA", "Executar Customizado") are grouped for better visual organization.
- **Error Handling**: Improved error messages for issues related to loading `aiProfiles.json` or invalid URL parameters.
- **Code Structure**:
    - `index.tsx` refactored to support new functionalities, including fetching external JSON, handling new UI elements and their events, and managing one-off API calls for custom prompts separately from chat sessions.

### Fixed
- Minor adjustments to UI element states (e.g., disabling/enabling buttons) for consistency during different operations.

## [1.0.0] - YYYY-MM-DD
*Actual date to be filled upon release*

### Added
- Initial FoundLab IA Lobby interface.
- 5 AI agent cards: Gemini Founder (Alex), Gemini DevCore (Patrick), Gemini Capital (Nicolas), Gemini Ops (Fernanda), Gemini Bridge (Raíssa).
- Each card displays IA name, role, and base prompt snippet.
- "Ativar IA" button on each card initiates a chat session with the selected AI using its base prompt as a system instruction.
- Real-time streaming of AI responses in a dedicated chat log area.
- Ability to send messages to the active AI.
- "Encerrar Chat" functionality to reset the chat interface.
- Responsive design with an institutional dark theme.
- Loading indicators and error message display.
- Basic Markdown rendering for AI responses (bold, italic, code blocks).
- API key handling from environment variables.
