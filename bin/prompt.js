/*
 * Used for prompt popup on vim
 */
const readline = require("readline")
const path = require("path")
const fs = require("fs")
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true,
  escapeCodeTimeout: 0,
  prompt: ''
})

var history = []
const history_file = path.resolve(__dirname, 'coc-prompt-history.json')
try {
  history = fs.existsSync(history_file) ? JSON.parse(fs.readFileSync(history_file, 'utf8')).filter(Boolean) : []
} catch {}

function writeHistory() {
  const newHistory = Array.from(new Set(history.slice(-100).reverse()))
    .reverse()
    .filter((x) => x.trim().length > 2)
  fs.writeFileSync(history_file, JSON.stringify(newHistory, null, 2))
}

history.push(process.argv[2] || '')
let history_cursor = history.length - 1
let value = process.argv[2]
let placeholder = process.argv[3]
let clear = false
if (value) {
  rl.write(value)
} else if (placeholder) {
  clear = true
  rl.write('\x1B[90m' + placeholder + '\x1B[39m')
  rl.write('', {ctrl: true, name: 'a'})
}
rl.on('line', (input) => {
  history.push(input)
  writeHistory()
  send(['confirm', clear ? '' : input])
  process.exit()
})

function clearLine() {
  rl.write('', { ctrl: true, name: 'a' })
  rl.write('', { ctrl: true, name: 'k' })
}

let original_ttyWrite = rl._ttyWrite
rl._ttyWrite = function (code, key) {
  if (key.name === 'enter') {
    send(['send', '<C-j>'])
    return ''
  }
  if (key.name === 'up') {
    if (history_cursor > 0) {
      const prev = history[--history_cursor]
      if (prev) {
        clearLine()
        rl.write(prev, {})
      }
      return
    }
  } else if (key.name === 'down') {
    if (history.length - history_cursor > 1) {
      const next = history[++history_cursor]
      clearLine()
      rl.write(next, {})
      return
    }
  }
  original_ttyWrite.apply(rl, arguments)
  if (clear && rl.line.includes('\x1B')) {
    clear = false
    rl.write('', { ctrl: true, name: 'k' })
    return
  }
  send(['change', rl.line])
}

function createSequences(str) {
  return '\033]51;' + str + '\x07'
}

function send(args) {
  process.stdout.write(createSequences(JSON.stringify(['call', 'CocPopupCallback', args])))
}

process.stdin.on('keypress', (e, key) => {
  if (key) {
    let k = getKey(key)
    if (k == '<bs>') {
      return
    }
    if (k == '<esc>') {
      send(['exit', ''])
      history.push(rl.line)
      writeHistory()
      process.exit()
    }
    if (k) {
      send(['send', k])
      return
    }
  }
})

function getKey(key) {
  if (key.ctrl === true) {
    if (key.name == 'n') {
      return '<C-n>'
    }
    if (key.name == 'p') {
      return '<C-p>'
    }
    if (key.name == 'j') {
      return '<C-j>'
    }
    if (key.name == 'k') {
      return '<C-k>'
    }
    if (key.name == 'f') {
      return '<C-f>'
    }
    if (key.name == 't') {
      return '<C-t>'
    }
    if (key.name == 'b') {
      return '<C-b>'
    }
    if (key.sequence == '\x00') {
      return '<C-@>'
    }
  }
  if (key.sequence == '\u001b') {
    return '<esc>'
  }
  if (key.sequence == '\r') {
    return '<cr>'
  }
  if (key.sequence == '\t') {
    return key.shift ? '<s-tab>' : '<tab>'
  }
  if (key.name == 'up') {
    return '<up>'
  }
  if (key.name == 'down') {
    return '<down>'
  }
  return ''
}
