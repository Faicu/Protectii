// Translocation: blocurile dispar la dezactivare, rămân salvate peste restart, revin la activare.
const L = require('./lib.js')
const Y = -60
const blocks = [[1103, 'stone'], [1104, 'oak_planks'], [1105, 'glass'], [1106, 'red_wool']]
const phase = process.argv[2]
const types = async () => { const r = []; for (const [x] of blocks) r.push(await L.blockAt(x, Y, 3)); return r.join(',') }
;(async () => {
  const o = await L.makeBot('Owner')
  await L.pst('perm Owner preciousstones.benefit.* true')
  await L.pst('perm Owner preciousstones.translocation.* true')
  await L.tp(o, 1102, Y, 0)
  let n
  if (phase === 'before') {
    await L.placeOn(o, 1100, Y, 0, 'red_mushroom_block')
    n = o.chatLog.length
    await L.asPlayer(o, 'ps setname tl')
    L.check('Translocation: creată după denumire', await L.waitChat(o, /Translocation tl created/, 3000, n))
    for (const [x, m] of blocks) await L.placeOn(o, x, Y, 3, m)
    await L.sleep(2000)
    n = o.chatLog.length
    await L.asPlayer(o, 'ps translocation list')
    L.check('Translocation: 4 blocuri înregistrate', await L.waitChat(o, /has 4 stored blocks|4/, 3000, n), o.chatLog.slice(n).join(' / '))
    await L.asPlayer(o, 'ps disable')
    await L.sleep(3000)
    const t = await types()
    L.check('Translocation: la dezactivare blocurile dispar', t === 'air,air,air,air', t)
  } else {
    const t0 = await types()
    L.check('Translocation: după restart blocurile sunt tot ascunse', t0 === 'air,air,air,air', t0)
    await L.asPlayer(o, 'ps enable')
    await L.sleep(3000)
    const t = await types()
    L.check('Translocation: la activare revin exact aceleași blocuri', t === blocks.map((b) => b[1]).join(','), t)
    await L.asPlayer(o, 'ps disable'); await L.sleep(3000)
    await L.asPlayer(o, 'ps enable'); await L.sleep(3000)
    const t2 = await types()
    L.check('Translocation: încă un ciclu dezactivare/activare', t2 === blocks.map((b) => b[1]).join(','), t2)
  }
  o.quit(); setTimeout(() => process.exit(0), 300)
})()
