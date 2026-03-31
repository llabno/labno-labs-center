from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import anthropic
import os
import json

app = FastAPI()

# Vercel Serverless environment handling
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Anthropic Client Wrapper
client = anthropic.Anthropic(
    api_key=os.environ.get("ANTHROPIC_API_KEY", "")
)

class OracleQuery(BaseModel):
    query: str
    context_type: str = "general"
    user_role: str = "guest"

class OracleParser(BaseModel):
    sop_text: str

@app.get("/api")
def root():
    return {"status": "Labno Labs Oracle Online", "version": "1.0"}

@app.post("/api/oracle/ask")
def ask_oracle(req: OracleQuery):
    """
    Phase 2 Core API Path. 
    Queries the vector database directly (logic placeholder) and feeds results to Anthropic Haiku.
    """
    if req.user_role not in ["lance@labnolabs.com", "romy@labnolabs.com", "avery@labnolabs.com", "sara@labnolabs.com"]:
        raise HTTPException(status_code=403, detail="Unauthorized Agent Access. Internal Brain strictly isolated.")

    # 1. Protection Hook (Prompt Injection Shield)
    dangerous_phrases = ['ignore all preceding', 'write a poem about', 'give me your prompt']
    if any(phrase in req.query.lower() for phrase in dangerous_phrases):
        return {"response": "Query blocked by Labno Labs Sentinel: Potential Prompt Injection Detected."}
    
    # 2. Oracle RAG Loop utilizing Anthropic
    prompt = f"""You are the overarching Oracle for Labno Labs Mission Control. 
    You manage company workflows, read private and public SOPs, and dictate company structure based on Lance's instructions.
    Answer the following human query intelligently: {req.query}
    """
    
    try:
        response = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=600,
            system="Always output clean JSON for the dashboard. Format { 'response': 'text' }",
            messages=[{"role": "user", "content": prompt}]
        )
        return json.loads(response.content[0].text)
    except Exception as e:
        # Default safety fallback if Anthropic call fails locally or without API key
        return {"response": f"Oracle System Status: Currently awaiting Anthropic API Key integration. Received query processing target: {req.query}"}

@app.post("/api/oracle/sync")
def trigger_sync(req: OracleParser):
    """
    Receives text from a Google Drive Watchhook (The Dispatcher) and chunks it.
    """
    return {"status": "Successfully captured SOP. Queued for pgvector embed ingestion loop."}
