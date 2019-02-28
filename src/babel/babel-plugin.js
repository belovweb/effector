//@noflow

const importName = 'effector'

module.exports = function(babel, options = {}) {
  const defaultCreators = ['createStore']
  const storeCreators = new Set(options.storeCreators || defaultCreators)

  const {types: t} = babel

  return {
    name: '@effector/babel-plugin', // not required
    visitor: {
      ImportDeclaration(path) {
        const source = path.node.source.value
        const specifiers = path.node.specifiers
        if (source === importName) {
          for (const specifier of specifiers.filter(
            s => s.imported && storeCreators.has(s.imported.name),
          )) {
            storeCreators.add(specifier.local.name)
          }
        }
      },

      CallExpression(path) {
        if (t.isIdentifier(path.node.callee)) {
          if (storeCreators.has(path.node.callee.name)) {
            // functionNames[0] = 'setStoreName'
            // addImportDeclaration(
            //   findProgram(path, t, functionNames),
            //   t,
            //   functionNames,
            // )
            const id = findCandidateNameForExpression(path)
            if (id) {
              setStoreNameAfter(path, id, babel.types)
            }
          }
        }

        if (t.isMemberExpression(path.node.callee)) {
          if (path.node.callee.property.name === 'store') {
            // functionNames[0] = 'setStoreName'
            // addImportDeclaration(
            //   findProgram(path, t, functionNames),
            //   t,
            //   functionNames,
            // )
            const id = findCandidateNameForExpression(path)
            if (id) {
              setStoreNameAfter(path, id, babel.types)
            }
          }
        }
      },
    },
  }
}

// function addImportDeclaration(path, t, names) {
//   if (!path) return
//   const importDeclaration = t.importDeclaration(
//     names.map(name =>
//       t.importSpecifier(t.identifier(name), t.identifier(name)),
//     ),
//     t.stringLiteral(importName),
//   )
//   importDeclaration.leadingComments = path.node.body[0].leadingComments
//   path.unshiftContainer('body', importDeclaration)
// }

function findCandidateNameForExpression(path) {
  let id
  path.find(path => {
    if (path.isAssignmentExpression()) {
      id = path.node.left
      // } else if (path.isObjectProperty()) {
      // id = path.node.key;
    } else if (path.isVariableDeclarator()) {
      id = path.node.id
    } else if (path.isStatement()) {
      // we've hit a statement, we should stop crawling up
      return true
    }

    // we've got an id! no need to continue
    if (id) return true
  })
  return id
}

function setStoreNameAfter(path, nameNodeId, t) {
  let displayName
  if (!displayName) {
    displayName = nameNodeId.name
  }

  let args
  path.find(path => {
    if (path.isCallExpression()) {
      args = path.node.arguments
      return true
    }
  })

  if (args && displayName) {
    const oldConfig = args[1]
    const nameExpr = t.objectExpression([])
    const nameProp = t.objectProperty(
      t.identifier('name'),
      t.stringLiteral(displayName),
    )
    args[1] = nameExpr
    if (oldConfig) {
      args[1].properties.push(t.objectProperty(t.identifier('ɔ'), oldConfig))
    }
    args[1].properties.push(nameProp)
  }
}
