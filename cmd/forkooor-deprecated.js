/* eslint-disable max-len */
/* eslint-disable no-shadow */
/* eslint-disable no-use-before-define */
/* eslint-disable import/no-extraneous-dependencies */
/*
 *
 *
 *
 *
 *
 *
 _______   _______ .______   .______       _______   ______     ___   .___________. _______  _______
|       \ |   ____||   _  \  |   _  \     |   ____| /      |   /   \  |           ||   ____||       \
|  .--.  ||  |__   |  |_)  | |  |_)  |    |  |__   |  ,----'  /  ^  \ `---|  |----`|  |__   |  .--.  |
|  |  |  ||   __|  |   ___/  |      /     |   __|  |  |      /  /_\  \    |  |     |   __|  |  |  |  |
|  '--'  ||  |____ |  |      |  |\  \----.|  |____ |  `----./  _____  \   |  |     |  |____ |  '--'  |
|_______/ |_______|| _|      | _| `._____||_______| \______/__/     \__\  |__|     |_______||_______/

USE: https://github.com/defisaver/defisaver-forkooor
 *
 *
 *
 *
 *
 *
 *
 */

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const hre = require('hardhat');
require('dotenv-safe').config();
const {
    getAssetInfo, ilks, assets, set, utils: { compare },
} = require('@defisaver/tokens');
const { configure } = require('@defisaver/sdk');
const automationSdk = require('@defisaver/automation-sdk');
const dfs = require('@defisaver/sdk');

const { program } = require('commander');

const {
    parse,
    stringify,
} = require('envfile');

const {
    createFork, topUp, chainIds,
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
    WBTC_ADDR,
    redeploy,
    setNetwork,
    addrs,
    ETH_ADDR,
    getOwnerAddr,
    MAX_UINT,
    getLocalTokenPrice,
    Float2BN,
    LUSD_ADDR,
    timeTravel,
    nullAddress,
    getContractFromRegistry,
    filterEthersObject,
    setBalance,
    network,
} = require('../test/utils/utils');

const {
    createAaveV3RepayL2Strategy,
    createAaveFLV3RepayL2Strategy,
    createAaveV3BoostL2Strategy,
    createAaveFLV3BoostL2Strategy,
} = require('../strategies-spec/l2');

const {
    getVaultsForUser,
    getRatio,
    getVaultInfo,
    MCD_MANAGER_ADDR,
} = require('../test/utils/mcd');

const {
    sell,
    yearnSupply,
    supplyMcd,
    withdrawMcd,
    liquityOpen,
    liquityWithdraw,
    aaveV3Supply,
    aaveV3Borrow,
    supplyCompV3,
    borrowCompV3,
    createChickenBond,
    morphoAaveV2Supply,
    morphoAaveV2Borrow,
} = require('../test/utils/actions');

const { subAaveV3L2AutomationStrategy, updateAaveV3L2AutomationStrategy, subAaveV3CloseBundle } = require('../test/strategies/utils/l2-strategy-subs');

const { deployContract } = require('../scripts/utils/deployer');

const {
    getSubHash,
    addBotCaller,
    getLatestStrategyId,
    createStrategy,
    createBundle,
    getLatestBundleId,
    subToMcdProxy,
    updateSubDataMorphoAaveV2Proxy,
    updateLiquityProxy,
    updateToAaveV2Proxy,
    updateToCompV2Proxy,
} = require('../test/strategies/utils/utils-strategies');

const {
    createLiquityCloseToCollStrategy,
    createMorphoAaveV2BoostStrategy,
    createMorphoAaveV2FLBoostStrategy,
    createMorphoAaveV2RepayStrategy,
    createMorphoAaveV2FLRepayStrategy,
    createLiquityRepayStrategy,
    createLiquityFLRepayStrategy,
    createLiquityBoostStrategy,
    createLiquityFLBoostStrategy,
    createLiquityFLBoostWithCollStrategy,
    createAaveV2RepayStrategy,
    createAaveFLV2RepayStrategy,
    createAaveV2BoostStrategy,
    createAaveFLV2BoostStrategy,
    createCompV2RepayStrategy,
    createCompFLV2RepayStrategy,
    createCompV2BoostStrategy,
    createCompFLV2BoostStrategy,
    createLiquityDsrPaybackStrategy,
    createLiquityDsrSupplyStrategy,
} = require('../strategies-spec/mainnet');

const {
    subRepayFromSavingsStrategy,
    subMcdCloseToDaiStrategy,
    subMcdCloseToCollStrategy,
    subLiquityCloseToCollStrategy,
    subMcdTrailingCloseToCollStrategy,
    subMcdTrailingCloseToDaiStrategy,
    subLiquityTrailingCloseToCollStrategy,
    subCompV3AutomationStrategy,
    subCbRebondStrategy,
    subLiquityCBPaybackStrategy,
    subLimitOrderStrategy,
    subDcaStrategy,
    subMorphoAaveV2AutomationStrategy,
    subLiquityAutomationStrategy,
    subCompV2AutomationStrategy,
    subAaveV2AutomationStrategy,
    subSparkCloseBundle,
    subSparkAutomationStrategy,
    subLiquityDebtInFrontRepayStrategy,
    subAaveV3CloseWithMaximumGasPriceBundle,
} = require('../test/strategies/utils/strategy-subs');

const { getTroveInfo, getDebtInFront } = require('../test/utils/liquity');

const { createNewCompV3AutomationBundles } = require('../test/utils/compoundV3');

const {
    createMcdTrigger,
    createChainLinkPriceTrigger,
    RATIO_STATE_OVER,
    RATIO_STATE_UNDER,
} = require('../test/strategies/utils/triggers');
// const { deployCloseToDebtBundle, deployCloseToCollBundle } = require('../test/strategies-spec/l2/l2-tests');
const { deployCloseToCollWithMaximumGasPriceBundle, deployCloseToDebtWithMaximumGasPriceBundle } = require('../test/strategies/aaveV3/gasprice/aaveV3-tests');
const { createRepayBundle, createBoostBundle } = require('../test/strategies/mcd/mcd-tests');

const {
    deployBundles: deploySparkBundles,
    deployCloseToCollBundle: deploySparkCloseToCollBundle,
    deployCloseToDebtBundle: deploySparkCloseToDebtBundle,
} = require('../test/strategies/spark/spark-tests');

program.version('0.0.1');
// let forkedAddresses = '';
try {
    // eslint-disable-next-line global-require
    // forkedAddresses = require('../forked-addr.json');
} catch (err) {
    console.log('No forked registry set yet, please run deploy');
}

const MOCK_CHAINLINK_ORACLE = '0x5d0e4672C77A2743F8b583D152A8935121D8F879';
const abiCoder = new hre.ethers.utils.AbiCoder();

function setEnv(key, value) {
    const pathToEnv = path.join(__dirname, '/../.env');

    const data = fs.readFileSync(pathToEnv, 'utf8');
    const result = parse(data);
    result[key] = value;

    // eslint-disable-next-line consistent-return
    fs.writeFileSync(pathToEnv, stringify(result));
}

const forkSetup = async (sender) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    if (sender) {
        senderAcc = hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    await topUp(senderAcc.address);

    let network = 'mainnet';

    if (process.env.TEST_CHAIN_ID) {
        network = process.env.TEST_CHAIN_ID;
    }

    configure({
        chainId: chainIds[network],
        testMode: true,
    });

    setNetwork(network);

    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    console.log({ sender: senderAcc.address, proxy: proxy.address });
    return { senderAcc, proxy, network };
};

// TODO: support more than dai?
const supplyInSS = async (protocol, daiAmount, sender) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    let proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
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

    let proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    const subProxyAddr = await getAddrFromRegistry('SubProxy');
    const subProxy = await hre.ethers.getContractAt('SubProxy', subProxyAddr);

    const subStorageAddr = await getAddrFromRegistry('SubStorage');
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

    let proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    const subProxyAddr = await getAddrFromRegistry('SubProxy');
    const subProxy = await hre.ethers.getContractAt('SubProxy', subProxyAddr);

    const subStorageAddr = await getAddrFromRegistry('SubStorage');
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

    let proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    const bundleId = 0;

    const { subId } = await subRepayFromSavingsStrategy(
        proxy, bundleId, vaultId, minRatio, targetRatio,
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

    let proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    await openStrategyAndBundleStorage(true);

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

    const { subId } = await subMcdCloseToDaiStrategy(
        vaultId,
        proxy,
        price.toString(),
        ilkObj.assetAddress,
        formattedPriceState,
    );

    console.log(`Subscribed to mcd close strategy with sub id #${subId}`);
};

const cbRebondSub = async (bondId, sender) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    let proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    const strategyId = '31';

    // eslint-disable-next-line no-unused-vars
    const { subId, strategySub } = await subCbRebondStrategy(proxy, bondId, strategyId);

    console.log(`Sub created #${subId}!`);
};

const liqCBPaybackSub = async (sourceId, sourceType, triggerRatio, triggerState, sender) => {
    let senderAcc = (await hre.ethers.getSigners())[0];
    await redeploy('FetchBondId', true);
    await redeploy('LiquityPayback', true);
    await redeploy('CBCreateRebondSub', true);

    let formattedPriceState;

    if (triggerState.toLowerCase() === 'over') {
        formattedPriceState = 0;
    } else if (triggerState.toLowerCase() === 'under') {
        formattedPriceState = 1;
    }
    let formattedSourceType;
    if (sourceType.toLowerCase() === 'bond') {
        formattedSourceType = 0;
    } else if (sourceType.toLowerCase() === 'sub') {
        formattedSourceType = 1;
    }

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }
    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    const { subId } = await subLiquityCBPaybackStrategy(
        proxy, sourceId, formattedSourceType, triggerRatio, formattedPriceState,
    );

    console.log(`Sub created #${subId}!`);
};

const mcdTrailingCloseStrategySub = async (vaultId, type, percentage, isToDai, sender) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    await redeploy('TrailingStopTrigger', true);

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    const ilkObj = ilks.find((i) => i.ilkLabel === type);

    let oracleDataAddress = ilkObj.assetAddress;

    switch (oracleDataAddress.toLowerCase()) {
    case '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'.toLowerCase():
        oracleDataAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
        break;
    case '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'.toLowerCase():
        oracleDataAddress = '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB';
        break;
    default:
        break;
    }

    const priceOracle = await hre.ethers.getContractAt('MockChainlinkFeedRegistry', MOCK_CHAINLINK_ORACLE);

    const USD_QUOTE = '0x0000000000000000000000000000000000000348';
    const oracleData = await priceOracle.latestRoundData(oracleDataAddress, USD_QUOTE);
    console.log(`Current roundId: ${oracleData.roundId}`);

    let subInfo;

    if (isToDai) {
        subInfo = await subMcdTrailingCloseToDaiStrategy(
            vaultId,
            proxy,
            ilkObj.assetAddress,
            percentage,
            oracleData.roundId,
        );

        console.log(`Subscribed to trailing mcd close to dai strategy with sub id #${subInfo.subId}`);
    } else {
        subInfo = await subMcdTrailingCloseToCollStrategy(
            vaultId,
            proxy,
            ilkObj.assetAddress,
            percentage,
            oracleData.roundId,
        );

        console.log(`Subscribed to trailing mcd close to coll strategy with sub id #${subInfo.subId}`);
    }
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

    let formattedPriceState;
    if (priceState.toLowerCase() === 'over') {
        formattedPriceState = 0;
    } else if (priceState.toLowerCase() === 'under') {
        formattedPriceState = 1;
    }

    const ilkObj = ilks.find((i) => i.ilkLabel === type);

    const { subId } = await subMcdCloseToCollStrategy(
        vaultId,
        proxy,
        price.toString(),
        ilkObj.assetAddress,
        formattedPriceState,
    );

    console.log(`Subscribed to mcd close strategy with sub id #${subId}`);
};

