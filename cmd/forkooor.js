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
    openStrategyAndBundleStorage,
    WETH_ADDRESS,
    UNISWAP_WRAPPER,
    DAI_ADDR,
    rariDaiFundManager,
    rdptAddress,
    WBTC_ADDR,
} = require('../test/utils');

const {
    getVaultsForUser,
    getRatio,
    getVaultInfo,
    MCD_MANAGER_ADDR,
} = require('../test/utils-mcd');

const {
    sell,
    yearnSupply,
    rariDeposit,
    mStableDeposit,
    supplyMcd,
    withdrawMcd,
} = require('../test/actions');

const { deployContract } = require('../scripts/utils/deployer');

const {
    mUSD,
    imUSD,
    imUSDVault,
    AssetPair,
} = require('../test/utils-mstable');

const {
    getSubHash,
    addBotCaller,
    getLatestStrategyId,
    createStrategy,
} = require('../test/utils-strategies');

const { createLiquityCloseToCollStrategy } = require('../test/strategies');

const {
    subRepayFromSavingsStrategy,
    subMcdCloseStrategy,
    subMcdCloseToCollStrategy,
    subLiquityCloseToCollStrategy,
} = require('../test/strategy-subs');

const { createMcdTrigger, createChainLinkPriceTrigger, RATIO_STATE_UNDER } = require('../test/triggers');

program.version('0.0.1');
// let forkedAddresses = '';
try {
    // eslint-disable-next-line global-require
    // forkedAddresses = require('../forked-addr.json');
} catch (err) {
    console.log('No forked registry set yet, please run deploy');
}

const REGISTRY_ADDR = '0x287778F121F134C66212FB16c9b53eC991D32f5b'; // forkedAddresses.DFSRegistry;
const abiCoder = new hre.ethers.utils.AbiCoder();

function setEnv(key, value) {
    const pathToEnv = path.join(__dirname, '/../.env');

    const data = fs.readFileSync(pathToEnv, 'utf8');
    const result = parse(data);
    result[key] = value;

    // eslint-disable-next-line consistent-return
    fs.writeFileSync(pathToEnv, stringify(result));
}

