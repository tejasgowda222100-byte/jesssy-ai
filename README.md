# JESSY AI — UBINTZE TECHNOLOGIES

JESSY AI is a multilingual assistant created by UBINTZE TECHNOLOGIES, founded by TEJAS GOWDA. The repository contains the website frontend and its FastAPI backend.

## Live web search

Enable **Search the web** below the chat box to ask JESSY AI to use current web information for that message. The option is off by default. Search uses Groq's built-in `browser_search` tool with `openai/gpt-oss-20b`; it needs no separate search service or search API key. Normal chat and language detection continue to use the existing Groq setup.

## Voice access

Tap the waveform button to enable **Hey Jessy** wake phrase access, then say “Hey Jessy, plan my trip today.” The browser needs microphone permission, and the page must remain open. Wake phrase access is off until the user enables it. The feature uses browser speech recognition and automatically turns on spoken replies; the microphone, wake phrase, and speaker controls can be turned off independently. Browser support varies; recent Chrome and Edge versions are recommended.

### Open JESSY AI with a Windows wake phrase

The browser cannot hear a wake phrase while its page is closed. On Windows, the optional `desktop/HeyJessyWake.ps1` helper uses the built-in Windows speech recognizer to open the JESSY AI website when it hears “Hey Jessy.” It listens only while the user runs the script; press Ctrl+C in its PowerShell window to stop it. The helper does not send audio to JESSY AI or a separate speech service. After the page opens, enable the page's **Hey Jessy** voice access and allow microphone permission if prompted to continue hands-free chat. Windows speech recognition must be configured for a supported language.

To start it, open PowerShell in the repository folder and run `.desktop\HeyJessyWake.ps1`. If Windows blocks local scripts, use the current PowerShell window's process-only policy with `Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned`, then run the script again. No API keys or extra provider setup are needed.

## Provider configuration

The backend reads `GROQ_API_KEY` from its environment. It never belongs in frontend files or Git. The model defaults to `openai/gpt-oss-20b`; optionally set `GROQ_MODEL` to another Groq model that supports browser search.

For local development, put the key in an ignored `.env` file at the project root. On Render, manage it in the service's **Environment** settings. Do not commit `.env` or paste the key into chat.

## Deployment

The Render web service and GitHub Pages site use the `main` branch of this repository. Pushing a commit to `main` triggers their configured deployments. The FastAPI backend serves `/`, `/style.css`, `/script.js`, `/health`, and `/chat`; the frontend also calls the existing Render API URL.

The existing Render `GROQ_API_KEY` setting remains required. No additional search credential or dependency is needed. After deployment, check `/health`, send a normal chat message, then enable **Search the web** and ask for a current fact.
