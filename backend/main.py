import logging
import json
import os
import threading
import time
from pathlib import Path
from typing import Literal
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
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

PHOTON_API_URL = os.getenv(
    "PHOTON_API_URL",
    "https://photon.komoot.io/api/"
)
OVERPASS_API_URL = os.getenv(
    "OVERPASS_API_URL",
    "https://overpass-api.de/api/interpreter"
)
OVERPASS_FALLBACK_API_URL = os.getenv(
    "OVERPASS_FALLBACK_API_URL",
    "https://overpass.private.coffee/api/interpreter"
)
OSM_USER_AGENT = "JESSY-AI/1.0 (https://jesssy-ai.onrender.com)"
OSM_CACHE_TTL_SECONDS = 900
_OSM_CACHE = {}
_OSM_SEARCH_LOCK = threading.Lock()
_GEOCODER_RATE_LOCK = threading.Lock()
_LAST_GEOCODER_REQUEST = 0.0


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

    location = request.location.strip()
    cache_key = (request.category, location.casefold())

    with _OSM_SEARCH_LOCK:
        now = time.monotonic()
        cached = _OSM_CACHE.get(cache_key)
        if cached and cached[0] > now:
            return cached[1]

        for key, value in list(_OSM_CACHE.items()):
            if value[0] <= now:
                _OSM_CACHE.pop(key, None)

        geocode_params = urlencode({
            "q": location,
            "limit": 1,
        })
        geocode_request = Request(
            f"{PHOTON_API_URL}?{geocode_params}",
            headers={
                "User-Agent": OSM_USER_AGENT,
                "Accept": "application/json",
            },
        )

        global _LAST_GEOCODER_REQUEST
        with _GEOCODER_RATE_LOCK:
            elapsed = time.monotonic() - _LAST_GEOCODER_REQUEST
            if elapsed < 1.05:
                time.sleep(1.05 - elapsed)
            _LAST_GEOCODER_REQUEST = time.monotonic()

        try:
            with urlopen(geocode_request, timeout=8) as response:
                geocode_data = json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            logger.warning("OpenStreetMap geocoder returned HTTP %s", error.code)
            raise HTTPException(
                status_code=503,
                detail="OpenStreetMap search is busy. Please try again shortly."
            ) from error
        except (URLError, TimeoutError, json.JSONDecodeError) as error:
            logger.warning("Photon geocoding failed: %s", type(error).__name__)
            raise HTTPException(
                status_code=502,
                detail="OpenStreetMap search is temporarily unavailable."
            ) from error

        geocode_features = geocode_data.get("features", [])
        if not geocode_features:
            raise HTTPException(
                status_code=404,
                detail="Destination not found. Check the spelling and try again."
            )

        try:
            coordinates = geocode_features[0]["geometry"]["coordinates"]
            longitude = float(coordinates[0])
            latitude = float(coordinates[1])
        except (KeyError, TypeError, ValueError) as error:
            raise HTTPException(
                status_code=502,
                detail="OpenStreetMap returned an invalid destination."
            ) from error

        if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
            raise HTTPException(
                status_code=502,
                detail="OpenStreetMap returned an invalid destination."
            )

        place_filter = (
            '["tourism"~"^(hotel|hostel|guest_house|motel|apartment|chalet)$"]'
            if request.category == "hotel"
            else '["amenity"~"^(restaurant|cafe|fast_food|food_court)$"]'
        )
        overpass_query = (
            "[out:json][timeout:12];"
            f"(nwr(around:10000,{latitude},{longitude}){place_filter};);"
            "out center 30;"
        )
        provider_data = None
        last_overpass_error = None
        overpass_urls = list(dict.fromkeys([
            OVERPASS_API_URL,
            OVERPASS_FALLBACK_API_URL,
        ]))
        for overpass_url in overpass_urls:
            overpass_request = Request(
                overpass_url,
                data=urlencode({"data": overpass_query}).encode("utf-8"),
                headers={
                    "User-Agent": OSM_USER_AGENT,
                    "Accept": "application/json",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                method="POST",
            )
            try:
                with urlopen(overpass_request, timeout=18) as response:
                    provider_data = json.loads(response.read().decode("utf-8"))
                break
            except HTTPError as error:
                last_overpass_error = error
                logger.warning("Overpass endpoint returned HTTP %s", error.code)
            except (URLError, TimeoutError, json.JSONDecodeError) as error:
                last_overpass_error = error
                logger.warning("Overpass endpoint failed: %s", type(error).__name__)

        if provider_data is None:
            if isinstance(last_overpass_error, HTTPError):
                raise HTTPException(
                    status_code=503,
                    detail="OpenStreetMap search is busy. Please try again shortly."
                ) from last_overpass_error
            raise HTTPException(
                status_code=502,
                detail="OpenStreetMap search is temporarily unavailable."
            ) from last_overpass_error

        properties = geocode_features[0].get("properties", {})
        resolved_location = ", ".join(filter(None, [
            properties.get("name"),
            properties.get("city") or properties.get("town"),
            properties.get("state"),
            properties.get("country"),
        ])) or location
        places = []
        for element in provider_data.get("elements", []):
            tags = element.get("tags") or {}
            name = tags.get("name") or tags.get("brand") or tags.get("operator")
            if not name:
                continue

            street = " ".join(filter(None, [
                tags.get("addr:housenumber"),
                tags.get("addr:street"),
            ]))
            address = ", ".join(filter(None, [
                street,
                tags.get("addr:city") or tags.get("addr:town"),
                tags.get("addr:postcode"),
            ]))
            osm_type = element.get("type")
            osm_id = element.get("id")
            if osm_type not in {"node", "way", "relation"} or not osm_id:
                continue

            places.append({
                "id": f"{osm_type}/{osm_id}",
                "name": name,
                "address": address or resolved_location,
                "category_detail": (
                    tags.get("cuisine")
                    if request.category == "restaurant"
                    else None
                ),
                "stars": tags.get("stars"),
                "opening_hours": tags.get("opening_hours"),
                "website": tags.get("contact:website") or tags.get("website"),
                "maps_url": f"https://www.openstreetmap.org/{osm_type}/{osm_id}",
            })

        result = {
            "location": location,
            "resolved_location": resolved_location,
            "category": request.category,
            "places": places,
            "source": "OpenStreetMap contributors",
            "availability_verified": False,
            "message": (
                "Listings may be incomplete. Room rates, booking fees, and "
                "availability are not provided."
                if request.category == "hotel"
                else "Listings may be incomplete or out of date; confirm directly with the venue."
            ),
        }
        _OSM_CACHE[cache_key] = (time.monotonic() + OSM_CACHE_TTL_SECONDS, result)
        return result


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
