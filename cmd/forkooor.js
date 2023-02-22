/* eslint-disable no-use-before-define */
/* eslint-disable import/no-extraneous-dependencies */
const hre = require('hardhat');
require('dotenv-safe').config();
const fs = require('fs');
const { spawnSync } = require('child_process');
const {
    getAssetInfo, ilks, assets, set,
} = require('@defisaver/tokens');
const { configure } = require('@defisaver/sdk');
const dfs = require('@defisaver/sdk');

const { program } = require('commander');

const {
    parse,
    stringify,
} = require('envfile');

const path = require('path');
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
    rariDaiFundManager,
    rdptAddress,
    WBTC_ADDR,
    redeploy,
    setNetwork,
    getNetwork,
    addrs,
    ETH_ADDR,
    getOwnerAddr,
    MAX_UINT,
    getLocalTokenPrice,
    Float2BN,
    LUSD_ADDR,
    timeTravel,
} = require('../test/utils');

const {
    createAaveV3RepayL2Strategy,
    createAaveFLV3RepayL2Strategy,
    createAaveV3BoostL2Strategy,
    createAaveFLV3BoostL2Strategy,
    createDCAL2Strategy,
    createLimitOrderL2Strategy,
} = require('../test/l2-strategies');

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
    liquityOpen,
    liquityWithdraw,
    aaveV3Supply,
    aaveV3Borrow,
    supplyCompV3,
    borrowCompV3,
    createChickenBond,
} = require('../test/actions');

const { subAaveV3L2AutomationStrategy, updateAaveV3L2AutomationStrategy, subAaveV3CloseBundle } = require('../test/l2-strategy-subs');

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
    createBundle,
    getLatestBundleId,
    subToMcdProxy,
} = require('../test/utils-strategies');

const {
    createLiquityCloseToCollStrategy,
    createCompV3FlBoostStrategy,
    createCompV3RepayStrategy,
    createCompV3BoostStrategy,
    createFlCompV3RepayStrategy,
    createCompV3EOABoostStrategy,
    createCompV3EOAFlBoostStrategy,
    createCompV3EOARepayStrategy,
    createFlCompV3EOARepayStrategy,
    createLiquityPaybackChickenInStrategy,
    createLiquityPaybackChickenOutStrategy,
    createLimitOrderStrategy,
    createDCAStrategy,
} = require('../test/strategies');

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
} = require('../test/strategy-subs');

const { getTroveInfo } = require('../test/utils-liquity');

const {
    createMcdTrigger,
    createChainLinkPriceTrigger,
    RATIO_STATE_OVER,
    RATIO_STATE_UNDER,
} = require('../test/triggers');
const { deployCloseToDebtBundle, deployCloseToCollBundle } = require('../test/strategies/l2/l2-tests');
const { createRepayBundle, createBoostBundle } = require('../test/strategies/mcd/mcd-tests');

program.version('0.0.1');
// let forkedAddresses = '';
try {
    // eslint-disable-next-line global-require
    // forkedAddresses = require('../forked-addr.json');
} catch (err) {
    console.log('No forked registry set yet, please run deploy');
}

const MOCK_CHAINLINK_ORACLE = '0x5d0e4672C77A2743F8b583D152A8935121D8F879';
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

    const { subId } = await subMcdCloseToDaiStrategy(
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

const cbRebondSub = async (bondId, sender) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    const strategyId = '31';

    // eslint-disable-next-line no-unused-vars
    const { subId, strategySub } = await subCbRebondStrategy(proxy, bondId, strategyId);

    console.log(`Sub created #${subId}!`);
};

