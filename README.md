Protectii
==========

Self-service protection for PVP Minecraft servers — a remake of [PreciousStones](https://github.com/elBukkit/PreciousStones) for **Spigot 26.3** (Java 25).

This project is based on PreciousStones by Phaed, NathanWolf, xtomyserrax and contributors. The full original history is kept in this repository.

## Server Version

Spigot 26.3 (`api-version: 26.3`), Java 25.

## Integrations

Optional, detected at startup: WorldGuard 7, WorldEdit 7, Vault, mcMMO 2.

Support for SimpleClans, LWC, Lockette, RedProtect, CombatTag, AntiCheat, Permissions and PermissionsBukkit was removed.

## Changes from PreciousStones 1.18

- Builds against the Spigot 26.3 API; deprecated and legacy (pre-1.13) API calls replaced.
- Grief Revert: griefed blocks are saved again (database insert was failing).
- Translocation: enabling restores blocks and disabling hides them (was reversed and looped); block types are stored correctly.
- No more ~5 s server freeze from legacy material support (signs, visualization).
- Clearing a field's allowed list (e.g. after a purchase) is saved.
- SQLite waits for locks instead of failing with "database is locked".

## Build

```
mvn package
```

The plugin jar is written to `target/PreciousStones.jar`.
