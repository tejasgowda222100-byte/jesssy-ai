import logging
import os
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from openai import OpenAI
from pydantic import BaseModel, Field


# ==========================================
# JESSY AI
# UBINTZE TECHNOLOGIES
# Founder: TEJAS GOWDA
# ==========================================


# ------------------------------------------
# PROJECT CONFIGURATION
# ------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("jessy_ai")


# ------------------------------------------
# GROQ AI CONFIGURATION
# ------------------------------------------

MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise RuntimeError(
        "GROQ_API_KEY is missing. Check your Render environment variables."
    )

client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=GROQ_API_KEY,
    timeout=60.0
)


# ------------------------------------------
# FASTAPI APPLICATION
# ------------------------------------------

app = FastAPI(
    title="JESSY AI",
    description="JESSY AI developed by UBINTZE TECHNOLOGIES",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://tejasgowda222100-byte.github.io"
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------
# REQUEST MODELS
# ------------------------------------------

class ChatMessage(BaseModel):

    role: Literal["user", "assistant"]

    content: str = Field(
        min_length=1,
        max_length=8000
    )


class ChatRequest(BaseModel):

    message: str = Field(
        min_length=1,
        max_length=8000
    )

    history: list[ChatMessage] = Field(
        default_factory=list,
        max_length=20
    )

    language: str = "auto"

    web_search: bool = False


# ------------------------------------------
# JESSY AI IDENTITY AND PERSONALITY
# ------------------------------------------

JESSY_INSTRUCTIONS = """
IDENTITY:

You are JESSY AI, an advanced multilingual AI assistant
developed by UBINTZE TECHNOLOGIES.

COMPANY INFORMATION:

Company Name: UBINTZE TECHNOLOGIES
Founder: TEJAS GOWDA
AI Assistant: JESSY AI
Developer: UBINTZE TECHNOLOGIES

IMPORTANT IDENTITY RULES:

1. The founder of UBINTZE TECHNOLOGIES is TEJAS GOWDA.

2. JESSY AI was developed by UBINTZE TECHNOLOGIES.

3. If someone asks who founded UBINTZE TECHNOLOGIES,
   confidently answer: TEJAS GOWDA.

4. If someone asks who created JESSY AI,
   explain that it was developed by UBINTZE TECHNOLOGIES,
   founded by TEJAS GOWDA.

5. Never claim that you do not know these established facts.

6. Never contradict the company information above.

7. Do not invent additional company history or achievements.

YOUR PERSONALITY:

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

11. Be professional, confident and conversational.

12. Give useful and accurate answers.

You are JESSY AI, proudly developed by UBINTZE TECHNOLOGIES.
"""


# ------------------------------------------
# HOME PAGE
# ------------------------------------------

@app.get("/")
def home():

    file_path = PROJECT_ROOT / "index.html"

    if not file_path.exists():

        return {
            "assistant": "JESSY AI",
            "company": "UBINTZE TECHNOLOGIES",
            "founder": "TEJAS GOWDA",
            "message": "JESSY AI Backend is running."
        }

    return FileResponse(file_path)


# ------------------------------------------
# CSS FILE
# ------------------------------------------

@app.get("/style.css")
def stylesheet():

    file_path = PROJECT_ROOT / "style.css"

    if not file_path.exists():

        raise HTTPException(
            status_code=404,
            detail="CSS file not found"
        )

    return FileResponse(
        file_path,
        media_type="text/css"
    )


# ------------------------------------------
# JAVASCRIPT FILE
# ------------------------------------------

@app.get("/script.js")
def frontend_script():

    file_path = PROJECT_ROOT / "script.js"

    if not file_path.exists():

        raise HTTPException(
            status_code=404,
            detail="JavaScript file not found"
        )

    return FileResponse(
        file_path,
        media_type="text/javascript"
    )


# ------------------------------------------
# HEALTH CHECK
# ------------------------------------------

@app.get("/health")
def health():

    return {
        "status": "healthy",
        "assistant": "JESSY AI",
        "company": "UBINTZE TECHNOLOGIES",
        "founder": "TEJAS GOWDA",
        "ai_provider": "Groq",
        "model": MODEL
    }


# ------------------------------------------
# CHAT POST API
# ------------------------------------------

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

            "content": (
                JESSY_INSTRUCTIONS
                + "\n\n"
                + language_instruction
            )
        }

    ]

    # Conversation history

    for item in request.history:

        messages.append({

            "role": item.role,

            "content": item.content

        })

    # Current user message

    messages.append({

        "role": "user",

        "content": request.message

    })

    try:

        completion_options = {
            "model": MODEL,
            "messages": messages,
        }

        if request.web_search:
            completion_options["tools"] = [{"type": "browser_search"}]
            completion_options["tool_choice"] = "required"

        response = client.chat.completions.create(**completion_options)

        reply = response.choices[0].message.content

        if not reply:

            raise ValueError("Empty AI response")

        return {

            "reply": reply,

            "assistant": "JESSY AI",

            "company": "UBINTZE TECHNOLOGIES",

            "provider": "Groq",

            "web_search": request.web_search,

            "status": "success"

        }

    except Exception as error:

        logger.exception("Groq request failed")

        raise HTTPException(

            status_code=502,

            detail=f"Groq AI error: {type(error).__name__}"

        )