// TODO: support more than dai?
const supplyInSS = async (protocol, daiAmount, sender) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

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
            senderAcc,
            REGISTRY_ADDR,
        );
    } catch (err) {
        console.log('Buying dai failed');
    }

    const bal = await balanceOf(DAI_ADDR, senderAcc.address);
    console.log(`Users balance ${bal.toString()}`);
    const daiAmountWei = hre.ethers.utils.parseUnits(daiAmount.toString(), 18);

    await approve(DAI_ADDR, proxy.address, senderAcc);

    try {
        if (protocol === 'yearn') {
            await yearnSupply(
                DAI_ADDR,
                daiAmountWei,
                senderAcc.address,
                proxy.address,
                proxy,
                REGISTRY_ADDR,
            );
        } else if (protocol === 'rari') {
            await rariDeposit(
                rariDaiFundManager,
                DAI_ADDR,
                rdptAddress,
                daiAmountWei,
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
                daiAmountWei,
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

const updateMcdCloseStrategySub = async (subId, vaultId, type, price, priceState, sender) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    const subProxyAddr = await getAddrFromRegistry('SubProxy', REGISTRY_ADDR);
    const subProxy = await hre.ethers.getContractAt('SubProxy', subProxyAddr);

    const subStorageAddr = await getAddrFromRegistry('SubStorage', REGISTRY_ADDR);
    const subStorage = await hre.ethers.getContractAt('SubStorage', subStorageAddr);

    const formattedPrice = (price * 1e8).toString();

    let formattedPriceState;
    if (priceState.toLowerCase() === 'over') {
        formattedPriceState = 0;
    } else if (priceState.toLowerCase() === 'under') {
        formattedPriceState = 1;
    }

    const ilkObj = ilks.find((i) => i.ilkLabel === type);

    // diff. chainlink price address for bitcoin
    if (ilkObj.assetAddress.toLocaleLowerCase() === WBTC_ADDR.toLocaleLowerCase()) {
        ilkObj.assetAddress = '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB';
    }

    const triggerData = await createChainLinkPriceTrigger(
        ilkObj.assetAddress,
        formattedPrice,
        formattedPriceState,
    );

    const vaultIdEncoded = abiCoder.encode(['uint256'], [vaultId.toString()]);
    const daiEncoded = abiCoder.encode(['address'], [DAI_ADDR]);
    const mcdManagerEncoded = abiCoder.encode(['address'], [MCD_MANAGER_ADDR]);

    const strategyId = (await getLatestStrategyId());
    const isBundle = false;

    const strategySub = [vaultIdEncoded, daiEncoded, mcdManagerEncoded];

    const updatedSubData = [strategyId, isBundle, [triggerData], strategySub];

    const hashToSet = getSubHash(updatedSubData);

    const functionData = subProxy.interface.encodeFunctionData('updateSubData', [subId, updatedSubData]);

    try {
        await proxy['execute(address,bytes)'](subProxy.address, functionData, {
            gasLimit: 5000000,
        });
    } catch (err) {
        console.log('Updated failed');
        return;
    }

    const storedSub = await subStorage.getSub(subId);

    if (storedSub.strategySubHash !== hashToSet) {
        console.log('Updated failed!');
    } else {
        console.log(`Updated sub id ${subId}, hash: ${hashToSet}`);
    }
};

const updateMcdCloseToCollStrategySub = async (subId, vaultId, type, price, priceState, sender) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    const subProxyAddr = await getAddrFromRegistry('SubProxy', REGISTRY_ADDR);
    const subProxy = await hre.ethers.getContractAt('SubProxy', subProxyAddr);

    const subStorageAddr = await getAddrFromRegistry('SubStorage', REGISTRY_ADDR);
    const subStorage = await hre.ethers.getContractAt('SubStorage', subStorageAddr);

    const formattedPrice = (price * 1e8).toString();

    let formattedPriceState;
    if (priceState.toLowerCase() === 'over') {
        formattedPriceState = 0;
    } else if (priceState.toLowerCase() === 'under') {
        formattedPriceState = 1;
    }

    const ilkObj = ilks.find((i) => i.ilkLabel === type);

    const collEncoded = abiCoder.encode(['address'], [ilkObj.assetAddress]);

    // diff. chainlink price address for bitcoin
    if (ilkObj.assetAddress.toLocaleLowerCase() === WBTC_ADDR.toLocaleLowerCase()) {
        ilkObj.assetAddress = '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB';
    }

    const triggerData = await createChainLinkPriceTrigger(
        ilkObj.assetAddress,
        formattedPrice,
        formattedPriceState,
    );

    const vaultIdEncoded = abiCoder.encode(['uint256'], [vaultId.toString()]);
    const daiEncoded = abiCoder.encode(['address'], [DAI_ADDR]);
    const mcdManagerEncoded = abiCoder.encode(['address'], [MCD_MANAGER_ADDR]);

    const strategyId = (await getLatestStrategyId());
    const isBundle = false;

    const strategySub = [vaultIdEncoded, collEncoded, daiEncoded, mcdManagerEncoded];

    const updatedSubData = [strategyId, isBundle, [triggerData], strategySub];

    const hashToSet = getSubHash(updatedSubData);

    const functionData = subProxy.interface.encodeFunctionData('updateSubData', [subId, updatedSubData]);

    try {
        await proxy['execute(address,bytes)'](subProxy.address, functionData, {
            gasLimit: 5000000,
        });
    } catch (err) {
        console.log('Updated failed');
        return;
    }

    const storedSub = await subStorage.getSub(subId);

    if (storedSub.strategySubHash !== hashToSet) {
        console.log('Updated failed!');
    } else {
        console.log(`Updated sub id ${subId}, hash: ${hashToSet}`);
    }
};

const smartSavingsStrategySub = async (protocol, vaultId, minRatio, targetRatio, sender) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    const ratioUnderWei = hre.ethers.utils.parseUnits(minRatio, '16');
    const targetRatioWei = hre.ethers.utils.parseUnits(targetRatio, '16');

    let bundleId = 0;

    if (protocol === 'mstable') {
        bundleId = 1;
    }

    if (protocol === 'rari') {
        bundleId = 2;
    }

    const { subId } = await subRepayFromSavingsStrategy(
        proxy, bundleId, vaultId, ratioUnderWei, targetRatioWei, true, REGISTRY_ADDR,
    );

    console.log(`Subscribed to ${protocol} bundle with sub id #${subId}`);
};

