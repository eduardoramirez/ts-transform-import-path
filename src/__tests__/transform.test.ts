import 'jest'
import {resolve} from 'path'
import {readFileSync} from 'fs'
import * as ts from 'typescript'

import {transformerFactory} from '../index'

describe('transforms', () => {
  const filesToCompile = [
    resolve(__dirname, 'src', 'index.ts'),
    resolve(__dirname, 'src', 'test.ts'),
  ]
  const program = ts.createProgram(filesToCompile, {
    target: ts.ScriptTarget.ES2015,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    module: ts.ModuleKind.ESNext,
    declaration: true,
    strict: true,
    baseUrl: `${__dirname}`,
  })

  it('transforms base url paths into relative paths', async () => {
    program.emit(undefined, undefined, undefined, undefined, {
      after: [transformerFactory({rootDir: 'src'})],
      afterDeclarations: [transformerFactory({rootDir: 'src'})],
    })

    const emittedJsFile = await readFileSync(resolve(__dirname, 'src/index.js'), {encoding: 'utf8'})
    const emittedDtsFile = await readFileSync(resolve(__dirname, 'src/index.d.ts'), {
      encoding: 'utf8',
    })

    expect(emittedJsFile).toContain('import { test } from "./test";')
    expect(emittedJsFile).toContain('import { C } from "./helpers/miniHelpers";')
    expect(emittedDtsFile).toContain('export { test } from "./test";')
  })
})
