// ==========================================
// JESSY AI - COMPLETE LIVE AI CHAT SYSTEM
// Developed by UBINTZE TECHNOLOGIES
// Founder: TEJAS GOWDA
// ==========================================

"use strict";

// ==========================================
// CONFIGURATION
// ==========================================

const API_URL = "https://jesssy-ai.onrender.com";
const MAX_HISTORY = 20;

// ==========================================
// HTML ELEMENTS
// ==========================================

const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");

const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");

const yearElement = document.getElementById("year");

let chatHistory = [];
let isSending = false;

// ==========================================
// WEBSITE INITIALIZATION
// ==========================================

if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
}

// ==========================================
// MOBILE NAVIGATION
// ==========================================

if (menuButton && nav) {

    menuButton.addEventListener("click", () => {
        const isOpen = nav.classList.toggle("open");
        menuButton.setAttribute("aria-expanded", String(isOpen));
    });

    nav.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            nav.classList.remove("open");
            menuButton.setAttribute("aria-expanded", "false");
        });
    });
}

// ==========================================
// LIVE WEBSITE STATUS
// ==========================================

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
// MARKDOWN CONFIGURATION
// ==========================================

if (window.marked) {
    window.marked.setOptions({
        breaks: true,
        gfm: true
    });
}

// ==========================================
// DISPLAY MESSAGES
// ==========================================

function addMessage(text, sender) {

    if (!chatMessages) {
        console.error("Chat messages element not found.");
        return null;
    }

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

    } else {

        message.textContent = content;

    }

    chatMessages.appendChild(message);

    chatMessages.scrollTop = chatMessages.scrollHeight;

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

    chatMessages.scrollTop = chatMessages.scrollHeight;

    return loading;
}

// ==========================================
// SEND MESSAGE TO BACKEND
// ==========================================

async function sendMessage(text) {

    if (!text || !text.trim() || isSending) {
        return;
    }

    if (!chatMessages || !chatInput) {
        console.error("JESSY AI chat elements are missing.");
        return;
    }

    isSending = true;

    const sendButton = chatForm
        ? chatForm.querySelector("button")
        : null;

    addMessage(text, "user");

    chatInput.value = "";
    chatInput.disabled = true;

    if (sendButton) {
        sendButton.disabled = true;
    }

    const loadingMessage = showLoadingMessage();

    try {

        const response = await fetch(`${API_URL}/chat`, {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                message: text,
                history: chatHistory,
                language: "auto"
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                typeof data.detail === "string"
                    ? data.detail
                    : `Server error: ${response.status}`
            );
        }

        if (!data.reply) {
            throw new Error("JESSY AI returned an empty response.");
        }

        loadingMessage.remove();

        addMessage(data.reply, "assistant");

        // Save conversation history

        chatHistory.push(
            {
                role: "user",
                content: text
            },
            {
                role: "assistant",
                content: data.reply
            }
        );

        chatHistory = chatHistory.slice(-MAX_HISTORY);

        console.log("JESSY AI response received successfully.");
        console.log("AI Provider:", data.provider);

    } catch (error) {

        console.error("JESSY AI Error:", error);

        if (loadingMessage) {
            loadingMessage.remove();
        }

        let errorMessage;

        if (error instanceof TypeError) {
            errorMessage =
                "Unable to connect to JESSY AI. Please check your internet connection and try again.";
        } else {
            errorMessage =
                error.message || "Something went wrong.";
        }

        addMessage("Sorry! " + errorMessage, "assistant");

    } finally {

        isSending = false;

        chatInput.disabled = false;

        if (sendButton) {
            sendButton.disabled = false;
        }

        chatInput.focus();
    }
}

// ==========================================
// CHAT FORM SUBMISSION
// ==========================================

if (chatForm && chatInput) {

    chatForm.addEventListener("submit", event => {

        event.preventDefault();

        const text = chatInput.value.trim();

        if (text) {
            sendMessage(text);
        }

    });
}

// ==========================================
// ENTER KEY SUPPORT
// ==========================================

if (chatInput) {

    chatInput.addEventListener("keydown", event => {

        if (event.key === "Enter" && !event.shiftKey) {

            event.preventDefault();

            if (chatForm) {
                chatForm.requestSubmit();
            }
        }

    });
}

// ==========================================
// JESSY AI READY
// ==========================================

console.log("--------------------------------");
console.log("JESSY AI is ready!");
console.log("Developed by UBINTZE TECHNOLOGIES");
console.log("Founder: TEJAS GOWDA");
console.log("AI Provider: Groq");
console.log("Model: GPT-OSS-20B");
console.log("Markdown:", Boolean(window.marked));
console.log("HTML Sanitizer:", Boolean(window.DOMPurify));
console.log("Backend:", API_URL);
console.log("--------------------------------");
