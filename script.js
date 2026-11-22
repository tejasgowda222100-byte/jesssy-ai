// ==========================================
// JESSY AI - LIVE AI CHAT SYSTEM
// Developed by UBINTZE TECHNOLOGIES
// Founder: TEJAS GOWDA
// ==========================================

const API_URL = "https://jesssy-ai.onrender.com";

// HTML ELEMENTS
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

if (menuButton && nav) {

    menuButton.addEventListener("click", () => {

        const open = nav.classList.toggle("open");

        menuButton.setAttribute(
            "aria-expanded",
            String(open)
        );

    });

    document.querySelectorAll(".nav a").forEach(link => {

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
// CHANGE PREVIEW TO LIVE STATUS
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

const demoDescription = document.querySelector("#demo .section-heading p");

if (demoDescription) {
    demoDescription.textContent =
        "Chat with JESSY AI, your intelligent AI assistant.";
}


// ==========================================
// DISPLAY MESSAGES
// ==========================================

// ==========================================
// DISPLAY MESSAGES WITH MARKDOWN
// ==========================================

function addMessage(text, sender) {

    const message = document.createElement("div");

    message.className = `message ${sender}`;

    if (sender === "assistant" &&
        window.marked &&
        window.DOMPurify) {

        const html = marked.parse(text, {
            breaks: true,
            gfm: true
        });

        message.innerHTML = DOMPurify.sanitize(html);

    } else {

        message.textContent = text;

    }

    chatMessages.appendChild(message);

    chatMessages.scrollTop = chatMessages.scrollHeight;

    return message;
} {

    const message = document.createElement("div");

    message.className = `message ${sender}`;

    message.textContent = text;

    chatMessages.appendChild(message);

    chatMessages.scrollTop = chatMessages.scrollHeight;

    return message;
}


// ==========================================
// SEND MESSAGE TO GROQ BACKEND
// ==========================================

async function sendMessage(text) {

    if (!text.trim() || isSending) {
        return;
    }

    isSending = true;

    addMessage(text, "user");

    chatInput.value = "";

    chatInput.disabled = true;

    const sendButton = chatForm.querySelector("button");

    if (sendButton) {
        sendButton.disabled = true;
    }

    const loadingMessage = addMessage(
        "JESSY AI is thinking...",
        "assistant"
    );

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
                data.detail || `Server error: ${response.status}`
            );

        }

        if (!data.reply) {

            throw new Error("JESSY AI returned an empty response.");

        }

        loadingMessage.remove();

        addMessage(data.reply, "assistant");

        // SAVE CONVERSATION HISTORY

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

        chatHistory = chatHistory.slice(-20);

        console.log("JESSY AI response received.");

        console.log("AI Provider:", data.provider);

    }

    catch (error) {

        console.error("JESSY AI Error:", error);

        loadingMessage.remove();

        let errorMessage;

        if (error instanceof TypeError) {

            errorMessage =
                "Unable to connect to JESSY AI. Please check the backend connection.";

        } else {

            errorMessage = error.message;

        }

        addMessage(
            "Sorry! " + errorMessage,
            "assistant"
        );

    }

    finally {

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

if (chatForm) {

    chatForm.addEventListener("submit", event => {

        event.preventDefault();

        sendMessage(chatInput.value.trim());

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

console.log("Backend:", API_URL);

console.log("--------------------------------");
