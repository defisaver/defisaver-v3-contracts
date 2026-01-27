require('dotenv-safe').config();

const { program } = require('commander');
const { execSync } = require('child_process');
const ts = require('typescript');
const { readFileSync, writeFileSync, existsSync, statSync, mkdirSync, readdirSync } = require('fs');
const { join, basename, relative, sep, dirname } = require('path');
const { getNameId } = require('../test/utils/utils');

// Escape special characters in a string so it can be safely used in a RegExp pattern
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 __    __   _______  __      .______    _______ .______          _______.
|  |  |  | |   ____||  |     |   _  \  |   ____||   _  \        /       |
|  |__|  | |  |__   |  |     |  |_)  | |  |__   |  |_)  |      |   (----`
|   __   | |   __|  |  |     |   ___/  |   __|  |      /        \   \
|  |  |  | |  |____ |  `----.|  |      |  |____ |  |\  \----.----)   |
|__|  |__| |_______||_______|| _|      |_______|| _| `._____|_______/
 */

/**
 * Generate a file with all the SDK signatures for the actions and triggers
 * @param {*} repoPath - The path to the sdk repository
 */
const genSdkSignatures = (repoPath) => {
    const actionsDir = `${repoPath}/src/actions`;
    const triggersDir = `${repoPath}/src/triggers`;

    const signatures = [];

    function getSdkConstructorParams(sourceFile) {
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

    function getSdkClassName(sourceFile) {
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

    function processSdkFile(filePath, type) {
        const sourceCode = readFileSync(filePath, 'utf-8');
        const sourceFile = ts.createSourceFile(
            basename(filePath),
            sourceCode,
            ts.ScriptTarget.Latest,
            true,
        );
        const className = getSdkClassName(sourceFile);
        if (!className) return null;
        // For actions, check if it ends with 'Action'
        // For triggers, include all classes in the triggers directory
        if (
            (type === 'actions' && !className.endsWith('Action')) ||
            (type === 'triggers' && className.endsWith('Action'))
        ) {
            return null;
        }
        const params = getSdkConstructorParams(sourceFile);
        const relativePath = relative(join(__dirname, `../src/${type}`), dirname(filePath));
        const namespace = relativePath.split(sep).join('.');
        let namespacePrefix = namespace ? `${namespace}.` : '';
        namespacePrefix = namespacePrefix.split('.src.')[1];
        return `const ${
            className.charAt(0).toLowerCase() + className.slice(1)
        } = new dfs.${namespacePrefix}${className}(\n    ${params.join(',\n    ')}\n);`;
    }

    function processSdkDirectory(dirPath, type, output = []) {
        const files = readdirSync(dirPath);
        files.forEach((file) => {
            const fullPath = join(dirPath, file);
            const stat = statSync(fullPath);
            if (stat.isDirectory()) {
                processSdkDirectory(fullPath, type, output);
            } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
                const signature = processSdkFile(fullPath, type);
                if (signature) {
                    output.push(signature);
                }
            }
        });
        return output;
    }

    signatures.push('// Actions');
    signatures.push(...processSdkDirectory(actionsDir, 'actions'));

    signatures.push('\n// Triggers');
    signatures.push(...processSdkDirectory(triggersDir, 'triggers'));

    const outputContent = signatures.join('\n\n');

    const outputDir = join(__dirname, '../gen');
    const outputFile = join(outputDir, 'sdkSignatures.txt');

    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
    }

    writeFileSync(outputFile, outputContent, 'utf-8');

    // Log success message with full file path
    console.log(`SDK signatures successfully generated at: ${outputFile}`);
};

/**
 * Parse the definitions of structs and enums from the template.
 * Used for solidity and sdk actions generation.
 * @param content - The content of the template file
 * @returns An object with the structs and enums
 */
const parseStructAndEnumDefinitions = (content) => {
    const structs = {};
    const enums = {};
    let currentStruct = null;
    let currentEnum = null;
    let commentBuffer = [];

    content.split('\n').forEach((line) => {
        line = line.trim();

        // Collect comments
        if (line.startsWith('///') || line.startsWith('//')) {
            commentBuffer.push(line.replace(/^\/\/\/?/, '').trim());
            return;
        }

        // Start of enum definition
        if (line.startsWith('enum ')) {
            const enumName = line.match(/enum\s+(\w+)/)[1];
            const values = line
                .split('{')[1]
                .split('}')[0]
                .trim()
                .split(',')
                .map((v) => v.trim());
            currentEnum = {
                name: enumName,
                values,
                comments: [...commentBuffer],
            };
            enums[enumName] = currentEnum;
            commentBuffer = [];
            return;
        }

        // Start of struct definition
        if (line.startsWith('struct ')) {
            const structName = line.match(/struct\s+(\w+)/)[1];
            currentStruct = {
                name: structName,
                fields: [],
                comments: [...commentBuffer],
            };
            structs[structName] = currentStruct;
            commentBuffer = [];
            return;
        }

        // End of struct
        if (line === '}') {
            currentStruct = null;
            commentBuffer = [];
            return;
        }

        // Field definition
        if (currentStruct && (line.endsWith(';') || line.endsWith('// p'))) {
            const isPiped = line.includes('// p');
            // Remove comments and semicolon
            const cleanLine = line
                .replace(/\/\/.*$/, '')
                .replace(';', '')
                .trim();
            const [type, name] = cleanLine.split(/\s+/);

            currentStruct.fields.push({
                type,
                name,
                isPiped,
                comments: [...commentBuffer],
            });
            commentBuffer = [];
        }
    });

    return { structs, enums };
};

/**
 * Parse the protocol template content to get the protocol name and actions.
 * Used for solidity and sdk actions generation.
 * @param content - The content of the protocol template file
 * @returns An object with the protocol name and actions
 */
const parseProtocolTemplate = (content) => {
    const actions = [];
    let currentAction = null;
    let protocolName = '';

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith('PROTOCOL_NAME')) {
            protocolName = line.split('=')[1].trim().replace(/[;"]/g, '');
        } else if (line.startsWith('ACTION_NAME')) {
            if (currentAction) {
                actions.push(currentAction);
            }
            const actionName = line.split('=')[1].trim().replace(/[;"]/g, '');
            currentAction = {
                name: actionName,
                content: '',
                lines: [],
            };
        } else if (currentAction) {
            currentAction.lines.push(line);
        }
    }

    if (currentAction) {
        actions.push(currentAction);
    }

    return { protocolName, actions };
};

/**
  _______  _______ .__   __.  _______ .______          ___   .___________. _______         _______.  ______    __
 /  _____||   ____||  \ |  | |   ____||   _  \        /   \  |           ||   ____|       /       | /  __  \  |  |
|  |  __  |  |__   |   \|  | |  |__   |  |_)  |      /  ^  \ `---|  |----`|  |__         |   (----`|  |  |  | |  |
|  | |_ | |   __|  |  . `  | |   __|  |      /      /  /_\  \    |  |     |   __|         \   \    |  |  |  | |  |
|  |__| | |  |____ |  |\   | |  |____ |  |\  \----./  _____  \   |  |     |  |____    .----)   |   |  `--'  | |  `----.
 \______| |_______||__| \__| |_______|| _| `._____/__/     \__\  |__|     |_______|   |_______/     \______/  |_______|
/**
 * Generate the solidity code for an action.
 * @param templateContent - The content of the template file
 * @param actionName - The name of the action
 * @returns The solidity code for the action
 */
const generateSolidityActionContent = (templateContent, actionName) => {
    function findPipedFields(structs, enums, structName, prefix = '') {
        const pipedFields = [];
        const struct = structs[structName];

        if (!struct) return pipedFields;

        struct.fields.forEach((field) => {
            if (field.isPiped) {
                pipedFields.push({
                    path: prefix ? `${prefix}.${field.name}` : field.name,
                    type: field.type,
                    isEnum: !!enums[field.type],
                });
            }
            // If field is a struct type, recursively find piped fields
            if (structs[field.type]) {
                const nestedPipedFields = findPipedFields(
                    structs,
                    enums,
                    field.type,
                    prefix ? `${prefix}.${field.name}` : field.name,
                );
                pipedFields.push(...nestedPipedFields);
            }
        });

        return pipedFields;
    }

    function generateParseCode(path, type, isEnum, index) {
        if (isEnum) {
            return `        params.${path} = ${type}(_parseParamUint(uint8(params.${path}), _paramMapping[${index}], _subData, _returnValues));`;
        }
        if (type === 'address') {
            return `        params.${path} = _parseParamAddr(params.${path}, _paramMapping[${index}], _subData, _returnValues);`;
        }
        if (type === 'bool') {
            return `        params.${path} = _parseParamUint(params.${path} ? 1 : 0, _paramMapping[${index}], _subData, _returnValues) == 1;`;
        }
        if (type === 'int256') {
            return `        params.${path} = int256(_parseParamUint(uint256(params.${path}), _paramMapping[${index}], _subData, _returnValues));`;
        }
        if (type.startsWith('uint')) {
            const bits = type.replace('uint', '');
            if (bits && bits !== '256') {
                return `        params.${path} = ${type}(_parseParamUint(uint256(params.${path}), _paramMapping[${index}], _subData, _returnValues));`;
            }
            return `        params.${path} = _parseParamUint(params.${path}, _paramMapping[${index}], _subData, _returnValues);`;
        }
        return `        // Unsupported type ${type} for field ${path}`;
    }

    const { structs, enums } = parseStructAndEnumDefinitions(templateContent);

    if (!structs.Params) {
        throw new Error('Template must contain a Params struct');
    }

    const pipedFields = findPipedFields(structs, enums, 'Params');

    // Generate enum definitions
    const enumDefinitions = Object.entries(enums)
        .map(([name, enumDef]) => {
            const enumComments = enumDef.comments.map((c) => `    /// ${c}`).join('\n');
            return `${
                enumComments ? `\n${enumComments}\n` : ''
            }    enum ${name} { ${enumDef.values.join(', ')} }`;
        })
        .join('\n');

    // Generate struct definitions
    const structDefinitions = Object.entries(structs)
        .map(([name, struct]) => {
            const structComments = struct.comments.map((c) => `    /// ${c}`).join('\n');
            const fields = struct.fields
                .map((field) => {
                    const comments = field.comments.map((c) => `        /// ${c}`).join('\n');
                    const fieldDef = `        ${field.type} ${field.name};`;
                    return comments ? `${comments}\n${fieldDef}` : fieldDef;
                })
                .join('\n');

            return `${structComments ? `\n${structComments}` : ''}
    struct ${name} {
${fields}
    }`;
        })
        .join('\n');

    const parameterParsing = pipedFields
        .map((field, i) => generateParseCode(field.path, field.type, field.isEnum, i))
        .join('\n');

    const template = `// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "./ActionBase.sol";

/// @title ${actionName}
contract ${actionName} is ActionBase {
${enumDefinitions} ${structDefinitions}

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

${parameterParsing}

        (uint256 returnValue, bytes memory logData) = _execute(params);
        emit ActionEvent("${actionName}", logData);
        return bytes32(returnValue);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _execute(params);
        logger.logActionDirectEvent("${actionName}", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _execute(Params memory _params) internal returns (uint256, bytes memory) {

        return (0, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}`;

    return template;
};