const mcdBoostRepaySub = async ({
    vaultId,
    minRatio,
    maxRatio,
    targetRatioBoost,
    targetRatioRepay,
    senderAddr,
}) => {
    setNetwork('mainnet');
    let [senderAcc] = await hre.ethers.getSigners();

    if (senderAddr) {
        senderAcc = hre.ethers.provider.getSigner(senderAddr.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    let proxy = await getProxy(senderAcc.address);
    proxy = senderAddr ? proxy.connect(senderAcc) : proxy;

    { // deploy if not live
        const registry = await hre.ethers.getContractAt('DFSRegistry', addrs[network].REGISTRY_ADDR);
        if (await registry.isRegistered(hre.ethers.utils.id('McdSubProxy').slice(0, 10)).then((e) => !e)) {
            const repayBundleId = await createRepayBundle(proxy, true);
            const boostBundleId = await createBoostBundle(proxy, true);
            await redeploy('McdSubProxy', true, repayBundleId, boostBundleId);
            console.log({ repayBundleId, boostBundleId });
        }
    }

    const encodeSub = (sub) => hre.ethers.utils.defaultAbiCoder.encode(
        [
            `(
                uint64 strategyOrBundleId,
                bool isBundle,
                bytes[] triggerData,
                bytes32[] subData
            )`,
        ],
        [sub],
    );

    const subData = automationSdk.strategySubService.makerEncode.leverageManagement(
        vaultId,
        minRatio.toString(),
        maxRatio.toString(),
        targetRatioBoost.toString(),
        targetRatioRepay.toString(),
        maxRatio > 0,
    );

    const {
        repaySubId, boostSubId, repaySub, boostSub,
    } = await subToMcdProxy(proxy, subData);

    console.log({
        repaySubEncoded: encodeSub(repaySub),
        boostSubEncoded: encodeSub(boostSub),
        repaySubId,
        boostSubId,
    });
};

const aaveAutomationSub = async ({
    minRatio,
    maxRatio,
    targetRatioBoost,
    targetRatioRepay,
    senderAddr,
}) => {
    setNetwork('mainnet');
    let [senderAcc] = await hre.ethers.getSigners();

    if (senderAddr) {
        senderAcc = hre.ethers.provider.getSigner(senderAddr.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    let proxy = await getProxy(senderAcc.address);
    proxy = senderAddr ? proxy.connect(senderAcc) : proxy;

    { // deploy if not live
        const registry = await hre.ethers.getContractAt('DFSRegistry', addrs[network].REGISTRY_ADDR);
        if (await registry.isRegistered(hre.ethers.utils.id('AaveSubProxy').slice(0, 10)).then((e) => !e)) {
            const repayAaveStrategyEncoded = createAaveV2RepayStrategy();
            const repayFLAaveStrategyEncoded = createAaveFLV2RepayStrategy();

            const boostAaveStrategyEncoded = createAaveV2BoostStrategy();
            const boostFLAaveStrategyEncoded = createAaveFLV2BoostStrategy();

            await openStrategyAndBundleStorage(true);

            const repayId1 = await createStrategy(...repayAaveStrategyEncoded, true);
            const repayId2 = await createStrategy(...repayFLAaveStrategyEncoded, true);

            const boostId1 = await createStrategy(...boostAaveStrategyEncoded, true);
            const boostId2 = await createStrategy(...boostFLAaveStrategyEncoded, true);

            const repayBundleId = await createBundle(
                [repayId1, repayId2],
            );

            const boostBundleId = await createBundle(
                [boostId1, boostId2],
            );
            await redeploy('AaveSubProxy', true, repayBundleId, boostBundleId);
            console.log({ repayBundleId, boostBundleId });

            await redeploy('AaveV2RatioCheck', true);
        }
    }

    const subData = await subAaveV2AutomationStrategy(
        proxy,
        minRatio,
        maxRatio,
        targetRatioBoost,
        targetRatioRepay,
        maxRatio > 0,
    );
    console.log('Subscribed to Aave automation');
    console.log(`Repay sub id: ${subData.repaySubId}`);
    console.log(`Boost sub id: ${subData.boostSubId}`);
};

const compAutomationSub = async ({
    minRatio,
    maxRatio,
    targetRatioBoost,
    targetRatioRepay,
    senderAddr,
}) => {
    setNetwork('mainnet');
    let [senderAcc] = await hre.ethers.getSigners();

    if (senderAddr) {
        senderAcc = hre.ethers.provider.getSigner(senderAddr.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    let proxy = await getProxy(senderAcc.address);
    proxy = senderAddr ? proxy.connect(senderAcc) : proxy;

    { // deploy if not live
        const registry = await hre.ethers.getContractAt('DFSRegistry', addrs[network].REGISTRY_ADDR);
        if (await registry.isRegistered(hre.ethers.utils.id('CompSubProxy').slice(0, 10)).then((e) => !e)) {
            const repayCompStrategyEncoded = createCompV2RepayStrategy();
            const repayFLCompStrategyEncoded = createCompFLV2RepayStrategy();

            const boostCompStrategyEncoded = createCompV2BoostStrategy();
            const boostFLCompStrategyEncoded = createCompFLV2BoostStrategy();

            await openStrategyAndBundleStorage(true);

            const repayId1 = await createStrategy(...repayCompStrategyEncoded, true);
            const repayId2 = await createStrategy(...repayFLCompStrategyEncoded, true);

            const boostId1 = await createStrategy(...boostCompStrategyEncoded, true);
            const boostId2 = await createStrategy(...boostFLCompStrategyEncoded, true);

            const repayBundleId = await createBundle(
                [repayId1, repayId2],
            );

            const boostBundleId = await createBundle(
                [boostId1, boostId2],
            );
            await redeploy('CompSubProxy', true, repayBundleId, boostBundleId);
            console.log({ repayBundleId, boostBundleId });

            await redeploy('CompV2RatioCheck', true);
            await redeploy('CompoundRatioTrigger', true);
        }
    }

    const subData = await subCompV2AutomationStrategy(
        proxy,
        minRatio,
        maxRatio,
        targetRatioBoost,
        targetRatioRepay,
        maxRatio > 0,
    );
    console.log('Subscribed to Comp automation');
    console.log(`Repay sub id: ${subData.repaySubId}`);
    console.log(`Boost sub id: ${subData.boostSubId}`);
};

const liquityTrailingCloseToCollStrategySub = async (percentage, sender) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    await redeploy('TrailingStopTrigger', true);

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    // grab latest roundId from chainlink
    const priceOracle = await hre.ethers.getContractAt('MockChainlinkFeedRegistry', MOCK_CHAINLINK_ORACLE);

    const USD_QUOTE = '0x0000000000000000000000000000000000000348';
    const oracleData = await priceOracle.latestRoundData(ETH_ADDR, USD_QUOTE);

    console.log(`Current price of time of sub $${oracleData.answer / 1e8} at roundId ${oracleData.roundId}`);

    const subInfo = await subLiquityTrailingCloseToCollStrategy(
        proxy,
        percentage,
        oracleData.roundId,
    );

    console.log(`Subscribed to trailing liquity close strategy with sub id #${subInfo.subId}`);
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

    const strategyId = await createStrategy(...liquityCloseToCollStrategy, false);

    console.log('strategyId: ', strategyId);

    let formattedPriceState;
    if (priceState.toLowerCase() === 'over') {
        formattedPriceState = 0;
    } else if (priceState.toLowerCase() === 'under') {
        formattedPriceState = 1;
    }

    const { subId } = await subLiquityCloseToCollStrategy(
        proxy,
        price,
        formattedPriceState,
    );

    console.log(`Subscribed to liquity close strategy with sub id #${subId}`);
};

// eslint-disable-next-line max-len
const updateSmartSavingsStrategySub = async (protocol, subId, vaultId, minRatio, targetRatio, sender) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    const bundleId = 0;

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    const subProxyAddr = await getAddrFromRegistry('SubProxy');
    const subProxy = await hre.ethers.getContractAt('SubProxy', subProxyAddr);

    const subStorageAddr = await getAddrFromRegistry('SubStorage');
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

    const subProxyAddr = await getAddrFromRegistry('SubProxy');
    const subProxy = await hre.ethers.getContractAt('SubProxy', subProxyAddr);

    const subStorageAddr = await getAddrFromRegistry('SubStorage');
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

    const subProxyAddr = '0xd18d4756bbf848674cc35f1a0b86afef20787382';
    const subProxy = await hre.ethers.getContractAt('SubProxy', subProxyAddr);

    const subStorageAddr = await getAddrFromRegistry('SubStorage');
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

const createLiquityTrove = async (coll, debt, sender) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    await topUp(senderAcc.address);

    let network = 'mainnet';

    if (process.env.TEST_CHAIN_ID) {
        network = process.env.TEST_CHAIN_ID;
    }

    configure({
        chainId: chainIds[network],
        testMode: true,
    });

    setNetwork(network);

    await redeploy('LiquityView', true);

    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    const amountColl = hre.ethers.utils.parseUnits(coll, 18);
    const amountLusd = hre.ethers.utils.parseUnits(debt, 18);

    await depositToWeth(amountColl, senderAcc);
    await approve(WETH_ADDRESS, proxy.address, senderAcc);

    const maxFeePercentage = hre.ethers.utils.parseUnits('5', 16);

    try {
        const tx = await liquityOpen(
            proxy,
            maxFeePercentage,
            amountColl,
            amountLusd,
            senderAcc.address,
            senderAcc.address,
        );

        await tx.wait();

        console.log(`Trove created at proxy address: ${proxy.address}`);
        const debtInFront = await getDebtInFront(proxy.address);

        const troveInfo = await getTroveInfo(proxy.address);

        console.log('Trove ratio: ', troveInfo.collAmount.mul(troveInfo.collPrice).div(troveInfo.debtAmount) / 1e16);

        console.log('DebtInFront ', debtInFront.debt / 1e18);
    } catch (err) {
        console.log(`Error opening trove at proxy address: ${proxy.address}`);

        const troveInfo = await getTroveInfo(proxy.address);

        if (troveInfo.troveStatus.eq('1')) {
            console.log('Trove already open');
        }
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
            );
        } catch (err) {
            console.log(`Buying ${tokenData.name} failed`);
        }
    }

    await approve(tokenData.address, proxy.address, senderAcc);

    const recipeExecutorAddr = await getAddrFromRegistry('RecipeExecutor');

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

const createCB = async (lusdAmount, sender) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    await topUp(senderAcc.address);

    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    let network = 'mainnet';

    if (process.env.TEST_CHAIN_ID) {
        network = process.env.TEST_CHAIN_ID;
    }

    configure({
        chainId: chainIds[network],
        testMode: true,
    });

    setNetwork(network);

    const lusdAmountWei = hre.ethers.utils.parseUnits(lusdAmount, 18);

    const lusdBalance = await balanceOf(LUSD_ADDR, senderAcc.address);
    if (lusdAmountWei.gt(lusdBalance)) {
        console.log('Not enough Lusd to create chicken bond');
        return;
    }

    const chickenBondsView = await hre.ethers.getContractAt(
        'ChickenBondsView',
        addrs[network].CHICKEN_BONDS_VIEW,
    );

    await createChickenBond(proxy, lusdAmountWei, senderAcc.address, senderAcc);

    const bonds = await chickenBondsView.getUsersBonds(proxy.address);
    const latestBond = bonds[bonds.length - 1].bondID;

    console.log(`Bond ${latestBond} created!`);
};

const getDFSAddr = async (actionName) => {
    const addr = await getAddrFromRegistry(actionName);

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

const getTrove = async (acc) => {
    if (!acc) {
        const senderAcc = (await hre.ethers.getSigners())[0];

        const proxy = await getProxy(senderAcc.address);
        // eslint-disable-next-line no-param-reassign
        acc = proxy.address;
    }

    await redeploy('LiquityView');
    const proxy = await getProxy(acc);

    const troveInfo = await getTroveInfo(proxy.address);

    console.log(`Coll amount ${troveInfo.collAmount / 1e18}`);
    console.log(`Debt amount ${troveInfo.debtAmount / 1e18}`);
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
        );

        console.log(`Supplied to cdp ${cdpId}`);
        await getCdp(cdpId, type);
    } catch (err) {
        console.log(err);
        console.log('Failed to supply to cdp');
    }
};

const withdrawLiquity = async (collAmount, sender) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    await topUp(senderAcc.address);
    await redeploy('LiquityView');

    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    const collAmountWei = hre.ethers.utils.parseUnits(collAmount, 18);

    try {
        const tx = await liquityWithdraw(
            proxy,
            collAmountWei,
            senderAcc.address,
        );

        await tx.wait();

        console.log(`Withdraw ${collAmount} eth from trove ${proxy.address}`);

        const troveInfo = await getTroveInfo(proxy.address);

        console.log(`Coll amount ${troveInfo.collAmount / 1e18}`);
        console.log(`Debt amount ${troveInfo.debtAmount / 1e18}`);
    } catch (err) {
        console.log(err);
        console.log('Failed to withdraw from trove');
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
        );

        console.log(`Withdraw from cdp ${cdpId}`);
        await getCdp(cdpId, type);
    } catch (err) {
        console.log(err);
        console.log('Failed to withdraw from cdp');
    }
};