const mcdCloseStrategySub = async (vaultId, type, price, priceState, sender) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    await openStrategyAndBundleStorage(true);

    const formattedPrice = (price * 1e8).toString();

    let formattedPriceState;
    if (priceState.toLowerCase() === 'over') {
        formattedPriceState = 0;
    } else if (priceState.toLowerCase() === 'under') {
        formattedPriceState = 1;
    }

    const ilkObj = ilks.find((i) => i.ilkLabel === type);

    // diff. chainlink price address for bitcoin
    if (ilkObj.assetAddress.toLocaleLowerCase() === WBTC_ADDR.toLocaleLowerCase()) {
        ilkObj.assetAddress = '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB';
    }

    const strategyId = 7;

    const { subId } = await subMcdCloseStrategy(
        vaultId,
        proxy,
        formattedPrice,
        ilkObj.assetAddress,
        formattedPriceState,
        strategyId,
        REGISTRY_ADDR,
    );

    console.log(`Subscribed to mcd close strategy with sub id #${subId}`);
};

const mcdCloseToCollStrategySub = async (vaultId, type, price, priceState, sender) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    await openStrategyAndBundleStorage(true);

    const formattedPrice = (price * 1e8).toString();

    let formattedPriceState;
    if (priceState.toLowerCase() === 'over') {
        formattedPriceState = 0;
    } else if (priceState.toLowerCase() === 'under') {
        formattedPriceState = 1;
    }

    const ilkObj = ilks.find((i) => i.ilkLabel === type);
    const strategyId = 8;

    const { subId } = await subMcdCloseToCollStrategy(
        vaultId,
        proxy,
        formattedPrice,
        ilkObj.assetAddress,
        formattedPriceState,
        strategyId,
        REGISTRY_ADDR,
    );

    console.log(`Subscribed to mcd close strategy with sub id #${subId}`);
};

const liquityCloseToCollStrategySub = async (price, priceState, sender) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    await openStrategyAndBundleStorage(true);

    // create
    const liquityCloseToCollStrategy = createLiquityCloseToCollStrategy();

    const strategyId = await createStrategy(proxy, ...liquityCloseToCollStrategy, false);

    const formattedPrice = (price * 1e8).toString();

    console.log('strategyId: ', strategyId);

    let formattedPriceState;
    if (priceState.toLowerCase() === 'over') {
        formattedPriceState = 0;
    } else if (priceState.toLowerCase() === 'under') {
        formattedPriceState = 1;
    }

    const { subId } = await subLiquityCloseToCollStrategy(
        proxy,
        formattedPrice,
        formattedPriceState,
        10,
        REGISTRY_ADDR,
    );

    console.log(`Subscribed to liquity close strategy with sub id #${subId}`);
};

// eslint-disable-next-line max-len
const updateSmartSavingsStrategySub = async (protocol, subId, vaultId, minRatio, targetRatio, sender) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    let bundleId = 0;
    if (protocol === 'mstable') {
        bundleId = 1;
    } else if (protocol === 'rari') {
        bundleId = 2;
    }

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    const subProxyAddr = await getAddrFromRegistry('SubProxy', REGISTRY_ADDR);
    const subProxy = await hre.ethers.getContractAt('SubProxy', subProxyAddr);

    const subStorageAddr = await getAddrFromRegistry('SubStorage', REGISTRY_ADDR);
    const subStorage = await hre.ethers.getContractAt('SubStorage', subStorageAddr);

    const ratioUnderWei = hre.ethers.utils.parseUnits(minRatio, '16');
    const targetRatioWei = hre.ethers.utils.parseUnits(targetRatio, '16');

    const triggerData = await createMcdTrigger(
        vaultId.toString(),
        ratioUnderWei.toString(),
        RATIO_STATE_UNDER,
    );

    const vaultIdEncoded = abiCoder.encode(['uint256'], [vaultId.toString()]);
    const targetRatioEncoded = abiCoder.encode(['uint256'], [targetRatioWei.toString()]);
    const daiAddrEncoded = abiCoder.encode(['address'], [DAI_ADDR]);
    const mcdManagerAddrEncoded = abiCoder.encode(['address'], [MCD_MANAGER_ADDR]);

    const strategySub = [vaultIdEncoded, targetRatioEncoded, daiAddrEncoded, mcdManagerAddrEncoded];

    const isBundle = true;
    const updatedSubData = [bundleId, isBundle, [triggerData], strategySub];

    const hashToSet = getSubHash(updatedSubData);

    const functionData = subProxy.interface.encodeFunctionData('updateSubData', [subId, updatedSubData]);

    try {
        await proxy['execute(address,bytes)'](subProxy.address, functionData, {
            gasLimit: 5000000,
        });
    } catch (err) {
        console.log('Updated failed');
        return;
    }

    const storedSub = await subStorage.getSub(subId);

    if (storedSub.strategySubHash !== hashToSet) {
        console.log('Updated failed!');
    } else {
        console.log(`Updated sub id ${subId}, hash: ${hashToSet}`);
    }
};

