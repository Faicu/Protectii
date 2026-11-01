// Scenarii de joc pentru PreciousStones pe Spigot 26.3, jucate de roboți.
const L = require('./lib.js')
const { sleep, cmd, pst, makeBot, waitChat, tp, give, blockAt, placeOn, dig, rightClick, asPlayer, check, results, Vec3 } = L
const Y = -60 // nivelul pe care stau jucătorii în lumea plată; solul e la -61

const health = (s) => parseFloat((s.match(/health=([\d.]+)/) || [])[1])

async function main () {
  const owner = await makeBot('Owner')
  const stranger = await makeBot('Stranger')
  const victim = await makeBot('Victim')
  for (const b of [owner, stranger, victim]) {
    await cmd(`deop ${b.username}`)
    await cmd(`gamemode survival ${b.username}`)
    await pst(`perm ${b.username} preciousstones.benefit.* true`)
    await pst(`perm ${b.username} preciousstones.whitelist.* true`)
    await pst(`effects ${b.username}`)
  }
  await cmd('difficulty normal')
  await cmd('gamerule natural_regeneration false')
  await cmd('gamerule naturalRegeneration false')
  await cmd('gamerule pvp true')
  await cmd('gamerule doDaylightCycle false')
  await cmd('time set day')

  // ---------------------------------------------------------------- 1. City Protection: protecție la spart / pus
  await tp(owner, 102, Y, 0)
  await placeOn(owner, 100, Y, 0, 'diamond_block')
  check('Câmp City Protection pus (diamond_block)', (await blockAt(100, Y, 0)) === 'diamond_block')
  let n0 = owner.chatLog.length
  await asPlayer(owner, 'ps toggle welcome-message')
  await asPlayer(owner, 'ps toggle farewell-message')
  check('/ps toggle welcome-message și farewell-message', await waitChat(owner, /enabled|disabled|toggled/i, 2000, n0), owner.chatLog.slice(n0).join(' / '))

  await tp(stranger, 130, Y, 2)
  let n = stranger.chatLog.length
  let r = await pst(`move Stranger 104 ${Y} 2`)
  check('Mesaj la intrarea în câmp', await waitChat(stranger, /Entering Owner's City Protection/, 3000, n), r)

  n = stranger.chatLog.length
  await dig(stranger, 104, Y - 1, 3)
  check('Străinul NU poate sparge în câmp', (await blockAt(104, Y - 1, 3)) === 'grass_block')
  check('Mesaj „Cannot destroy here”', await waitChat(stranger, /Cannot destroy here/, 2000, n))

  await placeOn(stranger, 105, Y, 3, 'dirt')
  check('Străinul NU poate pune blocuri în câmp', (await blockAt(105, Y, 3)) === 'air')

  await tp(stranger, 101, Y, 2)
  await dig(stranger, 100, Y, 0)
  check('Străinul NU poate sparge blocul câmpului', (await blockAt(100, Y, 0)) === 'diamond_block')

  n = owner.chatLog.length
  await asPlayer(owner, 'ps allow Stranger')
  check('/ps allow Stranger', await waitChat(owner, /Stranger/i, 3000, n), owner.chatLog.slice(n).join(' / '))
  await tp(stranger, 104, Y, 2)
  await dig(stranger, 104, Y - 1, 3)
  check('Străinul permis POATE sparge în câmp', (await blockAt(104, Y - 1, 3)) === 'air')

  n = stranger.chatLog.length
  r = await pst(`move Stranger 140 ${Y} 2`)
  check('Mesaj la ieșirea din câmp', await waitChat(stranger, /Leaving Owner's City Protection/, 3000, n), r)

  // ---------------------------------------------------------------- 2. WorldEdit: //set în câmp, de un jucător nepermis
  for (const p of ['worldedit.selection.pos', 'worldedit.region.set']) await pst(`perm Victim ${p} true`)
  await tp(victim, 108, Y, 8)
  await asPlayer(victim, '/pos1 104,-61,5')
  await asPlayer(victim, '/pos2 106,-61,7')
  n = victim.chatLog.length
  await asPlayer(victim, '/set stone')
  check('WorldEdit: //set blocat în câmp', (await blockAt(105, Y - 1, 6)) === 'grass_block', victim.chatLog.slice(n).join(' / '))
  await tp(victim, 150, Y, 0)
  await asPlayer(victim, '/pos1 150,-61,4')
  await asPlayer(victim, '/pos2 152,-61,6')
  await asPlayer(victim, '/set stone')
  check('WorldEdit: //set merge în afara câmpului (control)', (await blockAt(151, Y - 1, 5)) === 'stone')

  // ---------------------------------------------------------------- 3. mcMMO: abilitățile nu sparg blocurile câmpurilor
  r = await pst('fakebreak Victim 100 -60 0')
  check('mcMMO: spargerea blocului de câmp e anulată', /diamond_block\|cancelled=true/.test(r), r)
  r = await pst('fakebreak Victim 151 -61 5')
  check('mcMMO: bloc obișnuit nu e anulat (control)', /stone\|cancelled=false/.test(r), r)

  // ---------------------------------------------------------------- 4. Entry Bouncer: intrarea interzisă
  await tp(owner, 202, Y, 0)
  await placeOn(owner, 200, Y, 0, 'lapis_block')
  check('Câmp Entry Bouncer pus', (await blockAt(200, Y, 0)) === 'lapis_block')
  await tp(stranger, 215, Y, 0)
  n = stranger.chatLog.length
  r = await pst(`move Stranger 201 ${Y} 0`)
  const sx = parseFloat((await pst('state Stranger')).match(/loc=([-\d.]+)/)[1])
  check('Entry Bouncer: străinul nu intră', sx > 205, `${r}; x=${sx}`)
  check('Mesaj „Cannot enter protected area”', await waitChat(stranger, /Cannot enter protected area/, 2000, n))

  // ---------------------------------------------------------------- 5. Proximity Snitch: înregistrează intrușii
  await tp(owner, 302, Y, 0)
  await placeOn(owner, 300, Y, 0, 'note_block')
  check('Câmp Proximity Snitch pus', (await blockAt(300, Y, 0)) === 'note_block')
  await tp(owner, 330, Y, 0) // proprietarul pleacă
  await tp(victim, 320, Y, 0)
  await pst(`move Victim 302 ${Y} 1`)
  await pst(`move Victim 320 ${Y} 1`)
  await tp(owner, 302, Y, 0)
  await cmd('minecraft:item replace entity Owner weapon.mainhand with iron_pickaxe')
  n = owner.chatLog.length
  await rightClick(owner, 300, Y, 0)
  check('Snitch: lista arată intrusul Victim', await waitChat(owner, /Victim/, 3000, n), owner.chatLog.slice(n).join(' / '))

  // ---------------------------------------------------------------- 6. GodStone: vindecă, hrănește, scoate otrava
  await tp(owner, 402, Y, 0)
  await placeOn(owner, 400, Y, 0, 'sea_lantern')
  check('Câmp GodStone pus', (await blockAt(400, Y, 0)) === 'sea_lantern')
  await tp(owner, 420, Y, 0)
  await cmd('damage Owner 10')
  await cmd('effect give Owner minecraft:poison 60 0')
  await cmd('effect give Owner minecraft:slowness 60 0')
  const before = await pst('state Owner')
  await pst(`move Owner 402 ${Y} 1`)
  await sleep(6000)
  const after = await pst('state Owner')
  check('GodStone: viața crește', health(after) > health(before), `${health(before)} → ${health(after)}`)
  check('GodStone: otrava și încetinirea scoase (nume vechi HARM/SLOW/POISON)', !/poison|slowness/.test(after), after.split('|').pop())
  await pst(`move Owner 430 ${Y} 1`)

  // ---------------------------------------------------------------- 7. Miner's Haste: efecte la intrare, scoase la ieșire
  await tp(owner, 502, Y, 0)
  await placeOn(owner, 500, Y, 0, 'ice')
  check("Câmp Miner's Haste pus", (await blockAt(500, Y, 0)) === 'ice')
  await pst('effects Owner')
  await pst(`move Owner 525 ${Y} 0`)
  await pst(`move Owner 503 ${Y} 1`)
  await sleep(3000)
  r = await pst('state Owner')
  check("Miner's Haste: haste + speed + jump_boost (nume vechi FAST_DIGGING/JUMP)", /haste/.test(r) && /speed/.test(r) && /jump_boost/.test(r), r.split('|').pop())
  await pst(`move Owner 530 ${Y} 0`)
  await sleep(2000)
  r = await pst('state Owner')
  check("Miner's Haste: efectele dispar la ieșire", !/haste|jump_boost/.test(r), r.split('|').pop())

  // ---------------------------------------------------------------- 8. Jack-o-Death: rănește intrușii
  await tp(owner, 602, Y, 0)
  await placeOn(owner, 600, Y, 0, 'jack_o_lantern')
  check('Câmp Jack-o-Death pus', (await blockAt(600, Y, 0)) === 'jack_o_lantern')
  await tp(owner, 640, Y, 0)
  await cmd('effect clear Stranger')
  await tp(stranger, 620, Y, 0)
  const sBefore = health(await pst('state Stranger'))
  await pst(`move Stranger 602 ${Y} 1`)
  await sleep(5000)
  const sAfter = health(await pst('state Stranger'))
  check('Jack-o-Death: intrusul pierde viață', sAfter < sBefore, `${sBefore} → ${sAfter}`)
  await pst(`move Stranger 640 ${Y} 5`)
  await cmd('effect give Stranger minecraft:instant_health 1 5')

  // ---------------------------------------------------------------- 9. Peace Keeper: fără PvP
  await tp(owner, 702, Y, 0)
  await placeOn(owner, 700, Y, 0, 'sponge')
  check('Câmp Peace Keeper pus', (await blockAt(700, Y, 0)) === 'sponge')
  await tp(owner, 740, Y, 0)
  await cmd('effect give Victim minecraft:instant_health 1 5')
  await tp(stranger, 760, Y, 0); await tp(victim, 761, Y, 0)
  await sleep(5000) // EssentialsX: 4 s invulnerabilitate după teleport
  let vb = health(await pst('state Victim'))
  await pst('attack Stranger Victim'); await sleep(300)
  let va = health(await pst('state Victim'))
  check('PvP merge în afara câmpului (control)', va < vb, `${vb} → ${va}`)
  await cmd('effect give Victim minecraft:instant_health 1 5')
  await tp(stranger, 702, Y, 2); await tp(victim, 703, Y, 2)
  await sleep(5000)
  vb = health(await pst('state Victim'))
  n = stranger.chatLog.length
  await pst('attack Stranger Victim'); await sleep(300)
  va = health(await pst('state Victim'))
  check('Peace Keeper: PvP blocat în câmp', va === vb, `${vb} → ${va}`)
  check('Mesaj „PvP disabled in this area”', await waitChat(stranger, /PvP disabled/, 2000, n))

  // ---------------------------------------------------------------- 10. Launch Pad: aruncă jucătorul
  await tp(owner, 802, Y, 0)
  await placeOn(owner, 800, Y, 0, 'iron_ore')
  check('Câmp Launch Pad pus', (await blockAt(800, Y, 0)) === 'iron_ore')
  await tp(owner, 810, Y, 0)
  const logOff = L.markLog()
  await pst(`move Owner 801 ${Y} 0`)
  await sleep(300)
  r = await pst('state Owner')
  const vy = parseFloat(r.match(/vel=[-\d.]+ ([-\d.]+)/)[1])
  const log = L.readLogFrom(logOff)
  check('Launch Pad: jucătorul e aruncat în sus', vy > 0.5, r.split('|').find((x) => x.startsWith('vel')))
  check('Launch Pad: fără erori în log', !/Exception|SEVERE/.test(log), (log.match(/.*Exception.*/) || [''])[0])
  await sleep(4000)

  // ---------------------------------------------------------------- 11. Grief Revert: refacerea blocurilor stricate
  await tp(owner, 902, Y, 0)
  await placeOn(owner, 900, Y, 0, 'gold_block')
  check('Câmp Grief Revert pus', (await blockAt(900, Y, 0)) === 'gold_block')
  await tp(owner, 940, Y, 0)
  await tp(victim, 904, Y, 3)
  await dig(victim, 904, Y - 1, 4)
  await dig(victim, 905, Y - 1, 4)
  const griefed = (await blockAt(904, Y - 1, 4)) === 'air' && (await blockAt(905, Y - 1, 4)) === 'air'
  await tp(owner, 902, Y, 0)
  await cmd('minecraft:item replace entity Owner weapon.mainhand with iron_pickaxe')
  await sleep(2000) // grief-ul se salvează asincron
  await rightClick(owner, 900, Y, 0)
  await sleep(1500)
  const restored = (await blockAt(904, Y - 1, 4)) === 'grass_block' && (await blockAt(905, Y - 1, 4)) === 'grass_block'
  check('Grief Revert: blocurile sparte de intrus sunt refăcute', griefed && restored, `spart=${griefed} refăcut=${restored}`)

  // ---------------------------------------------------------------- 12. WorldGuard: câmp care intră într-o regiune interzisă
  for (const p of ['worldedit.selection.pos', 'worldguard.region.define']) await pst(`perm Owner ${p} true`)
  await tp(owner, 1005, Y, 0)
  await asPlayer(owner, '/pos1 1000,-100,-30')
  await asPlayer(owner, '/pos2 1012,100,30')
  n = owner.chatLog.length
  await asPlayer(owner, 'rg define wgtest')
  check('WorldGuard: regiune creată', await waitChat(owner, /wgtest|region/i, 2000, n), owner.chatLog.slice(n).join(' / '))
  await tp(stranger, 1032, Y, 2)
  await give(stranger, 'diamond_block')
  n = stranger.chatLog.length
  await placeOn(stranger, 1030, Y, 5, 'diamond_block')
  check('WorldGuard: câmpul care atinge regiunea e refuzat', (await blockAt(1030, Y, 5)) !== 'diamond_block')
  check('Mesaj „intersects with a WorldGuard region”', await waitChat(stranger, /WorldGuard region/, 2000, n))
  await tp(stranger, 1062, Y, 2)
  await placeOn(stranger, 1060, Y, 5, 'diamond_block')
  check('WorldGuard: câmp departe de regiune e acceptat (control)', (await blockAt(1060, Y, 5)) === 'diamond_block')

  // ---------------------------------------------------------------- 13. Vault + EssentialsX: cumpărarea unui câmp cu semn [Buy]
  await cmd('eco give Victim 1000')
  await cmd('eco set Owner 0')
  await tp(owner, 103, Y, 1)
  n = owner.chatLog.length
  r = await pst('sign Owner 100 -60 0 [Buy]|100||')
  check('Semn pus pe blocul câmpului', /sign/.test(await blockAt(101, Y, 0)), r)
  check('Semn [Buy] acceptat', await waitChat(owner, /Buy sign creation successful/, 3000, n), owner.chatLog.slice(n).join(' / '))
  await cmd('tp Victim 103.5 -60 0.5 facing 101.5 -59.5 0.5')
  await sleep(300)
  n = victim.chatLog.length
  await rightClick(victim, 101, Y, 0)
  await asPlayer(victim, 'ps buy')
  check('Victim cumpără câmpul', await waitChat(victim, /You have bought this field/, 3000, n), victim.chatLog.slice(n).join(' / '))
  const bal = async (p) => { const m = await cmd(`balance ${p}`, /Balance of \S+: \$?([\d,.]+)/); return m ? parseFloat(m[1].replace(/,/g, '')) : NaN }
  const vBal = await bal('Victim'); const oBal = await bal('Owner')
  check('Vault: banii trec de la cumpărător la vânzător', vBal === 900 && oBal === 100, `Victim=${vBal} Owner=${oBal}`)
  await tp(stranger, 104, Y, 2)
  await dig(stranger, 104, Y - 1, 4)
  check('După cumpărare, lista de permisiuni e golită (Stranger nu mai poate sparge)', (await blockAt(104, Y - 1, 4)) === 'grass_block')

  for (const b of [owner, stranger, victim]) b.quit()
  await sleep(1000)
  const failed = results.filter((x) => !x.ok)
  console.log(`\nREZULTAT: ${results.length - failed.length}/${results.length} OK`)
  process.exit(0)
}

main().catch((e) => { console.log('CRASH', e.stack); process.exit(1) })
