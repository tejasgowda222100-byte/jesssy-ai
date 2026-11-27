// ==========================================
// JESSY AI - ADVANCED CHAT SYSTEM
// UBINTZE TECHNOLOGIES
// Founder: TEJAS GOWDA
// ==========================================

"use strict";

// ==========================================
// CONFIGURATION
// ==========================================

const API_URL = "https://jesssy-ai.onrender.com";
const MAX_HISTORY = 20;
const STORAGE_KEY = "jessy_ai_conversations_v1";

// ==========================================
// HTML ELEMENTS
// ==========================================

const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");

const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
const webSearchToggle = document.getElementById("webSearchToggle");

const newChatButton = document.getElementById("newChatButton");
const chatSearch = document.getElementById("chatSearch");
const exportChatButton = document.getElementById("exportChatButton");
const conversationList = document.getElementById("conversationList");

const voiceInputButton = document.getElementById("voiceInputButton");
const wakeWordButton = document.getElementById("wakeWordButton");
const voiceOutputButton = document.getElementById("voiceOutputButton");
const voiceCommandStatus = document.getElementById("voiceCommandStatus");

const yearElement = document.getElementById("year");

// ==========================================
// STATE
// ==========================================

let conversations = [];
let activeChatId = null;
let chatHistory = [];
let isSending = false;

let voiceEnabled = false;
let recognition = null;
let isListening = false;
let recognitionStarting = false;
let microphonePermissionError = false;
let recognitionMode = "dictation";
let wakeWordEnabled = false;
let wakeCommandPending = false;
let pendingDictationStart = false;
let pendingVoiceCommand = "";
let wakeRetryTimer = null;
let wakeCommandTimer = null;

const VOICE_ICONS = {
    microphone: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="9" y="3" width="6" height="12" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0M12 18v3m-4 0h8"></path></svg>',
    wake: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 10v4m4-8v12m4-15v18m4-14v10m4-7v4"></path></svg>',
    speaker: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 10v4h4l5 4V6l-5 4H4z"></path><path d="M16 9a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12"></path></svg>',
    muted: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 10v4h4l5 4V6l-5 4H4z"></path><path d="m17 9 5 6m0-6-5 6"></path></svg>'
};

// ==========================================
// INITIALIZATION
// ==========================================

if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
}

const previewLabel = document.querySelector(".preview-label");

if (previewLabel) {
    previewLabel.textContent = "LIVE AI";
}

const chatStatus = document.querySelector(".chat-top small");

if (chatStatus) {
    chatStatus.innerHTML =
        '<span class="tiny-dot"></span> Groq AI Connected';
}

const chatNote = document.querySelector(".chat-note");

if (chatNote) {
    chatNote.textContent =
        "Powered by JESSY AI · UBINTZE TECHNOLOGIES";
}

const demoDescription =
    document.querySelector("#demo .section-heading p");

if (demoDescription) {
    demoDescription.textContent =
        "Chat with JESSY AI, your intelligent AI assistant.";
}

// ==========================================
// MOBILE NAVIGATION
// ==========================================

if (menuButton && nav) {

    menuButton.addEventListener("click", () => {

        const isOpen = nav.classList.toggle("open");

        menuButton.setAttribute(
            "aria-expanded",
            String(isOpen)
        );
    });

    nav.querySelectorAll("a").forEach(link => {

        link.addEventListener("click", () => {

            nav.classList.remove("open");

            menuButton.setAttribute(
                "aria-expanded",
                "false"
            );
        });
    });
}

// ==========================================
// MARKDOWN
// ==========================================

if (window.marked) {

    window.marked.setOptions({
        breaks: true,
        gfm: true
    });
}

// ==========================================
// WELCOME MESSAGE
// ==========================================

function showWelcomeMessage() {

    if (!chatMessages) return;

    chatMessages.replaceChildren();

    const welcome = document.createElement("div");

    welcome.className = "message assistant";

    welcome.textContent =
        "Hi! I'm JESSY AI. Ask me what you'd like to learn, create or build.";

    chatMessages.appendChild(welcome);
}

// ==========================================
// SAVE CONVERSATIONS
// ==========================================

function saveConversations() {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(conversations)
        );

    } catch (error) {

        console.error(
            "Unable to save conversations:",
            error
        );
    }
}

// ==========================================
// LOAD CONVERSATIONS
// ==========================================

