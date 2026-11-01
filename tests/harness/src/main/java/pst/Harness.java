package pst;

import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.block.BlockFace;
import org.bukkit.block.BlockState;
import org.bukkit.block.Sign;
import org.bukkit.block.data.type.WallSign;
import org.bukkit.block.sign.Side;
import org.bukkit.event.block.Action;
import org.bukkit.event.block.BlockBreakEvent;
import org.bukkit.event.block.BlockPlaceEvent;
import org.bukkit.event.block.SignChangeEvent;
import org.bukkit.event.player.PlayerInteractEvent;
import org.bukkit.inventory.EquipmentSlot;
import org.bukkit.inventory.ItemStack;
import org.bukkit.World;
import org.bukkit.attribute.Attribute;
import org.bukkit.block.Block;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.bukkit.event.Event;
import org.bukkit.event.Cancellable;
import org.bukkit.event.player.PlayerMoveEvent;
import org.bukkit.event.player.PlayerTeleportEvent;
import org.bukkit.permissions.PermissionAttachment;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.potion.PotionEffect;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Comenzi de test pentru PreciousStones. Toate rezultatele încep cu "PST|" în log.
 */
public class Harness extends JavaPlugin {
    private final Map<UUID, PermissionAttachment> attachments = new HashMap<>();

    private void out(String msg) {
        getLogger().info("PST|" + msg);
    }

    private Player player(String name) {
        Player p = Bukkit.getPlayerExact(name);
        if (p == null) {
            out("error|no player " + name);
        }
        return p;
    }

