package net.sacredlabyrinth.Phaed.PreciousStones.managers;

import com.gmail.nossr50.mcMMO;
import com.sk89q.worldedit.bukkit.WorldEditPlugin;

import net.milkbowl.vault.economy.Economy;
import net.milkbowl.vault.permission.Permission;
import net.sacredlabyrinth.Phaed.PreciousStones.PreciousStones;
import net.sacredlabyrinth.Phaed.PreciousStones.entries.PlayerEntry;
import net.sacredlabyrinth.Phaed.PreciousStones.field.FieldSettings;
import org.bukkit.Bukkit;
import org.bukkit.OfflinePlayer;
import org.bukkit.Location;
import org.bukkit.World;
import org.bukkit.block.Block;
import org.bukkit.entity.Player;
import org.bukkit.metadata.MetadataValue;
import org.bukkit.plugin.Plugin;
import org.bukkit.plugin.RegisteredServiceProvider;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * @author phaed
 */
@SuppressWarnings("deprecation")
public final class PermissionsManager {
    public static Permission permission = null;
    private static Economy economy = null;
    private PreciousStones plugin;
    private mcMMO mcmmo = null;
	private WorldEditPlugin worldEdit = null;

    /**
     *
     */
    public PermissionsManager() {
        plugin = PreciousStones.getInstance();
        detectMcMMO();
        detectWorldEdit();

        try {
            Class.forName("net.milkbowl.vault.permission.Permission");

            setupEconomy();
            setupPermissions();
        } catch (ClassNotFoundException e) {
            //SimpleClans.log("[PreciousStones] Vault.jar not found. No economy support.");
            //no need to spam everyone who doesnt use vault
        }
    }
    
    private void detectWorldEdit() {
    	Plugin p = plugin.getServer().getPluginManager().getPlugin("WorldEdit");
    	
    	if (p != null) {
    		worldEdit = (WorldEditPlugin) p;
    	}
    }

    private void detectMcMMO() {
        Plugin plug = plugin.getServer().getPluginManager().getPlugin("mcMMO");

        if (plug != null) {
            mcmmo = ((mcMMO) plug);
        }
    }

    private Boolean setupPermissions() {
        RegisteredServiceProvider<Permission> permissionProvider = plugin.getServer().getServicesManager().getRegistration(net.milkbowl.vault.permission.Permission.class);
        if (permissionProvider != null) {
            permission = permissionProvider.getProvider();
        }
        return (permission != null);
    }

    private Boolean setupEconomy() {
        RegisteredServiceProvider<Economy> economyProvider = plugin.getServer().getServicesManager().getRegistration(net.milkbowl.vault.economy.Economy.class);

        if (economyProvider != null) {
            economy = economyProvider.getProvider();
        }

        return (economy != null);
    }

    public boolean canBuild(Player player, Location loc) {
        return PreciousStones.getInstance().getWorldGuardManager().canBuild(player, loc);
    }

    public boolean canBuildField(Player player, Block block, FieldSettings fs) {
        return PreciousStones.getInstance().getWorldGuardManager().canBuildField(player, block, fs);
    }

    /**
     * Check whether a player has a permission
     *
     * @param player
     * @param perm
     * @return
     */
    public boolean has(Player player, String perm) {
        if (player == null) {
            return true;
        }

        if (!perm.contains("preciousstones.bypass.toggle")) {
            if (perm.contains("preciousstones.bypass.") || perm.contains("preciousstones.admin.allowed")) {
                PlayerEntry entry = plugin.getPlayerManager().getPlayerEntry(player);

                if (entry.isBypassDisabled()) {
                    return false;
                }
            }
        }

        if (permission != null) {
            if (permission.has(player, "preciousstones.blacklist") && !permission.has(player, "preciousstones.admin.isadmin")) {
                return false;
            }

            return permission.has(player, perm);
        } else {
            return player.hasPermission(perm);
        }
    }

    /**
     * Check whether a player belongs to a group
     *
     * @param playerName
     * @param group
     * @param world
     * @return
     */
    public boolean inGroup(String playerName, World world, String group) {
        try {
            if (permission != null) {
                return permission.playerInGroup(world.getName(), Bukkit.getOfflinePlayer(playerName), group);
            }
        } catch (Exception ex) {
            // no group support
        }
        return false;
    }

    /**
     * Get a player's groups
     *
     * @param worldName
     * @param playerName
     * @return
     */
    public List<String> getGroups(String worldName, String playerName) {
        List<String> groups = new ArrayList<>();

        try {
            if (permission != null) {
                String[] groupList = permission.getPlayerGroups(worldName, Bukkit.getOfflinePlayer(playerName));

                Collections.addAll(groups, groupList);
            }
        } catch (Exception ex) {
            // no group support
        }

        return groups;
    }


    /**
     * Gives the player permissions linked to a clan
     *
     * @param player
     * @param group
     */
    public void addGroup(Player player, String group) {
        if (permission != null) {
            if (player != null) {
                permission.playerAddGroup(player, group);
            }
        }
    }

    /**
     * Removes permissions linked to a clan from the player
     *
     * @param player
     * @param group
     */
    public void removeGroup(Player player, String group) {
        if (permission != null) {
            if (player != null) {
                permission.playerRemoveGroup(player, group);
            }
        }
    }

    /**
     * Whether exonomy plugin exists and is enabled
     *
     * @return
     */
    public boolean hasEconomy() {
        return economy != null && economy.isEnabled();
    }

    /**
     * Charge player money
     *
     * @param player
     * @param amount
     * @return
     */
    public boolean playerCharge(Player player, double amount) {
        return economy.withdrawPlayer(player, amount).transactionSuccess();
    }

    /**
     * Charge player money
     *
     * @param playerName
     * @param amount
     * @return
     */
    public boolean playerCharge(String playerName, double amount) {
        return economy.withdrawPlayer(Bukkit.getOfflinePlayer(playerName), amount).transactionSuccess();
    }

    /**
     * Return money to player
     *
     * @param player
     * @param amount
     * @return
     */
    public boolean playerCredit(Player player, double amount) {
        return economy.depositPlayer(player, amount).transactionSuccess();
    }

    /**
     * Check whether player has money
     *
     * @param player
     * @param amount
     * @return
     */
    public static boolean hasMoney(Player player, double amount) {
        return economy.has(player, amount);
    }

    /**
     * Check whether player has money
     *
     * @param playerName
     * @param amount
     * @return
     */
    public static boolean hasMoney(String playerName, double amount) {
        return economy.has(Bukkit.getOfflinePlayer(playerName), amount);
    }

    public boolean hasWorldEdit() {
    	return worldEdit != null;
    }

    public boolean hasMcMMO() {
        return mcmmo != null;
    }

    public boolean isVanished(Player player) {
        List<MetadataValue> values = player.getMetadata("vanished");

        for (MetadataValue value : values) {
            if (value.asBoolean()) {
                return true;
            }
        }

        return false;
    }

}
