# Teste de joc (Protectii pe Spigot 26.3)

Scenarii jucate de roboți pe un server Spigot 26.3 local. Ultima rulare (01.11.2026): **55/55 OK**, pe două porniri de server, fără erori, blocaje sau erori SQLite.

## Ce conține

| Director | Ce e |
|---|---|
| `harness/` | Plugin de test `PSTestHarness` (comanda de consolă `pst`): declanșează pe server evenimentele pe care le-ar trimite un client (vezi „De ce un plugin de test”). Toate răspunsurile încep cu `PST|` în log. |
| `bot/` | Roboții (Mineflayer) și scenariile: `tests.js` (45 de verificări), `transloc.js before` / `after` (Translocation peste restart), `persist.js` (date după restart). |
| `scripts/restart.sh` | Repornește serverul de test în tmux (`pstest`); `restart.sh reset` șterge lumea și datele. |

## Mediul de test (cum a fost montat)

Totul într-un director de test, implicit `/var/tmp/pstest` (variabila `PSTEST_DIR`). Nu în `/tmp` dacă e tmpfs (RAM).

1. **Java 25 + Maven** (`openjdk-25-jdk-headless`, `maven`).
2. **Spigot 26.3** cu BuildTools:
   ```
   mkdir -p $PSTEST_DIR/bt && cd $PSTEST_DIR/bt
   curl -LO https://hub.spigotmc.org/jenkins/job/BuildTools/lastSuccessfulBuild/artifact/target/BuildTools.jar
   java -jar BuildTools.jar --rev 26.3 --output-dir out      # → out/spigot-26.3.jar
   ```
3. **Server** în `$PSTEST_DIR/server`: `eula.txt` (`eula=true`, o accepți tu), `server.properties`:
   ```
   server-ip=127.0.0.1
   server-port=25599
   online-mode=false
   level-type=minecraft\:flat
   difficulty=peaceful
   spawn-monsters=false
   view-distance=4
   simulation-distance=4
   ```
   `plugins/`: jar-ul Protectii, `harness/target/PSTestHarness.jar`, WorldEdit 7.4.6, WorldGuard 7.0.20, Vault 1.7.3,
   EssentialsX 2.22.0 (economia pentru Vault), mcMMO 2.3.002, `plugins/bStats/config.yml` cu `enabled: false`.
   După prima pornire, în `plugins/PreciousStones/config.yml`: `disable-worldedit-hook: false` (implicit e `true`).
4. **ViaProxy 3.4.14** (Mineflayer știe doar până la 26.1):
   ```
   java -Duser.dir=$PSTEST_DIR/viaproxy -jar ViaProxy-3.4.14.jar cli --bind-address 127.0.0.1:25600 \
        --target-address 127.0.0.1:25599 --target-version 26.3 --auth-method NONE --chat-signing false
   ```
   Fără `-Duser.dir`, ViaProxy își scrie fișierele în directorul curent.
5. **Roboții:** `cd bot && npm install`, apoi `harness`: `mvn -f harness/pom.xml package`.

## Rulare

```
scripts/restart.sh reset
node bot/tests.js                 # 45 de verificări
node bot/transloc.js before
scripts/restart.sh                # restart fără ștergere
node bot/transloc.js after
node bot/persist.js               # câmpurile și permisiunile după restart
grep -c 'Legacy Material' $PSTEST_DIR/server/console-all.log   # trebuie 0
```

Scenariile folosesc coordonate fixe în lumea plată (x = 100…1200, y = -60) și jucătorii `Owner`, `Stranger`, `Victim`.

## De ce un plugin de test

Prin ViaProxy (client 26.1 → server 26.3), serverul dă afară clientul la al doilea pachet de mișcare
(„Invalid move player packet received”), iar pusul de blocuri, clicul și atacul ajung greșit („Height limit for building is 319”).
E o problemă de traducere în ViaProxy, nu în plugin. Roboții rămân reali pentru intrare, chat și comenzi.
Restul îl face `PSTestHarness`, cu aceleași evenimente Bukkit pe care le trimite serverul pentru un client real:

| `pst …` | Eveniment |
|---|---|
| `move <jucător> x y z` | `PlayerMoveEvent` pas cu pas (0,5 blocuri), apoi teleport |
| `place <jucător> x y z <material>` | `BlockPlaceEvent` (anulat → blocul revine) |
| `break <jucător> x y z` | `BlockBreakEvent` |
| `interact <jucător> x y z right\|left` | `PlayerInteractEvent` (clic pe câmp: cere unealtă din `tool-items`, ex. târnăcop) |
| `sign <jucător> x y z l1\|l2\|l3\|l4` | semn pe peretele de est + `SignChangeEvent` |
| `attack <atacator> <victimă>` | `damage(1, atacator)` → `EntityDamageByEntityEvent` |
| `fakebreak <jucător> x y z` | `FakeBlockBreakEvent` din mcMMO |
| `cmd <jucător> <comandă>` | comandă rulată ca jucătorul |
| `perm <jucător> <permisiune> true\|false` | permisiune temporară |
| `state <jucător>`, `block x y z`, `effects <jucător>` | citește starea / curăță efectele |

Un test cu un client Minecraft 26.3 real n-a fost făcut.

## Capcane întâlnite

- EssentialsX: `teleport-invulnerability: 4` → după teleport, 4 s fără damage (testele PvP așteaptă 5 s). Are și propria comandă `/item` — folosește `minecraft:item`.
- EssentialsX 2.22.0 scrie „You are running an unsupported server version!” și o excepție `MinecraftServer.z()` la pornire; economia merge.
- `?welcome-message` / `?farewell-message` în config = dezactivate implicit (se pornesc cu `/ps toggle`).
- Gamerule-urile au nume noi (`natural_regeneration`, `pvp`).
- Permisiunile `preciousstones.benefit.*` au `default: false`; jucătorii non-op au nevoie de ele (și de `preciousstones.whitelist.*` pentru `/ps allow`).