/**
 * Generate the helper files for a protocol.
 * Used during the generation of the solidity actions for a protocol.
 * @param protocolName - The name of the protocol
 * @param outputPath - The path to the output directory
 */
const generateHelperFiles = (protocolName, outputPath) => {
    const helperDir = join(outputPath, 'helpers');
    const addressesContent = `// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

contract Mainnet${protocolName}Addresses {
}`;

    const helperContent = `// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { Mainnet${protocolName}Addresses } from "./Mainnet${protocolName}Addresses.sol";

contract ${protocolName}Helper is Mainnet${protocolName}Addresses {
}`;

    if (!existsSync(helperDir)) {
        mkdirSync(helperDir, { recursive: true });
    }

    writeFileSync(join(helperDir, `Mainnet${protocolName}Addresses.sol`), addressesContent);
    writeFileSync(join(helperDir, `${protocolName}Helper.sol`), helperContent);
};

/**
 * Generate a single Solidity action file.
 * @param templatePath - The path to the template file
 * @param actionName - The name of the action
 * @param outputPath - The path to the output directory
 */
const generateSingleSolidityActionFile = (templatePath, actionName, outputPath) => {
    if (!existsSync(templatePath)) {
        console.error(`Template file not found at ${templatePath}`);
        process.exit(1);
    }

    const templateContent = readFileSync(templatePath, 'utf8');
    const solidityCode = generateSolidityActionContent(templateContent, actionName);

    if (existsSync(outputPath) && statSync(outputPath).isDirectory()) {
        outputPath = join(outputPath, `${actionName}.sol`);
    }

    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
    }

    writeFileSync(outputPath, solidityCode);
    console.log(`Generated Solidity action at ${outputPath}`);
};

