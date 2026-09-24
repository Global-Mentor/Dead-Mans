import ts from 'typescript'

export function inspectUiBoundaries(sourceFile) {
  const findings = []
  const filename = sourceFile.fileName.replaceAll('\\', '/')
  // Outside component owners, MUI supplies layout, typography and theme utilities only.
  // An allowlist also covers newly introduced MUI controls without a growing denylist.
  const foundations = new Set([
    'Box',
    'Stack',
    'Typography',
    'SvgIcon',
    'Collapse',
    'ClickAwayListener',
    'CssBaseline',
    'ThemeProvider',
    'alpha',
    'createTheme',
    'useMediaQuery',
    'useTheme',
    'styled',
  ])
  const nativeControls = new Set(['button', 'input', 'select', 'textarea', 'details', 'summary'])
  const ownsUi = filename.includes('/shared/ui/')
  const dialogNames = new Set(['AppDialog'])
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue
    const bindings = statement.importClause?.namedBindings
    if (bindings && ts.isNamedImports(bindings)) {
      for (const binding of bindings.elements) {
        if ((binding.propertyName ?? binding.name).text === 'AppDialog')
          dialogNames.add(binding.name.text)
      }
    }
  }
  function visit(node) {
    if (
      !ownsUi &&
      /\/(?:features|layouts|shared\/game-ui)\//.test(filename) &&
      ts.isPropertyAssignment(node) &&
      node.name?.getText(sourceFile) === 'borderRadius'
    ) {
      const value = node.initializer
      // Circular intrinsic marks (avatar/status dots) are not card surfaces.
      const circularMark = ts.isStringLiteralLike(value) && value.text === '50%'
      const square = ts.isNumericLiteral(value) && value.text === '0'
      const themeRadius = value.getText(sourceFile) === 'theme.shape.borderRadius'
      if (!circularMark && !square && !themeRadius)
        findings.push({ node, message: 'Use a shared surface instead of a local corner radius' })
    }

    const declaration = ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
    const moduleName =
      declaration && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)
        ? node.moduleSpecifier.text
        : null
    const typeOnly = ts.isImportDeclaration(node) ? node.importClause?.isTypeOnly : node.isTypeOnly
    if (!ownsUi && moduleName && /^@mui\/(material|system)(?:\/|$)/.test(moduleName) && !typeOnly) {
      const bindings = ts.isImportDeclaration(node)
        ? node.importClause?.namedBindings
        : node.exportClause
      const named = bindings && (ts.isNamedImports(bindings) || ts.isNamedExports(bindings))
      const invalidBinding =
        named &&
        bindings.elements.some(
          (binding) =>
            !binding.isTypeOnly && !foundations.has((binding.propertyName ?? binding.name).text),
        )
      const subpath = moduleName.split('/').slice(2).join('/')
      const invalidSubpath = subpath && subpath !== 'styles' && !foundations.has(subpath)
      const opaqueBindings = bindings && !named
      const opaqueDefault =
        ts.isImportDeclaration(node) && node.importClause?.name && !foundations.has(subpath)
      const wildcardExport = ts.isExportDeclaration(node) && !bindings
      if (invalidBinding || invalidSubpath || opaqueBindings || opaqueDefault || wildcardExport)
        findings.push({
          node,
          message:
            'Use the owned shared UI component; MUI controls and namespace imports belong inside shared/ui',
        })
    }
    if (
      !ownsUi &&
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        node.expression.getText(sourceFile) === 'require') &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0]) &&
      /^@mui\/(material|system)(?:\/|$)/.test(node.arguments[0].text)
    ) {
      findings.push({
        node,
        message: 'Use explicit foundation imports or owned shared UI components',
      })
    }
    if (!ownsUi && (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))) {
      const tag = node.tagName.getText(sourceFile)
      const nativeControl = node.attributes.properties.some((attribute) => {
        if (!ts.isJsxAttribute(attribute) || !['component', 'as'].includes(attribute.name.text))
          return false
        const value = attribute.initializer
        const expression = value && ts.isJsxExpression(value) ? value.expression : value
        return (
          expression && ts.isStringLiteralLike(expression) && nativeControls.has(expression.text)
        )
      })
      if (nativeControls.has(tag) || nativeControl)
        findings.push({
          node,
          message: 'Use the shared button or field contract instead of a local native control',
        })
    }

    if (
      filename.includes('/shared/ui/') &&
      moduleName &&
      /(?:features|api|auth|game-ui)\//.test(moduleName)
    ) {
      findings.push({
        node,
        message: 'Generic UI must not depend on features, transport, authorization or game UI',
      })
    }
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      dialogNames.has(node.tagName.getText(sourceFile).split('.').at(-1))
    ) {
      const sx = node.attributes.properties.find(
        (attribute) => ts.isJsxAttribute(attribute) && attribute.name.text === 'sx',
      )
      if (sx && /\.MuiDialog(?:-|Title|Content|Actions)/.test(sx.getText(sourceFile))) {
        findings.push({
          node: sx,
          message:
            'AppDialog consumers must use appearance/contentDensity instead of styling dialog slots',
        })
      }
    }
    if (!ownsUi && ts.isPropertyAssignment(node) && ts.isStringLiteral(node.name)) {
      const selector = node.name.text
      const targetsControlSlot =
        /\.Mui(?:Button|IconButton|InputBase|OutlinedInput|Select|TextField|Dialog|Chip)/.test(
          selector,
        )
      const targetsButton = /[ >]button(?:[ :.#[]|$)/.test(selector)
      const layoutProperties = new Set([
        'flex',
        'flexGrow',
        'flexShrink',
        'flexBasis',
        'alignSelf',
        'order',
        'width',
        'minWidth',
        'maxWidth',
        'm',
        'mt',
        'mr',
        'mb',
        'ml',
        'mx',
        'my',
      ])
      const onlyPlacement =
        ts.isObjectLiteralExpression(node.initializer) &&
        node.initializer.properties.every(
          (property) =>
            ts.isPropertyAssignment(property) &&
            layoutProperties.has(property.name.getText(sourceFile)),
        )
      if (targetsControlSlot || (targetsButton && !onlyPlacement))
        findings.push({
          node,
          message:
            'Control appearance belongs to its shared owner; containers may only arrange child buttons',
        })
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return findings
}