const createAavePosition = async (collSymbol, debtSymbol, collAmount, debtAmount, sender) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    await topUp(senderAcc.address);

    let network = 'mainnet';

    if (process.env.TEST_CHAIN_ID) {
        network = process.env.TEST_CHAIN_ID;
    }

    configure({
        chainId: chainIds[network],
        testMode: true,
    });

    setNetwork(network);

    const { address: collAddr, ...collAssetInfo } = getAssetInfo(collSymbol, chainIds[network]);
    const { address: debtAddr, ...debtAssetInfo } = getAssetInfo(debtSymbol, chainIds[network]);

    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
    const poolAddress = await aaveMarketContract.getPool();

    const pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);

    if (collSymbol === 'WETH') {
        await depositToWeth(Float2BN(collAmount), senderAcc);
    } else {
        try {
            const sellAmount = (
                (collAmount * 1.1 * getLocalTokenPrice(collSymbol)) / getLocalTokenPrice('WETH')
            ).toFixed(18);
            console.log(`selling ${sellAmount} WETH for ${collSymbol}`);

            await sell(
                proxy,
                addrs[network].WETH_ADDRESS,
                collAddr,
                Float2BN(sellAmount),
                addrs[network].UNISWAP_WRAPPER,
                senderAcc.address,
                senderAcc.address,
                0,
                senderAcc,
                undefined,
                undefined,
                true,
            );
            console.log(`Buying ${collSymbol} succeeded`);
        } catch (err) {
            console.log(err);
            console.log(`Buying ${collSymbol} failed`);
        }
    }

    const reserveData = await pool.getReserveData(collAddr);
    const collAssetId = reserveData.id;

    await aaveV3Supply(
        proxy,
        addrs[network].AAVE_MARKET,
        Float2BN(collAmount, collAssetInfo.decimals),
        collAddr,
        collAssetId,
        senderAcc.address,
        senderAcc,
    );

    const reserveDataDebt = await pool.getReserveData(debtAddr);
    const amountDebt = hre.ethers.utils.parseUnits(debtAmount, debtAssetInfo.decimals);

    console.log('amountDebt: ', amountDebt);

    const debtAssetId = reserveDataDebt.id;

    await aaveV3Borrow(
        proxy,
        addrs[network].AAVE_MARKET,
        amountDebt,
        senderAcc.address,
        2, // variable
        debtAssetId,
    );
};

const deployMorphoContracts = async () => {
    await getContractFromRegistry('MorphoAaveV2Supply', true);
    await getContractFromRegistry('MorphoAaveV2Borrow', true);
    await getContractFromRegistry('MorphoAaveV2Withdraw', true);
    await getContractFromRegistry('MorphoAaveV2Payback', true);
    await getContractFromRegistry('MorphoClaim', true);
    await getContractFromRegistry('MorphoAaveV2View', true);
    await getContractFromRegistry('MorphoAaveV2RatioTrigger', true);
    await getContractFromRegistry('MorphoAaveV2RatioCheck', true);
};

const createMorphoPosition = async (collSymbol, debtSymbol, collAmount, debtAmount, sender) => {
    const { senderAcc, proxy, network } = await forkSetup(sender);

    await deployMorphoContracts();
    const view = await getContractFromRegistry('MorphoAaveV2View', true);

    const { address: collAddr, ...collAssetInfo } = getAssetInfo(collSymbol, chainIds[network]);
    const { address: debtAddr, ...debtAssetInfo } = getAssetInfo(debtSymbol, chainIds[network]);

    if (collSymbol === 'WETH') {
        await depositToWeth(Float2BN(collAmount), senderAcc);
    } else {
        try {
            const sellAmount = (
                (collAmount * 1.1 * getLocalTokenPrice(collSymbol)) / getLocalTokenPrice('WETH')
            ).toFixed(18);
            console.log(`selling ${sellAmount} WETH for ${collSymbol}`);

            await sell(
                proxy,
                addrs[network].WETH_ADDRESS,
                collAddr,
                Float2BN(sellAmount),
                addrs[network].UNISWAP_WRAPPER,
                senderAcc.address,
                senderAcc.address,
                0,
                senderAcc,
                undefined,
                undefined,
                undefined,
            );
            console.log(`Buying ${collSymbol} succeeded`);
        } catch (err) {
            console.log(err);
            console.log(`Buying ${collSymbol} failed`);
        }
    }

    await approve(collAddr, proxy.address, senderAcc);
    await morphoAaveV2Supply(
        proxy,
        collAddr,
        Float2BN(collAmount, collAssetInfo.decimals),
        senderAcc.address,
        nullAddress,
    );

    await morphoAaveV2Borrow(
        proxy,
        debtAddr,
        Float2BN(debtAmount, debtAssetInfo.decimals),
        senderAcc.address,
    );

    console.log(`Position of ${proxy.address}`);
    const userInfo = await view.getUserInfo(
        proxy.address,
    ).then((userInfo) => filterEthersObject(userInfo));

    console.dir(userInfo, { depth: null });
};

const subAaveAutomation = async (
    minRatio,
    maxRatio,
    optimalRatioBoost,
    optimalRatioRepay,
    sender,
) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    await topUp(senderAcc.address);

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    await topUp(senderAcc.address);

    let network = 'mainnet';

    if (process.env.TEST_CHAIN_ID) {
        network = process.env.TEST_CHAIN_ID;
    }

    configure({
        chainId: chainIds[network],
        testMode: true,
    });

    setNetwork(network);
    await topUp(getOwnerAddr());

    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    const subIds = await subAaveV3L2AutomationStrategy(
        proxy,
        minRatio,
        maxRatio,
        optimalRatioBoost,
        optimalRatioRepay,
        maxRatio > 0,
    );

    console.log(`Aave position subbed, repaySubId ${subIds.firstSub} , boostSubId ${subIds.secondSub}`);
};

const subAaveV3MainnetAutomation = async (
    minRatio,
    maxRatio,
    optimalRatioBoost,
    optimalRatioRepay,
    boostEnabled,
    sender,
) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    await topUp(senderAcc.address);

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    await topUp(senderAcc.address);

    let network = 'mainnet';

    if (process.env.TEST_CHAIN_ID) {
        network = process.env.TEST_CHAIN_ID;
    }

    configure({
        chainId: chainIds[network],
        testMode: true,
    });

    setNetwork(network);
    await topUp(getOwnerAddr());

    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    // await openStrategyAndBundleStorage(true);
    // const aaveRepayStrategyEncoded = createAaveV3RepayStrategy();
    // const aaveRepayFLStrategyEncoded = createAaveFLV3RepayStrategy();

    // const strategyId1 = await createStrategy(...aaveRepayStrategyEncoded, true);
    // const strategyId2 = await createStrategy(...aaveRepayFLStrategyEncoded, true);

    // await createBundle([strategyId1, strategyId2]);

    // const aaveBoostStrategyEncoded = createAaveV3BoostStrategy();
    // const aaveBoostFLStrategyEncoded = createAaveFLV3BoostStrategy();

    // const strategyId11 = await createStrategy(...aaveBoostStrategyEncoded, true);
    // const strategyId22 = await createStrategy(...aaveBoostFLStrategyEncoded, true);

    // await createBundle([strategyId11, strategyId22]);

    await redeploy('AaveV3RatioTrigger', true);
    await redeploy('AaveV3RatioCheck', true);

    // same as in L1
    const subIds = await subAaveV3L2AutomationStrategy(
        proxy,
        minRatio,
        maxRatio,
        optimalRatioBoost,
        optimalRatioRepay,
        boostEnabled,
    );

    console.log(`Aave position subbed, repaySubId ${subIds.firstSub} , boostSubId ${subIds.secondSub}`);
};

const subAaveClose = async (
    collSymbol,
    debtSymbol,
    triggerBaseSymbol,
    triggerQuoteSymbol,
    targetQuotePrice,
    priceState,
    sender,
    closeToColl = false,
) => {
    let network = 'mainnet';
    if (process.env.TEST_CHAIN_ID) {
        network = process.env.TEST_CHAIN_ID;
    }

    configure({
        chainId: chainIds[network],
        testMode: true,
    });

    setNetwork(network);

    let proxy;
    let senderAcc = (await hre.ethers.getSigners())[0];
    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }
    proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    await topUp(getOwnerAddr());
    await topUp(senderAcc.address);

    const rateMode = 2;

    const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
    const poolAddress = await aaveMarketContract.getPool();
    const pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);

    const baseAssetInfo = getAssetInfo(triggerBaseSymbol);
    const quoteAssetInfo = getAssetInfo(triggerQuoteSymbol);
    const collAssetInfo = getAssetInfo(collSymbol);
    const debtAssetInfo = getAssetInfo(debtSymbol);
    const collReserveData = await pool.getReserveData(collAssetInfo.address);
    const debtReserveData = await pool.getReserveData(debtAssetInfo.address);
    const collAssetId = collReserveData.id;
    const debtAssetId = debtReserveData.id;

    // const triggerAddr = await redeploy(
    //     'AaveV3QuotePriceTrigger', true,
    // ).then((c) => c.address);
    // const viewAddr = await redeploy(
    //     'AaveV3OracleView', true,
    // ).then((c) => c.address);

    // console.log('AaveQuotePriceTrigger address:', triggerAddr);
    // console.log('AaveV3OracleView address:', viewAddr);

    // const closeToDebtId = await deployCloseToDebtBundle(proxy, true, true);
    // const closeToCollId = await deployCloseToCollBundle(proxy, true, true);

    const bundleId = closeToColl ? '13' : '12';

    await subAaveV3CloseBundle(
        proxy,
        bundleId,
        baseAssetInfo.address,
        quoteAssetInfo.address,
        targetQuotePrice,
        priceState,
        collAssetInfo.address,
        collAssetId,
        debtAssetInfo.address,
        debtAssetId,
        rateMode,
    ).then((subId) => console.log(`subId: ${subId}`));
};

