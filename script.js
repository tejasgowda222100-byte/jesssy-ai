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
// PLACE DISCOVERY
// ==========================================

const tripSearchForm = document.getElementById("tripSearchForm");
const tripLocationInput = document.getElementById("tripLocation");
const tripOriginInput = document.getElementById("tripOrigin");
const tripCategorySelect = document.getElementById("tripCategory");
const tripStartDateInput = document.getElementById("tripStartDate");
const tripEndDateInput = document.getElementById("tripEndDate");
const tripTravellersInput = document.getElementById("tripTravellers");
const tripSearchStatus = document.getElementById("tripSearchStatus");
const tripSearchResults = document.getElementById("tripSearchResults");
const tripProviderOutput = document.getElementById("tripProviderOutput");
const tripProviderStatus = document.getElementById("tripProviderStatus");
const tripProviderResults = document.getElementById("tripProviderResults");
const tripPosterPreview = document.getElementById("tripPosterPreview");
const tripPosterDownload = document.getElementById("tripPosterDownload");
const destinationPhotoCard = document.getElementById("destinationPhotoCard");
const tripDestinationPhoto = document.getElementById("tripDestinationPhoto");
const tripDestinationPhotoCredit = document.getElementById("tripDestinationPhotoCredit");
const tripDestinationPhotoLink = document.getElementById("tripDestinationPhotoLink");
const tripPlanMode = document.getElementById("tripPlanMode");
const tripPlanSteps = document.getElementById("tripPlanSteps");
const tripPlanNotice = document.getElementById("tripPlanNotice");

const TRIP_PROVIDER_SITES = {
    flight: [
        { name: "Google Flights", domain: "google.com/travel/flights" },
        { name: "Skyscanner", domain: "skyscanner.net" },
        { name: "KAYAK", domain: "kayak.com/flights" },
        { name: "Expedia", domain: "expedia.com/Flights" }
    ],
    train: [
        { name: "Trainline", domain: "thetrainline.com" },
        { name: "Omio", domain: "omio.com" },
        { name: "Rail Europe", domain: "raileurope.com" },
        { name: "IRCTC (India)", domain: "irctc.co.in" }
    ],
    bus: [
        { name: "Busbud", domain: "busbud.com" },
        { name: "FlixBus", domain: "flixbus.com" },
        { name: "redBus", domain: "redbus.in" },
        { name: "Omio", domain: "omio.com" }
    ],
    hotel: [
        { name: "Booking.com", domain: "booking.com" },
        { name: "Agoda", domain: "agoda.com" },
        { name: "Expedia", domain: "expedia.com" }
    ],
    restaurant: [
        { name: "Google Maps", domain: "google.com/maps" },
        { name: "OpenTable", domain: "opentable.com" },
        { name: "Tripadvisor", domain: "tripadvisor.com" }
    ],
    movie: [
        { name: "BookMyShow", domain: "bookmyshow.com" },
        { name: "Ticketmaster", domain: "ticketmaster.com" },
        { name: "Fandango", domain: "fandango.com" }
    ]
};

const DESTINATION_PHOTO_CACHE = new Map();

