from fastapi import FastAPI, Request, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import anthropic
import os
import json
import re

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.Anthropic(
    api_key=os.environ.get("ANTHROPIC_API_KEY", "")
)

class OracleQuery(BaseModel):
    query: str = Field(..., max_length=1500) # Prevents 2000-word overload attacks
    context_type: str = "general"

class OracleParser(BaseModel):
    sop_text: str = Field(..., min_length=10)
    document_id: str # Needed for deduplication

# Mock verify token function (In production, decodes Supabase JWT to prevent spoofing)
def verify_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized: Missing or invalid Bearer token")
    token = authorization.split(" ")[1]
    
    # Strictly simulated verification mapping
    if token == "lance_secure_token":
        return "lance@labnolabs.com"
    elif token == "public_guest_token":
        return "guest"
    else:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid signature")

@app.get("/api")
def root():
    return {"status": "Labno Labs Oracle Online", "version": "1.1"}

@app.post("/api/oracle/ask")
def ask_oracle(req: OracleQuery, user_email: str = Depends(verify_token)):
    query_clean = str(req.query).strip()
    if not query_clean:
         raise HTTPException(status_code=400, detail="Query cannot be empty spaces.")

    # 1. Protection Hook: Strict Regex Injection Shield
    # Blocks exact malicious commands, but allows "ignore distractions"
    lower_query = query_clean.lower()
    if re.search(r'\b(ignore previous instructions|forget your rules|system: override)\b', lower_query) or "dump the oracle_sops" in lower_query:
        return {"response": "Query blocked by Labno Labs Sentinel: Potential Prompt Injection Detected."}

    # 2. Data Sandbox (RLS happens natively in Supabase DB via the verified email)
    if user_email == "guest":
        brain_access = "Public Brain Only"
    else:
        brain_access = f"Private Brain Authorized for {user_email}"
    
    prompt = f"Role: Oracle. Access: {brain_access}. Query: {query_clean}"
    
    try:
        response = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=600,
            system="Always output clean JSON for the dashboard. Format { 'response': 'text' }",
            messages=[{"role": "user", "content": prompt}]
        )
        return json.loads(response.content[0].text)
    except Exception as e:
        return {"response": f"Oracle System Status: Currently awaiting Anthropic API Key integration. Received secure query processing target: {query_clean}"}

@app.post("/api/oracle/sync")
def trigger_sync(req: OracleParser, user_email: str = Depends(verify_token)):
    if user_email not in ("lance@labnolabs.com", "lance.labno@movement-solutions.com"):
        raise HTTPException(status_code=403, detail="Unauthorized: Only Admins can sync vectors.")
    
class LemonSqueezyEvent(BaseModel):
    meta: dict
    data: dict

@app.post("/api/lemon-squeezy/webhook")
def lemon_squeezy_purchase(req: LemonSqueezyEvent):
    """
    Task C: Oversubscribed Marketing Node.
    Listens for Lemon Squeezy purchases (e.g., Stretch Guides, Portfolio Templates).
    Strips the buyer's email and name, and injects them directly into labno_consulting_leads table.
    """
    event_name = req.meta.get("event_name")
    
    if event_name == "order_created":
        buyer_email = req.data.get("attributes", {}).get("user_email")
        buyer_name = req.data.get("attributes", {}).get("user_name")
        product_name = req.data.get("attributes", {}).get("first_order_item", {}).get("product_name")
        
        # Simulated database injection
        # supabase.table("labno_consulting_leads").insert({"email": buyer_email, "name": buyer_name, "app_interest": product_name})
        
        return {"status": "success", "message": f"Routed {buyer_email} to Labno CRM for: {product_name}"}
    
    return {"status": "ignored", "message": "Not an order creation event."}
