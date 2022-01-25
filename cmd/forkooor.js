/* eslint-disable import/no-extraneous-dependencies */
const hre = require('hardhat');
require('dotenv-safe').config();
const fs = require('fs');
const { spawnSync } = require('child_process');
const dfs = require('@defisaver/sdk');
const { getAssetInfo, ilks } = require('@defisaver/tokens');

const { program } = require('commander');

const {
    parse,
    stringify,
} = require('envfile');

const path = require('path');
const {
    createFork, topUp,
} = require('../scripts/utils/fork');

const {
    getProxy, getAddrFromRegistry, approve, MCD_MANAGER_ADDR, depositToWeth,
} = require('../test/utils');

const {
    getVaultsForUser,
} = require('../test/utils-mcd');

program.version('0.0.1');

const REGISTRY_ADDR = '0x4B6C6CC2384e08c073C97e262B7046d2ef42E836';

function setEnv(key, value) {
    const pathToEnv = path.join(__dirname, '/../.env');
    fs.readFile(pathToEnv, 'utf8', (err, data) => {
        const result = parse(data);
        result[key] = value;

        // eslint-disable-next-line consistent-return
        fs.writeFile(pathToEnv, stringify(result), (err2) => {
            if (err) {
                return console.log(err2);
            }
        });
    });
}

// eslint-disable-next-line consistent-return
const createMcdVault = async (type, coll, debt) => {
    const senderAcc = (await hre.ethers.getSigners())[0];

    await topUp(senderAcc.address);

    const proxy = await getProxy(senderAcc.address);

    const ilkObj = ilks.find((i) => i.ilkLabel === type);

    let asset = ilkObj.asset;
    if (asset === 'ETH') asset = 'WETH';
    const tokenData = getAssetInfo(asset);

    const amountColl = hre.ethers.utils.parseUnits(coll, tokenData.decimals);
    const amountDai = hre.ethers.utils.parseUnits(debt, 18);

    if (asset === 'WETH') {
        await depositToWeth(amountColl);
    } else {
        // TODO: buy tokens
    }

    await approve(tokenData.address, proxy.address);

    const recipeExecutorAddr = await getAddrFromRegistry('RecipeExecutor', REGISTRY_ADDR);

    const createVaultRecipe = new dfs.Recipe('CreateVaultRecipe', [
        new dfs.actions.maker.MakerOpenVaultAction(ilkObj.join, MCD_MANAGER_ADDR),
        new dfs.actions.maker.MakerSupplyAction('$1', amountColl, ilkObj.join, senderAcc.address, MCD_MANAGER_ADDR),
        new dfs.actions.maker.MakerGenerateAction('$1', amountDai, senderAcc.address, MCD_MANAGER_ADDR),
    ]);

    const functionData = createVaultRecipe.encodeForDsProxyCall();

    try {
        await proxy['execute(address,bytes)'](recipeExecutorAddr, functionData[1], { gasLimit: 3000000 });

        const vaultsAfter = await getVaultsForUser(proxy.address);

        console.log(`Vault #${vaultsAfter.ids[vaultsAfter.ids.length - 1].toString()} created`);
    } catch (err) {
        console.log(err);
    }

    process.exit(0);
};

(async () => {
    program
        .command('deploy ')
        .description('Creates a Mcd Vault')
        .action(async () => {
            console.log('This might take a few minutes dont stop the process');

            await spawnSync('npm run deploy fork deploy-on-fork',
                {
                    shell: true,
                    stdio: [process.stdin, process.stdout, process.stderr],
                    encoding: 'utf-8',
                });

            process.exit(0);
        });

    program
        .command('create-vault <type> <coll> <debt>')
        .description('Creates a Mcd Vault')
        .action(async (type, coll, debt) => {
            await createMcdVault(type, coll, debt);
        });

    program
        .command('new-fork')
        .description('Creates a Mcd Vault')
        .action(async () => {
            const forkId = await createFork();

            console.log(`Fork id: ${forkId}   |   Rpc url https://rpc.tenderly.co/fork/${forkId}`);

            setEnv('FORK_ID', forkId);

            process.exit(0);
        });

    program
        .command('gib-money <account>')
        .description('Gives 10000 Eth to the specified account')
        .action(async (account) => {
            await topUp(account);
            console.log(`Acc: ${account} credited with 10000 Eth`);
            process.exit(0);
        });

    program.parse(process.argv);
})();