function formatTripDate(value) {
    if (!value) return "Not selected";
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return value;
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

function renderJourneyPlan(category, origin, destination, startDate, endDate, travellers) {
    if (!tripPlanSteps || !tripPlanMode || !tripPlanNotice) return;

    const labels = {
        flight: "Flight trip",
        train: "Train trip",
        bus: "Bus trip",
        hotel: "Stay plan",
        restaurant: "Dining plan",
        movie: "Movie outing"
    };
    tripPlanMode.textContent = labels[category] || "Trip plan";
    tripPlanSteps.replaceChildren();

    const details = [];
    if (["flight", "train", "bus"].includes(category)) {
        details.push({ title: "Route", value: `${origin} → ${destination}` });
        details.push({ title: "Travel date", value: formatTripDate(startDate) });
        if (endDate) details.push({ title: "Return / end date", value: formatTripDate(endDate) });
        details.push({ title: "Passengers", value: `${travellers}` });
    } else if (category === "hotel") {
        details.push({ title: "Destination", value: destination });
        details.push({ title: "Check-in", value: formatTripDate(startDate) });
        details.push({ title: "Check-out", value: formatTripDate(endDate) });
        details.push({ title: "Guests", value: `${travellers}` });
    } else {
        details.push({ title: "Destination", value: destination });
        if (startDate) details.push({ title: "Date", value: formatTripDate(startDate) });
        details.push({ title: "People", value: `${travellers}` });
    }

    details.forEach(detail => {
        const item = document.createElement("li");
        item.textContent = `${detail.title}: ${detail.value}`;
        tripPlanSteps.append(item);
    });

    tripPlanNotice.textContent = ["flight", "train", "bus"].includes(category)
        ? "Plan built from your entries. Live departure times, delays, prices, seat availability and payment are not verified in JESSY."
        : "Plan built from your entries. Confirm opening times, availability, prices and any booking directly with the provider.";
}

async function loadDestinationPhoto(destination) {
    if (!destinationPhotoCard || !tripDestinationPhoto || !tripDestinationPhotoLink) return;
    destinationPhotoCard.hidden = true;

    const cacheKey = destination.trim().toLocaleLowerCase();
    if (!cacheKey) return;
    if (DESTINATION_PHOTO_CACHE.has(cacheKey)) {
        const cached = DESTINATION_PHOTO_CACHE.get(cacheKey);
        tripDestinationPhoto.src = cached.imageUrl;
        tripDestinationPhoto.alt = `Wikimedia Commons destination photo for ${destination}`;
        tripDestinationPhotoLink.href = cached.descriptionUrl;
        tripDestinationPhotoCredit.textContent = cached.credit;
        destinationPhotoCard.hidden = false;
        return;
    }

    const params = new URLSearchParams({
        action: "query",
        format: "json",
        origin: "*",
        generator: "search",
        gsrsearch: destination,
        gsrnamespace: "6",
        gsrlimit: "5",
        prop: "imageinfo",
        iiprop: "url|extmetadata",
        iiurlwidth: "1200"
    });

    try {
        const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`);
        if (!response.ok) return;
        const data = await response.json();
        const pages = Object.values(data.query?.pages || {});
        const candidates = pages
            .filter(page => !/\b(logo|map|flag|coat of arms)\b/i.test(page.title || ""))
            .map(page => ({ page, info: page.imageinfo?.[0] }))
            .filter(item => item.info?.thumburl && item.info?.descriptionurl);
        const selected = candidates[0];
        if (!selected) return;

        const imageUrl = new URL(selected.info.thumburl);
        const descriptionUrl = new URL(selected.info.descriptionurl);
        if (imageUrl.protocol !== "https:" || !["upload.wikimedia.org", "thumb.wikimedia.org"].includes(imageUrl.hostname)) return;
        if (descriptionUrl.protocol !== "https:" || descriptionUrl.hostname !== "commons.wikimedia.org") return;

        const metadata = selected.info.extmetadata || {};
        const artistMarkup = metadata.Artist?.value || "";
        const artist = artistMarkup
            ? new DOMParser().parseFromString(artistMarkup, "text/html").body.textContent.trim()
            : "Wikimedia Commons contributor";
        const license = metadata.LicenseShortName?.value || "license details on Wikimedia Commons";
        const credit = `Photo: ${artist.slice(0, 180)} · ${license}`;
        const photo = { imageUrl: imageUrl.href, descriptionUrl: descriptionUrl.href, credit };
        DESTINATION_PHOTO_CACHE.set(cacheKey, photo);

        tripDestinationPhoto.src = photo.imageUrl;
        tripDestinationPhoto.alt = `Wikimedia Commons photo search result for ${destination}`;
        tripDestinationPhotoLink.href = photo.descriptionUrl;
        tripDestinationPhotoCredit.textContent = credit;
        destinationPhotoCard.hidden = false;
    } catch {
        destinationPhotoCard.hidden = true;
    }
}

function createTripInspirationImage(destination) {
    if (!tripPosterPreview || !tripPosterDownload) return;

    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const context = canvas.getContext("2d");
    if (!context) return;

    const sky = context.createLinearGradient(0, 0, 1000, 630);
    sky.addColorStop(0, "#102c59");
    sky.addColorStop(0.52, "#456fa8");
    sky.addColorStop(1, "#f2a477");
    context.fillStyle = sky;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "rgba(255, 218, 150, 0.92)";
    context.beginPath();
    context.arc(940, 195, 92, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#203e66";
    context.beginPath();
    context.moveTo(0, 450);
    context.lineTo(260, 190);
    context.lineTo(460, 430);
    context.lineTo(680, 240);
    context.lineTo(950, 470);
    context.lineTo(1200, 285);
    context.lineTo(1200, 630);
    context.lineTo(0, 630);
    context.closePath();
    context.fill();

    context.fillStyle = "#177f91";
    context.beginPath();
    context.moveTo(0, 470);
    context.bezierCurveTo(280, 395, 490, 535, 760, 450);
    context.bezierCurveTo(930, 400, 1080, 430, 1200, 390);
    context.lineTo(1200, 630);
    context.lineTo(0, 630);
    context.closePath();
    context.fill();

    context.strokeStyle = "rgba(255,255,255,0.72)";
    context.lineWidth = 3;
    context.setLineDash([9, 12]);
    context.beginPath();
    context.moveTo(710, 190);
    context.bezierCurveTo(650, 245, 790, 285, 730, 335);
    context.stroke();
    context.setLineDash([]);

    context.fillStyle = "#ffffff";
    context.font = "700 21px system-ui, sans-serif";
    context.fillText("A JESSY TRIP IDEA", 78, 84);
    context.fillStyle = "rgba(255,255,255,0.82)";
    context.font = "500 17px system-ui, sans-serif";
    context.fillText("THE WORLD IS WAITING", 80, 116);

    const titleText = Array.from(destination.trim()).slice(0, 64).join("");
    const words = titleText.split(/\s+/).filter(Boolean);
    const lines = [];
    let line = "";
    context.font = "700 61px system-ui, sans-serif";
    for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (line && context.measureText(candidate).width > 710) {
            lines.push(line);
            line = word;
        } else {
            line = candidate;
        }
    }
    if (line) lines.push(line);

    context.shadowColor = "rgba(5, 14, 36, 0.4)";
    context.shadowBlur = 18;
    context.fillStyle = "#ffffff";
    lines.slice(0, 2).forEach((part, index) => {
        context.fillText(part, 80, 335 + index * 76, 720);
    });
    context.shadowBlur = 0;
    context.fillStyle = "rgba(255,255,255,0.9)";
    context.font = "500 18px system-ui, sans-serif";
    context.fillText("A little inspiration for the journey ahead", 82, 536);

    const imageUrl = canvas.toDataURL("image/png");
    tripPosterPreview.src = imageUrl;
    tripPosterDownload.href = imageUrl;
    const safeName = titleText.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "trip";
    tripPosterDownload.download = `jessy-${safeName}-postcard.png`;
}

function buildProviderQuery(category, origin, destination, startDate, endDate, travellers) {
    const route = origin ? `from ${origin} to ${destination}` : `in ${destination}`;
    const dateText = [startDate, endDate].filter(Boolean).join(" to ");
    const dates = dateText ? ` for ${dateText}` : "";
    const people = travellers === 1 ? "1 traveller" : `${travellers} travellers`;
    const searchTerms = {
        flight: `flights ${route}${dates} for ${people} book fares`,
        train: `train tickets ${route}${dates} for ${people}`,
        bus: `bus tickets ${route}${dates} for ${people}`,
        hotel: `hotel rooms ${route}${dates} for ${people} guests`,
        restaurant: `restaurants ${route}${dates}`,
        movie: `movie tickets and showtimes ${route}${dates}`
    };
    return searchTerms[category] || searchTerms.hotel;
}

function renderProviderSearchLinks(category, query) {
    if (!tripProviderResults) return;
    tripProviderResults.replaceChildren();

    for (const provider of TRIP_PROVIDER_SITES[category] || []) {
        const link = document.createElement("a");
        const searchUrl = new URL("https://www.google.com/search");
        searchUrl.searchParams.set("q", `site:${provider.domain} ${query}`);
        link.href = searchUrl.href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.className = "provider-search-link";
        link.textContent = `Find on ${provider.name} ↗`;
        tripProviderResults.append(link);
    }
}

function addPlaceLink(card, label, href) {
    if (!href) return;

    try {
        const url = new URL(href);
        if (url.protocol !== "https:") return;

        const link = document.createElement("a");
        link.href = url.href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = label;
        link.className = "place-link";
        card.append(link);
    } catch {
        // Ignore invalid provider links.
    }
}

function renderPlaceResults(data) {
    tripSearchResults.replaceChildren();

    if (!Array.isArray(data.places) || data.places.length === 0) {
        tripSearchStatus.textContent = `No ${data.category} listings were returned for ${data.location}. Try a nearby city or a broader destination.`;
        return;
    }

    tripSearchStatus.textContent = `${data.places.length} OpenStreetMap listings found near ${data.resolved_location || data.location}.`;

    data.places.forEach(place => {
        const card = document.createElement("article");
        card.className = "place-card";

        const title = document.createElement("h4");
        title.textContent = place.name || "Place";
        card.append(title);

        if (place.address) {
            const address = document.createElement("p");
            address.className = "place-address";
            address.textContent = place.address;
            card.append(address);
        }

        const details = document.createElement("p");
        details.className = "place-details";
        const detailParts = [];
        if (place.category_detail) detailParts.push(place.category_detail.replaceAll(";", ", "));
        if (place.stars) detailParts.push(`${place.stars} listed stars`);
        if (place.opening_hours) detailParts.push(`Hours: ${place.opening_hours}`);
        details.textContent = detailParts.join(" · ");
        if (detailParts.length) card.append(details);

        const links = document.createElement("div");
        links.className = "place-links";
        addPlaceLink(links, "Open in Google Maps", place.maps_url);
        addPlaceLink(links, "Venue website", place.website);
        if (links.childElementCount) card.append(links);

        tripSearchResults.append(card);
    });
}

if (tripSearchForm) {
    tripSearchForm.addEventListener("submit", async event => {
        event.preventDefault();
        const location = tripLocationInput.value.trim();
        const category = tripCategorySelect.value;
        const origin = tripOriginInput?.value.trim() || "";
        const startDate = tripStartDateInput?.value || "";
        const endDate = tripEndDateInput?.value || "";
        const travellers = Math.max(1, Math.min(9, Number(tripTravellersInput?.value) || 1));
        if (location.length < 2) {
            tripSearchStatus.textContent = "Enter a destination to search.";
            return;
        }
        if (["flight", "train", "bus"].includes(category) && origin.length < 2) {
            tripProviderStatus.textContent = "Enter a starting city for this route.";
            tripOriginInput?.focus();
            return;
        }
        if (startDate && endDate && endDate < startDate) {
            tripProviderStatus.textContent = "The end or return date must be after the start date.";
            return;
        }

        tripSearchForm.querySelector("button[type='submit']").disabled = true;
        tripSearchStatus.textContent = "";
        tripSearchResults.replaceChildren();
        tripProviderOutput.hidden = false;
        tripProviderStatus.textContent = "Preparing provider searches and your travel postcard…";
        createTripInspirationImage(location);
        renderJourneyPlan(category, origin, location, startDate, endDate, travellers);
        void loadDestinationPhoto(location);
        const providerQuery = buildProviderQuery(category, origin, location, startDate, endDate, travellers);
        renderProviderSearchLinks(category, providerQuery);
        const categoryLabel = tripCategorySelect.selectedOptions[0]?.textContent || "travel";
        tripProviderStatus.textContent = ["flight", "train", "bus"].includes(category)
            ? `Search ${categoryLabel.toLowerCase()} on these provider sites. JESSY cannot verify live times, seats or fares yet.`
            : `Search ${categoryLabel.toLowerCase()} on these provider sites. Confirm current details and checkout with the provider.`;

        if (["hotel", "restaurant"].includes(category)) {
            tripSearchStatus.textContent = "Searching basic OpenStreetMap place listings…";
            try {
                const response = await fetch(`${API_URL}/trip/places`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ location, category })
                });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.detail || "The search could not be completed.");
                }
                renderPlaceResults(data);
            } catch (error) {
                if (error.message?.includes("Destination not found")) {
                    tripSearchStatus.textContent = "Destination not found. Check the spelling or include the country.";
                } else if (error.message?.includes("busy")) {
                    tripSearchStatus.textContent = "The free map search is busy right now. Please try again shortly.";
                } else {
                    tripSearchStatus.textContent = "JESSY couldn’t reach the free map search. Provider links are still available above.";
                }
            }
        }

        if (!["hotel", "restaurant"].includes(category)) {
            tripSearchStatus.textContent = "JESSY prepared your journey plan and provider links. Live ticket inventory and in-app UPI payment are not connected.";
        }
        tripSearchForm.querySelector("button[type='submit']").disabled = false;
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
