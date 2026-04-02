#!/bin/bash
# Post-create setup for Labno Labs Center devcontainer
# Works on both ARM (M2 MacBook) and x86 (MSI PRO Windows)

set -e

echo "🔧 Setting up Labno Labs Center..."

# Install Node dependencies
npm install

# Install Python deps if they exist (for FastAPI Oracle API)
if [ -f "api/requirements.txt" ]; then
  pip install -r api/requirements.txt
fi

# Install Supabase CLI
npm install -g supabase@latest 2>/dev/null || true

# Install Vercel CLI
npm install -g vercel@latest 2>/dev/null || true

# Copy env template if no .env.local exists
if [ ! -f ".env.local" ]; then
  echo "⚠️  No .env.local found. Run 'vercel env pull .env.local' to get credentials."
  echo "   Or copy .env to .env.local and fill in your Supabase keys."
  cp .env .env.local 2>/dev/null || true
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. vercel env pull .env.local   (get Supabase credentials)"
echo "  2. npm run dev                  (start dev server on :5173)"
echo "  3. vercel dev                   (start with API routes on :3000)"
echo ""
