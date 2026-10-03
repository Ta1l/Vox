#!/usr/bin/env bash
set -euo pipefail

# run-codex-review.sh
# Executes Codex independent code review and saves output

CHECKPOINT_NAME="${1:-}"
PROMPT_FILE="${2:-}"

if [[ -z "$CHECKPOINT_NAME" ]]; then
  echo "ERROR: Checkpoint name required"
  echo "Usage: $0 <checkpoint_name> <prompt_file>"
  exit 1
fi

if [[ -z "$PROMPT_FILE" ]]; then
  echo "ERROR: Prompt file required"
  echo "Usage: $0 <checkpoint_name> <prompt_file>"
  exit 1
fi

if [[ ! -f "$PROMPT_FILE" ]]; then
  echo "ERROR: Prompt file not found: $PROMPT_FILE"
  exit 1
fi

if ! command -v codex &> /dev/null; then
  echo "ERROR: codex executable not found in PATH"
  echo ""
  echo "Codex is required for automated code review checkpoints."
  echo ""
  echo "Install Codex:"
  echo "  - Visit https://codex.anthropic.com or appropriate installation source"
  echo "  - Follow installation instructions"
  echo "  - Ensure 'codex' is in PATH"
  echo ""
  echo "AUTOPILOT STOPPED: Cannot proceed without mandatory review checkpoint."
  exit 1
fi

OUTPUT_FILE=".reviews/${CHECKPOINT_NAME}-codex-review.md"
RESPONSE_FILE=".reviews/${CHECKPOINT_NAME}-response.md"

echo "═══════════════════════════════════════════════════════════════"
echo "Running Codex review for checkpoint: $CHECKPOINT_NAME"
echo "═══════════════════════════════════════════════════════════════"
echo "Prompt file: $PROMPT_FILE"
echo "Output file: $OUTPUT_FILE"
echo ""

# Create .reviews directory if not exists
mkdir -p .reviews

# Run Codex in read-only review mode
# NOTE: Do NOT use --full-auto for read-only review
# Codex should analyze code but not modify it

echo "Executing Codex review..."
echo ""

if codex exec --prompt-file "$PROMPT_FILE" --output "$OUTPUT_FILE" --read-only 2>&1; then
  CODEX_EXIT_CODE=0
else
  CODEX_EXIT_CODE=$?
fi

if [[ $CODEX_EXIT_CODE -ne 0 ]]; then
  echo ""
  echo "ERROR: Codex review failed with exit code $CODEX_EXIT_CODE"
  echo ""
  echo "Possible causes:"
  echo "  - Codex encountered error during analysis"
  echo "  - Prompt file format invalid"
  echo "  - Project structure unexpected"
  echo "  - Codex configuration issue"
  echo ""
  echo "AUTOPILOT STOPPED: Cannot proceed without successful review checkpoint."
  exit 1
fi

if [[ ! -f "$OUTPUT_FILE" ]]; then
  echo ""
  echo "ERROR: Codex review completed but output file not created: $OUTPUT_FILE"
  echo ""
  echo "This is unexpected. Codex should always produce output."
  echo ""
  echo "AUTOPILOT STOPPED: Cannot proceed without review output."
  exit 1
fi

if [[ ! -s "$OUTPUT_FILE" ]]; then
  echo ""
  echo "ERROR: Codex review produced empty output file"
  echo ""
  echo "This is unexpected. Even if no issues found, Codex should produce report."
  echo ""
  echo "AUTOPILOT STOPPED: Cannot proceed with empty review."
  exit 1
fi

echo "═══════════════════════════════════════════════════════════════"
echo "Codex review complete"
echo "═══════════════════════════════════════════════════════════════"
echo "Report saved to: $OUTPUT_FILE"
echo ""
echo "Primary agent should now:"
echo "  1. Read review report"
echo "  2. Analyze each finding"
echo "  3. Fix BLOCKER/CRITICAL/HIGH issues"
echo "  4. Document decisions in: $RESPONSE_FILE"
echo "  5. Continue to next milestone"
echo ""

exit 0
