#!/usr/bin/env bash
# Build the ipk and install + launch it on the TV (ssh host "lgtv" in ~/.ssh/config).
set -euo pipefail
cd "$(dirname "$0")/.."

# The TV signs with SHA-1, which Fedora's crypto policy blocks; allow it for this script only.
[ -f ~/.ssh/lgtv-openssl.cnf ] && export OPENSSL_CONF=~/.ssh/lgtv-openssl.cnf

[ -d app/icons ] || python3 tools/fetch_icons.py
python3 tools/build_ipk.py
IPK=$(ls -t dist/*.ipk | head -1)
APP_ID=$(python3 -c 'import json; print(json.load(open("app/appinfo.json"))["id"])')

# The TV has no scp, so stream the file over ssh.
ssh lgtv 'cat > /media/developer/temp/app.ipk' < "$IPK"

# Runs on the TV. luna-send-pub -i quits when its stdin closes, so a sleep keeps
# it listening in the background while we poll its output for the final state.
RESULT=$(ssh lgtv sh -s <<'EOF'
LOG=/media/developer/temp/install.log
sleep 120 </dev/null 2>/dev/null | luna-send-pub -i luna://com.webos.appInstallService/dev/install \
  '{"id":"com.ares.defaultName","ipkUrl":"/media/developer/temp/app.ipk","subscribe":true}' >$LOG 2>&1 &
PID=$!
i=0
while [ $i -lt 90 ]; do
  if grep -q '"state":"installed"' $LOG; then echo installed; break; fi
  if grep -qE '"returnValue":false|fail|error' $LOG; then tail -1 $LOG; break; fi
  sleep 1
  i=$((i + 1))
done
kill $PID 2>/dev/null
rm -f $LOG
EOF
) || true

if [ "$RESULT" != installed ]; then
  echo "Install failed: ${RESULT:-no response from TV}" >&2
  exit 1
fi
echo "Installed."

ssh lgtv "rm -f /media/developer/temp/app.ipk; luna-send-pub -n 1 luna://com.webos.applicationManager/launch '{\"id\":\"$APP_ID\"}'"
echo "Launched $APP_ID."
