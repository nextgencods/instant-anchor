#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

fail=0
report="AUDIT_REPORT.txt"
: > "$report"

forbidden_js() {
  local label="$1"
  local pattern="$2"
  if grep -RniE "$pattern" --include='*.js' . > /tmp/iap-audit.txt 2>/dev/null; then
    echo "FAIL: $label" | tee -a "$report"
    cat /tmp/iap-audit.txt | tee -a "$report"
    fail=1
  else
    echo "PASS: $label" | tee -a "$report"
  fi
}

forbidden_manifest() {
  local label="$1"
  local pattern="$2"
  if grep -nE "$pattern" manifest.json > /tmp/iap-audit.txt 2>/dev/null; then
    echo "FAIL: $label" | tee -a "$report"
    cat /tmp/iap-audit.txt | tee -a "$report"
    fail=1
  else
    echo "PASS: $label" | tee -a "$report"
  fi
}

forbidden_manifest "No broad host permissions" '(<all_urls>|host_permissions|https?://\\*/\\*)'
forbidden_js "No network primitives" '(fetch[[:space:]]*\\(|XMLHttpRequest|WebSocket|sendBeacon[[:space:]]*\\()'
forbidden_js "No remote/eval code" '(eval[[:space:]]*\\(|new[[:space:]]+Function[[:space:]]*\\(|https?://)'
forbidden_js "No Chrome sync storage" '(chrome\\.storage\\.sync|storage[.]sync)'
forbidden_manifest "No cookies/history/downloads permissions" '"(cookies|history|downloads|clipboardRead|clipboardWrite|tabs|webRequest)"'

if ! grep -q '"activeTab"' manifest.json || ! grep -q '"scripting"' manifest.json || ! grep -q '"storage"' manifest.json; then
  echo "FAIL: expected activeTab + scripting + storage permissions" | tee -a "$report"
  fail=1
else
  echo "PASS: permissions are activeTab + scripting + local storage" | tee -a "$report"
fi

if [[ $fail -eq 0 ]]; then
  echo "RESULT: PASS" | tee -a "$report"
else
  echo "RESULT: FAIL" | tee -a "$report"
  exit 1
fi