const liqCBPaybackSub = async (sourceId, sourceType, triggerRatio, triggerState, sender) => {
    let senderAcc = (await hre.ethers.getSigners())[0];
    await redeploy('FetchBondId', REGISTRY_ADDR, false, true);
    await redeploy('LiquityPayback', REGISTRY_ADDR, false, true);
    await redeploy('CBCreateRebondSub', REGISTRY_ADDR, false, true);
    let bundleId = await getLatestBundleId();

    console.log(parseInt(bundleId, 10));
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

    if (parseInt(bundleId, 10) < 7) {
        await openStrategyAndBundleStorage(true);
        const liqInStrategyEncoded = createLiquityPaybackChickenInStrategy();
        const liqOutStrategyEncoded = createLiquityPaybackChickenOutStrategy();

        const strategyId1 = await createStrategy(proxy, ...liqInStrategyEncoded, false);
        const strategyId2 = await createStrategy(proxy, ...liqOutStrategyEncoded, false);

        bundleId = await createBundle(proxy, [strategyId1, strategyId2]);
        console.log(`Bundle Id is ${bundleId} and should be 7`);
        console.log('Chicken in strat - 0, Chicken out strat - 1');
    }

    bundleId = '7';
    const targetRatioWei = hre.ethers.utils.parseUnits(triggerRatio, '16');

    const { subId } = await subLiquityCBPaybackStrategy(
        proxy, bundleId, sourceId, formattedSourceType, targetRatioWei, formattedPriceState,
    );

    console.log(`Sub created #${subId}!`);
};

