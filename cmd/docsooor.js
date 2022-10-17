const fs = require('fs');
const path = require('path');
const hre = require('hardhat');

const { program } = require('commander');

const { findPathByContractName } = require('../scripts/hardhat-tasks-functions');

const parseActionInfo = async (contractName, sdkName) => {
    const filePath = await findPathByContractName(contractName);
    const attributes = {};

    const pathToAddrs = path.join(__dirname, '/../addresses');
    const mainnetAddrs = JSON.parse(fs.readFileSync(`${pathToAddrs}/mainnet.json`, 'utf8'));
    const optimismAddrs = JSON.parse(fs.readFileSync(`${pathToAddrs}/optimism.json`, 'utf8'));
    const arbitrumAddrs = JSON.parse(fs.readFileSync(`${pathToAddrs}/arbitrum.json`, 'utf8'));

    const addrInfoMainnet = mainnetAddrs.filter((n) => n.name === contractName);
    const addrInfoOptimism = optimismAddrs.filter((n) => n.name === contractName);
    const addrInfoArbitrum = arbitrumAddrs.filter((n) => n.name === contractName);

    const networkInfos = [addrInfoMainnet[0], addrInfoOptimism[0], addrInfoArbitrum[0]];

    attributes.networks = [];
    const ghLink = `https://github.com/defisaver/defisaver-v3-contracts/blob/${filePath}`;

    networkInfos.forEach((network, i) => {
        if (network) {
            attributes.action_id = network.id;
            let etherscanLink = `https://etherscan.io/address/${network.address}`;
            let networkName = 'mainnet';

            if (i === 1) {
                etherscanLink = `https://optimistic.etherscan.io/address/${network.address}`;
                networkName = 'optimism';
            }

            if (i === 2) {
                etherscanLink = `https://arbiscan.io/address/${network.address}`;
                networkName = 'arbitrum';
            }

            attributes.networks.push(`**Network ${networkName}:** \n([Deployed address](${etherscanLink}) **|** [Code](${ghLink}))`);
        }
    });
    attributes.networks = attributes.networks.join('\n\n');

    const contractString = fs.readFileSync(filePath, 'utf8').toString();
    const actionsString = fs.readFileSync(path.join(__dirname, '/../test/actions.js'), 'utf8');

    attributes.network = 'mainnet';
    attributes.struct_params = contractString.match(/( \s*\/\/\/ @param[\w\s_.,!"'-;/?$]+\s)*struct Params {\n[^}]*}/g);
    attributes.description = (contractString.match(/\/\/\/ @title .*/g))[0].slice(11);
    attributes.return_value = contractString.match(/return bytes32.*/g);
    let hints = contractString.match(/\/\/\/ @dev.*/g);
    attributes.events = (contractString.match(/(bytes memory logData [^;]*)|(logger.logActionDirectEvent.*)|(emit ActionEvent.*)/g))?.join('\n\n');
    attributes.action_type = contractString.match(/ActionType[^)]*/g)[0].split('.')[1];
    attributes.sdk_action = actionsString.match(new RegExp(`.*${sdkName}[^;]*;`, 'g'));

    if (attributes.sdk_action) {
        attributes.sdk_action = attributes.sdk_action[0];
    }

    let templateDoc = fs.readFileSync(path.join(__dirname, './docs_template.md'), 'utf8').toString();

    console.log(attributes.hints);

    attributes.hints = [];
    if (!hints) {
        hints = [];
    }

    hints.forEach((hint) => {
        attributes.hints.push(`{% hint style='info' %}\n${hint.slice(8)}\n{% endhint %}`);
    });

    attributes.hints = attributes.hints.join('\n');

    // eslint-disable-next-line guard-for-in, no-restricted-syntax
    for (const placeholder in attributes) {
        templateDoc = templateDoc.replace(`\${${placeholder}}`, attributes[placeholder]);
    }

    fs.writeFileSync(path.join(__dirname, `/../docs/${contractName}.md`), templateDoc);
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