const subAaveCloseWithMaximumGasPrice = async (
    collSymbol,
    debtSymbol,
    triggerBaseSymbol,
    triggerQuoteSymbol,
    targetQuotePrice,
    priceState,
    maximumGasPrice,
    sender,
    closeToColl = false,
) => {
    let network = 'mainnet';
    if (process.env.TEST_CHAIN_ID) {
        network = process.env.TEST_CHAIN_ID;
    }

    configure({
        chainId: chainIds[network],
        testMode: true,
    });

    setNetwork(network);

    let proxy;
    let senderAcc = (await hre.ethers.getSigners())[0];
    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }
    proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    await topUp(getOwnerAddr());
    await topUp(senderAcc.address);

    const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
    const poolAddress = await aaveMarketContract.getPool();
    const pool = await hre.ethers.getContractAt('IPoolV3', poolAddress);

    const baseAssetInfo = getAssetInfo(triggerBaseSymbol);
    const quoteAssetInfo = getAssetInfo(triggerQuoteSymbol);
    const collAssetInfo = getAssetInfo(collSymbol);
    const debtAssetInfo = getAssetInfo(debtSymbol);
    const collReserveData = await pool.getReserveData(collAssetInfo.address);
    const debtReserveData = await pool.getReserveData(debtAssetInfo.address);
    const collAssetId = collReserveData.id;
    const debtAssetId = debtReserveData.id;

    // const priceTriggerAddr = await redeploy(
    //     'AaveV3QuotePriceTrigger', undefined, false, true,
    // ).then((c) => c.address);
    // const gasPriceTriggerAddr = await redeploy(
    //     'GasPriceTrigger', true,
    // ).then((c) => c.address);
    // const viewAddr = await redeploy(
    //     'AaveV3OracleView', true,
    // ).then((c) => c.address);

    // console.log('AaveQuotePriceTrigger address:', priceTriggerAddr);
    // console.log('MaximumGasPriceTrigger address:', gasPriceTriggerAddr);
    // console.log('AaveV3OracleView address:', viewAddr);

    const closeToDebtId = await deployCloseToDebtWithMaximumGasPriceBundle(proxy, true);
    const closeToCollId = await deployCloseToCollWithMaximumGasPriceBundle(proxy, true);
    const bundleId = closeToColl ? closeToCollId : closeToDebtId;

    // const bundleId = closeToColl ? '13' : '12'; //TODO hardcode IDs

    await subAaveV3CloseWithMaximumGasPriceBundle(
        proxy,
        bundleId,
        baseAssetInfo.address,
        quoteAssetInfo.address,
        targetQuotePrice,
        priceState,
        maximumGasPrice,
        collAssetInfo.address,
        collAssetId,
        debtAssetInfo.address,
        debtAssetId,
    ).then((sub) => console.log(`sub: ${JSON.stringify(sub, null, 2)}`));
};

const subSparkAutomation = async (
    minRatio,
    maxRatio,
    optimalRatioBoost,
    optimalRatioRepay,
    boostEnabled,
    sender,
) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    await topUp(senderAcc.address);

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    await topUp(senderAcc.address);

    let network = 'mainnet';

    if (process.env.TEST_CHAIN_ID) {
        network = process.env.TEST_CHAIN_ID;
    }

    configure({
        chainId: chainIds[network],
        testMode: true,
    });

    setNetwork(network);
    await topUp(getOwnerAddr());

    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    if (await getLatestBundleId() < 18) {
        await deploySparkBundles(proxy, true)
            .then(({ repayBundleId, boostBundleId }) => console.log({ repayBundleId, boostBundleId }));

        const closeToCollId = await deploySparkCloseToCollBundle(proxy, true);
        const closeToDebtId = await deploySparkCloseToDebtBundle(proxy, true);

        console.log({ closeToCollId, closeToDebtId });
    }
    // same as in L1
    const subIds = await subSparkAutomationStrategy(
        proxy,
        minRatio,
        maxRatio,
        optimalRatioBoost,
        optimalRatioRepay,
        boostEnabled,
    );

    console.log(`Spark position subbed, repaySubId ${subIds.firstSub} , boostSubId ${subIds.secondSub}`);
};

const subSparkClose = async (
    collSymbol,
    debtSymbol,
    triggerBaseSymbol,
    triggerQuoteSymbol,
    targetQuotePrice,
    priceState,
    sender,
    closeToColl = false,
) => {
    let network = 'mainnet';
    if (process.env.TEST_CHAIN_ID) {
        network = process.env.TEST_CHAIN_ID;
    }

    configure({
        chainId: chainIds[network],
        testMode: true,
    });

    setNetwork(network);

    let proxy;
    let senderAcc = (await hre.ethers.getSigners())[0];
    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }
    proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    await topUp(getOwnerAddr());
    await topUp(senderAcc.address);

    const sparkMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].SPARK_MARKET);
    const poolAddress = await sparkMarketContract.getPool();
    const pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);

    const baseAssetInfo = getAssetInfo(triggerBaseSymbol);
    const quoteAssetInfo = getAssetInfo(triggerQuoteSymbol);
    const collAssetInfo = getAssetInfo(collSymbol);
    const debtAssetInfo = getAssetInfo(debtSymbol);
    const collReserveData = await pool.getReserveData(collAssetInfo.address);
    const debtReserveData = await pool.getReserveData(debtAssetInfo.address);
    const collAssetId = collReserveData.id;
    const debtAssetId = debtReserveData.id;

    if (await getLatestBundleId() < 18) {
        await deploySparkBundles(proxy, true)
            .then(({ repayBundleId, boostBundleId }) => console.log({ repayBundleId, boostBundleId }));

        const closeToCollId = await deploySparkCloseToCollBundle(proxy, true);
        const closeToDebtId = await deploySparkCloseToDebtBundle(proxy, true);

        console.log({ closeToCollId, closeToDebtId });
    }

    const bundleId = closeToColl ? '20' : '21';

    await subSparkCloseBundle(
        proxy,
        bundleId,
        baseAssetInfo.address,
        quoteAssetInfo.address,
        targetQuotePrice,
        priceState,
        collAssetInfo.address,
        collAssetId,
        debtAssetInfo.address,
        debtAssetId,
    ).then(({ subId }) => console.log(`subId: ${subId}`));
};

const subCompV3Automation = async (
    minRatio,
    maxRatio,
    optimalRatioBoost,
    optimalRatioRepay,
    boostEnabled,
    isEOA,
    sender,
) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    await topUp(senderAcc.address);

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    await topUp(senderAcc.address);

    let network = 'mainnet';

    if (process.env.TEST_CHAIN_ID) {
        network = process.env.TEST_CHAIN_ID;
    }

    configure({
        chainId: chainIds[network],
        testMode: true,
    });

    setNetwork(network);

    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    const bundleId = await getLatestBundleId();

    console.log(`Latest bundle id: ${parseInt(bundleId, 10)}`);

    // at the time of writing this script, latestBundleId is 25
    const newBundlesAlreadyDeployed = parseInt(bundleId, 10) > 25;

    if (!newBundlesAlreadyDeployed) {
        await openStrategyAndBundleStorage(true);

        const {
            repayBundleId,
            boostBundleId,
            repayBundleEOAId,
            boostBundleEOAId,
        } = await createNewCompV3AutomationBundles();

        // redeploy CompV3SubProxy with new bundles
        await redeploy(
            'CompV3SubProxy', true, repayBundleId, boostBundleId, repayBundleEOAId, boostBundleEOAId,
        );
    }

    const subIds = await subCompV3AutomationStrategy(
        proxy,
        addrs[network].COMET_USDC_ADDR,
        minRatio,
        maxRatio,
        optimalRatioBoost,
        optimalRatioRepay,
        boostEnabled,
        isEOA === 'true',
    );

    console.log(`CompV3 position subbed, repaySubId ${subIds.firstSub} , boostSubId ${subIds.secondSub}`);
};

const subLimitOrder = async (
    srcTokenLabel,
    destTokenLabel,
    srcAmount,
    targetPrice,
    expireDays,
    orderType,
    sender,
) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    await topUp(senderAcc.address);

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    await topUp(senderAcc.address);

    let network = 'mainnet';

    if (process.env.TEST_CHAIN_ID) {
        network = process.env.TEST_CHAIN_ID;
    }

    configure({
        chainId: chainIds[network],
        testMode: true,
    });

    setNetwork(network);
    set('network', chainIds[network]);

    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    await topUp(addrs[network].OWNER_ACC);

    // deploy contracts and strategy
    await redeploy('OffchainPriceTrigger', true);

    console.log(network);
    // eslint-disable-next-line no-unused-expressions
    network === 'mainnet'
        ? (await redeploy('LimitSell', true))
        : (await redeploy('LimitSellL2', true));

    // eslint-disable-next-line max-len
    // const strategyData = network === 'mainnet' ? createLimitOrderStrategy() : createLimitOrderL2Strategy();
    await openStrategyAndBundleStorage(true);

    let strategyId = '51'; // await createStrategy(...strategyData, false);

    if (network !== 'mainnet') {
        strategyId = '9';
    }

    await redeploy('LimitOrderSubProxy', true, strategyId);

    // format sub data
    const srcToken = getAssetInfo(srcTokenLabel);
    const destToken = getAssetInfo(destTokenLabel);

    const amountInWei = hre.ethers.utils.parseUnits(srcAmount, srcToken.decimals);
    const targetPriceInWei = hre.ethers.utils.parseUnits(targetPrice, srcToken.decimals);

    const goodUntilDuration = expireDays * 24 * 60 * 60;

    // give token approval
    await approve(srcToken.address, proxy.address, senderAcc);

    let orderTypeFormatted;

    if (orderType.toLowerCase() === 'take_profit') {
        orderTypeFormatted = 0;
    } else if (orderType.toLowerCase() === 'stop_loss') {
        orderTypeFormatted = 1;
    }

    // sub
    const subData = await subLimitOrderStrategy(
        proxy,
        srcToken.address,
        destToken.address,
        amountInWei,
        targetPriceInWei,
        goodUntilDuration,
        orderTypeFormatted,
    );

    console.log(`Limit order subbed, subId ${subData.subId}`);
};

const subMorphoAaveV2Automation = async (
    minRatio,
    maxRatio,
    optimalRatioBoost,
    optimalRatioRepay,
    boostEnabled,
    sender,
) => {
    const { proxy } = await forkSetup(sender);

    const latestBundleId = await getLatestBundleId().then((e) => parseInt(e, 10));

    let repayBundleId = latestBundleId - 1;
    let boostBundleId = latestBundleId;

    if (latestBundleId < 15) {
        {
            await openStrategyAndBundleStorage(true);
            const strategyData = createMorphoAaveV2RepayStrategy();
            const flStrategyData = createMorphoAaveV2FLRepayStrategy();

            const strategyId = await createStrategy(...strategyData, true);
            const flStrategyId = await createStrategy(...flStrategyData, true);
            repayBundleId = await createBundle([strategyId, flStrategyId]);
        }

        {
            await openStrategyAndBundleStorage(true);
            const strategyData = createMorphoAaveV2BoostStrategy();
            const flStrategyData = createMorphoAaveV2FLBoostStrategy();

            const strategyId = await createStrategy(...strategyData, true);
            const flStrategyId = await createStrategy(...flStrategyData, true);
            boostBundleId = await createBundle([strategyId, flStrategyId]);
        }

        await deployMorphoContracts();
        await getContractFromRegistry(
            'MorphoAaveV2SubProxy', true, repayBundleId, boostBundleId,
        );
    }

    console.log({ repayBundleId, boostBundleId });

    const {
        repaySubId, boostSubId,
    } = await subMorphoAaveV2AutomationStrategy(
        proxy,
        minRatio,
        maxRatio,
        optimalRatioBoost,
        optimalRatioRepay,
        boostEnabled,
    );

    console.log('MorphoAaveV2 position subbed', { repaySubId, boostSubId });
};

