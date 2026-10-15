#!/bin/zsh
cd -- "$(dirname -- "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  print '請先安裝 Node.js LTS（22.13 或更新版本），再重新開啟。'
  print 'Install Node.js LTS (22.13+) first: https://nodejs.org/'
  read '?按 Enter 關閉 / Press Enter to close…'
  exit 1
fi
node scripts/start-local.mjs --open
result=$?
if (( result != 0 )); then
  read '?啟動未成功，請查看上方原因。按 Enter 關閉 / Press Enter to close…'
fi
exit "$result"
