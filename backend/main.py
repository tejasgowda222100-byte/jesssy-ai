import logging
import json
import os
from pathlib import Path
from typing import Literal
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

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


class PlaceSearchRequest(BaseModel):

    location: str = Field(min_length=2, max_length=120)

    category: Literal["hotel", "restaurant"]


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

BOOKING AND LIVE TRAVEL REQUESTS:

1. The website's Trip Discovery panel can search Google Places for hotel and
   restaurant listings. JESSY has no direct reservation, transport-ticket,
   or movie-ticket booking provider connected. Do not claim a search was run
   unless it was, and never claim a reservation, payment, cancellation, or
   ticket purchase succeeded without provider confirmation.
2. Never invent live prices, taxes, booking charges, room inventory, seats,
   schedules, or availability. Explain that these require a live authorized
   provider result and may change before checkout.
3. If the user asks to plan or book a trip, help collect the missing details
   (destination, dates, guests or passengers, budget, and preferences) in the
   user's language. Clearly distinguish planning advice from a live search.
4. Public web results and Google Places listings do not confirm hotel room
   inventory, ticket availability, final fees, or complete a booking. State
   this limitation when relevant.
5. Only report a confirmed booking after a connected provider returns a
   confirmation, and show the provider's final amount and terms before the
   user approves payment.

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


@app.post("/trip/places")
def search_trip_places(request: PlaceSearchRequest):

    api_key = os.getenv("GOOGLE_PLACES_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Live place search is not configured yet."
        )

    place_type = "hotel" if request.category == "hotel" else "restaurant"
    search_word = "hotels" if request.category == "hotel" else "restaurants"
    payload = json.dumps({
        "textQuery": f"{search_word} in {request.location.strip()}",
        "includedType": place_type,
        "strictTypeFiltering": True,
        "languageCode": "en",
        "pageSize": 20,
    }).encode("utf-8")

    provider_request = Request(
        "https://places.googleapis.com/v1/places:searchText",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": (
                "places.id,places.displayName,places.formattedAddress,"
                "places.rating,places.userRatingCount,places.priceLevel,"
                "places.websiteUri,places.googleMapsUri,"
                "places.currentOpeningHours.openNow"
            ),
        },
        method="POST",
    )

    try:
        with urlopen(provider_request, timeout=12) as provider_response:
            provider_data = json.loads(provider_response.read().decode("utf-8"))
    except HTTPError as error:
        logger.warning("Google Places returned HTTP %s", error.code)
        raise HTTPException(
            status_code=502,
            detail="The place search provider could not complete the search."
        ) from error
    except (URLError, TimeoutError, json.JSONDecodeError) as error:
        logger.warning("Google Places request failed: %s", type(error).__name__)
        raise HTTPException(
            status_code=502,
            detail="The place search provider is temporarily unavailable."
        ) from error

    places = []
    for place in provider_data.get("places", []):
        opening_hours = place.get("currentOpeningHours") or {}
        places.append({
            "id": place.get("id"),
            "name": (place.get("displayName") or {}).get("text", "Place"),
            "address": place.get("formattedAddress", ""),
            "rating": place.get("rating"),
            "rating_count": place.get("userRatingCount"),
            "price_level": place.get("priceLevel"),
            "open_now": opening_hours.get("openNow"),
            "website": place.get("websiteUri"),
            "maps_url": place.get("googleMapsUri"),
        })

    return {
        "location": request.location.strip(),
        "category": request.category,
        "places": places,
        "source": "Google Places",
        "availability_verified": False,
        "message": (
            "These are place listings. Hotel room availability, nightly rates, "
            "and booking charges are not confirmed by this search."
            if request.category == "hotel"
            else "Restaurant listing details may change; confirm directly with the venue."
        ),
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
