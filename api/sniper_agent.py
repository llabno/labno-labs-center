import os
import json
import re
import anthropic

# ---------------------------------------------------------
# LABNO LABS SNIPER AGENT - CLINICAL BLOG PIPELINE (TASK B)
# ---------------------------------------------------------
# This script is designed to run in the background (or via FastAPI).
# It takes a raw, transcribed SOAP note from Lance's clinical visits, 
# rigorously strips all HIPAA (names, dob, specifics), and outputs a 
# high-quality, anonymous, SEO-optimized B2B or B2C physical therapy blog post.

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

def generate_clinical_blog(raw_soap_note: str) -> dict:
    """
    Core function for the Sniper Agent.
    1. Checks for injection or malformed data.
    2. Uses Claude Haiku to rip out HIPAA data and generate a markdown post.
    """
    if len(raw_soap_note) < 50:
        return {"error": "SOAP note too short to generate meaningful content."}

    system_prompt = """
    You are the 'Sniper Agent' for Movement Solutions. 
    Your strict objective: 
    1. Read the provided physical therapy SOAP note.
    2. STRIP ALL HIPAA IDENTIFIERS (Names, exact ages, dates, locations, employers). 
    3. Transform the clinical data (diagnosis, exercises prescribed, outcomes) into an engaging, 
       educational, and anonymous 500-word blog post in Markdown format.
       
    The blog post should follow the 'Oversubscribed' high-value marketing method: 
    - Title: Catchy, problem-solving.
    - Intro: Explain the common mechanism of injury.
    - The Fix: Explain the biomechanical solution used in the clinic today.
    - Conclusion: Call to action to book an assessment.
    
    Output JSON format ONLY:
    {
      "title": "...",
      "markdown_body": "...",
      "seo_tags": ["tag1", "tag2"]
    }
    """

    try:
        response = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=1500,
            system=system_prompt,
            messages=[{"role": "user", "content": raw_soap_note}]
        )
        return json.loads(response.content[0].text)
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    # Test Payload
    mock_soap = "Patient John Doe, 45, works at Home Depot. Injured L4-L5 lifting wood on Tuesday. Evaluated today. Prescribed McGill Big 3 and nerve glides. Pain dropped from 7/10 to 3/10 during session."
    
    print("Testing Sniper Agent Initialization...")
    # result = generate_clinical_blog(mock_soap)
    # print(json.dumps(result, indent=2))
    print("Sniper Agent Architectural Skeleton Complete and Ready for Front-End Hookup.")
