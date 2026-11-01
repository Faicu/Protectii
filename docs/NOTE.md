# Protectii — note de proiect

Remake al pluginului [PreciousStones](https://github.com/elBukkit/PreciousStones) (versiunea 1.18, ultimul commit al autorului: 27.10.2026) pentru **Spigot 26.3** și **Java 25**. Lucrat pe 01.11.2026.

## Starea la 01.11.2026

- Se compilează pe `spigot-api 26.3-R0.1-SNAPSHOT`, fără avertismente de API depășit de la Spigot.
- Testat pe Spigot 26.3 (build `4664-Spigot-bed90fc-e89124d`) cu WorldGuard 7.0.20, WorldEdit 7.4.6, Vault 1.7.3, mcMMO 2.3.002, EssentialsX 2.22.0: **55/55 verificări OK** (detalii în `tests/README.md`).
- Jar gata de folosit: `release/Protectii-26.3.jar`.
- În joc, pluginul se numește tot `PreciousStones`: comanda `/ps`, permisiunile `preciousstones.*`, pachetul `net.sacredlabyrinth.Phaed.PreciousStones`, datele în `plugins/PreciousStones/`.

## Ce s-a schimbat față de PreciousStones 1.18

### Build
- `spigot-api` 1.17 → 26.3, Java 8 → 25, `maven-shade-plugin` 3.6.0 cu ASM 9.9 (versiunea veche nu citea clase Java 25).
- Depozite moarte înlocuite (`maven.sk89q.com` → `maven.enginehub.org`, PaperMC → `repo.papermc.io`). Scoase: copierea jar-ului în `d:\Minecraft\…` și adresele vechi `http://104.236.246.108`.
- `json-simple` era primit pe ascuns prin pluginurile vechi; acum e dependență proprie, inclusă și relocată în jar. `commons-lang` înlocuit cu Java standard.
- `Metrics.java` (bStats vechi, copiat în cod) → `bstats-bukkit 3.2.1`, inclus și relocat.

### Integrări
- Păstrate: **WorldGuard 7** (`worldguard-bukkit`), **WorldEdit 7**, **Vault**, **mcMMO 2**.
- Scoase complet: SimpleClans (identificatorii `c:clan`, `auto-allow-clan-on-fields`, `allow-waring-clans-into-protections`, `disable-simpleclans-hook`), LWC (flag-ul `protect-lwc`), Lockette, RedProtect, CombatTag, AntiCheat, Permissions (Nijikokun), PermissionsBukkit. Permisiunile și grupurile merg prin Vault sau direct prin Bukkit.
- Economia Vault folosește variantele cu `OfflinePlayer` (nu cu numele jucătorului).

### API-uri noi
- Semne: `Sign.getSide(Side.FRONT)` în loc de `getLine/setLine/getLines`. Grief Revert și Translocation salvează doar fața din față a semnelor, ca înainte.
- Poțiuni: `Helper.getPotionEffectType(nume)` acceptă și cheile noi (`haste`, `minecraft:haste`), și numele vechi din config-uri (`FAST_DIGGING`, `SLOW`, `HARM`, `JUMP`, `CONFUSION` …).
- `Attribute.MAX_HEALTH` în loc de `getMaxHealth()`, `Damageable` meta în loc de `get/setDurability`, `Registry.ENCHANTMENT`, `getKeyOrThrow()`, `Scoreboard.getEntryTeam`, `EntityEffect.ENTITY_DEATH`, `BlockVector3.x()/y()/z()` (WorldEdit).
- `sendBlockChange(Location, BlockData)` în loc de varianta cu `Material, byte`.

### Buguri reparate (existau în PreciousStones)
1. **Grief Revert nu salva nimic:** inserarea în `pstone_grief_undo` nu dădea valoare pentru `type_id` (`NOT NULL`) după migrarea autorului de la ID-uri numerice la nume.
2. **Translocation era stricat:**
   - `Field.setDisabled` aplica blocurile la dezactivare și le ștergea la activare. Task-urile de mutare chemau la final `setDisabled`, deci intrau în buclă infinită și pierdeau blocuri.
   - Acum: activ = blocurile sunt în lume, dezactivat = sunt salvate. Task-urile marchează doar starea (`Field.setDisabledState`).
   - Tipul blocului se scria în `type_id` în loc de `type`.
   - `Material.AIR` era în lista blocurilor dependente: fiecare bloc pus salva și 6 vecini de aer, care ocupau apoi locul altor blocuri și dădeau erori `UNIQUE`. Salvarea folosește acum `REPLACE INTO`.
   - „Bloc gol” (aer/apă/lavă) se decide după material, nu după vechiul `type_id`.
3. **Blocaj de ~5 s al serverului** („Initializing Legacy Material Support … this is a bug!”) la primul semn de câmp și la vizualizări. Cauzele: `BlockState.getData()` (MaterialData) în `SignHelper.getAttachedBlock` și `sendBlockChange(…, Material, byte)`.
4. **Lista de permisiuni golită** (de ex. la cumpărarea câmpului cu semn `[Buy]`) nu se salva, deci revenea după restart.
5. **SQLite „database is locked”**: pool-ul are 2 conexiuni care scriu simultan. Acum: `busy_timeout=5000` și WAL.
6. **Forester:** un nume de creatură necunoscut arunca excepție; acum scrie un avertisment în log.

## Netestat încă

- Închiriere și partajare (`[Rent]`, `[Share]`), plata periodică.
- Forester, Proximity Mine, Sky Cannon, The Shocker (fulger), Air of Atlantis, Creature Repeller.
- Desenarea cuboidelor, blocurile unbreakable, vizualizarea, ascunderea câmpurilor, confiscarea, câmpurile de teleportare.
- Translocation: import/remove, uși, semne, cufere (testat doar cu blocuri simple, peste restart).
- MySQL (testat doar SQLite).
- Un client Minecraft 26.3 real (testele folosesc roboți plus un plugin de test; vezi `tests/README.md`).

## Ce mai e de știut

- **Licența:** PreciousStones nu are fișier de licență. Pentru publicare (de ex. pe spigotmc.org) e bine să ceri acordul autorilor.
- **Avertismente rămase la compilare:** 5 apeluri la `ForceFieldManager.isAllowed(Field, String)`, marcată `@Deprecated` chiar de autor, fără legătură cu Spigot. `getOfflinePlayer(String)` e folosit în continuare (pluginul lucrează cu nume de jucători, nu cu UUID).
- **`Helper.getMaterial(int)`** (conversia ID-urilor numerice vechi, prin `Bukkit.getUnsafe().fromLegacy`) pornește suportul legacy. Se folosește doar pentru baze de date sau config-uri de dinainte de 1.13, o singură dată, la migrare.
- **WorldEdit:** protecția la `//set` în câmpuri e oprită implicit (`disable-worldedit-hook: true` în config).
- **Clic dreapta pe un câmp** (snitch, grief revert etc.) cere o unealtă din `tool-items` în mână (târnăcop, lopată).
- **EssentialsX 2.22.0** nu suportă oficial 26.3 (avertisment la pornire), dar economia prin Vault merge.

## Idei pentru mai departe

- Redenumire completă (`Protectii`, `/pt`, `protectii.*`, alt pachet Java). Atenție: pierde compatibilitatea cu datele și permisiunile PreciousStones existente, deci ar trebui o migrare.
- Release pe GitHub (jar-ul atașat) în loc de `release/` în repo.
- Testarea tipurilor de câmpuri rămase, apoi un test cu un client real.