/**
 * Generate all the Solidity action files for a protocol.
 * @param templatePath - The path to the template file
 * @param outputPath - The path to the output directory
 */
const generateProtocolSolidityActionsFiles = (templatePath, outputPath) => {
    if (!existsSync(templatePath)) {
        console.error(`Template file not found at ${templatePath}`);
        process.exit(1);
    }

    const templateContent = readFileSync(templatePath, 'utf8');
    const { protocolName, actions } = parseProtocolTemplate(templateContent);

    const protocolDir = join(outputPath, protocolName.toLowerCase());
    if (!existsSync(protocolDir)) {
        mkdirSync(protocolDir, { recursive: true });
    }

    generateHelperFiles(protocolName, protocolDir);

    actions.forEach((action) => {
        const actionContent = action.lines.join('\n');
        const solidityCode = generateSolidityActionContent(actionContent, action.name);

        // Add TokenUtils import and usage, plus Helper import
        const modifiedCode = solidityCode
            .replace(
                'import { ActionBase } from "./ActionBase.sol";\n',
                `import { ActionBase } from "./ActionBase.sol";\nimport { TokenUtils } from "../../utils/token/TokenUtils.sol";\nimport { ${protocolName}Helper } from "./helpers/${protocolName}Helper.sol";\n`,
            )
            .replace(
                `contract ${action.name} is ActionBase {`,
                `contract ${action.name} is ActionBase, ${protocolName}Helper {\n    using TokenUtils for address;`,
            );

        const outputFile = join(protocolDir, `${action.name}.sol`);
        writeFileSync(outputFile, modifiedCode);
        console.log(`Generated Solidity action at ${outputFile}`);
    });

    console.log(`Generated helper files in ${join(protocolDir, 'helpers')}`);
};

/**
  _______  _______ .__   __.  _______ .______          ___   .___________. _______         _______. _______   __  ___
 /  _____||   ____||  \ |  | |   ____||   _  \        /   \  |           ||   ____|       /       ||       \ |  |/  /
|  |  __  |  |__   |   \|  | |  |__   |  |_)  |      /  ^  \ `---|  |----`|  |__         |   (----`|  .--.  ||  '  /
|  | |_ | |   __|  |  . `  | |   __|  |      /      /  /_\  \    |  |     |   __|         \   \    |  |  |  ||    <
|  |__| | |  |____ |  |\   | |  |____ |  |\  \----./  _____  \   |  |     |  |____    .----)   |   |  '--'  ||  .  \
 \______| |_______||__| \__| |_______|| _| `._____/__/     \__\  |__|     |_______|   |_______/    |_______/ |__|\__\
 */

/**
 * Generate the TypeScript SDK action content.
 * @param templateContent - The content of the template file
 * @param actionName - The name of the action
 * @returns The TypeScript SDK action content
 */
