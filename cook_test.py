from google import genai
from google.genai import types

client = genai.Client()

image_path = "recipe_example.jpg"

with open(image_path, "rb") as f:
    image_bytes = f.read()

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

response = client.models.generate_content(
    model="gemini-3-flash-preview",
    contents=[image_part, prompt],
    config=types.GenerateContentConfig(
        response_mime_type="application/json",
        temperature=0.1
    )
)

print(response.text)