const updateSubDataMorphoAaveV2 = async (
    subIdRepay,
    subIdBoost,
    minRatio,
    maxRatio,
    optimalRatioBoost,
    optimalRatioRepay,
    boostEnabled,
    sender,
) => {
    const { proxy } = await forkSetup(sender);

    const minRatioFormatted = hre.ethers.utils.parseUnits(minRatio, '16');
    const maxRatioFormatted = hre.ethers.utils.parseUnits(maxRatio, '16');

    const optimalRatioBoostFormatted = hre.ethers.utils.parseUnits(optimalRatioBoost, '16');
    const optimalRatioRepayFormatted = hre.ethers.utils.parseUnits(optimalRatioRepay, '16');

    await updateSubDataMorphoAaveV2Proxy(
        proxy,
        subIdRepay,
        subIdBoost,
        minRatioFormatted,
        maxRatioFormatted,
        optimalRatioBoostFormatted,
        optimalRatioRepayFormatted,
        boostEnabled,
    );

    console.log('MorphoAaveV2 position sub updated');
};

const updateSubDataAaveV2 = async (
    subIdRepay,
    subIdBoost,
    minRatio,
    maxRatio,
    optimalRatioBoost,
    optimalRatioRepay,
    sender,
) => {
    const { proxy } = await forkSetup(sender);

    const minRatioFormatted = hre.ethers.utils.parseUnits(minRatio, '16');
    const maxRatioFormatted = hre.ethers.utils.parseUnits(maxRatio, '16');

    const optimalRatioBoostFormatted = hre.ethers.utils.parseUnits(optimalRatioBoost, '16');
    const optimalRatioRepayFormatted = hre.ethers.utils.parseUnits(optimalRatioRepay, '16');

    await updateToAaveV2Proxy(
        proxy,
        subIdRepay.toString(),
        subIdBoost.toString(),
        [
            minRatioFormatted.toString(),
            maxRatioFormatted.toString(),
            optimalRatioBoostFormatted.toString(),
            optimalRatioRepayFormatted.toString(),
            maxRatio > 0,
        ],
    );

    console.log('AaveV2 position sub updated');
};

const updateSubDataCompV2 = async (
    subIdRepay,
    subIdBoost,
    minRatio,
    maxRatio,
    optimalRatioBoost,
    optimalRatioRepay,
    sender,
) => {
    const { proxy } = await forkSetup(sender);
    console.log('real sender and proxy', { sender, proxy });

    const minRatioFormatted = hre.ethers.utils.parseUnits(minRatio, '16');
    const maxRatioFormatted = hre.ethers.utils.parseUnits(maxRatio, '16');

    const optimalRatioBoostFormatted = hre.ethers.utils.parseUnits(optimalRatioBoost, '16');
    const optimalRatioRepayFormatted = hre.ethers.utils.parseUnits(optimalRatioRepay, '16');

    await updateToCompV2Proxy(
        proxy,
        subIdRepay.toString(),
        subIdBoost.toString(),
        [
            minRatioFormatted.toString(),
            maxRatioFormatted.toString(),
            optimalRatioBoostFormatted.toString(),
            optimalRatioRepayFormatted.toString(),
            maxRatio > 0,
        ],
    );

    console.log('CompV2 position sub updated');
};

const deployLiquityContracts = async () => {
    await getContractFromRegistry('LiquityRatioTrigger', true).then(({ address }) => {
        if (compare(address, '0x7dDA9F944c3Daf27fbe3B8f27EC5f14FE3fa94BF')) {
            return redeploy('LiquityRatioTrigger', true);
        }
        return address;
    });
    await getContractFromRegistry('LiquityRatioCheck', true);
};

const liqDebtInFrontRepaySub = async (
    maxDebtInFront,
    ratioIncrease,
    sender,
) => {
    const { proxy } = await forkSetup(sender);

    const { subId } = await subLiquityDebtInFrontRepayStrategy(
        proxy,
        maxDebtInFront,
        ratioIncrease,
    );

    console.log('Liquity debtInFront repay position subbed', subId);
};

const subLiquityAutomation = async (
    minRatio,
    maxRatio,
    optimalRatioBoost,
    optimalRatioRepay,
    boostEnabled,
    sender,
) => {
    const { proxy } = await forkSetup(sender);

    const latestBundleId = await getLatestBundleId().then((e) => parseInt(e, 10));

    let repayBundleId = latestBundleId - 1;
    let boostBundleId = latestBundleId;

    if (latestBundleId < 17) {
        await openStrategyAndBundleStorage(true);
        {
            const strategyData = createLiquityRepayStrategy();
            const flStrategyData = createLiquityFLRepayStrategy();

            const strategyId = await createStrategy(...strategyData, true);
            const flStrategyId = await createStrategy(...flStrategyData, true);
            repayBundleId = await createBundle([strategyId, flStrategyId]);
        }

        {
            const strategyData = createLiquityBoostStrategy();
            const flStrategyData = createLiquityFLBoostStrategy();
            const bigFlStrategyData = createLiquityFLBoostWithCollStrategy();

            const strategyId = await createStrategy(...strategyData, true);
            const flStrategyId = await createStrategy(...flStrategyData, true);
            const bigFlStrategyId = await createStrategy(...bigFlStrategyData, true);
            boostBundleId = await createBundle([strategyId, flStrategyId, bigFlStrategyId]);
        }

        await deployLiquityContracts();
        await getContractFromRegistry(
            'LiquitySubProxy', true, repayBundleId, boostBundleId,
        );
    }

    console.log({ repayBundleId, boostBundleId });

    const {
        repaySubId, boostSubId,
    } = await subLiquityAutomationStrategy(
        proxy,
        minRatio,
        maxRatio,
        optimalRatioBoost,
        optimalRatioRepay,
        boostEnabled,
    );

    console.log('Liquity position subbed', { repaySubId, boostSubId });
};

const updateLiquity = async (
    subIdRepay,
    subIdBoost,
    minRatio,
    maxRatio,
    optimalRatioBoost,
    optimalRatioRepay,
    boostEnabled,
    sender,
) => {
    const { proxy } = await forkSetup(sender);

    const minRatioFormatted = hre.ethers.utils.parseUnits(minRatio, '16');
    const maxRatioFormatted = hre.ethers.utils.parseUnits(maxRatio, '16');

    const optimalRatioBoostFormatted = hre.ethers.utils.parseUnits(optimalRatioBoost, '16');
    const optimalRatioRepayFormatted = hre.ethers.utils.parseUnits(optimalRatioRepay, '16');

    await updateLiquityProxy(
        proxy,
        subIdRepay,
        subIdBoost,
        minRatioFormatted,
        maxRatioFormatted,
        optimalRatioBoostFormatted,
        optimalRatioRepayFormatted,
        boostEnabled,
    );

    console.log('Liquity position sub updated');
};

const getAavePos = async (
    sender,
) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    await topUp(senderAcc.address);

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    let network = 'mainnet';

    if (process.env.TEST_CHAIN_ID) {
        network = process.env.TEST_CHAIN_ID;
    }

    configure({
        chainId: chainIds[network],
        testMode: true,
    });

    setNetwork(network);

    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    const aaveView = await hre.ethers.getContractAt('AaveV3View', addrs[network].AAVE_V3_VIEW);

    const aaveInfo = await aaveView.getLoanData(addrs[network].AAVE_MARKET, proxy.address);

    console.log(`User proxy: ${aaveInfo.user}`);
    console.log(`Ratio: ${aaveInfo.ratio / 1e16}%`);

    aaveInfo.collAmounts.forEach((amount, i) => {
        if (!amount.eq(0)) {
            console.log(aaveInfo.collAddr[i]);
            const collAssetInfo = assets.find(
                // eslint-disable-next-line max-len
                (a) => a.addresses[chainIds[network]].toLocaleLowerCase() === aaveInfo.collAddr[i].toLowerCase(),
            );

            console.log(`Collateral ${collAssetInfo.symbol}, amount: $${amount / 1e8}`);
        }
    });

    aaveInfo.borrowVariableAmounts.forEach((amount, i) => {
        if (!amount.eq(0)) {
            const borrowAssetInfo = assets.find(
                (a) => a.addresses[chainIds[network]] === aaveInfo.borrowAddr[i].toLowerCase(),
            );

            console.log(`Borrow ${borrowAssetInfo.symbol}, amount: $${amount / 1e8}}`);
        }
    });

    aaveInfo.borrowStableAmounts.forEach((amount, i) => {
        if (!amount.eq(0)) {
            const borrowAssetInfo = assets.find(
                (a) => a.addresses[chainIds[network]] === aaveInfo.borrowAddr[i].toLowerCase(),
            );

            console.log(`Borrow stable ${borrowAssetInfo.symbol}, amount: $${amount / 1e8}}`);
        }
    });
};

const getCompV3Pos = async (
    isEOA, sender,
) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    await topUp(senderAcc.address);

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    let network = 'mainnet';

    if (process.env.TEST_CHAIN_ID) {
        network = process.env.TEST_CHAIN_ID;
    }

    configure({
        chainId: chainIds[network],
        testMode: true,
    });

    setNetwork(network);

    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    const compV3View = await hre.ethers.getContractAt('CompV3View', '0x5e07E953dac1d7c19091c3b493579ba7283572a4');

    const user = isEOA ? senderAcc.address : proxy.address;

    const compInfo = await compV3View.getLoanData(addrs[network].COMET_USDC_ADDR, user);

    compInfo.collAmounts.forEach((amount, i) => {
        if (!amount.eq(0)) {
            const collAssetInfo = assets.find(
                // eslint-disable-next-line max-len
                (a) => a.addresses[chainIds[network]].toLocaleLowerCase() === compInfo.collAddr[i].toLowerCase(),
            );

            console.log(`Collateral ${amount / 10 ** collAssetInfo.decimals} ${collAssetInfo.symbol}`);
        }
    });

    console.log(`Coll $${compInfo.collValue / 1e8}`);
    console.log(`Debt $${compInfo.borrowValue / 1e6}`);
};