const activateSub = async (subId, sender) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    const subProxyAddr = await getAddrFromRegistry('SubProxy', REGISTRY_ADDR);
    const subProxy = await hre.ethers.getContractAt('SubProxy', subProxyAddr);

    const subStorageAddr = await getAddrFromRegistry('SubStorage', REGISTRY_ADDR);
    const subStorage = await hre.ethers.getContractAt('SubStorage', subStorageAddr);

    const functionData = subProxy.interface.encodeFunctionData('activateSub', [subId]);

    try {
        await proxy['execute(address,bytes)'](subProxy.address, functionData, {
            gasLimit: 5000000,
        });
    } catch (err) {
        console.log('Activate sub failed');
        return;
    }

    const storedSub = await subStorage.getSub(subId);

    if (!storedSub.isEnabled) {
        console.log('Activate sub failed');
    } else {
        console.log(`Sub id ${subId} activated!`);
    }
};

const deactivateSub = async (subId, sender) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    const subProxyAddr = await getAddrFromRegistry('SubProxy', REGISTRY_ADDR);
    const subProxy = await hre.ethers.getContractAt('SubProxy', subProxyAddr);

    const subStorageAddr = await getAddrFromRegistry('SubStorage', REGISTRY_ADDR);
    const subStorage = await hre.ethers.getContractAt('SubStorage', subStorageAddr);

    const functionData = subProxy.interface.encodeFunctionData('deactivateSub', [subId]);

    try {
        await proxy['execute(address,bytes)'](subProxy.address, functionData, {
            gasLimit: 5000000,
        });
    } catch (err) {
        console.log('Deactivate sub failed');
        return;
    }

    const storedSub = await subStorage.getSub(subId);

    if (storedSub.isEnabled) {
        console.log('Deactivate sub failed!');
    } else {
        console.log(`Sub id ${subId} deactivated!`);
    }
};

// eslint-disable-next-line consistent-return
const createMcdVault = async (type, coll, debt, sender) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    await topUp(senderAcc.address);

    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    const ilkObj = ilks.find((i) => i.ilkLabel === type);

    let asset = ilkObj.asset;
    if (asset === 'ETH') asset = 'WETH';
    const tokenData = getAssetInfo(asset);

    const amountColl = hre.ethers.utils.parseUnits(coll, tokenData.decimals);
    const amountDai = hre.ethers.utils.parseUnits(debt, 18);

    if (asset === 'WETH') {
        await depositToWeth(amountColl, senderAcc);
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
                senderAcc,
                REGISTRY_ADDR,
            );
        } catch (err) {
            console.log(`Buying ${tokenData.name} failed`);
        }
    }

    await approve(tokenData.address, proxy.address, senderAcc);

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
        console.log(vaultsAfter);

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

const getCdp = async (cdpId, type) => {
    const mcdView = await deployContract('McdView');
    const ratio = await getRatio(mcdView, cdpId);
    console.log(`Vault id: #${cdpId} has ratio ${ratio}%`);

    if (type) {
        const ilkObj = ilks.find((i) => i.ilkLabel === type);
        const cdpState = await getVaultInfo(mcdView, cdpId, ilkObj.ilkBytes, MCD_MANAGER_ADDR);

        console.log(`Coll: ${cdpState.coll}`);
        console.log(`Debt: ${cdpState.debt}`);
    }
};

