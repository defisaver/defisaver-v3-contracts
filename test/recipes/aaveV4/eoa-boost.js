const hre = require('hardhat');
const dfs = require('@defisaver/sdk');
const { expect } = require('chai');
const { getAssetInfo } = require('@defisaver/tokens');
const {
    redeploy,
    chainIds,
    nullAddress,
    getAddrFromRegistry,
    takeSnapshot,
    revertToSnapshot,
    fetchAmountInUSDPriceByAddress,
    isNetworkFork,
    getAndSetMockExchangeWrapper,
    formatMockExchangeObjUsdFeed,
    getOwnerAddr,
    getProxy,
} = require('../../utils/utils');
const { predictSafeAddress, signSafeTx, encodeSetupArgs } = require('../../utils/safe');
const {
    CORE_RESERVE_ID_WETH,
    CORE_RESERVE_ID_USDC,
    ALL_POSITION_MANAGER_UPDATES,
    getReserveData,
    openAaveV4EoaPosition,
    signSetUserManagersIntent,
    signBorrowPermit,
    MAIN_SPOKE,
} = require('../../utils/aaveV4');
const { topUp } = require('../../../scripts/utils/fork');
const { executeAction } = require('../../utils/actions');

const spokeAddr = MAIN_SPOKE;
const collReserveId = CORE_RESERVE_ID_WETH;
const debtReserveId = CORE_RESERVE_ID_USDC;
const getRandomSaltNonce = () =>
    hre.ethers.BigNumber.from(hre.ethers.utils.randomBytes(32)).toString();

const buildBoostRecipe = ({
    spoke,
    setManagersSig,
    setManagersNonce,
    setManagersDeadline,
    senderAddress,
    updates,
    borrowPermit,
    borrowSig,
    proxyAddress,
    boostAmount,
    exchangeData,
}) => {
    const setManagersAction = new dfs.actions.aaveV4.AaveV4SetUserManagersWithSigAction(
        spoke,
        senderAddress,
        setManagersNonce.toString(),
        setManagersDeadline,
        setManagersSig,
        updates.map((u) => [u.positionManager, u.approve]),
    );

    const delegateBorrowAction = new dfs.actions.aaveV4.AaveV4DelegateBorrowWithSigAction(
        [
            borrowPermit.spoke,
            borrowPermit.reserveId,
            borrowPermit.owner,
            borrowPermit.spender,
            borrowPermit.amount.toString(),
            borrowPermit.nonce.toString(),
            borrowPermit.deadline,
        ],
        borrowSig,
    );

    const borrowAction = new dfs.actions.aaveV4.AaveV4BorrowAction(
        spoke,
        senderAddress,
        proxyAddress,
        debtReserveId,
        boostAmount.toString(),
    );

    const sellAction = new dfs.actions.basic.SellAction(exchangeData, proxyAddress, proxyAddress);

    const supplyAction = new dfs.actions.aaveV4.AaveV4SupplyAction(
        spoke,
        senderAddress,
        proxyAddress,
        collReserveId,
        '$4',
        true,
    );

    return new dfs.Recipe('AaveV4EOABoost', [
        setManagersAction,
        delegateBorrowAction,
        borrowAction,
        sellAction,
        supplyAction,
    ]);
};

const signAndBuildBoostRecipe = async (senderAcc, proxyAddress, boostAmount, exchangeData) => {
    const {
        signature: setManagersSig,
        nonce: setManagersNonce,
        deadline: setManagersDeadline,
    } = await signSetUserManagersIntent(senderAcc, spokeAddr, ALL_POSITION_MANAGER_UPDATES);

    const {
        signature: borrowSig,
        nonce: borrowNonce,
        deadline: borrowDeadline,
    } = await signBorrowPermit(
        senderAcc,
        spokeAddr,
        debtReserveId,
        proxyAddress,
        hre.ethers.constants.MaxUint256,
    );

    return buildBoostRecipe({
        spoke: spokeAddr,
        setManagersSig,
        setManagersNonce,
        setManagersDeadline,
        senderAddress: senderAcc.address,
        updates: ALL_POSITION_MANAGER_UPDATES,
        borrowPermit: {
            spoke: spokeAddr,
            reserveId: debtReserveId,
            owner: senderAcc.address,
            spender: proxyAddress,
            amount: hre.ethers.constants.MaxUint256,
            nonce: borrowNonce,
            deadline: borrowDeadline,
        },
        borrowSig,
        proxyAddress,
        boostAmount,
        exchangeData,
    });
};

