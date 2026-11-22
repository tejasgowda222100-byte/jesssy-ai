// ======================================
// JESSY AI - LIVE GROQ CONNECTION
// UBINTZE TECHNOLOGIES
// ======================================

const API_URL = "https://jesssy-ai.onrender.com";

const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");

let chatHistory = [];

function addMessage(text, sender) {
    const message = document.createElement("div");

    message.className = `message ${sender}`;
    message.textContent = text;

    chatMessages.appendChild(message);

    chatMessages.scrollTop = chatMessages.scrollHeight;

    return message;
}

async function sendMessage(text) {

    if (!text.trim()) return;

    addMessage(text, "user");

    chatInput.value = "";
    chatInput.disabled = true;

    const loading = addMessage(
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
                data.detail || "AI service error"
            );
        }

        if (!data.reply) {
            throw new Error("Empty AI response");
        }

        loading.remove();

        addMessage(data.reply, "assistant");

        chatHistory.push(
            { role: "user", content: text },
            { role: "assistant", content: data.reply }
        );

        chatHistory = chatHistory.slice(-20);

    } catch (error) {

        console.error("JESSY AI Error:", error);

        loading.remove();

        addMessage(
            "Connection error: " + error.message,
            "assistant"
        );

    } finally {

        chatInput.disabled = false;
        chatInput.focus();

    }
}

// FORM SUBMISSION

chatForm.addEventListener("submit", function(event) {

    event.preventDefault();

    sendMessage(chatInput.value);

});

// WEBSITE INITIALIZATION

console.log("JESSY AI initialized.");
console.log("Provider: Groq");
console.log("Backend:", API_URL);