const mcdTrailingCloseStrategySub = async (vaultId, type, percentage, isToDai, sender) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    await redeploy('TrailingStopTrigger', REGISTRY_ADDR, false, true);

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
    const formatPercentage = percentage * 1e8;

    let subInfo;

    if (isToDai) {
        const strategyId = 12;
        subInfo = await subMcdTrailingCloseToDaiStrategy(
            vaultId,
            proxy,
            ilkObj.assetAddress,
            formatPercentage,
            oracleData.roundId,
            strategyId,
            REGISTRY_ADDR,
        );

        console.log(`Subscribed to trailing mcd close to dai strategy with sub id #${subInfo.subId}`);
    } else {
        const strategyId = 11;
        subInfo = await subMcdTrailingCloseToCollStrategy(
            vaultId,
            proxy,
            ilkObj.assetAddress,
            formatPercentage,
            oracleData.roundId,
            strategyId,
            REGISTRY_ADDR,
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

    const formattedPrice = (price * 1e8).toString();

    let formattedPriceState;
    if (priceState.toLowerCase() === 'over') {
        formattedPriceState = 0;
    } else if (priceState.toLowerCase() === 'under') {
        formattedPriceState = 1;
    }

    const ilkObj = ilks.find((i) => i.ilkLabel === type);
    const strategyId = 9;

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
        const registry = await hre.ethers.getContractAt('DFSRegistry', addrs[getNetwork()].REGISTRY_ADDR);
        if (await registry.isRegistered(hre.ethers.utils.id('McdSubProxy').slice(0, 10)).then((e) => !e)) {
            const repayBundleId = await createRepayBundle(proxy, true);
            const boostBundleId = await createBoostBundle(proxy, true);
            await redeploy('McdSubProxy', REGISTRY_ADDR, false, true, repayBundleId, boostBundleId);
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

    const {
        repaySubId, boostSubId, repaySub, boostSub,
    } = await subToMcdProxy(
        proxy,
        [
            vaultId,
            Float2BN(minRatio, 16),
            Float2BN(maxRatio, 16),
            Float2BN(targetRatioBoost, 16),
            Float2BN(targetRatioRepay, 16),
            maxRatio > 0,
        ],
    );
    console.log({
        repaySubEncoded: encodeSub(repaySub),
        boostSubEncoded: encodeSub(boostSub),
        repaySubId,
        boostSubId,
    });
};

const liquityTrailingCloseToCollStrategySub = async (percentage, sender) => {
    let senderAcc = (await hre.ethers.getSigners())[0];

    await redeploy('TrailingStopTrigger', REGISTRY_ADDR, false, true);

    if (sender) {
        senderAcc = await hre.ethers.provider.getSigner(sender.toString());
        // eslint-disable-next-line no-underscore-dangle
        senderAcc.address = senderAcc._address;
    }

    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    const formatPercentage = percentage * 1e8;
    const strategyId = 13;

    // grab latest roundId from chainlink
    const priceOracle = await hre.ethers.getContractAt('MockChainlinkFeedRegistry', MOCK_CHAINLINK_ORACLE);

    const USD_QUOTE = '0x0000000000000000000000000000000000000348';
    const oracleData = await priceOracle.latestRoundData(ETH_ADDR, USD_QUOTE);

    console.log(`Current price of time of sub $${oracleData.answer / 1e8} at roundId ${oracleData.roundId}`);

    const subInfo = await subLiquityTrailingCloseToCollStrategy(
        proxy,
        formatPercentage,
        oracleData.roundId,
        strategyId,
        REGISTRY_ADDR,
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

    const subProxyAddr = '0xd18d4756bbf848674cc35f1a0b86afef20787382';
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

    let proxy = await getProxy(senderAcc.address);
    proxy = sender ? proxy.connect(senderAcc) : proxy;

    const amountColl = hre.ethers.utils.parseUnits(coll, 18);
    const amountLusd = hre.ethers.utils.parseUnits(debt, 18);

    await depositToWeth(amountColl, senderAcc);
    await approve(WETH_ADDRESS, proxy.address, senderAcc);
    await redeploy('LiquityView', addrs[network].REGISTRY_ADDR, false, true);

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
            REGISTRY_ADDR,
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

const subAaveAutomation = async (
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

    await redeploy('AaveSubProxy', addrs[network].REGISTRY_ADDR, false, true);

    const minRatioFormatted = hre.ethers.utils.parseUnits(minRatio, '16');
    const maxRatioFormatted = hre.ethers.utils.parseUnits(maxRatio, '16');

    const optimalRatioBoostFormatted = hre.ethers.utils.parseUnits(optimalRatioBoost, '16');
    const optimalRatioRepayFormatted = hre.ethers.utils.parseUnits(optimalRatioRepay, '16');

    const subIds = await subAaveV3L2AutomationStrategy(
        proxy,
        minRatioFormatted.toHexString().slice(2),
        maxRatioFormatted.toHexString().slice(2),
        optimalRatioBoostFormatted.toHexString().slice(2),
        optimalRatioRepayFormatted.toHexString().slice(2),
        boostEnabled,
        addrs[network].REGISTRY_ADDR,
    );

    console.log(`Aave position subed, repaySubId ${subIds.firstSub} , boostSubId ${subIds.secondSub}`);
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

    let bundleId = await getLatestBundleId();
    if (bundleId < 2) {
        const triggerAddr = await redeploy(
            'AaveV3QuotePriceTrigger', undefined, false, true,
        ).then((c) => c.address);
        const viewAddr = await redeploy(
            'AaveV3OracleView', undefined, false, true,
        ).then((c) => c.address);

        console.log('AaveQuotePriceTrigger address:', triggerAddr);
        console.log('AaveV3OracleView address:', viewAddr);

        const closeToDebtId = await deployCloseToDebtBundle(proxy, true);
        const closeToCollId = await deployCloseToCollBundle(proxy, true);

        console.log(`close-to-debt-Id: ${closeToDebtId}, close-to-coll-Id: ${closeToCollId}`);

        bundleId = closeToColl ? closeToCollId : closeToDebtId;
    } else {
        bundleId = closeToColl ? bundleId : bundleId - 1;
    }

    const formattedPrice = (targetQuotePrice * 1e8).toString();

    await subAaveV3CloseBundle(
        proxy,
        bundleId,
        baseAssetInfo.address,
        quoteAssetInfo.address,
        formattedPrice,
        priceState,
        collAssetInfo.address,
        collAssetId,
        debtAssetInfo.address,
        debtAssetId,
        rateMode,
    ).then((subId) => console.log(`subId: ${subId}`));
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

    await redeploy('CompV3SubProxy', addrs[network].REGISTRY_ADDR, false, true);

    const bundleId = await getLatestBundleId();

    console.log(parseInt(bundleId, 10));

    let repayBundleId;
    let boostBundleId;

    if (parseInt(bundleId, 10) < 4) {
        await openStrategyAndBundleStorage(true);
        const compV3RepayStrategyEncoded = createCompV3RepayStrategy();
        const compV3RepayFLStrategyEncoded = createFlCompV3RepayStrategy();

        const strategyId1 = await createStrategy(proxy, ...compV3RepayStrategyEncoded, true);
        const strategyId2 = await createStrategy(proxy, ...compV3RepayFLStrategyEncoded, true);

        repayBundleId = await createBundle(proxy, [strategyId1, strategyId2]);

        const compV3BoostStrategyEncoded = createCompV3BoostStrategy();
        const compV3BoostFLStrategyEncoded = createCompV3FlBoostStrategy();

        const strategyId11 = await createStrategy(proxy, ...compV3BoostStrategyEncoded, true);
        const strategyId22 = await createStrategy(proxy, ...compV3BoostFLStrategyEncoded, true);

        boostBundleId = await createBundle(proxy, [strategyId11, strategyId22]);

        console.log(repayBundleId, boostBundleId);
    }

    if (isEOA === 'true') {
        if (parseInt(bundleId, 10) < 6) {
            await openStrategyAndBundleStorage(true);
            const compV3RepayStrategyEncoded = createCompV3EOARepayStrategy();
            const compV3RepayFLStrategyEncoded = createFlCompV3EOARepayStrategy();

            const strategyId1 = await createStrategy(proxy, ...compV3RepayStrategyEncoded, true);
            const strategyId2 = await createStrategy(proxy, ...compV3RepayFLStrategyEncoded, true);

            repayBundleId = await createBundle(proxy, [strategyId1, strategyId2]);

            const compV3BoostStrategyEncoded = createCompV3EOABoostStrategy();
            const compV3BoostFLStrategyEncoded = createCompV3EOAFlBoostStrategy();

            const strategyId11 = await createStrategy(proxy, ...compV3BoostStrategyEncoded, true);
            const strategyId22 = await createStrategy(proxy, ...compV3BoostFLStrategyEncoded, true);

            boostBundleId = await createBundle(proxy, [strategyId11, strategyId22]);

            console.log(repayBundleId, boostBundleId);
        }
        // create strategies
    }

    const minRatioFormatted = hre.ethers.utils.parseUnits(minRatio, '16');
    const maxRatioFormatted = hre.ethers.utils.parseUnits(maxRatio, '16');

    const optimalRatioBoostFormatted = hre.ethers.utils.parseUnits(optimalRatioBoost, '16');
    const optimalRatioRepayFormatted = hre.ethers.utils.parseUnits(optimalRatioRepay, '16');

    const subIds = await subCompV3AutomationStrategy(
        proxy,
        addrs[network].COMET_USDC_ADDR,
        minRatioFormatted.toString(),
        maxRatioFormatted.toString(),
        optimalRatioBoostFormatted.toString(),
        optimalRatioRepayFormatted.toString(),
        boostEnabled,
        isEOA === 'true',
        addrs[network].REGISTRY_ADDR,
    );

    console.log(`CompV3 position subed, repaySubId ${subIds.firstSub} , boostSubId ${subIds.secondSub}`);
};

const subLimitOrder = async (
    srcTokenLabel,
    destTokenLabel,
    srcAmount,
    targetPrice,
    expireDays,
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
    await redeploy('OffchainPriceTrigger', addrs[network].REGISTRY_ADDR, false, true);

    console.log(network);
    // eslint-disable-next-line no-unused-expressions
    network === 'mainnet'
        ? (await redeploy('LimitSell', addrs[network].REGISTRY_ADDR, false, true))
        : (await redeploy('LimitSellL2', addrs[network].REGISTRY_ADDR, false, true));

    const strategyData = network === 'mainnet' ? createLimitOrderStrategy() : createLimitOrderL2Strategy();
    await openStrategyAndBundleStorage(true);

    const strategyId = await createStrategy(proxy, ...strategyData, false);

    // format sub data
    const srcToken = getAssetInfo(srcTokenLabel);
    const destToken = getAssetInfo(destTokenLabel);

    const amountInWei = hre.ethers.utils.parseUnits(srcAmount, srcToken.decimals);
    const targetPriceInWei = hre.ethers.utils.parseUnits(targetPrice, srcToken.decimals);

    const latestBlock = await hre.ethers.provider.getBlock('latest');
    const goodUntil = latestBlock.timestamp + (expireDays * 24 * 60 * 60);

    // give token approval
    await approve(srcToken.address, proxy.address, senderAcc);

    // sub
    const subData = await subLimitOrderStrategy(
        proxy,
        srcToken.address,
        destToken.address,
        amountInWei,
        targetPriceInWei,
        goodUntil,
        strategyId,
    );

    console.log(`Limit order subed, subId ${subData.subId}`);
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

    await redeploy('AaveSubProxy', addrs[network].REGISTRY_ADDR, false, true);

    await openStrategyAndBundleStorage(true);
    const aaveRepayStrategyEncoded = createAaveV3RepayL2Strategy();
    const aaveRepayFLStrategyEncoded = createAaveFLV3RepayL2Strategy();

    const strategyId1 = await createStrategy(proxy, ...aaveRepayStrategyEncoded, true);
    const strategyId2 = await createStrategy(proxy, ...aaveRepayFLStrategyEncoded, true);

    await createBundle(proxy, [strategyId1, strategyId2]);

    const aaveBoostStrategyEncoded = createAaveV3BoostL2Strategy();
    const aaveBoostFLStrategyEncoded = createAaveFLV3BoostL2Strategy();

    const strategyId11 = await createStrategy(proxy, ...aaveBoostStrategyEncoded, true);
    const strategyId22 = await createStrategy(proxy, ...aaveBoostFLStrategyEncoded, true);

    await createBundle(proxy, [strategyId11, strategyId22]);

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
        addrs[network].REGISTRY_ADDR,
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

    await addBotCaller(addr, addrs[network].REGISTRY_ADDR, true, network);
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
                REGISTRY_ADDR,
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

    const strategyData = network === 'mainnet' ? createDCAStrategy() : createDCAL2Strategy();
    await openStrategyAndBundleStorage(true);
    const strategyId = await createStrategy(proxy, ...strategyData, true);

    console.log('Strategy created: ', strategyId);

    await redeploy('TimestampTrigger', addrs[network].REGISTRY_ADDR, false, true);

    const srcToken = getAssetInfo(srcTokenLabel);
    const destToken = getAssetInfo(destTokenLabel);

    const DAY = 1 * 24 * 60 * 60;

    const intervalInSeconds = interval * DAY;
    const latestBlock = await hre.ethers.provider.getBlock('latest');

    const lastTimestamp = latestBlock.timestamp + intervalInSeconds;

    const amountInDecimals = hre.ethers.utils.parseUnits(amount, srcToken.decimals);

    console.log(srcToken.address,
        destToken.address,
        amountInDecimals,
        intervalInSeconds,
        lastTimestamp,
        strategyId);

    const sub = await subDcaStrategy(
        proxy,
        srcToken.address,
        destToken.address,
        amountInDecimals,
        intervalInSeconds,
        lastTimestamp,
        strategyId,
    );

    console.log(`Subscribed to DCA strategy with sub id ${sub.subId}`);
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
                    await addBotCaller(botAddr, addrs[network].REGISTRY_ADDR, true);
                }
            }
            topUp(addrs[network].OWNER_ACC);
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
        .command('deposit-in-ss <protocol> <amount> [senderAddr]')
        .description('Deposits dai in smart savings')
        .action(async (protocol, amount, senderAddr) => {
            await supplyInSS(protocol, amount, senderAddr);
            process.exit(0);
        });

    program
        .command('sub-mcd-automation <vaultId> <minRatio> <maxRatio> <targetRatioBoost> <targetRatioRepay> [senderAddr]')
        .description('Subscribes to Maker repay and (optionaly) boost bundles')
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
            'sub-aave-automation <minRatio> <maxRatio> <optimalRatioBoost> <optimalRatioRepay> <boostEnabled> [senderAddr]',
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
                await subAaveAutomation(
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
        .command('sub-limit-order <srcTokenLabel> <destTokenLabel> <srcAmount> <targetPrice> <expireDays> [senderAddr]')
        .description('Subscribes to a limit order')
        // eslint-disable-next-line max-len
        .action(async (srcTokenLabel, destTokenLabel, srcAmount, targetPrice, expireDays, senderAddr) => {
            // eslint-disable-next-line max-len
            await subLimitOrder(srcTokenLabel, destTokenLabel, srcAmount, targetPrice, expireDays, senderAddr);
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
            'update-aave-automation <subIdRepay> <subIdBoost> <minRatio> <maxRatio> <optimalRatioBoost> <optimalRatioRepay> <boostEnabled> [senderAddr]',
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
                boostEnabled,
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
            let network = 'mainnet';

            if (process.env.TEST_CHAIN_ID) {
                network = process.env.TEST_CHAIN_ID;
            }
            await redeploy(contractName.toString(), addrs[network].REGISTRY_ADDR, false, true);

            process.exit(0);
        });

    program.parse(process.argv);
})();