describe('AaveV4-EOA-Boost', function () {
    const network = hre.network.config.name;
    this.timeout(300000);
    let senderAcc;
    let snapshotId;
    let chainId;
    let debtReserve;
    let mockWrapper;
    let dfsSafeFactory;

    before(async function () {
        this.timeout(300000);
        const isFork = isNetworkFork();
        senderAcc = new hre.ethers.Wallet(process.env.PRIV_KEY_MAINNET, hre.ethers.provider);
        chainId = chainIds[network];

        console.log('Sender address:', senderAcc.address);

        if (isFork) {
            await topUp(senderAcc.address);
            await topUp(getOwnerAddr());
        }

        await redeploy('AaveV4Supply', isFork);
        await redeploy('AaveV4Borrow', isFork);
        await redeploy('AaveV4Withdraw', isFork);
        await redeploy('AaveV4Payback', isFork);
        await redeploy('AaveV4SetUserManagersWithSig', isFork);
        await redeploy('AaveV4DelegateBorrowWithSig', isFork);
        await redeploy('RecipeExecutor', isFork);
        dfsSafeFactory = await redeploy('DFSSafeFactory', isFork);

        mockWrapper = await getAndSetMockExchangeWrapper(senderAcc, nullAddress, isFork);

        debtReserve = await getReserveData(spokeAddr, debtReserveId);
    });

    beforeEach(async () => {
        snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
        await revertToSnapshot(snapshotId);
    });

    it('... should boost EOA position using existing Safe wallet', async () => {
        let safe = await getProxy(senderAcc.address, true);
        safe = safe.connect(senderAcc);
        safe.signer.address = senderAcc.address;

        await openAaveV4EoaPosition(
            senderAcc.address,
            collReserveId,
            debtReserveId,
            '10000',
            '2000',
            spokeAddr,
        );

        const view = await (await hre.ethers.getContractFactory('AaveV4View')).deploy();

        const boostAmount = await fetchAmountInUSDPriceByAddress(
            debtReserve.underlying,
            debtReserve.decimals,
            '1000',
        );

        const exchangeData = await formatMockExchangeObjUsdFeed(
            getAssetInfo('USDC', chainId),
            getAssetInfo('WETH', chainId),
            boostAmount,
            mockWrapper,
        );

        const recipe = await signAndBuildBoostRecipe(
            senderAcc,
            safe.address,
            boostAmount,
            exchangeData,
        );

        const functionData = recipe.encodeForDsProxyCall()[1];

        const loanDataPre = await view.getLoanData(spokeAddr, senderAcc.address);

        await executeAction('RecipeExecutor', functionData, safe);

        const loanData = await view.getLoanData(spokeAddr, senderAcc.address);
        console.log(
            `Collateral before: ${loanDataPre.totalCollateralInUsd}, after: ${loanData.totalCollateralInUsd}`,
        );
        console.log(
            `Debt before: ${loanDataPre.totalDebtInUsdRay}, after: ${loanData.totalDebtInUsdRay}`,
        );
        expect(loanData.totalCollateralInUsd).to.be.gt(loanDataPre.totalCollateralInUsd);
        expect(loanData.totalDebtInUsdRay).to.be.gt(loanDataPre.totalDebtInUsdRay);
    });

    it('... should boost EOA position creating Safe wallet via DFSSafeFactory', async () => {
        const singletonAddr = '0xd9db270c1b5e3bd161e8c8503c55ceabee709552';
        const safeProxyFactory = '0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2';
        const setupArgs = [
            [senderAcc.address],
            1,
            nullAddress,
            '0x',
            nullAddress,
            nullAddress,
            0,
            nullAddress,
        ];
        const saltNonce = getRandomSaltNonce();

        const predictedSafe = await predictSafeAddress(
            singletonAddr,
            setupArgs,
            saltNonce,
            safeProxyFactory,
        );
        console.log('Predicted safe address:', predictedSafe);

        await openAaveV4EoaPosition(
            senderAcc.address,
            collReserveId,
            debtReserveId,
            '10000',
            '2000',
            spokeAddr,
        );

        const boostAmount = await fetchAmountInUSDPriceByAddress(
            debtReserve.underlying,
            debtReserve.decimals,
            '1000',
        );

        const exchangeData = await formatMockExchangeObjUsdFeed(
            getAssetInfo('USDC', chainId),
            getAssetInfo('WETH', chainId),
            boostAmount,
            mockWrapper,
        );

        const recipe = await signAndBuildBoostRecipe(
            senderAcc,
            predictedSafe,
            boostAmount,
            exchangeData,
        );

        const recipeExecutor = await getAddrFromRegistry('RecipeExecutor');
        const functionData = recipe.encodeForDsProxyCall()[1];

        const safeTxParams = {
            to: recipeExecutor,
            value: 0,
            data: functionData,
            operation: 1,
            safeTxGas: 0,
            baseGas: 0,
            gasPrice: 0,
            gasToken: hre.ethers.constants.AddressZero,
            refundReceiver: hre.ethers.constants.AddressZero,
            nonce: 0,
        };
        const safeSig = await signSafeTx(
            { address: predictedSafe },
            safeTxParams,
            senderAcc,
            123456789, // TODO:AaveV4 return back to 1 once deployed.
        );

        const view = await (await hre.ethers.getContractFactory('AaveV4View')).deploy();
        const loanDataPre = await view.getLoanData(spokeAddr, senderAcc.address);

        const setupArgsEncoded = await encodeSetupArgs(setupArgs);
        await dfsSafeFactory.createSafeAndExecute(
            [singletonAddr, setupArgsEncoded, saltNonce],
            [
                safeTxParams.to,
                safeTxParams.value,
                safeTxParams.data,
                safeTxParams.operation,
                safeTxParams.safeTxGas,
                safeTxParams.baseGas,
                safeTxParams.gasPrice,
                safeTxParams.gasToken,
                safeTxParams.refundReceiver,
                safeSig,
            ],
            { gasLimit: 10000000 },
        );

        const loanData = await view.getLoanData(spokeAddr, senderAcc.address);
        expect(loanData.totalCollateralInUsd).to.be.gt(loanDataPre.totalCollateralInUsd);
        expect(loanData.totalDebtInUsdRay).to.be.gt(loanDataPre.totalDebtInUsdRay);
        console.log(
            `Collateral before: ${loanDataPre.totalCollateralInUsd}, after: ${loanData.totalCollateralInUsd}`,
        );
        console.log(
            `Debt before: ${loanDataPre.totalDebtInUsdRay}, after: ${loanData.totalDebtInUsdRay}`,
        );
    });
});