const generateSdkActionContent = (templateContent, actionName) => {
    const SUPPORTED_SDK_TYPES = new Set([
        'EthAddress',
        'bytes32',
        'bytes',
        'uint256',
        'uint160',
        'uint128',
        'uint80',
        'uint64',
        'uint32',
        'uint24',
        'uint16',
        'uint8',
        'int256',
        'int24',
    ]);

    function generateNestedTypeArray(field, structs) {
        const struct = structs[field.type];
        if (!struct) return `'${field.type}'`;

        return `[${struct.fields
            .map((f) => {
                if (structs[f.type]) {
                    return generateNestedTypeArray(f, structs);
                }
                return `'${f.type}'`;
            })
            .join(', ')}]`;
    }

    function solToTsType(solType, enums, structs) {
        if (structs && structs[solType]) return 'Array<any>';
        if (enums && enums[solType]) return 'uint8';
        if (solType === 'address') return 'EthAddress';
        if (solType === 'bool') return 'boolean';
        if (solType === 'bytes32') return 'bytes32';
        if (solType === 'bytes') return 'bytes';
        // Handle array types
        if (solType.endsWith('[]')) {
            const baseType = solType.slice(0, -2);
            return `Array<${solToTsType(baseType, enums, structs)}>`;
        }
        if (solType.startsWith('uint')) {
            const bits = solType.replace('uint', '');
            const type = `uint${bits || '256'}`;
            return SUPPORTED_SDK_TYPES.has(type) ? type : 'string';
        }
        if (solType.startsWith('int')) {
            const bits = solType.replace('int', '');
            const type = `int${bits || '256'}`;
            return SUPPORTED_SDK_TYPES.has(type) ? type : 'string';
        }
        return solType;
    }

    function getRequiredTypes(struct, enums, structs) {
        const types = new Set();
        struct.fields.forEach((field) => {
            const tsType = solToTsType(field.type, enums, structs);
            if (SUPPORTED_SDK_TYPES.has(tsType)) {
                types.add(tsType);
            }
        });
        return Array.from(types).sort();
    }

    function generateConstructorParams(struct, enums, structs) {
        return struct.fields
            .map((field) => `    ${field.name}: ${solToTsType(field.type, enums, structs)}`)
            .join(',\n');
    }

    function parseStructComments(comments) {
        const fieldComments = {};
        let currentField = null;
        let currentComment = [];

        comments.forEach((comment) => {
            const paramMatch = comment.match(/@param\s+(\w+)\s+(.*)/);
            if (paramMatch) {
                // If we were building a previous field's comment, save it
                if (currentField) {
                    fieldComments[currentField] = currentComment.join(' ');
                    currentComment = [];
                }
                currentField = paramMatch[1];
                currentComment.push(paramMatch[2]);
            } else if (currentField && comment.trim()) {
                // Continue building the current field's comment
                currentComment.push(comment.trim());
            }
        });

        // Save the last field's comment
        if (currentField) {
            fieldComments[currentField] = currentComment.join(' ');
        }

        return fieldComments;
    }

    function generateParamDocs(struct) {
        const fieldComments = parseStructComments(struct.comments);
        return struct.fields
            .map((field) => {
                const comment = fieldComments[field.name] || 'No description provided';
                return `   * @param ${field.name} ${comment}`;
            })
            .join('\n');
    }

    function generateTypeArray(struct, enums, structs) {
        const types = struct.fields.map((field) => {
            if (structs[field.type]) {
                return generateNestedTypeArray(field, structs);
            }
            return `'${enums && enums[field.type] ? 'uint8' : field.type}'`;
        });

        if (types.some((t) => t.startsWith('['))) {
            return `[\n        ${types.join(',\n        ')}\n      ]`;
        }
        return `[${types.join(', ')}]`;
    }

    function generateArgsArray(struct) {
        return struct.fields.map((field) => field.name).join(', ');
    }

    function findPipedFieldsInStruct(field, structs, prefix = '', index = '') {
        const struct = structs[field.type];
        if (!struct) {
            return field.isPiped ? [`this.args${index}`] : [];
        }

        return struct.fields.flatMap((f, i) => {
            const newPrefix = prefix ? `${prefix}.${f.name}` : f.name;
            const newIndex = `${index}[${i}]`;
            return findPipedFieldsInStruct(f, structs, newPrefix, newIndex);
        });
    }

    function generateMappableArgs(struct, structs) {
        const mappableArgs = struct.fields.flatMap((field, i) => {
            if (structs[field.type]) {
                return findPipedFieldsInStruct(field, structs, field.name, `[${i}]`);
            }
            return field.isPiped ? [`this.args[${i}]`] : [];
        });

        return mappableArgs.map((arg) => `      ${arg},`).join('\n');
    }

    const { structs, enums } = parseStructAndEnumDefinitions(templateContent);

    if (!structs.Params) {
        throw new Error('Template must contain a Params struct');
    }

    const requiredTypes = getRequiredTypes(structs.Params, enums, structs);

    const hasPipedFields = structs.Params.fields.some((field) => {
        if (structs[field.type]) {
            const pipedFields = findPipedFieldsInStruct(field, structs);
            return pipedFields.length > 0;
        }
        return field.isPiped;
    });

    const mappableArgsSection = hasPipedFields
        ? `
    this.mappableArgs = [
${generateMappableArgs(structs.Params, structs)}
    ];`
        : '';

    const template = `import { Action } from '../../Action';
import { getAddr } from '../../addresses';
import { ${requiredTypes.join(', ')} } from '../../types';

/**
 * ${actionName}Action -
 *
 * @category ${actionName}
 */
export class ${actionName}Action extends Action {
  /**
${generateParamDocs(structs.Params)}
   */
  constructor(
${generateConstructorParams(structs.Params, enums, structs)}
  ) {
    super(
      '${actionName}',
      getAddr('${actionName}'),
      ${generateTypeArray(structs.Params, enums, structs)},
      [${generateArgsArray(structs.Params)}],
    );${mappableArgsSection}
  }
}
`;

    return template;
};

/**
 * Generate a single TypeScript SDK action file.
 * @param templatePath - The path to the template file
 * @param actionName - The name of the action
 * @param outputPath - The path to the output directory
 */
const generateSingleSdkActionFile = (templatePath, actionName, outputPath) => {
    if (!existsSync(templatePath)) {
        console.error(`Template file not found at ${templatePath}`);
        process.exit(1);
    }

    const templateContent = readFileSync(templatePath, 'utf8');
    const tsCode = generateSdkActionContent(templateContent, actionName);

    if (existsSync(outputPath) && statSync(outputPath).isDirectory()) {
        outputPath = join(outputPath, `${actionName}Action.ts`);
    }

    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
    }

    writeFileSync(outputPath, tsCode);
    console.log(`Generated TypeScript SDK action at ${outputPath}`);
};

/**
 * Generate all TypeScript SDK action files for a protocol.
 * @param templatePath - The path to the template file
 * @param outputPath - The path to the output directory
 */
