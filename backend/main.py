
import logging
import os
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from openai import OpenAI
from fastapi.middleware.cors import CORSMiddleware

# --------------------------------
# PROJECT CONFIGURATION
# --------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("jessy_ai")


# --------------------------------
# GROQ AI CONFIGURATION
# --------------------------------

MODEL = "openai/gpt-oss-20b"

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise RuntimeError(
        "GROQ_API_KEY is missing. Please check your .env file."
    )

client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=GROQ_API_KEY,
    timeout=60.0
)


# --------------------------------
# FASTAPI APPLICATION
# --------------------------------

app = FastAPI(title="JESSY AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://tejasgowda222100-byte.github.io"
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------
# REQUEST MODELS
# --------------------------------

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=8000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=8000)
    history: list[ChatMessage] = Field(
        default_factory=list,
        max_length=20
    )
    language: str = "auto"


# --------------------------------
# JESSY AI PERSONALITY
# --------------------------------

JESSY_INSTRUCTIONS = """
You are JESSY AI, an advanced multilingual AI assistant
developed by UBINTZE TECHNOLOGIES.

Your responsibilities:

1. Be friendly, intelligent and helpful.
2. Understand Indian and international languages.
3. Automatically detect the user's language.
4. Reply in the same language as the user.
5. Answer questions clearly and accurately.
6. Help with programming, education and technology.
7. Maintain conversation context.
8. Never pretend to be human.
9. Never invent information.
10. Explain answers with examples when necessary.
"""


# --------------------------------
# HOME PAGE
# --------------------------------

@app.get("/")
def home():
    file_path = PROJECT_ROOT / "index.html"

    if not file_path.exists():
        return {
            "assistant": "JESSY AI",
            "message": "JESSY AI Backend is running."
        }

    return FileResponse(file_path)


# --------------------------------
# CSS FILE
# --------------------------------

@app.get("/style.css")
def stylesheet():
    return FileResponse(
        PROJECT_ROOT / "style.css",
        media_type="text/css"
    )


# --------------------------------
# JAVASCRIPT FILE
# --------------------------------

@app.get("/script.js")
def frontend_script():
    return FileResponse(
        PROJECT_ROOT / "script.js",
        media_type="text/javascript"
    )


# --------------------------------
# HEALTH CHECK
# --------------------------------

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "assistant": "JESSY AI",
        "ai_provider": "Groq",
        "model": MODEL
    }


# --------------------------------
# CHAT POST API
# --------------------------------

@app.post("/chat")
def chat(request: ChatRequest):

    language_instruction = (
        "Automatically detect the user's language "
        "and respond in the same language."
        if request.language.lower() == "auto"
        else f"Respond in {request.language}."
    )

    messages = [
        {
            "role": "system",
            "content": JESSY_INSTRUCTIONS + "\n\n" + language_instruction
        }
    ]

    for item in request.history:
        messages.append({
            "role": item.role,
            "content": item.content
        })

    messages.append({
        "role": "user",
        "content": request.message
    })

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=messages
        )

        reply = response.choices[0].message.content

        if not reply:
            raise ValueError("Empty AI response")

        return {
            "reply": reply,
            "assistant": "JESSY AI",
            "provider": "Groq",
            "status": "success"
        }

    except Exception as error:

        logger.exception("Groq request failed")

        raise HTTPException(
            status_code=502,
            detail=f"Groq AI error: {type(error).__name__}"
        )
