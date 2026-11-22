// ======================================
// JESSY AI - GROQ CONNECTED VOICE JAVASCRIPT
// Developed by UBINTZE TECHNOLOGIES
// ======================================


// ======================================
// CONFIGURATION
// ======================================

const API_URL = "https://jesssy-ai.onrender.com";

const STORAGE_KEY = "jessy-ai-conversations-v1";


// ======================================
// HTML ELEMENTS
// ======================================

const chatArea = document.getElementById("chatArea");
const userInput = document.getElementById("userInput");
const sendButton = document.querySelector(".send-button");
const conversationList = document.getElementById("conversationList");
const newChatButton = document.querySelector(".new-chat");

const voiceButton = document.getElementById("voiceButton");
const voiceOutputButton = document.getElementById("voiceOutputButton");
const voiceStatus = document.getElementById("voiceStatus");

const welcomeElement = document.getElementById("welcome");

const welcomeTemplate = welcomeElement
    ? welcomeElement.cloneNode(true)
    : null;


// ======================================
// APPLICATION STATE
// ======================================

let conversations = loadConversations();

let currentConversationId = null;

let voiceEnabled = false;

let recognition = null;

let isListening = false;


// ======================================
// SPEECH RECOGNITION
// ======================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

if (SpeechRecognition) {

    recognition = new SpeechRecognition();

    recognition.continuous = false;

    recognition.interimResults = false;

    recognition.lang = "en-IN";

    recognition.onstart = function () {

        isListening = true;

        if (voiceButton) {
            voiceButton.classList.add("listening");
            voiceButton.textContent = "🔴";
        }

        if (voiceStatus) {
            voiceStatus.textContent = "Listening... Speak now.";
        }

    };

    recognition.onresult = function (event) {

        const transcript =
            event.results[0][0].transcript;

        userInput.value = transcript;

        if (voiceStatus) {
            voiceStatus.textContent =
                "Recognized: " + transcript;
        }

        sendMessage();

    };

    recognition.onerror = function (event) {

        console.error("Voice error:", event.error);

        if (voiceStatus) {
            voiceStatus.textContent =
                "Voice error: " + event.error;
        }

    };

    recognition.onend = function () {

        isListening = false;

        if (voiceButton) {
            voiceButton.classList.remove("listening");
            voiceButton.textContent = "🎤";
        }

        if (
            voiceStatus &&
            !voiceStatus.textContent.startsWith("Recognized:")
        ) {
            voiceStatus.textContent =
                "Voice input available";
        }

    };

}


// ======================================
// INITIALIZATION
// ======================================

renderConversationList();

console.log("JESSY AI loaded successfully.");

console.log("AI Provider: Groq");

console.log("AI Model: GPT-OSS-20B");

console.log("Backend:", API_URL);


// ======================================
// LOAD CHAT HISTORY
// ======================================

function loadConversations() {

    try {

        const saved = JSON.parse(
            localStorage.getItem(STORAGE_KEY) || "[]"
        );

        return Array.isArray(saved)
            ? saved.filter(item =>
                item &&
                typeof item.id === "string" &&
                Array.isArray(item.messages)
            )
            : [];

    } catch (error) {

        console.error("History loading error:", error);

        return [];

    }

}


// ======================================
// SAVE CHAT HISTORY
// ======================================

function saveConversations() {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(conversations)
        );

    } catch (error) {

        console.error("History saving error:", error);

    }

}


// ======================================
// DISPLAY MESSAGE
// ======================================

function addMessage(text, type) {

    const message = document.createElement("div");

    message.className = `message ${type}`;

    const label = document.createElement("div");

    label.className = "message-label";

    label.textContent =
        type === "user-message"
            ? "YOU"
            : "JESSY AI";

    const content = document.createElement("div");

    content.textContent = text;

    message.appendChild(label);

    message.appendChild(content);

    chatArea.appendChild(message);

    chatArea.scrollTop = chatArea.scrollHeight;

    return message;

}