const generateProtocolSdkActionsFiles = (templatePath, outputPath) => {
    if (!existsSync(templatePath)) {
        console.error(`Template file not found at ${templatePath}`);
        process.exit(1);
    }

    const templateContent = readFileSync(templatePath, 'utf8');
    const { protocolName, actions } = parseProtocolTemplate(templateContent);

    // Create protocol directory
    const protocolDir = join(outputPath, protocolName.toLowerCase());
    if (!existsSync(protocolDir)) {
        mkdirSync(protocolDir, { recursive: true });
    }

    // Generate each action
    const actionNames = [];
    actions.forEach((action) => {
        const actionContent = action.lines.join('\n');
        const tsCode = generateSdkActionContent(actionContent, action.name);
        const outputFile = join(protocolDir, `${action.name}Action.ts`);
        writeFileSync(outputFile, tsCode);
        actionNames.push(action.name);
        console.log(`Generated TypeScript SDK action at ${outputFile}`);
    });

    // Generate index.ts
    const indexContent = actionNames.map((name) => `export * from './${name}Action';`).join('\n');
    writeFileSync(join(protocolDir, 'index.ts'), indexContent);
    console.log(`Generated index.ts in ${protocolDir}`);
};

/**
  _______  _______ .__   __.  _______ .______          ___   .___________. _______     _______   ______     ______     _______.
 /  _____||   ____||  \ |  | |   ____||   _  \        /   \  |           ||   ____|   |       \ /  __  \   /      |   /       |
|  |  __  |  |__   |   \|  | |  |__   |  |_)  |      /  ^  \ `---|  |----`|  |__      |  .--.  |  |  |  | |  ,----'  |   (----`
|  | |_ | |   __|  |  . `  | |   __|  |      /      /  /_\  \    |  |     |   __|     |  |  |  |  |  |  | |  |        \   \
|  |__| | |  |____ |  |\   | |  |____ |  |\  \----./  _____  \   |  |     |  |____    |  '--'  |  `--'  | |  `----.----)   |
 \______| |_______||__| \__| |_______|| _| `._____/__/     \__\  |__|     |_______|   |_______/ \______/   \______|_______/
 */

/* //////////////////////////////////////////////////////////////
                          ACTION DOCS
////////////////////////////////////////////////////////////// */
/**
 * Find the SDK action signature from the template file.
 * @param actionName - The name of the action
 * @returns The SDK action signature
 */
const findSdkActionSignatureFromTemplateFile = (actionName) => {
    try {
        const signaturesPath = join(process.cwd(), 'templates/md/action/template.txt');
        const signatures = readFileSync(signaturesPath, 'utf8');
        // Convert action name to camelCase for matching
        const camelCaseName = actionName[0].toLowerCase() + actionName.slice(1);
        // Look for the signature block
        const safeCamelCaseName = escapeRegExp(camelCaseName);
        const regex = new RegExp(
            `const ${safeCamelCaseName}Action = new dfs\\.actions\\.[\\w.]+\\([\\s\\S]+?\\);`,
            'g',
        );
        const match = signatures.match(regex);
        if (match && match[0]) {
            return match[0];
        }
        return null;
    } catch (error) {
        console.error(`Could not find SDK signature for ${actionName}`);
        return null;
    }
};

/**
 * Extract NatSpec comments from a string.
 * @param content - The content to extract the NatSpec comments from
 * @returns The NatSpec comments
 */
const extractNatSpec = (content) => {
    const natspec = {
        title: '',
        notice: [], // Array to store multiple @notice comments
        dev: [], // Array to store multiple @dev comments
        other: {}, // Store other NatSpec tags
    };

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('///')) {
            const match = line.match(/\/\/\/\s*@(\w+)\s+(.*)/);
            if (match) {
                const [, tag, value] = match;
                if (tag === 'title') {
                    natspec.title = value.trim();
                } else if (tag === 'dev') {
                    natspec.dev.push(value.trim());
                } else if (tag === 'notice') {
                    natspec.notice.push(value.trim());
                } else {
                    natspec.other[tag] = value.trim();
                }
            }
        }
    }
    return natspec;
};

/**
 * Find the contract file by name.
 * @param contractName - The name of the contract
 * @returns The contract file path
 */
const findContractFile = (contractName) => {
    try {
        // Use find command to locate the contract file
        const result = execSync(`find contracts -type f -name "${contractName}.sol"`, {
            encoding: 'utf8',
        });
        const files = result.trim().split('\n');
        if (!files[0]) {
            throw new Error(`Contract ${contractName} not found`);
        }
        return files[0]; // Return the first match
    } catch (error) {
        console.error(`Could not find contract file for ${contractName}`);
        return null;
    }
};

/**
 * Generate empty markdown for actions without contracts.
 * @param actionName - The name of the action
 * @param outputPath - The path to the output directory
 */
const generateEmptyDoc = (actionName, outputPath) => {
    const markdown = `# ${actionName}

## Description
No contract found for this action.

## Action ID
\`Not Available\`

## SDK Action
\`\`\`ts
${findSdkActionSignatureFromTemplateFile(actionName)}
\`\`\`

## Action Type
\`UNKNOWN\`

## Input Parameters
\`\`\`solidity
No contract found
\`\`\`

## Return Value
\`\`\`solidity
No contract found
\`\`\`

## Events and Logs
\`\`\`solidity
No contract found
\`\`\`
`;

    const finalOutputPath = join(outputPath, `${actionName}.md`);
    writeFileSync(finalOutputPath, markdown);
    console.log(`Generated empty documentation for ${actionName} at ${finalOutputPath}`);
};

/**
 * Generate documentation for a contract action.
 * @param contractName - The name of the contract
 * @param outputPath - The path to the output directory
 */