    private static String loc(Location l) {
        return String.format("%.2f %.2f %.2f", l.getX(), l.getY(), l.getZ());
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] a) {
        try {
            run(a);
        } catch (Exception ex) {
            out("error|" + ex);
            ex.printStackTrace();
        }
        return true;
    }

    private void run(String[] a) throws Exception {
        World world = Bukkit.getWorlds().get(0);
        switch (a[0]) {
            case "move" -> {
                // Merge pas cu pas (0,5 blocuri) și declanșează PlayerMoveEvent la fiecare pas, ca un jucător real.
                Player p = player(a[1]);
                if (p == null) return;
                Location target = new Location(p.getWorld(), Double.parseDouble(a[2]), Double.parseDouble(a[3]), Double.parseDouble(a[4]));
                int steps = Math.max(1, (int) Math.ceil(p.getLocation().distance(target) / 0.5));
                Location start = p.getLocation().clone();
                for (int i = 1; i <= steps; i++) {
                    Location from = p.getLocation().clone();
                    Location to = start.clone().add(target.clone().subtract(start).toVector().multiply((double) i / steps));
                    to.setYaw(from.getYaw());
                    to.setPitch(from.getPitch());
                    PlayerMoveEvent ev = new PlayerMoveEvent(p, from, to);
                    Bukkit.getPluginManager().callEvent(ev);
                    if (ev.isCancelled()) {
                        out("move|" + p.getName() + "|cancelled at " + loc(from));
                        return;
                    }
                    if (p.getLocation().distanceSquared(from) > 0.0001) {
                        out("move|" + p.getName() + "|moved by plugin to " + loc(p.getLocation()));
                        return;
                    }
                    p.teleport(ev.getTo(), PlayerTeleportEvent.TeleportCause.UNKNOWN);
                }
                out("move|" + p.getName() + "|arrived " + loc(p.getLocation()));
            }
            case "perm" -> {
                Player p = player(a[1]);
                if (p == null) return;
                PermissionAttachment att = attachments.get(p.getUniqueId());
                if (att == null || att.getPermissible() != p) {
                    att = p.addAttachment(this);
                    attachments.put(p.getUniqueId(), att);
                }
                att.setPermission(a[2], Boolean.parseBoolean(a[3]));
                out("perm|" + p.getName() + "|" + a[2] + "=" + p.hasPermission(a[2]));
            }
            case "state" -> {
                Player p = player(a[1]);
                if (p == null) return;
                String effects = p.getActivePotionEffects().stream()
                        .map(e -> e.getType().getKeyOrThrow().getKey() + ":" + e.getAmplifier())
                        .sorted().collect(Collectors.joining(","));
                out("state|" + p.getName() + "|loc=" + loc(p.getLocation())
                        + "|health=" + p.getHealth() + "/" + p.getAttribute(Attribute.MAX_HEALTH).getValue()
                        + "|food=" + p.getFoodLevel()
                        + "|mode=" + p.getGameMode() + "|fly=" + p.getAllowFlight()
                        + "|vel=" + String.format("%.2f %.2f %.2f", p.getVelocity().getX(), p.getVelocity().getY(), p.getVelocity().getZ())
                        + "|effects=" + effects);
            }
            case "block" -> {
                Block b = world.getBlockAt(Integer.parseInt(a[1]), Integer.parseInt(a[2]), Integer.parseInt(a[3]));
                out("block|" + a[1] + " " + a[2] + " " + a[3] + "|" + b.getType().getKey().getKey());
            }
            case "fakebreak" -> {
                // Evenimentul pe care mcMMO îl trimite înainte să spargă un bloc cu o abilitate (ex. Tree Feller).
                Player p = player(a[1]);
                if (p == null) return;
                Block b = world.getBlockAt(Integer.parseInt(a[2]), Integer.parseInt(a[3]), Integer.parseInt(a[4]));
                Class<?> cls = Class.forName("com.gmail.nossr50.events.fake.FakeBlockBreakEvent", true,
                        Bukkit.getPluginManager().getPlugin("mcMMO").getClass().getClassLoader());
                Event ev = (Event) cls.getConstructor(Block.class, Player.class).newInstance(b, p);
                Bukkit.getPluginManager().callEvent(ev);
                out("fakebreak|" + b.getType().getKey().getKey() + "|cancelled=" + ((Cancellable) ev).isCancelled());
            }
            case "effects" -> {
                Player p = player(a[1]);
                if (p == null) return;
                for (PotionEffect e : p.getActivePotionEffects()) {
                    p.removePotionEffect(e.getType());
                }
                out("effects|" + p.getName() + "|cleared");
            }
            case "place" -> {
                // Ca serverul la un bloc pus de jucător: pune blocul, trimite BlockPlaceEvent, anulează dacă e refuzat.
                Player p = player(a[1]);
                if (p == null) return;
                Block b = world.getBlockAt(Integer.parseInt(a[2]), Integer.parseInt(a[3]), Integer.parseInt(a[4]));
                Material mat = Material.matchMaterial(a[5]);
                ItemStack item = new ItemStack(mat);
                p.getInventory().setItemInMainHand(item);
                BlockState replaced = b.getState();
                b.setType(mat, false);
                BlockPlaceEvent ev = new BlockPlaceEvent(b, replaced, b.getRelative(BlockFace.DOWN), item, p, true, EquipmentSlot.HAND);
                Bukkit.getPluginManager().callEvent(ev);
                if (ev.isCancelled() || !ev.canBuild()) {
                    replaced.update(true, false);
                    out("place|" + p.getName() + "|" + a[5] + "|cancelled");
                } else {
                    p.getInventory().setItemInMainHand(null);
                    out("place|" + p.getName() + "|" + a[5] + "|placed");
                }
            }
            case "sign" -> {
                // Semn pe peretele de est al blocului (x,y,z), apoi SignChangeEvent cu textul dat (linii separate de ';').
                Player p = player(a[1]);
                if (p == null) return;
                Block against = world.getBlockAt(Integer.parseInt(a[2]), Integer.parseInt(a[3]), Integer.parseInt(a[4]));
                Block b = against.getRelative(BlockFace.EAST);
                BlockState replaced = b.getState();
                b.setType(Material.OAK_WALL_SIGN, false);
                WallSign data = (WallSign) b.getBlockData();
                data.setFacing(BlockFace.EAST);
                b.setBlockData(data, false);
                String[] lines = (String.join(" ", java.util.Arrays.copyOfRange(a, 5, a.length)) + "||||").split("\\|", -1);
                lines = java.util.Arrays.copyOf(lines, 4);
                ItemStack item = new ItemStack(Material.OAK_SIGN);
                BlockPlaceEvent pe = new BlockPlaceEvent(b, replaced, against, item, p, true, EquipmentSlot.HAND);
                Bukkit.getPluginManager().callEvent(pe);
                if (pe.isCancelled()) {
                    replaced.update(true, false);
                    out("sign|cancelled at place");
                    return;
                }
                SignChangeEvent se = new SignChangeEvent(b, p, lines, Side.FRONT);
                Bukkit.getPluginManager().callEvent(se);
                if (se.isCancelled()) {
                    out("sign|cancelled at text");
                    return;
                }
                Sign sign = (Sign) b.getState();
                for (int i = 0; i < 4; i++) {
                    sign.getSide(Side.FRONT).setLine(i, se.getLine(i) == null ? "" : se.getLine(i));
                }
                sign.update(true, false);
                out("sign|placed|" + String.join(";", se.getLines()));
            }
            case "break" -> {
                // Ca serverul când jucătorul termină de spart un bloc: BlockBreakEvent, apoi blocul dispare dacă nu e anulat.
                Player p = player(a[1]);
                if (p == null) return;
                Block b = world.getBlockAt(Integer.parseInt(a[2]), Integer.parseInt(a[3]), Integer.parseInt(a[4]));
                String type = b.getType().getKey().getKey();
                BlockBreakEvent ev = new BlockBreakEvent(b, p);
                Bukkit.getPluginManager().callEvent(ev);
                if (!ev.isCancelled()) {
                    b.setType(Material.AIR);
                }
                out("break|" + p.getName() + "|" + type + "|" + (ev.isCancelled() ? "cancelled" : "broken"));
            }
            case "interact" -> {
                // Click pe bloc (right/left), ca PlayerInteractEvent trimis de server.
                Player p = player(a[1]);
                if (p == null) return;
                Block b = world.getBlockAt(Integer.parseInt(a[2]), Integer.parseInt(a[3]), Integer.parseInt(a[4]));
                Action action = a[5].equals("left") ? Action.LEFT_CLICK_BLOCK : Action.RIGHT_CLICK_BLOCK;
                PlayerInteractEvent ev = new PlayerInteractEvent(p, action, p.getInventory().getItemInMainHand(), b, BlockFace.UP, EquipmentSlot.HAND);
                Bukkit.getPluginManager().callEvent(ev);
                out("interact|" + p.getName() + "|" + b.getType().getKey().getKey() + "|denied=" + (ev.useInteractedBlock() == Event.Result.DENY));
            }
            case "attack" -> {
                Player p = player(a[1]);
                Player v = player(a[2]);
                if (p == null || v == null) return;
                double before = v.getHealth();
                v.setNoDamageTicks(0);
                v.damage(1.0, p);
                out("attack|" + p.getName() + "->" + v.getName() + "|" + before + "->" + v.getHealth());
            }
            case "cmd" -> {
                // Comandă rulată ca jucătorul (răspunsurile ajung în chat-ul robotului).
                Player p = player(a[1]);
                if (p == null) return;
                String c = String.join(" ", java.util.Arrays.copyOfRange(a, 2, a.length));
                boolean ok = p.performCommand(c);
                out("cmd|" + p.getName() + "|" + c + "|" + ok);
            }
            default -> out("error|unknown " + a[0]);
        }
    }
}