// ======================================
// CREATE CONVERSATION
// ======================================

function createConversation() {

    const conversation = {

        id: globalThis.crypto?.randomUUID?.() ||
            `${Date.now()}-${Math.random()}`,

        title: "New chat",

        updatedAt: Date.now(),

        messages: []

    };

    conversations.unshift(conversation);

    conversations = conversations.slice(0, 50);

    currentConversationId = conversation.id;

    return conversation;

}


// ======================================
// RENDER CONVERSATION LIST
// ======================================

function renderConversationList() {

    if (!conversationList) return;

    conversationList.replaceChildren();

    conversations.forEach(conversation => {

        const button = document.createElement("button");

        button.type = "button";

        button.className = "conversation-item";

        button.textContent =
            conversation.title || "New chat";

        button.title =
            conversation.title || "New chat";

        button.setAttribute(
            "aria-current",
            conversation.id === currentConversationId
                ? "page"
                : "false"
        );

        button.addEventListener("click", () => {

            openConversation(conversation.id);

        });

        conversationList.appendChild(button);

    });

}


// ======================================
// OPEN OLD CONVERSATION
// ======================================

function openConversation(id) {

    if (sendButton.disabled) return;

    const conversation = conversations.find(
        item => item.id === id
    );

    if (!conversation) return;

    currentConversationId = id;

    chatArea.replaceChildren();

    conversation.messages.forEach(message => {

        addMessage(
            message.content,
            message.role === "user"
                ? "user-message"
                : "ai-message"
        );

    });

    renderConversationList();

    userInput.focus();

}


// ======================================
// VOICE INPUT
// ======================================

function startVoiceInput() {

    if (!recognition) {

        if (voiceStatus) {
            voiceStatus.textContent =
                "Speech recognition is not supported. Try Chrome.";
        }

        return;

    }

    if (isListening) {

        recognition.stop();

        return;

    }

    if (sendButton.disabled) return;

    try {

        if (voiceStatus) {
            voiceStatus.textContent =
                "Starting microphone...";
        }

        recognition.start();

    } catch (error) {

        console.error(error);

        if (voiceStatus) {
            voiceStatus.textContent =
                "Could not start microphone. Try again.";
        }

    }

}


// ======================================
// VOICE OUTPUT TOGGLE
// ======================================

function toggleVoiceOutput() {

    if (!("speechSynthesis" in window)) {

        if (voiceStatus) {
            voiceStatus.textContent =
                "Voice output is not supported.";
        }

        return;

    }

    voiceEnabled = !voiceEnabled;

    if (voiceEnabled) {

        if (voiceOutputButton) {

            voiceOutputButton.textContent = "🔊";

            voiceOutputButton.title = "Voice output ON";

        }

        if (voiceStatus) {
            voiceStatus.textContent =
                "Voice output enabled.";
        }

    } else {

        window.speechSynthesis.cancel();

        if (voiceOutputButton) {

            voiceOutputButton.textContent = "🔇";

            voiceOutputButton.title = "Voice output OFF";

        }

        if (voiceStatus) {
            voiceStatus.textContent =
                "Voice output disabled.";
        }

    }

}


// ======================================
// SPEAK AI RESPONSE
// ======================================

function speakResponse(text) {

    if (!voiceEnabled) return;

    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(text);

    speech.lang = "en-IN";

    speech.rate = 1;

    speech.pitch = 1;

    speech.volume = 1;

    speech.onstart = function () {

        if (voiceStatus) {
            voiceStatus.textContent =
                "JESSY AI is speaking...";
        }

    };

    speech.onend = function () {

        if (voiceStatus) {
            voiceStatus.textContent =
                "Voice conversation ready.";
        }

    };

    speech.onerror = function (event) {

        console.error("Speech output error:", event.error);

        if (voiceStatus) {
            voiceStatus.textContent =
                "Could not play voice response.";
        }

    };

    window.speechSynthesis.speak(speech);

}


// ======================================
// SEND MESSAGE TO GROQ AI
// ======================================