const generateActionMdFile = (contractName, outputPath = 'gen/md/actions') => {
    function extractParamsWithComments(content) {
        const structMatch = content.match(/struct\s+Params\s*{([^}]+)}/s);
        if (!structMatch) return '';

        // Find the position of struct Params
        const structIndex = content.indexOf('struct Params');
        if (structIndex === -1) return '';

        // Look backwards from struct to find all @param comments
        const contentBeforeStruct = content.substring(0, structIndex);
        const lines = contentBeforeStruct.split('\n').reverse();

        // Find all @param comments until we hit a non-comment line
        const paramComments = lines.reduce((comments, line) => {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('/// @param')) {
                comments.unshift(trimmedLine);
            }
            return comments;
        }, []);

        // Get the struct content and format it
        const structContent = structMatch[1].trim();
        const params = structContent
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.endsWith(';'));

        // Format comments above struct and params inside
        return `    ${paramComments.join('\n    ')}\n    struct Params {\n        ${params.join(
            '\n        ',
        )}\n    }`;
    }

    function extractReturnValue(content) {
        const returnMatch = content.match(/return\s+[^;]+;/g);
        if (!returnMatch) return 'unknown';
        if (returnMatch[0].includes('return uint8(ActionType.')) {
            return '';
        }
        return returnMatch[0];
    }

    function extractEvents(content) {
        const actionEventMatch = content.match(/emit\s+ActionEvent\("([^"]+)"/);
        const logDirectMatch = content.match(/logActionDirectEvent\("([^"]+)"/);
        const lines = [];
        if (actionEventMatch) {
            lines.push(`emit ActionEvent("${actionEventMatch[1]}", logData);`);
        }
        if (logDirectMatch) {
            lines.push(`logger.logActionDirectEvent("${logDirectMatch[1]}", logData);`);
        }
        if (lines.length) {
            lines.push(
                `bytes memory logData = abi.encode(${
                    contractName.endsWith('Check') ? 'currRatio' : 'params'
                });`,
            );
            return `\`\`\`solidity
${lines.join('\n')}
\`\`\``;
        }
        return `\`\`\`solidity
\`\`\``;
    }

    const contractPath = findContractFile(contractName);
    if (!contractPath) {
        console.error(`Contract ${contractName} not found`);
        process.exit(1);
    }

    const content = readFileSync(contractPath, 'utf8');
    const natspec = extractNatSpec(content);
    const actionId = getNameId(contractName);
    const actionTypeMatch = content.match(/actionType\(\).*?return\s+uint8\(ActionType\.(\w+)\)/s);
    const actionType = actionTypeMatch ? actionTypeMatch[1] : 'UNKNOWN';
    const paramsStruct = extractParamsWithComments(content);
    const returnValue = extractReturnValue(content);
    const events = extractEvents(content, contractName);

    const sdkSignature = findSdkActionSignatureFromTemplateFile(contractName);
    let sdkSection = sdkSignature
        ? `\n${sdkSignature}`
        : `\nconst ${contractName[0].toLowerCase()}${contractName.slice(
              1,
          )}Action = new dfs.actions.${contractName}Action(\n    ...args\n);\n`;

    sdkSection = `\`\`\`ts${sdkSection}\n\`\`\``;

    if (!existsSync(outputPath)) {
        mkdirSync(outputPath, { recursive: true });
    }

    const markdown = `# ${contractName}

## Description
${natspec.title || 'No description available'}

${natspec.notice.length > 0 ? `> **Notes**\n>\n> ${natspec.notice.join('\n> ')}\n` : ''}

## Action ID
\`${actionId}\`

## SDK Action
\`${sdkSection}\`

## Action Type
\`${actionType}\`

## Input Parameters
\`\`\`solidity
${paramsStruct}
\`\`\`

## Return Value
\`\`\`solidity
${returnValue}
\`\`\`

## Events and Logs
${events}
`;

    const finalOutputPath = join(outputPath, `${contractName}.md`);
    writeFileSync(finalOutputPath, markdown);
    console.log(`Documentation generated for ${contractName} at ${finalOutputPath}`);
};

/**
 * Generate multiple action markdown files.
 * @param outputPath - The path to the output directory
 */
const generateMultipleActionsMdFiles = (outputPath = 'gen/md/actions') => {
    function getAllActionNamesFromTemplate() {
        try {
            const signaturesPath = join(process.cwd(), 'templates/md/action/template.txt');
            const signatures = readFileSync(signaturesPath, 'utf8');
            // Match all action declarations
            const actionRegex = /const\s+(\w+)Action\s*=/g;
            const matches = [...signatures.matchAll(actionRegex)];
            // Convert from camelCase to PascalCase and remove 'Action' suffix
            return matches.map((match) => {
                const actionName = match[1];
                // Convert first character to uppercase
                return actionName[0].toUpperCase() + actionName.slice(1).replace('Action', '');
            });
        } catch (error) {
            console.error('Could not read template file');
            return [];
        }
    }

    if (!existsSync(outputPath)) {
        mkdirSync(outputPath, { recursive: true });
    }

    const actionNames = getAllActionNamesFromTemplate();
    console.log(`Found ${actionNames.length} actions in template file`);

    let generated = 0;
    let empty = 0;

    actionNames.forEach((actionName) => {
        try {
            const contractPath = findContractFile(actionName);
            if (contractPath) {
                generateActionMdFile(actionName, outputPath);
                generated++;
            } else {
                generateEmptyDoc(actionName, outputPath);
                empty++;
            }
        } catch (error) {
            console.error(`Error generating documentation for ${actionName}:`, error.message);
            generateEmptyDoc(actionName, outputPath);
            empty++;
        }
    });

    console.log('\nDocumentation generation complete:');
    console.log(`- Generated full documentation for ${generated} actions`);
    console.log(`- Generated empty documentation for ${empty} actions`);
    console.log(`- Total actions processed: ${actionNames.length}`);
};

/* //////////////////////////////////////////////////////////////
                          TRIGGER DOCS
////////////////////////////////////////////////////////////// */

