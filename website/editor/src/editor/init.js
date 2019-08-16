//@flow

import {createStoreObject, sample, forward} from 'effector'

import {
  changeSources,
  codeCursorActivity,
  codeMarkLine,
  evalEffect,
  selectVersion,
} from '.'
import {sourceCode, codeError, version} from './state'
import {retrieveCode, retrieveVersion} from './retrieve'
import {compress} from './compression'
import {typeAtPos, typeNode} from '../flow/domain'
import {resetGraphiteState} from '../graphite/domain'
import {evaluator, versionLoader} from '../evaluator'
import {typechecker, typeHoverToggle} from '../settings/domain'

evalEffect.use(evaluator)

version.on(selectVersion, (_, p) => p)

codeCursorActivity.watch(editor => {
  const cursor = editor.getCursor()
  const body = editor.getValue()
  const line = cursor.line + 1
  const col = cursor.ch
  typeAtPos({
    filename: '/static/repl.js',
    body,
    line,
    col,
  })
})

sample({
  source: typeHoverToggle,
  clock: codeCursorActivity,
  fn: (enabled, editor) => ({enabled, editor}),
  //$off
}).watch(({enabled, editor}) => {
  const cursor = editor.getCursor()
  if (cursor.line === 0 && cursor.ch === 0) return
  if (enabled) {
    editor.addWidget(
      {
        line: cursor.line,
        ch: cursor.ch,
      },
      typeNode.current,
    )
    if (cursor.outside) {
      typeNode.hide()
    } else {
      typeNode.show()
    }
  }
})

//$off
forward({
  from: evalEffect,
  to: resetGraphiteState,
})

codeError
  .on(evalEffect.done, () => ({
    isError: false,
    error: null,
    stackFrames: [],
  }))
  .on(evalEffect.fail, (_, e) => {
    if ('stack' in e.error) {
      return {
        isError: true,
        error: e.error,
        stackFrames: [],
      }
    }
    return {
      isError: true,
      error: e.error.original,
      stackFrames: e.error.stackFrames,
    }
  })

let textMarker
codeError.watch(async({stackFrames}) => {
  if (textMarker) textMarker.clear()
  for (const frame of stackFrames) {
    if (frame._originalFileName !== 'repl.js') continue
    const line = (frame._originalLineNumber || 0) - 1
    const ch = frame._originalColumnNumber || 0
    textMarker = await codeMarkLine({
      from: {line, ch},
      options: {className: 'CodeMirror-lint-mark-error'},
    })
  }
})

changeSources.map(compress).watch(code => {
  localStorage.setItem('code-compressed', code)
})

forward({
  from: changeSources,
  to: sourceCode,
})

{
  const initStore = createStoreObject({
    sourceCode,
    versionLoader,
    typechecker,
  })
  initStore.watch(data => {
    console.log('init store update', data)
    evalEffect(data.sourceCode)
  })
}

changeSources(retrieveCode())
selectVersion(retrieveVersion())
