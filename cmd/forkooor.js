/* eslint-disable no-use-before-define */
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
    getProxy,
    getAddrFromRegistry,
    approve,
    depositToWeth,
    balanceOf,
    MCD_MANAGER_ADDR,
    WETH_ADDRESS,
    UNISWAP_WRAPPER,
    DAI_ADDR,
    rariDaiFundManager,
    rdptAddress,
} = require('../test/utils');

const {
    getVaultsForUser,
    getRatio,
    getVaultInfo,
} = require('../test/utils-mcd');

const {
    sell,
    yearnSupply,
    rariDeposit,
    mStableDeposit,
} = require('../test/actions');

const {
    mUSD,
    imUSD,
    imUSDVault,
    AssetPair,
} = require('../test/utils-mstable');

const { subMcdRepayStrategy } = require('../test/strategy-subs');

program.version('0.0.1');

// TODO: inject this
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

// TODO: support more than dai?
const supplyInSS = async (protocol, daiAmount) => {
    const senderAcc = (await hre.ethers.getSigners())[0];
    const proxy = await getProxy(senderAcc.address);

    // very rough estimate takes 1000 eth pre dai price
    const ethEstimate = daiAmount / 1000;
    try {
        await sell(
            proxy,
            WETH_ADDRESS,
            DAI_ADDR,
            hre.ethers.utils.parseUnits(ethEstimate.toString(), 18),
            UNISWAP_WRAPPER,
            senderAcc.address,
            senderAcc.address,
            0,
            REGISTRY_ADDR,
        );
    } catch (err) {
        console.log('Buying dai failed');
    }

    const daiAmountWei = hre.ethers.utils.parseUnits(daiAmount.toString(), 18);

    await approve(DAI_ADDR, proxy.address);

    try {
        if (protocol === 'yearn') {
            await yearnSupply(
                DAI_ADDR,
                daiAmountWei,
                senderAcc.address,
                senderAcc.address,
                proxy,
                REGISTRY_ADDR,
            );
        } else if (protocol === 'rari') {
            await rariDeposit(
                rariDaiFundManager,
                DAI_ADDR,
                rdptAddress,
                daiAmount,
                senderAcc.address,
                proxy.address,
                proxy,
                REGISTRY_ADDR,
            );
        } else if (protocol === 'mstable') {
            await mStableDeposit(
                proxy,
                DAI_ADDR,
                mUSD,
                imUSD,
                imUSDVault,
                senderAcc.address,
                proxy.address,
                daiAmount,
                0,
                AssetPair.BASSET_IMASSETVAULT,
                REGISTRY_ADDR,
            );
        }

        console.log(`Deposited to ${protocol} ${daiAmount} Dai`);
    } catch (err) {
        console.log(`Failed to supply ${daiAmount} to ${protocol}`);
    }
};

const smartSavingsStrategySub = async (protocol, vaultId, minRatio, targetRatio) => {
    const senderAcc = (await hre.ethers.getSigners())[0];
    const proxy = await getProxy(senderAcc.address);

    const ratioUnderWei = hre.ethers.utils.parseUnits(minRatio, '16');
    const targetRatioWei = hre.ethers.utils.parseUnits(targetRatio, '16');

    let bundleId = 0;

    if (protocol === 'mstable') {
        bundleId = 1;
    }

    if (protocol === 'rari') {
        bundleId = 2;
    }

    const { subId } = await subMcdRepayStrategy(
        proxy, bundleId, vaultId, ratioUnderWei, targetRatioWei, false, REGISTRY_ADDR,
    );

    console.log(`Subscribed to ${protocol} strategy with sub id #${subId}`);
};

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
        try {
            await sell(
                proxy,
                WETH_ADDRESS,
                tokenData.address,
                hre.ethers.utils.parseUnits('100', 18),
                UNISWAP_WRAPPER,
                senderAcc.address,
                senderAcc.address,
                0,
                REGISTRY_ADDR,
            );
        } catch (err) {
            console.log(`Buying ${tokenData.name} failed`);
        }
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

const getDFSAddr = async (actionName) => {
    const addr = await getAddrFromRegistry(actionName, REGISTRY_ADDR);

    console.log(`Address: ${addr}`);
};

const getBalanceCall = async (account, tokenLabel) => {
    const token = getAssetInfo(tokenLabel);

    const balance = await balanceOf(token.address, account);

    console.log(`Balance: ${balance.toString()} | ${hre.ethers.utils.formatUnits(balance, token.decimals)}`);
};