/**
 * Find the SDK trigger signature from the template file.
 * @param triggerName - The name of the trigger
 * @returns The SDK trigger signature
 */
const findSdkTriggerSignaturesFromTemplateFile = (triggerName) => {
    try {
        const signaturesPath = join(process.cwd(), 'templates/md/trigger/template.txt');
        const signatures = readFileSync(signaturesPath, 'utf8');
        // Convert trigger name to camelCase for matching
        const camelCaseName = triggerName[0].toLowerCase() + triggerName.slice(1);
        // Look for the signature block
        const regex = new RegExp(
            `const ${camelCaseName} = new dfs\\.triggers\\.[\\w.]+\\([\\s\\S]+?\\);`,
            'g',
        );
        const match = signatures.match(regex);
        if (match && match[0]) {
            return match[0];
        }
        return null;
    } catch (error) {
        console.error('Could not find trigger signature from template');
        return null;
    }
};

/**
 * Generate empty markdown for triggers without contracts.
 * @param triggerName - The name of the trigger
 * @param outputPath - The path to the output directory
 */
const generateEmptyTriggerDoc = (triggerName, outputPath) => {
    const markdown = `# ${triggerName}

## Description
No contract found for this trigger.

## Trigger ID
\`Not Available\`

## SDK Action
\`\`\`ts
${findSdkTriggerSignaturesFromTemplateFile(triggerName) || 'No signature found'}
\`\`\`

## Subscription Parameters
\`\`\`solidity
No contract found
\`\`\`

## Calldata Parameters
\`None\`

## IsChangeable
\`false\`
`;

    const finalOutputPath = join(outputPath, `${triggerName}.md`);
    writeFileSync(finalOutputPath, markdown);
    console.log(`Generated empty documentation for ${triggerName} at ${finalOutputPath}`);
};

/**
 * Generate the markdown file for a trigger.
 * @param triggerName - The name of the trigger
 * @param outputPath - The path to the output directory
 */
const generateTriggerMdFile = (triggerName, outputPath = 'gen/md/triggers') => {
    const contractPath = findContractFile(triggerName);
    if (!contractPath) {
        console.error(`Contract ${triggerName} not found`);
        process.exit(1);
    }

    const content = readFileSync(contractPath, 'utf8');
    const natspec = extractNatSpec(content);
    const triggerId = getNameId(triggerName);
    const triggerSignature = findSdkTriggerSignaturesFromTemplateFile(triggerName);
    const isChangeableMatch = content.match(/isChangeable\(\).*?return\s+(true|false)/s);
    const isChangeable = isChangeableMatch ? isChangeableMatch[1] : 'false';

    const findStructWithComments = (sourceContent, structName) => {
        // Look for all comments and the struct definition
        const pattern = new RegExp(
            `(?:(?:///[^\\n]*\\n)+\\s*)*struct\\s+${structName}\\s*{[^}]+}`,
            'gs',
        );
        const match = sourceContent.match(pattern);
        if (!match) return null;

        const fullMatch = match[0];
        const structStart = fullMatch.indexOf('struct');
        const commentsPart = fullMatch.substring(0, structStart);

        const comments = commentsPart
            .split('\n')
            .filter((line) => line.trim().startsWith('///'))
            .map((line) => line.trim());

        const structPart = fullMatch.substring(structStart);
        const structLines = structPart.split('\n').map((line) => {
            line = line.trim();
            if (line.match(/^\w+\s+\w+;/)) {
                return `    ${line}`;
            }
            return line;
        });

        return [...comments, ...structLines].filter((line) => line.length > 0).join('\n');
    };

    const subParamsContent =
        findStructWithComments(content, 'SubParams') || 'No SubParams struct found';
    const callParamsContent = findStructWithComments(content, 'CallParams') || 'None';

    if (!existsSync(outputPath)) {
        mkdirSync(outputPath, { recursive: true });
    }

    const markdown = `# ${triggerName}

## Description
${natspec.title || 'No description available'}

${natspec.notice.length > 0 ? `> **Notes**\n>\n> ${natspec.notice.join('\n> ')}\n` : ''}

## Trigger ID
\`${triggerId || 'Not Available'}\`

## SDK Action
\`\`\`ts
${
    triggerSignature ||
    `const ${triggerName[0].toLowerCase()}${triggerName.slice(
        1,
    )} = new dfs.triggers.${triggerName}(\n    ...args\n);`
}
\`\`\`

## Subscription Parameters
\`\`\`solidity
${subParamsContent}
\`\`\`

## Calldata Parameters
\`\`\`solidity
${callParamsContent}
\`\`\`

## IsChangeable
\`${isChangeable}\`
`;

    const finalOutputPath = join(outputPath, `${triggerName}.md`);
    writeFileSync(finalOutputPath, markdown);
    console.log(`Documentation generated for ${triggerName} at ${finalOutputPath}`);
};

/**
 * Generate all trigger markdown files.
 * @param outputPath - The path to the output directory
 */
