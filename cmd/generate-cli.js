/* eslint-disable no-await-in-loop */
/* eslint-disable no-unused-vars */
/* eslint-disable no-param-reassign */
/* eslint-disable import/no-extraneous-dependencies */
require('dotenv-safe').config();

const { program } = require('commander');
const { execSync } = require('child_process');
const {
    readFileSync,
    writeFileSync,
    existsSync,
    statSync,
    mkdirSync,
} = require('fs');
const { join } = require('path');
const { getNameId } = require('../test/utils/utils');

// Helper to extract struct and enum definitions from template
const parseDefinitions = (content) => {
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
            const values = line.split('{')[1].split('}')[0].trim().split(',').map((v) => v.trim());
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
            const cleanLine = line.replace(/\/\/.*$/, '').replace(';', '').trim();
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

// Helper to find all piped fields recursively
const findPipedFields = (structs, enums, structName, prefix = '') => {
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
};

// Helper to generate parameter parsing code based on type
const generateParseCode = (path, type, isEnum, index) => {
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
};

const generateSolidityAction = (templateContent, actionName) => {
    const { structs, enums } = parseDefinitions(templateContent);

    // Find the main Params struct
    if (!structs.Params) {
        throw new Error('Template must contain a Params struct');
    }

    // Get all piped fields
    const pipedFields = findPipedFields(structs, enums, 'Params');

    // Generate enum definitions
    const enumDefinitions = Object.entries(enums)
        .map(([name, enumDef]) => {
            const enumComments = enumDef.comments.map((c) => `    /// ${c}`).join('\n');
            return `${enumComments ? `\n${enumComments}\n` : ''}    enum ${name} { ${enumDef.values.join(', ')} }`;
        })
        .join('\n');

    // Generate struct definitions with proper indentation and comments
    const structDefinitions = Object.entries(structs)
        .map(([name, struct]) => {
            // Add struct-level NatSpec comments if they exist
            const structComments = struct.comments.map((c) => `    /// ${c}`).join('\n');

            const fields = struct.fields.map((field) => {
                const comments = field.comments.map((c) => `        /// ${c}`).join('\n');
                const fieldDef = `        ${field.type} ${field.name};`;
                return comments ? `${comments}\n${fieldDef}` : fieldDef;
            }).join('\n');

            return `${structComments ? `\n${structComments}` : ''}
    struct ${name} {
${fields}
    }`;
        })
        .join('\n');

    // Generate parameter parsing in executeAction
    const parameterParsing = pipedFields.map((field, i) => generateParseCode(field.path, field.type, field.isEnum, i)).join('\n');

    // Generate the complete contract
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

const generateAction = (templatePath, actionName, outputPath) => {
    if (!existsSync(templatePath)) {
        console.error(`Template file not found at ${templatePath}`);
        process.exit(1);
    }

    const templateContent = readFileSync(templatePath, 'utf8');
    const solidityCode = generateSolidityAction(templateContent, actionName);

    // If outputPath is a directory, append the file name.
    if (existsSync(outputPath) && statSync(outputPath).isDirectory()) {
        outputPath = join(outputPath, `${actionName}.sol`);
    }

    writeFileSync(outputPath, solidityCode);
    console.log(`Generated Solidity action at ${outputPath}`);
};

// Helper to parse protocol template content
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
            // If we have a current action, save it
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

    // Don't forget to add the last action
    if (currentAction) {
        actions.push(currentAction);
    }

    return { protocolName, actions };
};

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

const generateProtocolActions = (templatePath, outputPath) => {
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

    // Generate helper files
    generateHelperFiles(protocolName, protocolDir);

    // Generate each action
    actions.forEach((action) => {
        const actionContent = action.lines.join('\n');
        const solidityCode = generateSolidityAction(actionContent, action.name);

        // Add TokenUtils import and usage, plus Helper import
        const modifiedCode = solidityCode.replace(
            'import { ActionBase } from "./ActionBase.sol";\n',
            `import { ActionBase } from "./ActionBase.sol";\nimport { TokenUtils } from "../../utils/TokenUtils.sol";\nimport { ${protocolName}Helper } from "./helpers/${protocolName}Helper.sol";\n`,
        ).replace(
            `contract ${action.name} is ActionBase {`,
            `contract ${action.name} is ActionBase, ${protocolName}Helper {\n    using TokenUtils for address;`,
        );

        const outputFile = join(protocolDir, `${action.name}.sol`);
        writeFileSync(outputFile, modifiedCode);
        console.log(`Generated Solidity action at ${outputFile}`);
    });

    console.log(`Generated helper files in ${join(protocolDir, 'helpers')}`);
};

// List of supported TypeScript types
const SUPPORTED_TYPES = new Set([
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

// Helper to generate type array for nested structs
const generateNestedTypeArray = (field, structs) => {
    const struct = structs[field.type];
    if (!struct) return `'${field.type}'`;

    return `[${struct.fields.map((f) => {
        if (structs[f.type]) {
            return generateNestedTypeArray(f, structs);
        }
        return `'${f.type}'`;
    }).join(', ')}]`;
};

// Helper to convert Solidity type to TypeScript type
const solToTsType = (solType, enums, structs) => {
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
        return SUPPORTED_TYPES.has(type) ? type : 'string';
    }
    if (solType.startsWith('int')) {
        const bits = solType.replace('int', '');
        const type = `int${bits || '256'}`;
        return SUPPORTED_TYPES.has(type) ? type : 'string';
    }
    return solType;
};

// Helper to get required type imports based on struct fields
const getRequiredTypes = (struct, enums, structs) => {
    const types = new Set();
    struct.fields.forEach((field) => {
        const tsType = solToTsType(field.type, enums, structs);
        if (SUPPORTED_TYPES.has(tsType)) {
            types.add(tsType);
        }
    });
    return Array.from(types).sort();
};

// Helper to generate constructor parameters from struct fields
const generateConstructorParams = (struct, enums, structs) => struct.fields
    .map((field) => `    ${field.name}: ${solToTsType(field.type, enums, structs)}`)
    .join(',\n');

// Helper to parse struct comments and match them to fields
const parseStructComments = (comments) => {
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
};

// Helper to generate constructor parameter docs
const generateParamDocs = (struct) => {
    const fieldComments = parseStructComments(struct.comments);
    return struct.fields
        .map((field) => {
            const comment = fieldComments[field.name] || 'No description provided';
            return `   * @param ${field.name} ${comment}`;
        })
        .join('\n');
};

// Helper to generate type array for super call
const generateTypeArray = (struct, enums, structs) => {
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
};

// Helper to generate args array for super call
const generateArgsArray = (struct) => struct.fields
    .map((field) => field.name)
    .join(', ');

// Helper to find piped fields in nested structs
const findPipedFieldsInStruct = (field, structs, prefix = '', index = '') => {
    const struct = structs[field.type];
    if (!struct) {
        return field.isPiped ? [`this.args${index}`] : [];
    }

    return struct.fields.flatMap((f, i) => {
        const newPrefix = prefix ? `${prefix}.${f.name}` : f.name;
        const newIndex = `${index}[${i}]`;
        return findPipedFieldsInStruct(f, structs, newPrefix, newIndex);
    });
};

// Helper to generate mappable args
const generateMappableArgs = (struct, structs) => {
    const mappableArgs = struct.fields.flatMap((field, i) => {
        if (structs[field.type]) {
            return findPipedFieldsInStruct(field, structs, field.name, `[${i}]`);
        }
        return field.isPiped ? [`this.args[${i}]`] : [];
    });

    return mappableArgs
        .map((arg) => `      ${arg},`)
        .join('\n');
};

const generateTypeScriptAction = (templateContent, actionName) => {
    const { structs, enums } = parseDefinitions(templateContent);

    if (!structs.Params) {
        throw new Error('Template must contain a Params struct');
    }

    // Get required type imports
    const requiredTypes = getRequiredTypes(structs.Params, enums, structs);

    // Check if there are any piped fields
    const hasPipedFields = structs.Params.fields.some((field) => {
        if (structs[field.type]) {
            const pipedFields = findPipedFieldsInStruct(field, structs);
            return pipedFields.length > 0;
        }
        return field.isPiped;
    });

    const mappableArgsSection = hasPipedFields ? `
    this.mappableArgs = [
${generateMappableArgs(structs.Params, structs)}
    ];` : '';

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

const generateActionSdk = (templatePath, actionName, outputPath) => {
    if (!existsSync(templatePath)) {
        console.error(`Template file not found at ${templatePath}`);
        process.exit(1);
    }

    const templateContent = readFileSync(templatePath, 'utf8');
    const tsCode = generateTypeScriptAction(templateContent, actionName);

    // If outputPath is a directory, append the file name
    if (existsSync(outputPath) && statSync(outputPath).isDirectory()) {
        outputPath = join(outputPath, `${actionName}Action.ts`);
    }

    writeFileSync(outputPath, tsCode);
    console.log(`Generated TypeScript SDK action at ${outputPath}`);
};

const generateProtocolSdk = (templatePath, outputPath) => {
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
        const tsCode = generateTypeScriptAction(actionContent, action.name);
        const outputFile = join(protocolDir, `${action.name}Action.ts`);
        writeFileSync(outputFile, tsCode);
        actionNames.push(action.name);
        console.log(`Generated TypeScript SDK action at ${outputFile}`);
    });

    // Generate index.ts
    const indexContent = actionNames
        .map((name) => `export * from './${name}Action';`)
        .join('\n');
    writeFileSync(join(protocolDir, 'index.ts'), indexContent);
    console.log(`Generated index.ts in ${protocolDir}`);
};

// Helper to find SDK signature for an action
const findSdkSignature = (actionName) => {
    try {
        const signaturesPath = join(process.cwd(), 'cmd', 'sdkSignatures', 'signatures.txt');
        const signatures = readFileSync(signaturesPath, 'utf8');
        // Convert action name to camelCase for matching
        const camelCaseName = actionName[0].toLowerCase() + actionName.slice(1);
        // Look for the signature block
        const regex = new RegExp(`const ${camelCaseName}Action = new dfs\\.actions\\.[\\w.]+\\([\\s\\S]+?\\);`, 'g');
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

// Helper to extract NatSpec comments from a string
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

// Helper to extract struct params with natspec comments
const extractParamsWithComments = (content) => {
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
    const params = structContent.split('\n')
        .map((line) => line.trim())
        .filter((line) => line.endsWith(';'));

    // Format comments above struct and params inside
    return `    ${paramComments.join('\n    ')}\n    struct Params {\n        ${params.join('\n        ')}\n    }`;
};

// Helper to extract return value
const extractReturnValue = (content) => {
    const returnMatch = content.match(/return\s*\(.*?\);/g);
    if (!returnMatch) return 'unknown';

    return returnMatch[0];
};

// Helper to extract event information and log data
const extractEvents = (content) => {
    const actionEventMatch = content.match(/emit\s+ActionEvent\("([^"]+)"/);
    const logDirectMatch = content.match(/logActionDirectEvent\("([^"]+)"/);
    if (!actionEventMatch || !logDirectMatch) {
        return `\`\`\`solidity
\`\`\``;
    }

    return `\`\`\`solidity
emit ActionEvent("${actionEventMatch[1]}", logData);
logger.logActionDirectEvent("${logDirectMatch[1]}", logData);
bytes memory logData = abi.encode(params);
\`\`\``;
};

// Helper to find contract file by name
const findContractFile = (contractName) => {
    try {
        // Use find command to locate the contract file
        const result = execSync(`find contracts -type f -name "${contractName}.sol"`, { encoding: 'utf8' });
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

// Main function to generate action documentation
const genActionDoc = (contractName, outputPath = 'gen/docs') => {
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
    const events = extractEvents(content);

    // Find SDK signature from signatures.txt
    const sdkSignature = findSdkSignature(contractName);
    let sdkSection = sdkSignature
        ? `\n${sdkSignature}`
        : `\nconst ${contractName[0].toLowerCase()}${contractName.slice(1)}Action = new dfs.actions.${contractName}Action(\n    ...args\n);\n`;

    sdkSection = `\`\`\`ts${sdkSection}\n\`\`\``;

    // Create output directory if it doesn't exist
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

(async () => {
    program
        .command('genActionSol <actionName>')
        .description('Generate a Solidity action file from a template')
        .option('-t, --template <path>', 'Template file path (defaults to cmd/actionTemplates/defaultTemplate.sol)')
        .option('-o, --output <path>', 'Output path for the generated Solidity file (defaults to contracts/actions/<actionName>.sol)')
        .action((actionName, options) => {
            const templatePath = options.template || join(process.cwd(), 'cmd', './actionTemplates/defaultTemplate.sol');
            const outputPath = options.output || join(process.cwd(), 'contracts', 'actions', `${actionName}.sol`);
            generateAction(templatePath, actionName, outputPath);
            process.exit(0);
        });

    program
        .command('genProtocolSol')
        .description('Generate multiple Solidity action files from a protocol template')
        .option('-t, --template <path>', 'Template file path (defaults to cmd/protocolTemplates/defaultTemplate.sol)')
        .option('-o, --output <path>', 'Output directory for the generated files (defaults to contracts/actions)')
        .action((options) => {
            const templatePath = options.template || join(process.cwd(), 'cmd', './protocolTemplates/defaultTemplate.sol');
            const outputPath = options.output || join(process.cwd(), 'contracts', 'actions');
            generateProtocolActions(templatePath, outputPath);
            process.exit(0);
        });

    program
        .command('genActionSdk <actionName>')
        .description('Generate a TypeScript SDK action file from a template')
        .option('-t, --template <path>', 'Template file path (defaults to cmd/actionTemplates/defaultTemplate.sol)')
        .option('-o, --output <path>', 'Output path for the generated TypeScript file (defaults to sdk/actions/<actionName>Action.ts)')
        .action((actionName, options) => {
            const templatePath = options.template || join(process.cwd(), 'cmd', './actionTemplates/defaultTemplate.sol');
            const outputPath = options.output || join(process.cwd(), 'gen/sdk', `${actionName}Action.ts`);
            generateActionSdk(templatePath, actionName, outputPath);
            process.exit(0);
        });

    program
        .command('genProtocolSdk')
        .description('Generate TypeScript SDK action files from a protocol template')
        .option('-t, --template <path>', 'Template file path (defaults to cmd/protocolTemplates/defaultTemplate.sol)')
        .option('-o, --output <path>', 'Output directory for the generated files (defaults to gen/sdk)')
        .action((options) => {
            const templatePath = options.template || join(process.cwd(), 'cmd', './protocolTemplates/defaultTemplate.sol');
            const outputPath = options.output || join(process.cwd(), 'gen/sdk');
            generateProtocolSdk(templatePath, outputPath);
            process.exit(0);
        });

    program
        .command('genActionDoc <contractPath>')
        .description('Generate documentation from a contract source file')
        .option('-o, --output <path>', 'Output directory for documentation (defaults to gen/docs)')
        .action((contractName, options) => {
            const outputPath = options.output || join(process.cwd(), 'gen/docs');
            genActionDoc(contractName, outputPath);
            process.exit(0);
        });

    program.parse(process.argv);
})();
