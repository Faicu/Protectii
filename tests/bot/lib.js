// Unelte comune pentru testele PreciousStones: roboți, consola serverului, logul.
const fs = require('fs')
const { execFileSync } = require('child_process')
const mineflayer = require('mineflayer')
const { Vec3 } = require('vec3')

const ROOT = process.env.PSTEST_DIR || '/var/tmp/pstest'
const LOG = ROOT + '/server/console.log'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let logOffset = fs.statSync(LOG).size
function markLog () { logOffset = fs.statSync(LOG).size; return logOffset }
function readLogFrom (off) { const fd = fs.openSync(LOG, 'r'); const size = fs.statSync(LOG).size; const buf = Buffer.alloc(size - off); fs.readSync(fd, buf, 0, buf.length, off); fs.closeSync(fd); return buf.toString() }

// Trimite o comandă în consola serverului și așteaptă (opțional) o linie din log.
async function cmd (command, expect, timeout = 5000) {
  const off = markLog()
  execFileSync('tmux', ['send-keys', '-t', 'pstest', command, 'Enter'])
  if (!expect) { await sleep(400); return readLogFrom(off) }
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) {
    const txt = readLogFrom(off)
    const m = txt.match(expect)
    if (m) return m
    await sleep(100)
  }
  return null
}

const pst = async (args) => {
  const m = await cmd('pst ' + args, /PST\|([^\n]*)/)
  return m ? m[1] : 'NO RESPONSE'
}

// Robot: nu trimite pachete de mișcare (ViaProxy le strică), doar confirmă teleportările.
function makeBot (name) {
  return new Promise((resolve, reject) => {
    const bot = mineflayer.createBot({ host: '127.0.0.1', port: 25600, username: name, version: '26.1', auth: 'offline' })
    const orig = bot._client.write.bind(bot._client)
    bot._client.write = (packet, data) => {
      if (packet === 'position' || packet === 'position_look' || packet === 'look') return
      return orig(packet, data)
    }
    bot.chatLog = []
    bot.on('messagestr', (m) => bot.chatLog.push(m))
    bot.on('kicked', (r) => console.log(`[${name}] KICKED`, JSON.stringify(r).slice(0, 300)))
    bot.on('error', (e) => console.log(`[${name}] ERROR`, e.message))
    bot.once('spawn', async () => { await sleep(10 * 50); resolve(bot) })
    setTimeout(() => reject(new Error('spawn timeout ' + name)), 20000)
  })
}

async function waitChat (bot, re, timeout = 5000, from = 0) {
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) {
    const hit = bot.chatLog.slice(from).find((m) => re.test(m))
    if (hit) return hit
    await sleep(100)
  }
  return null
}

async function tp (bot, x, y, z) {
  await cmd(`tp ${bot.username} ${x} ${y} ${z}`)
  await sleep(4 * 50)
}

async function give (bot, item, count = 1) {
  await cmd(`give ${bot.username} ${item} ${count}`)
  const t0 = Date.now()
  while (Date.now() - t0 < 3000) {
    const it = bot.inventory.items().find((i) => i.name === item)
    if (it) { await bot.equip(it, 'hand'); return true }
    await sleep(100)
  }
  return false
}

async function blockAt (x, y, z) {
  const r = await pst(`block ${x} ${y} ${z}`)
  return r.split('|').pop()
}

// Pune un bloc ca jucătorul (pe server, prin BlockPlaceEvent: pachetul de pus blocuri e stricat de ViaProxy).
async function placeOn (bot, x, y, z, material) {
  return pst(`place ${bot.username} ${x} ${y} ${z} ${material}`)
}

// Spargere ca jucătorul (pe server, prin BlockBreakEvent: robotul nu primește chunk-urile departe de spawn).
async function dig (bot, x, y, z) {
  const r = await pst(`break ${bot.username} ${x} ${y} ${z}`)
  await sleep(200)
  return r
}

async function rightClick (bot, x, y, z) {
  const r = await pst(`interact ${bot.username} ${x} ${y} ${z} right`)
  await sleep(300)
  return r
}

// Comandă rulată ca jucătorul; răspunsul ajunge în chat-ul robotului.
async function asPlayer (bot, command) {
  const r = await pst(`cmd ${bot.username} ${command}`)
  await sleep(400)
  return r
}

const results = []
function check (name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail })
  console.log(`${ok ? 'OK   ' : 'FAIL '} ${name}${detail ? '  — ' + detail : ''}`)
}

module.exports = { sleep, cmd, pst, makeBot, waitChat, tp, give, blockAt, placeOn, dig, rightClick, asPlayer, check, results, markLog, readLogFrom, Vec3 }
