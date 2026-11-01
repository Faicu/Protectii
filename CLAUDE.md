# Protectii — instrucțiuni pentru Claude

Remake al pluginului PreciousStones pentru Spigot 26.3 / Java 25. Istoricul complet al PreciousStones e păstrat; `upstream` = https://github.com/elBukkit/PreciousStones.

- **Starea proiectului, ce s-a schimbat, buguri reparate, ce e netestat:** `docs/NOTE.md`. Citește-l înainte de orice modificare.
- **Teste de joc** (server Spigot 26.3 local, roboți Mineflayer prin ViaProxy, plugin de test `PSTestHarness`): `tests/README.md`.
- **Build:** `mvn package` → `target/PreciousStones.jar`. Jar-ul publicat stă în `release/Protectii-26.3.jar`; după modificări îl recompilezi și îl înlocuiești.
- În cod și în joc numele e încă `PreciousStones` (`/ps`, `preciousstones.*`); redenumirea e o decizie a userului, încă neluată.
- Integrări păstrate: WorldGuard, WorldEdit, Vault, mcMMO. Nu readuce SimpleClans/LWC/Lockette/RedProtect/CombatTag/AntiCheat/Permissions.
- Fără API legacy (MaterialData, `sendBlockChange(…, byte)`, ID-uri numerice): pornesc „Legacy Material Support” și blochează serverul ~5 s. După teste: `grep -c 'Legacy Material'` în logul serverului trebuie să fie 0.
- Multe `@SuppressWarnings("deprecation")` vin de la autorul original și pot ascunde API-uri vechi; verifică compilând fără ele.
- Commit-urile: autor Faicu <faicuro@gmail.com>.