const updateAaveV3AutomationSub = async (
    subIdRepay,
    subIdBoost,
    minRatio,
    maxRatio,
    optimalRatioBoost,
    optimalRatioRepay,
    boostEnabled,
    sender,
) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    let network = 'mainnet';

    if (process.env.TEST_CHAIN_ID) {
        network = process.env.TEST_CHAIN_ID;
    }

    configure({
        chainId: chainIds[network],
        testMode: true,
    });

    setNetwork(network);

    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    await openStrategyAndBundleStorage(true);
    const aaveRepayStrategyEncoded = createAaveV3RepayL2Strategy();
    const aaveRepayFLStrategyEncoded = createAaveFLV3RepayL2Strategy();

    const strategyId1 = await createStrategy(...aaveRepayStrategyEncoded, true);
    const strategyId2 = await createStrategy(...aaveRepayFLStrategyEncoded, true);

    await createBundle([strategyId1, strategyId2]);

    const aaveBoostStrategyEncoded = createAaveV3BoostL2Strategy();
    const aaveBoostFLStrategyEncoded = createAaveFLV3BoostL2Strategy();

    const strategyId11 = await createStrategy(...aaveBoostStrategyEncoded, true);
    const strategyId22 = await createStrategy(...aaveBoostFLStrategyEncoded, true);

    await createBundle([strategyId11, strategyId22]);

    const minRatioFormatted = hre.ethers.utils.parseUnits(minRatio, '16');
    const maxRatioFormatted = hre.ethers.utils.parseUnits(maxRatio, '16');

    const optimalRatioBoostFormatted = hre.ethers.utils.parseUnits(optimalRatioBoost, '16');
    const optimalRatioRepayFormatted = hre.ethers.utils.parseUnits(optimalRatioRepay, '16');

    await updateAaveV3L2AutomationStrategy(
        proxy,
        subIdRepay,
        subIdBoost,
        minRatioFormatted.toHexString().slice(2),
        maxRatioFormatted.toHexString().slice(2),
        optimalRatioBoostFormatted.toHexString().slice(2),
        optimalRatioRepayFormatted.toHexString().slice(2),
        boostEnabled,
    );

    console.log('Aave position updated');
};

const setBotAuth = async (addr) => {
    let network = 'mainnet';

    if (process.env.TEST_CHAIN_ID) {
        network = process.env.TEST_CHAIN_ID;
    }

    await topUp(addrs[network].OWNER_ACC);

    configure({
        chainId: chainIds[network],
        testMode: true,
    });

    setNetwork(network);

    await topUp(addrs[network].OWNER_ACC);

    await addBotCaller(addr, true);
};

const setMockChainlinkPrice = async (tokenLabel, price) => {
    const USD_QUOTE = '0x0000000000000000000000000000000000000348';
    const formattedPrice = price * 1e8;
    const c = await hre.ethers.getContractAt('MockChainlinkFeedRegistry', MOCK_CHAINLINK_ORACLE);

    const srcToken = getAssetInfo(tokenLabel);

    console.log(srcToken.address);
    await c.setRoundData(srcToken.address, USD_QUOTE, formattedPrice);

    const oracleData = await c.latestRoundData(srcToken.address, USD_QUOTE);

    console.log(`Current price for token ${tokenLabel} at ${new Date(oracleData.updatedAt * 1000).toLocaleTimeString('en-US')} is $${oracleData.answer / 1e8}`);
};

const createCompV3Position = async (
    collType, collAmount, debtAmount, isEOA, sender,
) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    await topUp(senderAcc.address);

    let network = 'mainnet';

    if (process.env.TEST_CHAIN_ID) {
        network = process.env.TEST_CHAIN_ID;
    }

    configure({
        chainId: chainIds[network],
        testMode: true,
    });

    setNetwork(network);

    const collToken = getAssetInfo(collType);

    const collAmountWei = hre.ethers.utils.parseUnits(collAmount, collToken.decimals);
    const debtAmountWei = hre.ethers.utils.parseUnits(debtAmount, 6);

    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    console.log(proxy.address);

    if (collType === 'WETH') {
        await depositToWeth(collAmountWei, senderAcc);
    } else {
        try {
            await sell(
                proxy,
                WETH_ADDRESS,
                collToken.address,
                hre.ethers.utils.parseUnits('100', 18),
                UNISWAP_WRAPPER,
                senderAcc.address,
                senderAcc.address,
                0,
                senderAcc,
            );
        } catch (err) {
            console.log(`Buying ${collToken.name} failed`);
        }
    }

    try {
        if (isEOA === 'true') {
            let comet = await hre.ethers.getContractAt('IComet', addrs[network].COMET_USDC_ADDR);
            let erc20 = await hre.ethers.getContractAt('IERC20', collToken.address);

            comet = comet.connect(senderAcc);
            erc20 = erc20.connect(senderAcc);

            // approve
            await erc20.approve(addrs[network].COMET_USDC_ADDR, MAX_UINT);

            await comet.supply(collToken.address, collAmountWei);
            await comet.withdraw(addrs[network].USDC_ADDR, debtAmountWei);

            // give proxy approval
            await comet.allow(proxy.address, true);

            console.log(`Position created for ${senderAcc.address}`);
        } else {
            await supplyCompV3(
                addrs[network].COMET_USDC_ADDR,
                proxy,
                collToken.address,
                collAmountWei,
                senderAcc.address,
                proxy.address,
                true,
                senderAcc,
            );
            await borrowCompV3(
                addrs[network].COMET_USDC_ADDR,
                proxy,
                debtAmountWei,
                proxy.address,
                senderAcc.address,
            );
            console.log(`Position created! for ${proxy.address}`);
        }
    } catch (err) {
        console.log(err);
    }
};

const dcaStrategySub = async (srcTokenLabel, destTokenLabel, amount, interval, sender) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    await topUp(senderAcc.address);

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    let network = 'mainnet';

    if (process.env.TEST_CHAIN_ID) {
        network = process.env.TEST_CHAIN_ID;
    }

    configure({
        chainId: chainIds[network],
        testMode: true,
    });

    set('network', chainIds[network]);
    setNetwork(network);

    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    // const strategyData = network === 'mainnet' ? createDCAStrategy() : createDCAL2Strategy();
    // await openStrategyAndBundleStorage(true);
    await redeploy('TimestampTrigger', true);

    const srcToken = getAssetInfo(srcTokenLabel);
    const destToken = getAssetInfo(destTokenLabel);

    await approve(srcToken.address, proxy.address, senderAcc);

    const DAY = 1 * 24 * 60 * 60;

    const intervalInSeconds = interval * DAY;
    const latestBlock = await hre.ethers.provider.getBlock('latest');

    const lastTimestamp = latestBlock.timestamp + intervalInSeconds;

    const amountInDecimals = hre.ethers.utils.parseUnits(amount, srcToken.decimals);

    console.log(srcToken.address,
        destToken.address,
        amountInDecimals,
        intervalInSeconds,
        lastTimestamp);

    const sub = await subDcaStrategy(
        proxy,
        srcToken.address,
        destToken.address,
        amountInDecimals,
        intervalInSeconds,
        lastTimestamp,
    );

    console.log(`Subscribed to DCA strategy with sub id ${sub.subId}`);
};

const llammaSell = async (controllerAddress, swapAmount, sellCrvUsd, sender) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    const crvusdAddress = getAssetInfo('crvUSD').address;

    await topUp(senderAcc.address);

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    const crvController = await hre.ethers.getContractAt('ICrvUsdController', controllerAddress);
    const llammaAddress = await crvController.amm();
    const llammaExchange = await hre.ethers.getContractAt('ILLAMMA', llammaAddress);

    const sellAddrId = sellCrvUsd === 'true' ? 0 : 1;

    const sellAddr = await llammaExchange.coins(sellAddrId);
    const sellToken = await hre.ethers.getContractAt('IERC20', sellAddr);
    const sellDecimals = await sellToken.decimals();

    const swapAmountWei = hre.ethers.utils.parseUnits(swapAmount, sellDecimals);

    await setBalance(crvusdAddress, senderAcc.address, swapAmountWei);
    await approve(crvusdAddress, llammaAddress);

    const minAmount = 1;

    let sellId = 0;
    let buyId = 1;

    if (sellCrvUsd === 'false') {
        sellId = 1;
        buyId = 0;
        console.log('Selling coll asset');

        await setBalance(sellAddr, senderAcc.address, swapAmountWei);
        await approve(sellAddr, llammaAddress);
    }

    const beforePrice = await llammaExchange.get_p();
    console.log(`Price before swap ${beforePrice / 1e18}`);

    try {
        await llammaExchange.exchange(sellId, buyId, swapAmountWei, minAmount, { gasLimit: 5000000 });
    } catch (err) {
        console.log(err);
    }

    const afterPrice = await llammaExchange.get_p();
    console.log(`Price after swap ${afterPrice / 1e18}`);
};

