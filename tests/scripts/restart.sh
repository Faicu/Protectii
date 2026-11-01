#!/bin/bash
# Repornește serverul de test (sesiunea tmux "pstest"); cu "reset" șterge lumea și datele pluginurilor.
# PSTEST_DIR = directorul de test (implicit /var/tmp/pstest), REPO = clona Protectii (implicit directorul acestui repo).
ROOT=${PSTEST_DIR:-/var/tmp/pstest}
REPO=${REPO:-$(cd "$(dirname "$0")/../.." && pwd)}
S=$ROOT/server

tmux send-keys -t pstest "stop" Enter 2>/dev/null
for i in $(seq 1 40); do tmux has-session -t pstest 2>/dev/null || break; sleep 1; done
if [ "$1" = reset ]; then
  rm -rf $S/world $S/world_nether $S/world_the_end $S/plugins/PreciousStones/PreciousStones.db \
         $S/plugins/WorldGuard/worlds $S/plugins/Essentials/userdata
fi
cp $REPO/target/PreciousStones.jar $S/plugins/
[ -s $S/console.log ] && cat $S/console.log >> $S/console-all.log
: > $S/console.log
tmux new-session -d -s pstest -c $S "java -Xms1G -Xmx2G -jar $ROOT/bt/out/spigot-26.3.jar nogui 2>&1 | tee $S/console.log"
sleep 2
until grep -qE 'Done \(' $S/console.log; do sleep 1; done
