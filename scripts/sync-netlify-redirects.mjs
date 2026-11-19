// Writes one-hop redirects for the short spoken addresses into netlify.toml.
// Without this, quizliai.com/ww1 goes apex -> www -> /study/<slug> (two hops). With it, one hop.
// Run after changing content/study/aliases.js:  node scripts/sync-netlify-redirects.mjs
import { createRequire } from "module"
import { readFileSync, writeFileSync } from "fs"

const require = createRequire(import.meta.url)
const aliases = require("../content/study/aliases.js")
const START = "# BEGIN short-address redirects (generated)"
const END = "# END short-address redirects"

let block = `${START}\n# Generated from content/study/aliases.js by scripts/sync-netlify-redirects.mjs. Do not edit by hand.\n`
for (const [alias, slug] of Object.entries(aliases)) {
  for (const host of ["https://quizliai.com", "https://www.quizliai.com"]) {
    block += `[[redirects]]\n  from = "${host}/${alias}"\n  to = "https://www.quizliai.com/study/${slug}"\n  status = 302\n  force = true\n`
  }
}
block += `${END}\n`

let toml = readFileSync("netlify.toml", "utf8")
const a = toml.indexOf(START)
if (a >= 0) {
  const b = toml.indexOf(END) + END.length + 1
  toml = toml.slice(0, a) + block + toml.slice(b)
} else {
  toml = toml.replace(/\n*$/, "\n\n") + block
}
writeFileSync("netlify.toml", toml)
console.log("wrote", Object.keys(aliases).length, "aliases (", Object.keys(aliases).length * 2, "rules )")
