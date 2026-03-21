import json
import os

from fastapi import HTTPException
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv(override=True)
new_api_key = os.getenv("GEMINI_API_KEY")

print(f"DEBUG: I am forcing the client to use the key starting with: {str(new_api_key)[:10]}...")

client = genai.Client(api_key=new_api_key)

def process_recipe_image(image_bytes: bytes) -> dict:
    image_part = types.Part.from_bytes(
        data=image_bytes,
        mime_type="image/jpeg"
    )

    prompt = """
    Extract this Hebrew recipe into JSON.
    Format exactly: {"ingredients": [{"item": "str", "weight_or_quantity": "str"}], "instructions": ["str", "str"]}.
    Do not add markdown formatting or explanations. Output Hebrew text only.
    """

    try:
        response = client.models.generate_content(
            model="gemini-3-flash-preview", # Reverting to the one that gives 20 scans
            contents=[image_part, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1
            )
        )
        return json.loads(response.text)
    except Exception as e:
        error_msg = str(e)
        print(f"CRITICAL SCAN ERROR: {error_msg}")
        
        # If the error is about the Google limit (429)
        if "429" in error_msg or "quota" in error_msg.lower():
            raise HTTPException(
                status_code=429, 
                detail="הגעת למכסה היומית של סריקות (20). נסה שוב מחר או החלף מפתח API ב-AI Studio."
            )
            
        # NEW: If Google's servers choke (502 or 503)
        if "502" in error_msg or "503" in error_msg:
            raise HTTPException(
                status_code=502,
                detail="השרתים של גוגל עמוסים כרגע. אנא המתן 30 שניות ונסה שוב."
            )
        
        # If it's any other error
        raise HTTPException(status_code=500, detail=f"שגיאה בסריקה: {error_msg}")