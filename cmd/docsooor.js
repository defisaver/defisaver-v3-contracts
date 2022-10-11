const fs = require('fs');
const path = require('path');
const hre = require('hardhat');

const { program } = require('commander');

const { findPathByContractName } = require('../scripts/hardhat-tasks-functions');

// TODO: l2 support
const parseActionInfo = async (contractName, sdkName) => {
    const filePath = await findPathByContractName(contractName);
    const attributes = {};

    const pathToAddrs = path.join(__dirname, '/../addresses');
    const mainnetAddrs = JSON.parse(fs.readFileSync(`${pathToAddrs}/mainnet.json`, 'utf8'));

    const addrInfoMainnet = mainnetAddrs.filter(n => n.name == contractName);

    let contractString = fs.readFileSync(filePath, 'utf8').toString();
    let actionsString = fs.readFileSync(path.join(__dirname, '/../test/actions.js'), 'utf8');

    attributes.network = 'mainnet';
    attributes.struct_params = contractString.match(/( \s*\/\/\/ @param[\w\s]+\s)*struct Params {\n[^}]*}/g);
    attributes.description = (contractString.match(/\/\/\/ @title .*/g))[0].slice(11);
    attributes.return_value = contractString.match(/return bytes32.*/g);
    const hints = contractString.match(/\/\/\/ @dev.*/g);
    attributes.events = (contractString.match(/(bytes memory logData .*)|(logger.logActionDirectEvent.*)|(emit ActionEvent.*)/g)).join('\n');
    attributes.action_type = contractString.match(/ActionType[^)]*/g);
    attributes.sdk_action = actionsString.match(new RegExp('.*' + sdkName + '[^;]*;', 'g'));
    attributes.gh_link = `https://github.com/defisaver/defisaver-v3-contracts/blob/${filePath}`;
    attributes.etherscan_link = `https://etherscan.io/address/${addrInfoMainnet[0].address}`;

    let templateDoc = fs.readFileSync(path.join(__dirname, './docs_template.md'), 'utf8').toString();

    console.log(attributes.hints);

    attributes.hints = [];
    hints.forEach(hint => {
        attributes.hints.push(`{% hint style='info' %}\n${hint.slice(8)}\n{% endhint %}`);
    });

    attributes.hints = attributes.hints.join('\n');

    for (const placeholder in attributes) {
        templateDoc = templateDoc.replace('${' + placeholder + '}', attributes[placeholder]);
    }

    fs.writeFileSync(`${contractName}.md`, templateDoc);

};

(async () => {
    program
        .command('generate-action <contractName> [sdkName]')
        .description('Generates a doc template for a DFS action')
        .action(async (contractName, sdkName) => {
            await parseActionInfo(contractName, sdkName);

            process.exit(0);
        });

    program.parse(process.argv);
})();
