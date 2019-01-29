import * as ts from 'typescript'
import {relative, resolve, dirname} from 'path'

interface ProjectConfig {
  projectRootPath: string
  rootDir: string
}

function relativizePath(
  sf: ts.SourceFile,
  projectRootPath: string,
  importPath: string
): string | null {
  const absoluteImportPath = resolve(projectRootPath, importPath)
  const relativeImportPath = relative(dirname(sf.fileName), absoluteImportPath)

  // It probably was in the same directory
  if (!relativeImportPath.startsWith('.')) {
    return `./${relativeImportPath}`
  }

  return relativeImportPath
}

function getRelativeImportPath(
  sf: ts.SourceFile,
  {rootDir, projectRootPath}: ProjectConfig,
  node: ts.ExportDeclaration | ts.ImportDeclaration
): string {
  const fullImportPath = node.moduleSpecifier.getText(sf)
  const importPath = fullImportPath.slice(1, fullImportPath.length - 1)

  if (!importPath.startsWith(rootDir)) {
    return null
  }

  return relativizePath(sf, projectRootPath, importPath)
}

function visitor(ctx: ts.TransformationContext, sf: ts.SourceFile, config: ProjectConfig) {
  const visitor: ts.Visitor = (node: ts.Node): ts.Node => {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
      const relativePath = getRelativeImportPath(sf, config, node)
      if (relativePath) {
        return ts.createImportDeclaration(
          undefined,
          undefined,
          node.importClause,
          ts.createLiteral(relativePath)
        )
      }
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      const relativePath = getRelativeImportPath(sf, config, node)
      if (relativePath) {
        return ts.createExportDeclaration(
          undefined,
          undefined,
          node.exportClause,
          ts.createLiteral(relativePath)
        )
      }
    }

    return ts.visitEachChild(node, visitor, ctx)
  }

  return visitor
}

export interface TransformerOptions {
  rootDir: string
}

export function transformerFactory({
  rootDir,
}: TransformerOptions): ts.TransformerFactory<ts.SourceFile> {
  return (ctx: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
    const {baseUrl} = ctx.getCompilerOptions()
    if (!baseUrl) {
      throw new Error('No `baseUrl` was found in tsconfig.json.')
    }

    const config = {
      rootDir,
      projectRootPath: resolve(baseUrl),
    }

    return (sf: ts.SourceFile) => ts.visitNode(sf, visitor(ctx, sf, config))
  }
}

export default function transform(_: ts.Program, opts: TransformerOptions) {
  return transformerFactory(opts)
}
