const fs = require('fs')
const path = require('path')
const svelte = require('svelte/compiler')

function getCSS(expr, dir) {
  let value = expr.type === 'Url'
        ? expr.value.value
        : expr.value
  const relative = value.substring(1, value.length - 1)
  const filepath = path.join(dir, relative)
  	
  return fs.readFileSync(filepath, "utf8")
}

function getCode(content, imports) {
  let result = ''
  const end = imports.reduce((end, imp) => {
    result += content.substring(end, imp.start) + imp.css
    return imp.end
  }, 0)
  result += content.substring(end, content.length)
  return result
}

const markup = async ({content, filename}) => {
  const ast = svelte.parse(content).css
  if (!ast) return
  
  const dir = path.dirname(filename)
  const imports = []
  await svelte.walk(ast, { enter(node) {
    if (node.type === 'Style') return
    if (node.type !== 'Atrule' || node.name !== 'import')
    return this.skip()
    
    const atrule = {start: node.start, end: node.end}
    const children = node.expression.children
    const css = getCSS(children[0], dir)
  
    atrule.css = children.length < 3 ? css
      : `\n@media ${ content.substring(children[2].start, children[2].end) } {\n${css}\n}\n`
  
    imports.push(atrule)
  } })
  const code = getCode(content, imports)
  return {code}
}


module.exports = { markup }