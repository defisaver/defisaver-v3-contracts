/* eslint-disable no-await-in-loop */
/* eslint-disable no-unused-vars */
/* eslint-disable no-param-reassign */
/* eslint-disable import/no-extraneous-dependencies */
require('dotenv-safe').config();

const { program } = require('commander');
const {
    readFileSync, writeFileSync, existsSync, statSync,
} = require('fs');
const { join } = require('path');

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
${enumDefinitions}
${structDefinitions}

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
        // TODO: Implement action logic here
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

(async () => {
    program
        .command('genSol <actionName>')
        .description('Generate a Solidity action file from a template')
        .option('-t, --template <path>', 'Template file path (defaults to cmd/actionTemplates/defaultTemplate.sol)')
        .option('-o, --output <path>', 'Output path for the generated Solidity file (defaults to contracts/actions/<actionName>.sol)')
        .action((actionName, options) => {
            const templatePath = options.template || join(process.cwd(), 'cmd', './actionTemplates/defaultTemplate.sol');
            const outputPath = options.output || join(process.cwd(), 'contracts', 'actions', `${actionName}.sol`);
            generateAction(templatePath, actionName, outputPath);
            process.exit(0);
        });

    program.parse(process.argv);
})();