const callSell = async (srcTokenLabel, destTokenLabel, srcAmount, sender) => {
    const srcToken = getAssetInfo(srcTokenLabel);
    const destToken = getAssetInfo(destTokenLabel);

    let senderAcc = (await hre.ethers.getSigners())[0];

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    await topUp(senderAcc.address);
    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

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
            senderAcc,
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

const supplyCdp = async (type, cdpId, amount, sender) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    await topUp(senderAcc.address);
    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    const ilkObj = ilks.find((i) => i.ilkLabel === type);

    let asset = ilkObj.asset;
    if (asset === 'ETH') asset = 'WETH';
    const tokenData = getAssetInfo(asset);

    const amountInWei = hre.ethers.BigNumber.from(
        hre.ethers.utils.parseUnits(amount.toString(), tokenData.decimals),
    );

    try {
        await supplyMcd(
            proxy,
            cdpId,
            amountInWei,
            tokenData.address,
            ilkObj.join,
            senderAcc.address,
            REGISTRY_ADDR,
        );

        console.log(`Supplied to cdp ${cdpId}`);
        await getCdp(cdpId, type);
    } catch (err) {
        console.log(err);
        console.log('Failed to supply to cdp');
    }
};

const withdrawCdp = async (type, cdpId, amount, sender) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    await topUp(senderAcc.address);

    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    const ilkObj = ilks.find((i) => i.ilkLabel === type);

    let asset = ilkObj.asset;
    if (asset === 'ETH') asset = 'WETH';
    const tokenData = getAssetInfo(asset);

    const amountInWei = hre.ethers.BigNumber.from(
        hre.ethers.utils.parseUnits(amount.toString(), tokenData.decimals),
    );

    try {
        await withdrawMcd(
            proxy,
            cdpId,
            amountInWei,
            ilkObj.join,
            senderAcc.address,
            REGISTRY_ADDR,
        );

        console.log(`Withdraw from cdp ${cdpId}`);
        await getCdp(cdpId, type);
    } catch (err) {
        console.log(err);
        console.log('Failed to withdraw from cdp');
    }
};

