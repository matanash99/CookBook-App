import json
from google import genai
from google.genai import types

client = genai.Client()

def process_recipe_image(image_bytes: bytes) -> dict:
    image_part = types.Part.from_bytes(
        data=image_bytes,
        mime_type="image/jpeg"
    )

    prompt = """
    Read this handwritten Hebrew recipe. 
    Return a valid JSON object with two keys:
    1. 'ingredients': A list of objects, each containing 'item' and 'weight_or_quantity'.
    2. 'instructions': A list of strings, each representing a step.
    Keep the extracted text in Hebrew.
    """

    try:
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=[image_part, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1
            )
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Error processing image: {e}")
        return {"ingredients": [], "instructions": []}