async function sendMessage() {

    const text = userInput.value.trim();

    if (!text || sendButton.disabled) return;

    let conversation = conversations.find(
        item => item.id === currentConversationId
    );

    if (!conversation) {

        conversation = createConversation();

    }

    document.getElementById("welcome")?.remove();

    const history = conversation.messages.slice(-20);

    conversation.messages.push({

        role: "user",

        content: text

    });

    conversation.title =
        conversation.messages.find(
            message => message.role === "user"
        )?.content.slice(0, 48) || "New chat";

    conversation.updatedAt = Date.now();

    addMessage(text, "user-message");

    saveConversations();

    renderConversationList();

    userInput.value = "";

    sendButton.disabled = true;

    if (newChatButton) {
        newChatButton.disabled = true;
    }

    sendButton.setAttribute(
        "aria-label",
        "JESSY AI is responding"
    );

    const loadingMessage = addMessage(
        "JESSY AI is thinking...",
        "ai-message loading-message"
    );

    try {

        const controller = new AbortController();

        const timeout = setTimeout(
            () => controller.abort(),
            120000
        );

        let response;

        try {

            response = await fetch(`${API_URL}/chat`, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    message: text,

                    history: history,

                    language: "auto"

                }),

                signal: controller.signal

            });

        } finally {

            clearTimeout(timeout);

        }

        const result = await response.json();

        if (!response.ok) {

            throw new Error(
                result.detail ||
                `Server error: ${response.status}`
            );

        }

        if (
            typeof result.reply !== "string" ||
            !result.reply.trim()
        ) {

            throw new Error(
                "JESSY AI returned an empty response."
            );

        }

        loadingMessage.remove();

        conversation.messages.push({

            role: "assistant",

            content: result.reply

        });

        conversation.updatedAt = Date.now();

        saveConversations();

        addMessage(
            result.reply,
            "ai-message"
        );

        renderConversationList();

        // Speak response when voice is enabled

        speakResponse(result.reply);

        console.log("JESSY AI response received.");

        console.log("Provider:", result.provider);

    } catch (error) {

        console.error("JESSY AI Error:", error);

        loadingMessage.remove();

        let errorText;

        if (error.name === "AbortError") {

            errorText =
                "JESSY AI is taking too long to respond. Please try again.";

        } else if (error instanceof TypeError) {

            errorText =
                "Unable to connect to JESSY AI. Please check your internet connection or try again later.";

        } else {

            errorText =
                error.message || "Connection error.";

        }

        addMessage(
            errorText,
            "ai-message error-message"
        );

    } finally {

        sendButton.disabled = false;

        sendButton.setAttribute(
            "aria-label",
            "Send message"
        );

        if (newChatButton) {
            newChatButton.disabled = false;
        }

        userInput.focus();

    }

}


// ======================================
// QUICK PROMPTS
// ======================================

function usePrompt(text) {

    userInput.value = text;

    sendMessage();

}


// ======================================
// NEW CHAT
// ======================================

function newChat() {

    if (sendButton.disabled) return;

    if (isListening && recognition) {

        recognition.stop();

    }

    window.speechSynthesis?.cancel();

    currentConversationId = null;

    chatArea.replaceChildren();

    if (welcomeTemplate) {

        chatArea.appendChild(
            welcomeTemplate.cloneNode(true)
        );

    }

    renderConversationList();

    userInput.value = "";

    userInput.focus();

}


// ======================================
// ENTER KEY
// ======================================

function handleKey(event) {

    if (
        event.key === "Enter" &&
        !event.shiftKey
    ) {

        event.preventDefault();

        sendMessage();

    }

}


// ======================================
// JESSY AI READY
// ======================================

console.log("--------------------------------");

console.log("JESSY AI is ready.");

console.log("Developed by UBINTZE TECHNOLOGIES.");

console.log("AI Provider: Groq.");

console.log("Model: GPT-OSS-20B.");

console.log("Backend connection:", API_URL);

console.log("--------------------------------");