(async () => {
    program
        .command('new-fork <network>')
        .description('Creates a new tenderly fork')
        .option('-b, --bots <botAddr...>', 'bot addresses', [])
        .action(async (network, options) => {
            const forkId = await createFork(network);

            hre.ethers.provider = hre.ethers.getDefaultProvider(`https://rpc.tenderly.co/fork/${forkId}`);
            process.env.FORK_ID = forkId;

            setEnv('FORK_ID', forkId);
            setEnv('TEST_CHAIN_ID', network);

            const currentBlockNum = await hre.ethers.provider.getBlockNumber();

            console.log(`Fork id: ${forkId}   |   Rpc url https://rpc.tenderly.co/fork/${forkId}`);
            console.log('chainlink oracle', MOCK_CHAINLINK_ORACLE);
            console.log('blockNumber', currentBlockNum.toString());
            if (options.bots.length > 0) {
                // setting this so we can do topUp and addBotCaller from this script
                for (let i = 0; i < options.bots.length; i++) {
                    const botAddr = options.bots[i];
                    // eslint-disable-next-line no-await-in-loop
                    await topUp(botAddr);
                    // eslint-disable-next-line no-await-in-loop
                    await addBotCaller(botAddr, true);
                }
            }
            topUp(addrs[network].OWNER_ACC);
            process.exit(0);
        });

    program
        .command('deploy ')
        .description('Deploys the whole system to the fork and builds strategies')
        .action(async () => {
            console.log('This might take a few minutes do not stop the process');

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
        .command('create-chicken-bond <lusdAmount> [senderAddr]')
        .description('Creates a new chicken bond')
        .action(async (lusdAmount, senderAddr) => {
            await createCB(lusdAmount, senderAddr);
            process.exit(0);
        });

    program
        .command('create-aave-position <collType> <debtType> <collAmount> <debtAmount> [senderAddr]')
        .description('Creates Aave position ')
        .action(async (collSymbol, debtSymbol, collAmount, debtAmount, senderAddr) => {
            await createAavePosition(collSymbol, debtSymbol, collAmount, debtAmount, senderAddr);
            process.exit(0);
        });

    program
        .command('create-trove <coll> <debt> [senderAddr]')
        .description('Creates a Liquity trove')
        .action(async (coll, debt, senderAddr) => {
            await createLiquityTrove(coll, debt, senderAddr);
            process.exit(0);
        });

    program
        .command('create-morpho-position <collType> <debtType> <collAmount> <debtAmount> [senderAddr]')
        .description('Creates Morpho-AaveV2 position ')
        .action(async (collSymbol, debtSymbol, collAmount, debtAmount, senderAddr) => {
            await createMorphoPosition(collSymbol, debtSymbol, collAmount, debtAmount, senderAddr);
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
        .command('sub-mcd-automation <vaultId> <minRatio> <maxRatio> <targetRatioBoost> <targetRatioRepay> [senderAddr]')
        .description('Subscribes to Maker repay and (optionally) boost bundles')
        .action(async (
            vaultId,
            minRatio,
            maxRatio,
            targetRatioBoost,
            targetRatioRepay,
            senderAddr,
        ) => {
            await mcdBoostRepaySub({
                vaultId,
                minRatio,
                maxRatio,
                targetRatioBoost,
                targetRatioRepay,
                senderAddr,
            });
            process.exit(0);
        });

    program
        .command('sub-aaveV2-automation <minRatio> <maxRatio> <targetRatioBoost> <targetRatioRepay> [senderAddr]')
        .description('Subscribes to AaveV2 repay and (optionally) boost bundles')
        .action(async (
            minRatio,
            maxRatio,
            targetRatioBoost,
            targetRatioRepay,
            senderAddr,
        ) => {
            await aaveAutomationSub({
                minRatio,
                maxRatio,
                targetRatioBoost,
                targetRatioRepay,
                senderAddr,
            });
            process.exit(0);
        });

    program
        .command('sub-compV2-automation <minRatio> <maxRatio> <targetRatioBoost> <targetRatioRepay> [senderAddr]')
        .description('Subscribes to CompoundV2 repay and (optionally) boost bundles')
        .action(async (
            minRatio,
            maxRatio,
            targetRatioBoost,
            targetRatioRepay,
            senderAddr,
        ) => {
            await compAutomationSub({
                minRatio,
                maxRatio,
                targetRatioBoost,
                targetRatioRepay,
                senderAddr,
            });
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
        .command('sub-cb-rebond <bondId> [senderAddr]')
        .description('Subscribes a bond to the rebonding strategy')
        .action(async (bondId, senderAddr) => {
            // eslint-disable-next-line max-len
            await cbRebondSub(bondId, senderAddr);
            process.exit(0);
        });

    program
        .command('sub-liquity-cb-payback <sourceId> <sourceType> <triggerRatio> <triggerState> [senderAddr]')
        .description('Subscribes a bond to the rebonding strategy')
        .action(async (sourceId, sourceType, triggerRatio, triggerState, senderAddr) => {
            // sourceId : Id of the bond or of strategy sub
            // sourceType : bond / sub
            // triggerRatio should be [110 - 1000] (in that format)
            // triggerState : over/under
            // When executing strategy from bundle, ChickenIn strategy index is 0, ChickenOut is 1
            // eslint-disable-next-line max-len
            await liqCBPaybackSub(sourceId, sourceType, triggerRatio, triggerState, senderAddr);
            process.exit(0);
        });

    program
        .command('sub-liquity-debt-in-front-repay <minDebtInFront> <ratioIncrease> [senderAddr]')
        .description('Subscribes a bond to the rebonding strategy')
        .action(async (minDebtInFront, ratioIncrease, senderAddr) => {
            await liqDebtInFrontRepaySub(minDebtInFront, ratioIncrease, senderAddr);
            process.exit(0);
        });

    program
        .command('sub-mcd-trailing-close-to-coll <vaultId> <type> <percentage> [senderAddr]')
        .description('Subscribes to a Trailing Mcd close to coll strategy')
        .action(async (vaultId, type, percentage, senderAddr) => {
            // eslint-disable-next-line max-len
            await mcdTrailingCloseStrategySub(vaultId, type, percentage, false, senderAddr);
            process.exit(0);
        });

    program
        .command('sub-mcd-trailing-close-to-dai <vaultId> <type> <percentage> [senderAddr]')
        .description('Subscribes to a Trailing Mcd close to dai strategy')
        .action(async (vaultId, percentage, senderAddr) => {
            // eslint-disable-next-line max-len
            await mcdTrailingCloseStrategySub(vaultId, percentage, true, senderAddr);
            process.exit(0);
        });

    program
        .command(
            'sub-aave-automation <minRatio> <maxRatio> <optimalRatioBoost> <optimalRatioRepay> [senderAddr]',
        )
        .description('Subscribes to aave automation can be both b/r')
        .action(
            async (
                minRatio,
                maxRatio,
                optimalRatioBoost,
                optimalRatioRepay,
                senderAcc,
            ) => {
                // eslint-disable-next-line max-len
                await subAaveAutomation(
                    minRatio,
                    maxRatio,
                    optimalRatioBoost,
                    optimalRatioRepay,
                    senderAcc,
                );
                process.exit(0);
            },
        );

    program
        .command(
            'sub-aaveV3-mainnet-automation <minRatio> <maxRatio> <optimalRatioBoost> <optimalRatioRepay> <boostEnabled> [senderAddr]',
        )
        .description('Subscribes to aave automation can be both b/r')
        .action(
            async (
                minRatio,
                maxRatio,
                optimalRatioBoost,
                optimalRatioRepay,
                boostEnabled,
                senderAcc,
            ) => {
                // eslint-disable-next-line max-len
                await subAaveV3MainnetAutomation(
                    minRatio,
                    maxRatio,
                    optimalRatioBoost,
                    optimalRatioRepay,
                    boostEnabled,
                    senderAcc,
                );
                process.exit(0);
            },
        );

    program
        .command('sub-aave-close-to-debt <collSymbol> <debtSymbol> <triggerBaseSymbol> <triggerQuoteSymbol> <triggerTargetPrice> <triggerState> [senderAddr]')
        .description('Subscribes to AaveV3 close to debt bundle')
        .action(async (
            collSymbol,
            debtSymbol,
            triggerBaseSymbol,
            triggerQuoteSymbol,
            triggerTargetPrice,
            triggerState,
            senderAddr,
        ) => {
            await subAaveClose(
                collSymbol,
                debtSymbol,
                triggerBaseSymbol,
                triggerQuoteSymbol,
                triggerTargetPrice,
                triggerState.toLowerCase() === 'over' ? RATIO_STATE_OVER : RATIO_STATE_UNDER,
                senderAddr,
            );
            process.exit(0);
        });

    program
        .command('sub-aave-close-to-debt-with-max-gasprice <collSymbol> <debtSymbol> <triggerBaseSymbol> <triggerQuoteSymbol> <triggerTargetPrice> <triggerState> <maximumGasPrice> [senderAddr]')
        .description('Subscribes to AaveV3 close to debt with maximum gas price bundle')
        .action(async (
            collSymbol,
            debtSymbol,
            triggerBaseSymbol,
            triggerQuoteSymbol,
            triggerTargetPrice,
            triggerState,
            maximumGasPrice,
            senderAddr,
        ) => {
            await subAaveCloseWithMaximumGasPrice(
                collSymbol,
                debtSymbol,
                triggerBaseSymbol,
                triggerQuoteSymbol,
                triggerTargetPrice,
                triggerState.toLowerCase() === 'over' ? RATIO_STATE_OVER : RATIO_STATE_UNDER,
                maximumGasPrice,
                senderAddr,
            );
            process.exit(0);
        });

    program
        .command('sub-aave-close-to-coll <collSymbol> <debtSymbol> <triggerBaseSymbol> <triggerQuoteSymbol> <triggerTargetPrice> <triggerState> [senderAddr]')
        .description('Subscribes to AaveV3 close to collateral bundle')
        .action(async (
            collSymbol,
            debtSymbol,
            triggerBaseSymbol,
            triggerQuoteSymbol,
            triggerTargetPrice,
            triggerState,
            senderAddr,
        ) => {
            await subAaveClose(
                collSymbol,
                debtSymbol,
                triggerBaseSymbol,
                triggerQuoteSymbol,
                triggerTargetPrice,
                triggerState.toLowerCase() === 'over' ? RATIO_STATE_OVER : RATIO_STATE_UNDER,
                senderAddr,
                true,
            );
            process.exit(0);
        });

    program
        .command('sub-aave-close-to-coll-with-max-gasprice <collSymbol> <debtSymbol> <triggerBaseSymbol> <triggerQuoteSymbol> <triggerTargetPrice> <triggerState> <maximumGasPrice> [senderAddr]')
        .description('Subscribes to AaveV3 close to collateral with maximum gasprice bundle')
        .action(async (
            collSymbol,
            debtSymbol,
            triggerBaseSymbol,
            triggerQuoteSymbol,
            triggerTargetPrice,
            triggerState,
            maximumGasPrice,
            senderAddr,
        ) => {
            await subAaveCloseWithMaximumGasPrice(
                collSymbol,
                debtSymbol,
                triggerBaseSymbol,
                triggerQuoteSymbol,
                triggerTargetPrice,
                triggerState.toLowerCase() === 'over' ? RATIO_STATE_OVER : RATIO_STATE_UNDER,
                maximumGasPrice,
                senderAddr,
                true,
            );
            process.exit(0);
        });

    program
        .command(
            'sub-spark-automation <minRatio> <maxRatio> <optimalRatioBoost> <optimalRatioRepay> <boostEnabled> [senderAddr]',
        )
        .description('Subscribes to Spark automation can be both b/r')
        .action(
            async (
                minRatio,
                maxRatio,
                optimalRatioBoost,
                optimalRatioRepay,
                boostEnabled,
                senderAcc,
            ) => {
                // eslint-disable-next-line max-len
                await subSparkAutomation(
                    minRatio,
                    maxRatio,
                    optimalRatioBoost,
                    optimalRatioRepay,
                    boostEnabled,
                    senderAcc,
                );
                process.exit(0);
            },
        );

    program
        .command('sub-spark-close-to-debt <collSymbol> <debtSymbol> <triggerBaseSymbol> <triggerQuoteSymbol> <triggerTargetPrice> <triggerState> [senderAddr]')
        .description('Subscribes to Spark close to debt bundle')
        .action(async (
            collSymbol,
            debtSymbol,
            triggerBaseSymbol,
            triggerQuoteSymbol,
            triggerTargetPrice,
            triggerState,
            senderAddr,
        ) => {
            await subSparkClose(
                collSymbol,
                debtSymbol,
                triggerBaseSymbol,
                triggerQuoteSymbol,
                triggerTargetPrice,
                triggerState.toLowerCase() === 'over' ? RATIO_STATE_OVER : RATIO_STATE_UNDER,
                senderAddr,
            );
            process.exit(0);
        });

    program
        .command('sub-spark-close-to-coll <collSymbol> <debtSymbol> <triggerBaseSymbol> <triggerQuoteSymbol> <triggerTargetPrice> <triggerState> [senderAddr]')
        .description('Subscribes to Spark close to collateral bundle')
        .action(async (
            collSymbol,
            debtSymbol,
            triggerBaseSymbol,
            triggerQuoteSymbol,
            triggerTargetPrice,
            triggerState,
            senderAddr,
        ) => {
            await subSparkClose(
                collSymbol,
                debtSymbol,
                triggerBaseSymbol,
                triggerQuoteSymbol,
                triggerTargetPrice,
                triggerState.toLowerCase() === 'over' ? RATIO_STATE_OVER : RATIO_STATE_UNDER,
                senderAddr,
                true,
            );
            process.exit(0);
        });

    program
        .command(
            'sub-compV3-automation <minRatio> <maxRatio> <optimalRatioBoost> <optimalRatioRepay> <boostEnabled> <isEOA> [senderAddr]',
        )
        .description('Subscribes to compV3 automation can be both b/r')
        .action(
            async (
                minRatio,
                maxRatio,
                optimalRatioBoost,
                optimalRatioRepay,
                boostEnabled,
                isEOA,
                senderAcc,
            ) => {
                // eslint-disable-next-line max-len
                await subCompV3Automation(
                    minRatio,
                    maxRatio,
                    optimalRatioBoost,
                    optimalRatioRepay,
                    boostEnabled,
                    isEOA,
                    senderAcc,
                );
                process.exit(0);
            },
        );

    program
        .command(
            'sub-morphoAaveV2-automation <minRatio> <maxRatio> <optimalRatioBoost> <optimalRatioRepay> <boostEnabled> [senderAddr]',
        )
        .description('Subscribes to morphoAaveV2 automation can be both b/r')
        .action(
            async (
                minRatio,
                maxRatio,
                optimalRatioBoost,
                optimalRatioRepay,
                boostEnabled,
                senderAcc,
            ) => {
                // eslint-disable-next-line no-param-reassign
                boostEnabled = boostEnabled === 'true';
                await subMorphoAaveV2Automation(
                    minRatio,
                    maxRatio,
                    optimalRatioBoost,
                    optimalRatioRepay,
                    boostEnabled,
                    senderAcc,
                );
                process.exit(0);
            },
        );
    program
        .command('sub-mcd-close-to-coll <vaultId> <type> <price> <priceState> [senderAddr]')
        .description('Subscribes to a Mcd close to coll strategy')
        .action(async (vaultId, type, price, priceState, senderAddr) => {
            // eslint-disable-next-line max-len
            await mcdCloseToCollStrategySub(vaultId, type, price, priceState, senderAddr);
            process.exit(0);
        });

    program
        .command('sub-trailing-liquity-close <percentage> [senderAddr]')
        .description('Subscribes to a trailing liquity to coll strategy')
        .action(async (percentage, senderAddr) => {
            // eslint-disable-next-line max-len
            await liquityTrailingCloseToCollStrategySub(percentage, senderAddr);
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
        .command(
            'sub-liquity-automation <minRatio> <maxRatio> <optimalRatioBoost> <optimalRatioRepay> <boostEnabled> [senderAddr]',
        )
        .description('Subscribes to liquity automation can be both b/r')
        .action(
            async (
                minRatio,
                maxRatio,
                optimalRatioBoost,
                optimalRatioRepay,
                boostEnabled,
                senderAcc,
            ) => {
                // eslint-disable-next-line no-param-reassign
                boostEnabled = boostEnabled === 'true';
                await subLiquityAutomation(
                    minRatio,
                    maxRatio,
                    optimalRatioBoost,
                    optimalRatioRepay,
                    boostEnabled,
                    senderAcc,
                );
                process.exit(0);
            },
        );

    program
        .command('sub-limit-order <srcTokenLabel> <destTokenLabel> <srcAmount> <targetPrice> <expireDays> <orderType> [senderAddr]')
        .description('Subscribes to a limit order')
        // eslint-disable-next-line max-len
        .action(async (srcTokenLabel, destTokenLabel, srcAmount, targetPrice, expireDays, orderType, senderAddr) => {
            // eslint-disable-next-line max-len
            await subLimitOrder(srcTokenLabel, destTokenLabel, srcAmount, targetPrice, expireDays, orderType, senderAddr);
        });

    program
        .command('sub-dca <srcTokenLabel> <buyTokenLabel> <amount> <interval> [senderAddr]')
        .description('Subscribes to a DCA strategy')
        .action(async (srcTokenLabel, buyTokenLabel, amount, interval, senderAddr) => {
            await dcaStrategySub(srcTokenLabel, buyTokenLabel, amount, interval, senderAddr);
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
        .command(
            'update-aave-automation <subIdRepay> <subIdBoost> <minRatio> <maxRatio> <optimalRatioBoost> <optimalRatioRepay> [senderAddr]',
        )
        .description('Updates aaveV3 automation bundles')
        .action(
            async (
                subIdRepay,
                subIdBoost,
                minRatio,
                maxRatio,
                optimalRatioBoost,
                optimalRatioRepay,
                senderAcc,
            ) => {
                // eslint-disable-next-line max-len
                await updateAaveV3AutomationSub(
                    subIdRepay,
                    subIdBoost,
                    minRatio,
                    maxRatio,
                    optimalRatioBoost,
                    optimalRatioRepay,
                    senderAcc,
                );
                process.exit(0);
            },
        );

    program
        .command(
            'update-morpho-automation <subIdRepay> <subIdBoost> <minRatio> <maxRatio> <optimalRatioBoost> <optimalRatioRepay> <boostEnabled> [senderAddr]',
        )
        .description('Updates MorphoAaveV2 automation bundles')
        .action(
            async (
                subIdRepay,
                subIdBoost,
                minRatio,
                maxRatio,
                optimalRatioBoost,
                optimalRatioRepay,
                boostEnabled,
                senderAcc,
            ) => {
                // eslint-disable-next-line no-param-reassign
                boostEnabled = boostEnabled === 'true';
                await updateSubDataMorphoAaveV2(
                    subIdRepay,
                    subIdBoost,
                    minRatio,
                    maxRatio,
                    optimalRatioBoost,
                    optimalRatioRepay,
                    boostEnabled,
                    senderAcc,
                );
                process.exit(0);
            },
        );

    program
        .command(
            'update-aaveV2-automation <subIdRepay> <subIdBoost> <minRatio> <maxRatio> <optimalRatioBoost> <optimalRatioRepay> [senderAddr]',
        )
        .description('Updates AaveV2 automation bundles')
        .action(
            async (
                subIdRepay,
                subIdBoost,
                minRatio,
                maxRatio,
                optimalRatioBoost,
                optimalRatioRepay,
                senderAcc,
            ) => {
                // eslint-disable-next-line no-param-reassign
                await updateSubDataAaveV2(
                    subIdRepay,
                    subIdBoost,
                    minRatio,
                    maxRatio,
                    optimalRatioBoost,
                    optimalRatioRepay,
                    senderAcc,
                );
                process.exit(0);
            },
        );

    program
        .command(
            'update-compV2-automation <subIdRepay> <subIdBoost> <minRatio> <maxRatio> <optimalRatioBoost> <optimalRatioRepay> [senderAddr]',
        )
        .description('Updates CompV2 automation bundles')
        .action(
            async (
                subIdRepay,
                subIdBoost,
                minRatio,
                maxRatio,
                optimalRatioBoost,
                optimalRatioRepay,
                senderAcc,
            ) => {
                // eslint-disable-next-line no-param-reassign
                await updateSubDataCompV2(
                    subIdRepay,
                    subIdBoost,
                    minRatio,
                    maxRatio,
                    optimalRatioBoost,
                    optimalRatioRepay,
                    senderAcc,
                );
                process.exit(0);
            },
        );

    program
        .command(
            'update-liquity-automation <subIdRepay> <subIdBoost> <minRatio> <maxRatio> <optimalRatioBoost> <optimalRatioRepay> <boostEnabled> [senderAddr]',
        )
        .description('Updates liquity automation bundles')
        .action(
            async (
                subIdRepay,
                subIdBoost,
                minRatio,
                maxRatio,
                optimalRatioBoost,
                optimalRatioRepay,
                boostEnabled,
                senderAcc,
            ) => {
                // eslint-disable-next-line no-param-reassign
                boostEnabled = boostEnabled === 'true';
                await updateLiquity(
                    subIdRepay,
                    subIdBoost,
                    minRatio,
                    maxRatio,
                    optimalRatioBoost,
                    optimalRatioRepay,
                    boostEnabled,
                    senderAcc,
                );
                process.exit(0);
            },
        );

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
        .command('sell-llamma <controllerAddr> <swapAmount> <sellCrvUsd> [senderAddr]')
        .description('Sells one token for another on a specific lamma curve pool')
        .action(async (controllerAddr, swapAmount, sellCrvUsd, senderAddr) => {
            await llammaSell(controllerAddr, swapAmount, sellCrvUsd, senderAddr);
            process.exit(0);
        });

    program
        .command('time-travel <seconds>')
        .description('Moves the forked blockchain timestamp by <seconds>')
        .action(async (seconds) => {
            await timeTravel(+seconds);
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
        .command('liquity-withdraw <collAmount> [senderAddr]')
        .description('Withdraw coll from liquity trove')
        .action(async (collAmount, senderAddr) => {
            await withdrawLiquity(collAmount, senderAddr);
            process.exit(0);
        });

    program
        .command('create-compV3-position <collType> <collAmount> <debtAmount> <isEOA> [senderAddr]')
        .description('Creates a compV3 position')
        .action(async (collType, collAmount, debtAmount, isEOA, senderAddr) => {
            await createCompV3Position(collType, collAmount, debtAmount, isEOA, senderAddr);
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
        .command('get-aave-position [addr]')
        .description('Aave position view, default to proxy')
        .action(async (addr) => {
            await getAavePos(addr);
            process.exit(0);
        });

    program
        .command('get-compV3-position <isEOA> [addr]')
        .description('CompV3 position view, default to proxy')
        .action(async (isEOA, addr) => {
            await getCompV3Pos(isEOA, addr);
            process.exit(0);
        });

    program
        .command('get-morphoAaveV2-position <isEOA> [addr]')
        .description('MorphoAaveV2 position view, default to proxy')
        .action(async (isEOA, addr) => {
            const { senderAcc, proxy } = await forkSetup(addr);
            const view = await getContractFromRegistry('MorphoAaveV2View', true);

            const user = compare(isEOA, 'false') ? proxy.address : senderAcc.address;
            console.log(`Fetching position for ${user}`);

            const userInfo = await view.getUserInfo(
                user,
            ).then((userInfo) => filterEthersObject(userInfo));

            console.dir(userInfo, { depth: null });
            process.exit(0);
        });

    program
        .command('get-trove [acc]')
        .description('Returns data about trove defaults to senders proxy')
        .action(async (acc) => {
            await getTrove(acc);
            process.exit(0);
        });

    program
        .command('set-bot-auth <botAddr>')
        .description('Gives an address the authority to call a contract')
        .action(async (botAddr) => {
            await setBotAuth(botAddr);

            console.log(`Bot auth given to ${botAddr}`);
            process.exit(0);
        });

    program
        .command('set-chainlink-price <tokenLabel> <priceId>')
        .description('Sets price in a mock chainlink oracle used on fork')
        .action(async (tokenLabel, priceId) => {
            await setMockChainlinkPrice(tokenLabel, priceId);

            process.exit(0);
        });
    program
        .command('redeploy <contractName>')
        .description('Sets price in a mock chainlink oracle used on fork')
        .action(async (contractName) => {
            await redeploy(contractName.toString(), true);

            process.exit(0);
        });

    program
        .command('deploy-spark-contracts')
        .description('Deploys all Spark contracts on fork')
        .action(async () => {
            const sparkContracts = [
                'SDaiWrap',
                'SDaiUnwrap',
                'SparkBorrow',
                'SparkClaimRewards',
                'SparkCollateralSwitch',
                'SparkPayback',
                'SparkSetEMode',
                'SparkSpTokenPayback',
                'SparkSupply',
                'SparkSwapBorrowRateMode',
                'SparkWithdraw',
                'FLSpark',
                'SparkView',
                'SparkRatioTrigger',
                'SparkRatioCheck',
                'SparkQuotePriceTrigger',
            ];

            const deployments = await sparkContracts.reduce(async (acc, name) => ({ ...(await acc), [name]: await redeploy(name, true).then((c) => c.address) }), {});
            console.log(deployments);

            process.exit(0);
        });
    program
        .command('deploy-liquity-dsr-strategies')
        .description('Deploys Liquity Dsr strategies as well as updated McdView')
        .action(async () => {
            if (latestStrategyId >= 70) return;

            const contractsToDeploy = [
                'McdView',
            ];

            const deployments = await contractsToDeploy.reduce(async (acc, name) => ({ ...(await acc), [name]: await redeploy(name, true).then((c) => c.address) }), {});
            console.log(deployments);

            const latestStrategyId = await getLatestStrategyId();

            await openStrategyAndBundleStorage(true);
            const paybackStrategy = createLiquityDsrPaybackStrategy();
            const supplyStrategy = createLiquityDsrSupplyStrategy();

            const paybackStrategyId = await createStrategy(...paybackStrategy, true);
            const supplyStrategyId = await createStrategy(...supplyStrategy, true);
            console.log({ paybackStrategyId, supplyStrategyId });
            process.exit(0);
        });
    program.parse(process.argv);
})();
