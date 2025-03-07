/* eslint-disable no-await-in-loop */
/* eslint-disable no-unused-vars */
/* eslint-disable no-param-reassign */
/* eslint-disable import/no-extraneous-dependencies */
require('dotenv-safe').config();
const { program } = require('commander');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function getConstructorParams(sourceFile) {
    const params = [];
    function visit(node) {
        if (ts.isConstructorDeclaration(node)) {
            node.parameters.forEach((param) => {
                params.push(param.name.getText(sourceFile));
            });
        }
        ts.forEachChild(node, visit);
    }
    ts.forEachChild(sourceFile, visit);
    return params;
}

function getClassName(sourceFile) {
    let className = '';
    function visit(node) {
        if (ts.isClassDeclaration(node) && node.name) {
            className = node.name.text;
        }
        ts.forEachChild(node, visit);
    }
    ts.forEachChild(sourceFile, visit);
    return className;
}

function processFile(filePath, type) {
    const sourceCode = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
        path.basename(filePath),
        sourceCode,
        ts.ScriptTarget.Latest,
        true,
    );
    const className = getClassName(sourceFile);
    if (!className) return null;

    // For actions, check if it ends with 'Action'
    // For triggers, include all classes in the triggers directory
    if ((type === 'actions' && !className.endsWith('Action'))
        || (type === 'triggers' && className.endsWith('Action'))) {
        return null;
    }

    const params = getConstructorParams(sourceFile);
    const relativePath = path.relative(path.join(__dirname, `../src/${type}`), path.dirname(filePath));
    const namespace = relativePath.split(path.sep).join('.');
    let namespacePrefix = namespace ? `${namespace}.` : '';
    namespacePrefix = namespacePrefix.split('.src.')[1];
    return `const ${className.charAt(0).toLowerCase() + className.slice(1)} = new dfs.${namespacePrefix}${className}(\n    ${params.join(',\n    ')}\n);`;
}

function processDirectory(dirPath, type, output = []) {
    const files = fs.readdirSync(dirPath);
    files.forEach((file) => {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            processDirectory(fullPath, type, output);
        } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
            const signature = processFile(fullPath, type);
            if (signature) {
                output.push(signature);
            }
        }
    });
    return output;
}

function syncSdkSignatures(repoPath) {
    // Process both actions and triggers
    const actionsDir = `${repoPath}/src/actions`;
    const triggersDir = `${repoPath}/src/triggers`;

    const signatures = [];

    // Add a header comment for Actions
    signatures.push('// Actions');
    signatures.push(...processDirectory(actionsDir, 'actions'));

    // Add a header comment for Triggers
    signatures.push('\n// Triggers');
    signatures.push(...processDirectory(triggersDir, 'triggers'));

    const outputContent = signatures.join('\n\n');
    fs.writeFileSync(path.join(__dirname, 'signatures.txt'), outputContent, 'utf-8');
}

(async () => {
    program
        .command('sync-signatures <repoPath>')
        .description('Fetches all sdk signatures for actions and triggers from the sdk repo')
        .action(async (repoPath, options) => {
            syncSdkSignatures(repoPath, options);
            process.exit(0);
        });

    program.parse(process.argv);
})();