(async () => {
    program
        .command('new-fork')
        .description('Creates a new tenderly fork')
        .option('-b, --bots <botAddr...>', 'bot addresses', [])
        .action(async (options) => {
            const forkId = await createFork();

            console.log(`Fork id: ${forkId}   |   Rpc url https://rpc.tenderly.co/fork/${forkId}`);

            setEnv('FORK_ID', forkId);

            if (options.bots.length > 0) {
                // setting this so we can do topUp and addBotCaller from this script
                process.env.FORK_ID = forkId;
                for (let i = 0; i < options.bots.length; i++) {
                    const botAddr = options.bots[i];
                    // eslint-disable-next-line no-await-in-loop
                    await topUp(botAddr);
                    // eslint-disable-next-line no-await-in-loop
                    await addBotCaller(botAddr, REGISTRY_ADDR, true);
                }
            }

            process.exit(0);
        });

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
        .command('create-vault <type> <coll> <debt> [senderAddr]')
        .description('Creates a Mcd Vault')
        .action(async (type, coll, debt, senderAddr) => {
            await createMcdVault(type, coll, debt, senderAddr);
            process.exit(0);
        });

    program
        .command('deposit-in-ss <protocol> <amount> [senderAddr]')
        .description('Deposits dai in smart savings')
        .action(async (protocol, amount, senderAddr) => {
            await supplyInSS(protocol, amount, senderAddr);
            process.exit(0);
        });

    program
        .command('sub-ss <protocol> <vaultId> <minRatio> <targetRatio> [senderAddr]')
        .description('Subscribes to a Smart Savings strategy')
        .action(async (protocol, vaultId, minRatio, targetRatio, senderAddr) => {
            // eslint-disable-next-line max-len
            await smartSavingsStrategySub(protocol, vaultId, minRatio, targetRatio, senderAddr);
            process.exit(0);
        });

    program
        .command('sub-mcd-close <vaultId> <type> <price> <priceState> [senderAddr]')
        .description('Subscribes to a Mcd close to dai strategy')
        .action(async (vaultId, type, price, priceState, senderAddr) => {
            // eslint-disable-next-line max-len
            await mcdCloseStrategySub(vaultId, type, price, priceState, senderAddr);
            process.exit(0);
        });

    program
        .command('sub-mcd-close-to-coll <vaultId> <type> <price> <priceState> [senderAddr]')
        .description('Subscribes to a Mcd close to coll strategy')
        .action(async (vaultId, type, price, priceState, senderAddr) => {
            // eslint-disable-next-line max-len
            await mcdCloseToCollStrategySub(vaultId, type, price, priceState, senderAddr);
            process.exit(0);
        });

    program
        .command('sub-liquity-close-to-coll <price> <priceState> [senderAddr]')
        .description('Subscribes to a Liquity to coll strategy')
        .action(async (price, priceState, senderAddr) => {
            // eslint-disable-next-line max-len
            await liquityCloseToCollStrategySub(price, priceState, senderAddr);
            process.exit(0);
        });

    program
        .command('update-mcd-close <subId> <vaultId> <type> <price> <priceState> [senderAddr]')
        .description('Updates mcd close strategy')
        .action(async (subId, vaultId, type, price, priceState, senderAddr) => {
            await updateMcdCloseStrategySub(subId, vaultId, type, price, priceState, senderAddr);
            process.exit(0);
        });

    program
        .command('update-mcd-close-to-coll <subId> <vaultId> <type> <price> <priceState> [senderAddr]')
        .description('Updates mcd close to coll strategy')
        .action(async (subId, vaultId, type, price, priceState, senderAddr) => {
            // eslint-disable-next-line max-len
            await updateMcdCloseToCollStrategySub(subId, vaultId, type, price, priceState, senderAddr);
            process.exit(0);
        });

    program
        .command('update-ss <protocol> <subId> <vaultId> <minRatio> <targetRatio> [senderAddr]')
        .description('Updates to a Smart Savings strategy')
        .action(async (protocol, subId, vaultId, minRatio, targetRatio, senderAddr) => {
            // eslint-disable-next-line max-len
            await updateSmartSavingsStrategySub(protocol, subId, vaultId, minRatio, targetRatio, senderAddr);
            process.exit(0);
        });

    program
        .command('activate-sub <subId> [senderAddr]')
        .description('Activates subscription for the user')
        .action(async (subId, senderAddr) => {
            await activateSub(subId, senderAddr);
            process.exit(0);
        });

    program
        .command('deactivate-sub <subId> [senderAddr]')
        .description('Deactivates subscription for the user')
        .action(async (subId, senderAddr) => {
            await deactivateSub(subId, senderAddr);
            process.exit(0);
        });

    program
        .command('sell <srcTokenLabel> <destTokenLabel> <srcAmount> [senderAddr]')
        .description('Calls sell operation to get tokens other than eth')
        .action(async (srcTokenLabel, destTokenLabel, srcAmount, senderAddr) => {
            await callSell(srcTokenLabel, destTokenLabel, srcAmount, senderAddr);
            process.exit(0);
        });

    program
        .command('mcd-supply <type> <cdpId> <amount> [senderAddr]')
        .description('Supplies coll to cdp')
        .action(async (type, cdpId, amount, senderAddr) => {
            await supplyCdp(type, cdpId, amount, senderAddr);
            process.exit(0);
        });

    program
        .command('mcd-withdraw <type> <cdpId> <amount> [senderAddr]')
        .description('Withdraw coll from cdp')
        .action(async (type, cdpId, amount, senderAddr) => {
            await withdrawCdp(type, cdpId, amount, senderAddr);
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
        .command('get-cdp <cdpId> [type]')
        .description('Returns data about a cdp')
        .action(async (cdpId, type) => {
            await getCdp(cdpId, type);
            process.exit(0);
        });

    program
        .command('set-bot-auth <botAddr>')
        .description('Gives an address the authority to call a contract')
        .action(async (botAddr) => {
            await addBotCaller(botAddr, REGISTRY_ADDR, true);

            console.log(`Bot auth given to ${botAddr}`);
            process.exit(0);
        });

    program.parse(process.argv);
})();