const generateMultipleTriggersMdFiles = (outputPath = 'gen/md/triggers') => {
    function getAllTriggerNamesFromTemplate() {
        try {
            const signaturesPath = join(process.cwd(), 'templates/md/trigger/template.txt');
            const signatures = readFileSync(signaturesPath, 'utf8');
            // Match all trigger declarations
            const triggerRegex = /const\s+(\w+)\s*=/g;
            const matches = [...signatures.matchAll(triggerRegex)];
            // Convert from camelCase to PascalCase
            return matches.map((match) => {
                const triggerName = match[1];
                // Convert first character to uppercase
                return triggerName[0].toUpperCase() + triggerName.slice(1);
            });
        } catch (error) {
            console.error('Could not read template.txt');
            return [];
        }
    }

    if (!existsSync(outputPath)) {
        mkdirSync(outputPath, { recursive: true });
    }

    const triggerNames = getAllTriggerNamesFromTemplate();
    console.log(`Found ${triggerNames.length} triggers in template.txt`);

    let generated = 0;
    let empty = 0;

    triggerNames.forEach((triggerName) => {
        try {
            const contractPath = findContractFile(triggerName);
            if (contractPath) {
                generateTriggerMdFile(triggerName, outputPath);
                generated++;
            } else {
                generateEmptyTriggerDoc(triggerName, outputPath);
                empty++;
            }
        } catch (error) {
            console.error(`Error generating documentation for ${triggerName}:`, error.message);
            generateEmptyTriggerDoc(triggerName, outputPath);
            empty++;
        }
    });

    console.log('\nDocumentation generation complete:');
    console.log(`- Generated full documentation for ${generated} triggers`);
    console.log(`- Generated empty documentation for ${empty} triggers`);
    console.log(`- Total triggers processed: ${triggerNames.length}`);
};

/* //////////////////////////////////////////////////////////////
             SEE `templates` FOLDER FOR USAGE EXAMPLE
////////////////////////////////////////////////////////////// */
(async () => {
    program
        .command('genActionSol <contractName>')
        .description('Generate a Solidity action file from a template')
        .option(
            '-t, --template <path>',
            'Template file path (defaults to templates/solSdk/action/template.sol)',
        )
        .option(
            '-o, --output <path>',
            'Output path for the generated Solidity file (defaults to gen/sol/<actionName>.sol)',
        )
        .action((contractName, options) => {
            const templatePath =
                options.template || join(process.cwd(), 'templates/solSdk/action/template.sol');
            const outputPath = options.output || join(process.cwd(), `gen/sol/${contractName}.sol`);
            generateSingleSolidityActionFile(templatePath, contractName, outputPath);
            process.exit(0);
        });

    program
        .command('genProtocolSol')
        .description('Generate multiple Solidity action files from a protocol template')
        .option(
            '-t, --template <path>',
            'Template file path (defaults to templates/solSdk/protocol/template.sol)',
        )
        .option(
            '-o, --output <path>',
            'Output directory for the generated files (defaults to gen/sol/)',
        )
        .action((options) => {
            const templatePath =
                options.template || join(process.cwd(), 'templates/solSdk/protocol/template.sol');
            const outputPath = options.output || join(process.cwd(), 'gen/sol/');
            generateProtocolSolidityActionsFiles(templatePath, outputPath);
            process.exit(0);
        });

    program
        .command('genActionSdk <contractName>')
        .description('Generate a TypeScript SDK action file from a template')
        .option(
            '-t, --template <path>',
            'Template file path (defaults to templates/solSdk/action/template.sol)',
        )
        .option(
            '-o, --output <path>',
            'Output path for the generated TypeScript file (defaults to gen/sdk/<actionName>Action.ts)',
        )
        .action((contractName, options) => {
            const templatePath =
                options.template || join(process.cwd(), 'templates/solSdk/action/template.sol');
            const outputPath =
                options.output || join(process.cwd(), `gen/sdk/${contractName}Action.ts`);
            generateSingleSdkActionFile(templatePath, contractName, outputPath);
            process.exit(0);
        });

    program
        .command('genProtocolSdk')
        .description('Generate TypeScript SDK action files from a protocol template')
        .option(
            '-t, --template <path>',
            'Template file path (defaults to templates/solSdk/protocol/template.sol)',
        )
        .option(
            '-o, --output <path>',
            'Output directory for the generated files (defaults to gen/sdk)',
        )
        .action((options) => {
            const templatePath =
                options.template || join(process.cwd(), 'templates/solSdk/protocol/template.sol');
            const outputPath = options.output || join(process.cwd(), 'gen/sdk');
            generateProtocolSdkActionsFiles(templatePath, outputPath);
            process.exit(0);
        });

    program
        .command('genActionDoc <contractName>')
        .description('Generate documentation for a contract action')
        .option(
            '-o, --output <path>',
            'Output directory for documentation (defaults to gen/md/actions)',
        )
        .action((contractName, options) => {
            const outputPath = options.output || join(process.cwd(), 'gen/md/actions');
            generateActionMdFile(contractName, outputPath);
            process.exit(0);
        });

    program
        .command('genActionsDocs')
        .description(
            'Generate documentation for all actions sdk signatures found in templates/md/action/template.txt',
        )
        .option(
            '-o, --output <path>',
            'Output directory for documentation (defaults to gen/md/actions)',
        )
        .action((options) => {
            const outputPath = options.output || join(process.cwd(), 'gen/md/actions');
            generateMultipleActionsMdFiles(outputPath);
            process.exit(0);
        });

    program
        .command('genTriggerDoc <triggerName>')
        .description('Generate documentation from a trigger contract source file')
        .option(
            '-o, --output <path>',
            'Output directory for documentation (defaults to gen/md/triggers)',
        )
        .action((triggerName, options) => {
            const outputPath = options.output || join(process.cwd(), 'gen/md/triggers');
            generateTriggerMdFile(triggerName, outputPath);
            process.exit(0);
        });

    program
        .command('genTriggersDocs')
        .description(
            'Generate documentation for all triggers found in templates/md/action/template.txt',
        )
        .option(
            '-o, --output <path>',
            'Output directory for documentation (defaults to gen/md/triggers)',
        )
        .action((options) => {
            const outputPath = options.output || join(process.cwd(), 'gen/md/triggers');
            generateMultipleTriggersMdFiles(outputPath);
            process.exit(0);
        });

    program
        .command('genSdkSignatures <repoPath>')
        .description('Fetches all sdk signatures for actions and triggers from the sdk repo')
        .action(async (repoPath, options) => {
            genSdkSignatures(repoPath, options);
            process.exit(0);
        });

    program.parse(process.argv);
})();