function loadConversations() {

    try {

        const saved = localStorage.getItem(STORAGE_KEY);

        const parsed = saved ? JSON.parse(saved) : [];

        conversations = Array.isArray(parsed)
            ? parsed.filter(chat =>
                chat &&
                typeof chat.id === "string" &&
                Array.isArray(chat.messages)
            )
            : [];

    } catch (error) {

        console.error(
            "Unable to load conversations:",
            error
        );

        conversations = [];
    }

    if (conversations.length === 0) {

        createNewChat();

        return;
    }

    conversations.sort(
        (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
    );

    activeChatId = conversations[0].id;

    renderConversations();

    openConversation(activeChatId);
}

// ==========================================
// CREATE NEW CHAT
// ==========================================

function createNewChat() {

    if (isSending) return;

    const conversation = {

        id: Date.now().toString() +
            Math.random().toString(36).slice(2),

        title: "New Chat",

        messages: [],

        updatedAt: Date.now()
    };

    conversations.unshift(conversation);

    activeChatId = conversation.id;

    chatHistory = [];

    saveConversations();

    renderConversations();

    showWelcomeMessage();

    if (chatInput) {
        chatInput.focus();
    }
}

if (newChatButton) {

    newChatButton.addEventListener(
        "click",
        createNewChat
    );
}

// ==========================================
// OPEN CONVERSATION
// ==========================================

function openConversation(id) {

    if (isSending) return;

    const conversation = conversations.find(
        chat => chat.id === id
    );

    if (!conversation) return;

    activeChatId = id;

    chatHistory = conversation.messages.slice(-MAX_HISTORY);

    if (chatMessages) {

        chatMessages.replaceChildren();

        if (conversation.messages.length === 0) {

            showWelcomeMessage();

        } else {

            conversation.messages.forEach(message => {

                addMessage(
                    message.content,
                    message.role
                );
            });
        }
    }

    renderConversations();

    if (chatInput) {
        chatInput.focus();
    }
}

// ==========================================
// RENDER CONVERSATIONS
// ==========================================

function renderConversations() {

    if (!conversationList) return;

    conversationList.replaceChildren();

    const searchTerm = chatSearch
        ? chatSearch.value.trim().toLowerCase()
        : "";

    conversations.sort(
        (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
    );

    const filteredConversations = conversations.filter(chat => {

        const titleMatch = String(chat.title || "")
            .toLowerCase()
            .includes(searchTerm);

        const messageMatch = chat.messages.some(message =>
            String(message.content || "")
                .toLowerCase()
                .includes(searchTerm)
        );

        return titleMatch || messageMatch;
    });

    filteredConversations.forEach(conversation => {

        const item = document.createElement("div");

        item.className = "conversation-item";

        if (conversation.id === activeChatId) {
            item.classList.add("active");
        }

        const title = document.createElement("button");

        title.type = "button";
        title.className = "conversation-title";

        title.textContent =
            conversation.title || "New Chat";

        title.title =
            conversation.title || "New Chat";

        title.addEventListener("click", () => {
            openConversation(conversation.id);
        });

        const actions = document.createElement("div");

        actions.className = "conversation-actions";

        const renameButton = document.createElement("button");

        renameButton.type = "button";
        renameButton.textContent = "✎";
        renameButton.title = "Rename conversation";

        renameButton.setAttribute(
            "aria-label",
            "Rename conversation"
        );

        renameButton.addEventListener("click", () => {
            renameConversation(conversation.id);
        });

        const deleteButton = document.createElement("button");

        deleteButton.type = "button";
        deleteButton.textContent = "×";
        deleteButton.title = "Delete conversation";

        deleteButton.setAttribute(
            "aria-label",
            "Delete conversation"
        );

        deleteButton.addEventListener("click", () => {
            deleteConversation(conversation.id);
        });

        actions.append(renameButton, deleteButton);

        item.append(title, actions);

        conversationList.appendChild(item);
    });

    if (filteredConversations.length === 0) {

        const empty = document.createElement("p");

        empty.textContent = "No conversations found.";

        empty.style.color = "#8494ad";
        empty.style.fontSize = "12px";

        conversationList.appendChild(empty);
    }
}

// ==========================================
// RENAME CONVERSATION
// ==========================================

function renameConversation(id) {

    if (isSending) return;

    const conversation = conversations.find(
        chat => chat.id === id
    );

    if (!conversation) return;

    const newTitle = prompt(
        "Enter a new conversation name:",
        conversation.title
    );

    if (newTitle === null) return;

    const cleanedTitle = newTitle.trim();

    if (!cleanedTitle) {

        alert("Please enter a valid name.");

        return;
    }

    conversation.title = cleanedTitle.slice(0, 60);

    conversation.updatedAt = Date.now();

    saveConversations();

    renderConversations();
}

// ==========================================
// DELETE CONVERSATION
// ==========================================

function deleteConversation(id) {

    if (isSending) return;

    const confirmed = confirm(
        "Are you sure you want to delete this conversation?"
    );

    if (!confirmed) return;

    conversations = conversations.filter(
        chat => chat.id !== id
    );

    if (activeChatId === id) {

        activeChatId = null;

        chatHistory = [];
    }

    saveConversations();

    if (conversations.length === 0) {

        createNewChat();

    } else if (!activeChatId) {

        openConversation(conversations[0].id);

    } else {

        renderConversations();
    }
}

// ==========================================
// COPY CODE
// ==========================================

async function copyCode(code, button) {

    try {

        await navigator.clipboard.writeText(code);

        button.textContent = "Copied!";

    } catch (error) {

        console.error("Copy failed:", error);

        const textarea = document.createElement("textarea");

        textarea.value = code;

        textarea.style.position = "fixed";
        textarea.style.opacity = "0";

        document.body.appendChild(textarea);

        textarea.select();

        try {

            const successful =
                document.execCommand("copy");

            button.textContent =
                successful ? "Copied!" : "Failed";

        } catch (fallbackError) {

            console.error(fallbackError);

            button.textContent = "Failed";
        }

        textarea.remove();
    }

    setTimeout(() => {

        button.textContent = "Copy";

    }, 2000);
}

// ==========================================
// FORMAT CODE BLOCKS
// ==========================================

function formatCodeBlocks(message) {

    message.querySelectorAll("pre code").forEach(block => {

        if (window.hljs) {
            window.hljs.highlightElement(block);
        }
    });

    message.querySelectorAll("pre").forEach(pre => {

        if (pre.querySelector(".copy-code-btn")) return;

        const code = pre.querySelector("code");

        if (!code) return;

        const button = document.createElement("button");

        button.type = "button";
        button.className = "copy-code-btn";
        button.textContent = "Copy";

        button.addEventListener("click", () => {

            copyCode(
                code.innerText,
                button
            );
        });

        pre.appendChild(button);
    });
}

// ==========================================
// DISPLAY MESSAGES
// ==========================================

function addMessage(text, sender) {

    if (!chatMessages) return null;

    const message = document.createElement("div");

    message.className = `message ${sender}`;

    const content = String(text ?? "");

    if (
        sender === "assistant" &&
        window.marked &&
        window.DOMPurify
    ) {

        const html = window.marked.parse(content);

        message.innerHTML =
            window.DOMPurify.sanitize(html);

        formatCodeBlocks(message);

    } else {

        message.textContent = content;
    }

    chatMessages.appendChild(message);

    chatMessages.scrollTop =
        chatMessages.scrollHeight;

    return message;
}

// ==========================================
// LOADING MESSAGE
// ==========================================

function showLoadingMessage() {

    const loading = document.createElement("div");

    loading.className = "message assistant loading";

    loading.textContent = "JESSY AI is thinking...";

    chatMessages.appendChild(loading);

    chatMessages.scrollTop =
        chatMessages.scrollHeight;

    return loading;
}

// ==========================================
// UPDATE CONVERSATION TITLE
// ==========================================

function updateConversationTitle(conversation, text) {

    if (conversation.title === "New Chat") {

        conversation.title = text.trim().slice(0, 35);

        if (text.length > 35) {
            conversation.title += "...";
        }
    }

    conversation.updatedAt = Date.now();
}

// ==========================================
// VOICE OUTPUT FUNCTION
// ==========================================

function speakReply(text) {

    if (
        !voiceEnabled ||
        !("speechSynthesis" in window)
    ) {
        return;
    }

    window.speechSynthesis.cancel();

    const cleanText = String(text)
        .replace(/```[\s\S]*?```/g, " Code block omitted. ")
        .replace(/[*#`_~]/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

    const speech =
        new SpeechSynthesisUtterance(cleanText);

    speech.lang = "en-IN";
    speech.rate = 1;
    speech.pitch = 1;

    window.speechSynthesis.speak(speech);
}

// ==========================================
// SEND MESSAGE
// ==========================================

async function sendMessage(text) {

    if (!text || !text.trim() || isSending) return;

    if (
        wakeWordEnabled &&
        isListening &&
        recognitionMode === "wake"
    ) {
        recognition.stop();
    }

    if (!chatMessages || !chatInput) {

        console.error("Chat elements missing.");

        return;
    }

    if (!activeChatId) {
        createNewChat();
    }

    const conversation = conversations.find(
        chat => chat.id === activeChatId
    );

    if (!conversation) return;

    isSending = true;

    const sendButton = chatForm
        ? chatForm.querySelector('button[type="submit"]')
        : null;

    addMessage(text, "user");

    chatInput.value = "";

    chatInput.disabled = true;

    if (sendButton) {
        sendButton.disabled = true;
    }

    const loadingMessage = showLoadingMessage();

    try {

        const response = await fetch(
            `${API_URL}/chat`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    message: text,
                    history: chatHistory,
                    language: "auto",
                    web_search: Boolean(webSearchToggle?.checked)
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {

            throw new Error(
                typeof data.detail === "string"
                    ? data.detail
                    : `Server error: ${response.status}`
            );
        }

        if (!data.reply) {

            throw new Error(
                "JESSY AI returned an empty response."
            );
        }

        loadingMessage.remove();

        addMessage(data.reply, "assistant");

        speakReply(data.reply);

        const userMessage = {
            role: "user",
            content: text
        };

        const assistantMessage = {
            role: "assistant",
            content: data.reply
        };

        chatHistory.push(
            userMessage,
            assistantMessage
        );

        chatHistory = chatHistory.slice(-MAX_HISTORY);

        conversation.messages.push(
            userMessage,
            assistantMessage
        );

        conversation.messages =
            conversation.messages.slice(-MAX_HISTORY);

        updateConversationTitle(
            conversation,
            text
        );

        saveConversations();

        renderConversations();

        console.log("JESSY AI response received.");

        console.log("AI Provider:", data.provider);

    } catch (error) {

        console.error("JESSY AI Error:", error);

        if (loadingMessage) {
            loadingMessage.remove();
        }

        let errorMessage;

        if (error instanceof TypeError) {

            errorMessage =
                "Unable to connect to JESSY AI. Please check your internet connection.";

        } else {

            errorMessage =
                error.message || "Something went wrong.";
        }

        addMessage(
            "Sorry! " + errorMessage,
            "assistant"
        );

    } finally {

        isSending = false;

        chatInput.disabled = false;

        if (sendButton) {
            sendButton.disabled = false;
        }

        chatInput.focus();

        if (wakeWordEnabled) {
            scheduleWakeWordRestart(600);
        }
    }
}

// ==========================================
// CHAT FORM + ENTER KEY
// ==========================================

if (chatForm && chatInput) {

    chatForm.addEventListener("submit", event => {

        event.preventDefault();

        const message = chatInput.value.trim();

        if (message && !isSending) {
            sendMessage(message);
        }
    });

    chatInput.addEventListener("keydown", event => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            if (!isSending) {
                chatForm.requestSubmit();
            }
        }
    });
}

// ==========================================
// VOICE INPUT
// ==========================================

const SpeechRecognitionAPI =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

function setVoiceCommandStatus(message) {
    if (voiceCommandStatus) {
        voiceCommandStatus.textContent = message;
    }
}

function updateVoiceOutputButton() {
    if (!voiceOutputButton) return;

    voiceOutputButton.innerHTML =
        voiceEnabled ? VOICE_ICONS.muted : VOICE_ICONS.speaker;
    voiceOutputButton.classList.toggle("is-active", voiceEnabled);
    voiceOutputButton.setAttribute("aria-pressed", String(voiceEnabled));
    voiceOutputButton.setAttribute(
        "aria-label",
        voiceEnabled ? "Turn off voice responses" : "Enable voice responses"
    );
    voiceOutputButton.title = voiceEnabled
        ? "Turn off voice responses"
        : "Enable voice responses";
}

function updateWakeWordButton() {
    if (!wakeWordButton) return;

    wakeWordButton.classList.toggle("is-active", wakeWordEnabled);
    wakeWordButton.setAttribute("aria-pressed", String(wakeWordEnabled));
    wakeWordButton.setAttribute(
        "aria-label",
        wakeWordEnabled
            ? "Turn off Hey Jessy voice access"
            : "Enable Hey Jessy voice access"
    );
    wakeWordButton.title = wakeWordEnabled
        ? "Turn off Hey Jessy voice access"
        : "Enable Hey Jessy voice access";
}

function startSpeechRecognition(mode) {
    if (
        !recognition ||
        isListening ||
        recognitionStarting ||
        isSending
    ) {
        return;
    }

    recognitionMode = mode;
    recognition.continuous = mode === "wake";
    recognition.interimResults = mode === "wake";
    recognitionStarting = true;
    microphonePermissionError = false;

    try {
        recognition.start();
    } catch (error) {
        recognitionStarting = false;

        if (error.name !== "InvalidStateError") {
            console.error("Voice recognition could not start:", error);
            setVoiceCommandStatus(
                "Microphone could not start. Check browser microphone permission."
            );
        }
    }
}

function scheduleWakeWordRestart(delay = 700) {
    if (!wakeWordEnabled) return;

    window.clearTimeout(wakeRetryTimer);
    wakeRetryTimer = window.setTimeout(() => {
        startSpeechRecognition("wake");
    }, delay);
}

function handleWakeWordTranscript(spokenText) {
    const wakeMatch = /\b(?:hey|okay|ok)[\s,.'-]+jess(?:y|ie|e|i)\b/i.exec(spokenText);

    if (!wakeMatch) {
        if (!wakeCommandPending) return;

        const followUpCommand = spokenText.trim();
        if (!followUpCommand) return;

        wakeCommandPending = false;
        window.clearTimeout(wakeCommandTimer);
        pendingVoiceCommand = followUpCommand;
        setVoiceCommandStatus("Heard you. JESSY is preparing a reply.");

        if (isListening) {
            recognition.stop();
        }
        return;
    }

    const command = spokenText
        .slice(wakeMatch.index + wakeMatch[0].length)
        .replace(/^[\s,.:;!?-]+/, "")
        .trim();

    if (!command) {
        wakeCommandPending = true;
        window.clearTimeout(wakeCommandTimer);
        wakeCommandTimer = window.setTimeout(() => {
            wakeCommandPending = false;
        }, 12000);
        setVoiceCommandStatus("Hey Jessy heard. Say your request now.");
        return;
    }

    wakeCommandPending = false;
    window.clearTimeout(wakeCommandTimer);
    pendingVoiceCommand = command;
    setVoiceCommandStatus("Heard you. JESSY is preparing a reply.");

    if (isListening) {
        recognition.stop();
    }
}

if (SpeechRecognitionAPI) {
    recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-IN";

    if (voiceInputButton) {
        voiceInputButton.innerHTML = VOICE_ICONS.microphone;

        voiceInputButton.addEventListener("click", () => {
            window.clearTimeout(wakeRetryTimer);

            if (isListening) {
                if (recognitionMode === "wake") {
                    pendingDictationStart = true;
                    setVoiceCommandStatus("Switching to voice dictation...");
                }

                recognition.stop();
                return;
            }

            startSpeechRecognition("dictation");
        });
    }

    if (wakeWordButton) {
        wakeWordButton.innerHTML = VOICE_ICONS.wake;
        wakeWordButton.addEventListener("click", () => {
            wakeWordEnabled = !wakeWordEnabled;
            updateWakeWordButton();

            if (wakeWordEnabled) {
                voiceEnabled = true;
                updateVoiceOutputButton();
                setVoiceCommandStatus(
                    'Wake phrase on. Your browser is listening for “Hey Jessy”.'
                );

                if (!isListening && !recognitionStarting) {
                    startSpeechRecognition("wake");
                }
            } else {
                window.clearTimeout(wakeRetryTimer);
                window.clearTimeout(wakeCommandTimer);
                wakeCommandPending = false;
                setVoiceCommandStatus(
                    'Wake phrase off. Tap the microphone or enable “Hey Jessy” access.'
                );

                if (isListening && recognitionMode === "wake") {
                    recognition.stop();
                }
            }
        });
    }

    recognition.onstart = () => {
        recognitionStarting = false;
        isListening = true;

        if (recognitionMode === "dictation") {
            voiceInputButton?.classList.add("is-active");
            setVoiceCommandStatus("Listening. Speak your message.");
        } else {
            setVoiceCommandStatus(
                'Wake phrase on. Your browser is listening for “Hey Jessy”.'
            );
        }
    };

    recognition.onresult = event => {
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
            const result = event.results[index];
            if (!result.isFinal) continue;

            const spokenText = result[0].transcript.trim();

            if (recognitionMode === "wake") {
                handleWakeWordTranscript(spokenText);
            } else if (chatInput) {
                chatInput.value = spokenText;
                chatInput.focus();
                setVoiceCommandStatus("Voice message ready. Review it, then send.");
            }
        }
    };

    recognition.onerror = event => {
        recognitionStarting = false;
        console.error("Speech recognition error:", event.error);

        if (["not-allowed", "service-not-allowed", "audio-capture"].includes(event.error)) {
            microphonePermissionError = true;
            wakeWordEnabled = false;
            updateWakeWordButton();
            setVoiceCommandStatus(
                "Microphone access is blocked. Allow it in browser settings, then try again."
            );
        }
    };

    recognition.onend = () => {
        isListening = false;
        recognitionStarting = false;
        voiceInputButton?.classList.remove("is-active");

        if (pendingVoiceCommand) {
            const command = pendingVoiceCommand;
            pendingVoiceCommand = "";
            sendMessage(command);
            return;
        }

        if (pendingDictationStart) {
            pendingDictationStart = false;
            startSpeechRecognition("dictation");
            return;
        }

        if (microphonePermissionError) {
            microphonePermissionError = false;
            return;
        }

        if (wakeWordEnabled) {
            scheduleWakeWordRestart();
        } else if (recognitionMode === "dictation") {
            setVoiceCommandStatus(
                'Enable voice command to let your browser listen for “Hey Jessy” while this page is open.'
            );
        }
    };
} else {
    if (voiceInputButton) {
        voiceInputButton.disabled = true;
        voiceInputButton.title = "Voice recognition is not supported in this browser.";
    }

    if (wakeWordButton) {
        wakeWordButton.disabled = true;
        wakeWordButton.title = "Wake phrase is not supported in this browser.";
    }

    setVoiceCommandStatus(
        "Voice recognition is not supported in this browser. Try a recent version of Chrome or Edge."
    );
}

if (voiceOutputButton) {
    updateVoiceOutputButton();

    voiceOutputButton.addEventListener("click", () => {
        voiceEnabled = !voiceEnabled;
        updateVoiceOutputButton();

        if (!voiceEnabled && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    });
}

// ==========================================
// CHAT SEARCH
// ==========================================

if (chatSearch) {

    chatSearch.addEventListener("input", () => {

        renderConversations();
    });
}

// ==========================================
// EXPORT CURRENT CONVERSATION
// ==========================================

if (exportChatButton) {

    exportChatButton.addEventListener("click", () => {

        const conversation = conversations.find(
            chat => chat.id === activeChatId
        );

        if (!conversation) {

            alert(
                "Please select a conversation first."
            );

            return;
        }

        if (
            !conversation.messages ||
            conversation.messages.length === 0
        ) {

            alert(
                "No messages available to export."
            );

            return;
        }

        let content = "JESSY AI CONVERSATION\n";

        content +=
            "UBINTZE TECHNOLOGIES\n";

        content +=
            "====================================\n\n";

        content +=
            "Title: " + conversation.title + "\n";

        content +=
            "Date: " + new Date().toLocaleString() + "\n\n";

        conversation.messages.forEach(message => {

            const role = message.role === "user"
                ? "YOU"
                : "JESSY AI";

            content += role + ":\n";

            content += message.content + "\n\n";
        });

        try {

            const blob = new Blob(
                [content],
                {
                    type: "text/plain;charset=utf-8"
                }
            );

            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");

            link.href = url;

            link.download =
                "JESSY_AI_Conversation.txt";

            document.body.appendChild(link);

            link.click();

            link.remove();

            setTimeout(() => {

                URL.revokeObjectURL(url);

            }, 2000);

            console.log(
                "Conversation exported."
            );

        } catch (error) {

            console.error(
                "Export error:",
                error
            );

            alert(
                "Export failed. Please try again."
            );
        }
    });
}

// ==========================================
// START JESSY AI
// ==========================================

loadConversations();

console.log("--------------------------------");
console.log("JESSY AI Advanced Chat Ready!");
console.log("Developer: UBINTZE TECHNOLOGIES");
console.log("Founder: TEJAS GOWDA");
console.log("AI Provider: Groq");
console.log("Model: GPT-OSS-20B");
console.log("Conversation History: Enabled");
console.log("Search: Enabled");
console.log("Rename Chat: Enabled");
console.log("Delete Chat: Enabled");
console.log("Export: Enabled");
console.log("Voice Input: Enabled when supported");
console.log("Voice Output: Enabled");
console.log("Local Storage: Enabled");
console.log("Backend:", API_URL);
console.log("--------------------------------");
