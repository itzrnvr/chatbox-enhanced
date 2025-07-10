# Gemini API Implementation Overview

This document outlines the current implementation of the Google Gemini provider within the "super-chatbox" application, including its advanced document processing capabilities.

## 1. Overview

The existing integration is designed for both **text-based chat completions** and **native document processing**. It allows users to upload files (like PDFs) directly to the Gemini API, which can then be included in prompts for a more context-aware conversational experience. The implementation is cleanly separated into two main parts: provider configuration and API interaction, both handled within the client-side renderer process.

---

## 2. Provider Configuration

The configuration and setup for the Gemini provider are handled by the `GeminiSettingUtil` class.

-   **File:** [`src/renderer/packages/model-setting-utils/gemini-setting-util.ts`](src/renderer/packages/model-setting-utils/gemini-setting-util.ts:0)
-   **Purpose:** This class is responsible for managing how the Gemini provider is presented in the application's UI and for discovering the available chat models.
-   **Key Functionality:**
    -   It instantiates the core `Gemeni` model class.
    -   It uses the `listModels()` method from the `Gemeni` class to fetch a list of available text-based models from the Gemini API, which are then displayed in the settings UI.

```typescript
// From: src/renderer/packages/model-setting-utils/gemini-setting-util.ts

const gemini = new Gemini({
  geminiAPIHost: settings.apiHost!,
  geminiAPIKey: settings.apiKey!,
  model,
  temperature: 0,
})
return gemini.listModels()
```

---

## 3. API Interaction

All direct communication with the Gemini API is managed by the `Gemeni` class (note the typo in the class name).

-   **File:** [`src/renderer/packages/models/gemini.ts`](src/renderer/packages/models/gemini.ts:0)
-   **Purpose:** This class serves as an abstraction layer over the official `@ai-sdk/google` library, adapting its functionality to the application's internal standards. It handles both text generation and file uploads.
-   **API Call Workflow:**
    1.  **File Upload:** When a user attaches a file, the new `uploadFile` method in the `Gemeni` class is called. It sends the file to the Gemini Files API and receives a URI in return.
    2.  **Chat Request:** When the user sends a prompt, the `getChatModel` method is invoked.
    3.  This method initializes the Google AI provider using `createGoogleGenerativeAI`.
    4.  It constructs the prompt payload to include both the user's text and the URIs of any uploaded files.
    5.  It then returns a `provider.chat()` instance, which handles the streaming chat completion.
    6.  All content safety settings are explicitly disabled (`threshold: 'BLOCK_NONE'`), allowing all responses from the API.

```typescript
// From: src/renderer/packages/models/gemini.ts

protected getChatModel(options: CallChatCompletionOptions): LanguageModelV1 {
  const provider = createGoogleGenerativeAI({
    apiKey: this.options.geminiAPIKey,
    baseURL: normalizeGeminiHost(this.options.geminiAPIHost).apiHost,
  })

  // Note: The actual implementation will now dynamically add fileData parts
  // to the `contents` array based on the new plan.

  return provider.chat(this.options.model.modelId, {
    structuredOutputs: false,
    safetySettings: [
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    ],
  })
}
```

---

## 4. Conclusion

The implementation now provides a solid foundation for both text-based chat and advanced document processing, following the established client-side architecture of the application.