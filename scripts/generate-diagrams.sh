#!/bin/bash

# Simple Diagram Generation Script
# Generates PNG images from Mermaid diagrams

echo "🎨 Generating Architecture Diagrams"
echo "===================================="
echo ""

# Check if mermaid-cli is installed
if ! command -v mmdc &> /dev/null; then
    echo "❌ mermaid-cli not found."
    echo "📦 Install it with: npm install -g @mermaid-js/mermaid-cli"
    echo ""
    echo "💡 Alternative: View diagrams on GitHub (they render automatically!)"
    echo "   Just push your code: git push origin main"
    exit 1
fi

# Create output directory
OUTPUT_DIR=".agent/architecture/diagrams"
mkdir -p "$OUTPUT_DIR"

echo "✅ mermaid-cli found"
echo "📁 Output directory: $OUTPUT_DIR"
echo ""

# Source file
SOURCE_FILE=".agent/architecture/architecture-diagrams.md"

if [ ! -f "$SOURCE_FILE" ]; then
    echo "❌ Source file not found: $SOURCE_FILE"
    exit 1
fi

echo "📄 Source file: $SOURCE_FILE"
echo ""
echo "🔨 Generating diagrams..."
echo ""
echo "⚠️  Note: This may take a few minutes for all 12 diagrams"
echo ""

# Try to generate all diagrams at once
mmdc -i "$SOURCE_FILE" -o "$OUTPUT_DIR" -b transparent 2>&1 | grep -v "Warning"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Diagram generation complete!"
    echo ""
    echo "📊 Generated files:"
    ls -lh "$OUTPUT_DIR"/*.png 2>/dev/null || echo "  Check $OUTPUT_DIR for generated files"
else
    echo ""
    echo "⚠️  Some diagrams may have failed to generate"
    echo ""
    echo "💡 Alternative options:"
    echo "  1. View on GitHub (easiest - diagrams render automatically)"
    echo "  2. Use VS Code with Mermaid extension"
    echo "  3. Use https://mermaid.live to view/export individual diagrams"
fi

echo ""
echo "📚 Documentation:"
echo "  - View diagrams: open $OUTPUT_DIR"
echo "  - Source file: $SOURCE_FILE"
echo ""