const getCdp = async (cdpId) => {
    const mcdViewAddr = await getAddrFromRegistry('McdView', REGISTRY_ADDR);
    const mcdView = await hre.ethers.getContractAt('McdView', mcdViewAddr);
    const ratio = await getRatio(mcdView, cdpId);
    // const cdpState = await getVaultInfo(mcdView, cdpId);

    console.log(`Vault id: #${cdpId} has ratio ${ratio}%`);
    // console.log(`Coll: ${cdpState.coll}`);
    // console.log(`Debt: ${cdpState.debt}`);
};

const callSell = async (srcTokenLabel, destTokenLabel, srcAmount) => {
    const srcToken = getAssetInfo(srcTokenLabel);
    const destToken = getAssetInfo(destTokenLabel);
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);
    const proxy = await getProxy(senderAcc.address);

    try {
        await sell(
            proxy,
            srcToken.address,
            destToken.address,
            hre.ethers.utils.parseUnits(srcAmount.toString(), 18),
            UNISWAP_WRAPPER,
            senderAcc.address,
            senderAcc.address,
            0,
            REGISTRY_ADDR,
        );

        console.log(`${srcAmount} ${srcTokenLabel} -> ${destTokenLabel}`);
        let balanceSrc = await balanceOf(srcToken.address, senderAcc.address);
        let balanceDest = await balanceOf(destToken.address, senderAcc.address);

        balanceSrc = hre.ethers.utils.formatUnits(balanceSrc, srcToken.decimals);
        balanceDest = hre.ethers.utils.formatUnits(balanceDest, destToken.decimals);

        console.log(`Balance ${srcTokenLabel}`, balanceSrc.toString());
        console.log(`Balance ${destTokenLabel}: `, balanceDest.toString());
    } catch (err) {
        console.log(`Buying ${destTokenLabel} failed`);
    }
};

(async () => {
    program
        .command('deploy ')
        .description('Deploys the whole system to the fork and builds strategies')
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
        .command('new-fork')
        .description('Creates a new tenderly fork')
        .action(async () => {
            const forkId = await createFork();

            console.log(`Fork id: ${forkId}   |   Rpc url https://rpc.tenderly.co/fork/${forkId}`);

            setEnv('FORK_ID', forkId);

            process.exit(0);
        });

    program
        .command('create-vault <type> <coll> <debt>')
        .description('Creates a Mcd Vault')
        .action(async (type, coll, debt) => {
            await createMcdVault(type, coll, debt);
            process.exit(0);
        });

    program
        .command('deposit-in-ss <protocol> <amount>')
        .description('Deposits dai in smart savings')
        .action(async (protocol, amount) => {
            await supplyInSS(protocol, amount);
            process.exit(0);
        });

    program
        .command('sub-ss <protocol> <vaultId> <minRatio> <targetRatio>')
        .description('Subscribes to a Smart Savings strategy')
        .action(async (protocol, vaultId, minRatio, targetRatio) => {
            await smartSavingsStrategySub(protocol, vaultId, minRatio, targetRatio);
            process.exit(0);
        });

    program
        .command('gib-money <account>')
        .description('Gives 100000 Eth to the specified account')
        .action(async (account) => {
            await topUp(account);
            console.log(`Acc: ${account} credited with 100000 Eth`);
            process.exit(0);
        });

    program
        .command('get-addr <actionName>')
        .description('Fetches address from DFSRegistry by name')
        .action(async (actionName) => {
            await getDFSAddr(actionName);
            process.exit(0);
        });

    program
        .command('get-balance <account> <tokenLabel>')
        .description('Gets token/eth balance of account')
        .action(async (account, tokenLabel) => {
            await getBalanceCall(account, tokenLabel);
            process.exit(0);
        });

    program
        .command('get-cdp <cdpId>')
        .description('Returns data about a cdp')
        .action(async (cdpId) => {
            await getCdp(cdpId);
            process.exit(0);
        });

    program
        .command('sell <srcTokenLabel> <destTokenLabel> <srcAmount>')
        .description('Calls sell operation to get tokens other than eth')
        .action(async (srcTokenLabel, destTokenLabel, srcAmount) => {
            await callSell(srcTokenLabel, destTokenLabel, srcAmount);
            process.exit(0);
        });

    program.parse(process.argv);
})();
