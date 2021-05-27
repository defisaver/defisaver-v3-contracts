const { expect } = require('chai');
const hre = require('hardhat');

const { getAssetInfo, ilks } = require('@defisaver/tokens');
const dfs = require('@defisaver/sdk');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    formatExchangeObj,
    setNewExchangeWrapper,
    nullAddress,
    UNISWAP_WRAPPER,
    WETH_ADDRESS,
    MIN_VAULT_DAI_AMOUNT,
    fetchAmountinUSDPrice,
} = require('../../utils');

const {
    fetchMakerAddresses,
    getRatio,
    getVaultInfo,
    MCD_MANAGER_ADDR,
} = require('../../utils-mcd');

const {
    openVault,
} = require('../../actions.js');

// const dydxFLAction = dfs.actions.flashloan.DyDxFlashLoanAction;
const McdPaybackAction = dfs.actions.maker.MakerPaybackAction;
const McdWithdrawAction = dfs.actions.maker.MakerWithdrawAction;
const SellAction = dfs.actions.basic.SellAction;

describe('Mcd-Repay', function () {
    this.timeout(80000);

    let makerAddresses;
    let uniWrapper;
    let senderAcc;
    let proxy;
    // let dydxFlAddr;
    let aaveV2FlAddr;
    let mcdView;
    let taskExecutorAddr;

    before(async () => {
        uniWrapper = await redeploy('UniswapWrapperV3');
        mcdView = await redeploy('McdView');
        taskExecutorAddr = await getAddrFromRegistry('TaskExecutor');

        // dydxFlAddr = await getAddrFromRegistry('FLDyDx');

        makerAddresses = await fetchMakerAddresses();

        aaveV2FlAddr = await getAddrFromRegistry('FLAaveV2');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        await setNewExchangeWrapper(senderAcc, uniWrapper.address);
    });

    for (let i = 0; i < 1; ++i) {
        const ilkData = ilks[i];
        const joinAddr = ilkData.join;
        const tokenData = getAssetInfo(ilkData.asset);
        let vaultId;

        if (tokenData.symbol === 'ETH') {
            tokenData.address = WETH_ADDRESS;
        }

        let repayAmount = fetchAmountinUSDPrice(tokenData.symbol, '100');

        it(`... should call a repay ${repayAmount} ${tokenData.symbol} on a ${ilkData.ilkLabel} vault`, async () => {
            // create a vault
            vaultId = await openVault(
                makerAddresses,
                proxy,
                joinAddr,
                tokenData,
                fetchAmountinUSDPrice(tokenData.symbol, '40000'),
                (parseInt(MIN_VAULT_DAI_AMOUNT, 10) + 400).toString(),
            );

            repayAmount = hre.ethers.utils.parseUnits(repayAmount, tokenData.decimals);

            const ratioBefore = await getRatio(mcdView, vaultId);
            const info = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
            console.log(`Ratio before: ${ratioBefore.toFixed(2)}% (coll: ${info.coll.toFixed(2)} ${tokenData.symbol}, debt: ${info.debt.toFixed(2)} Dai)`);

            const from = proxy.address;
            const to = proxy.address;
            const collToken = tokenData.address;
            const fromToken = makerAddresses.MCD_DAI;

            const mcdWithdrawAction = new dfs.actions.maker.MakerWithdrawAction(
                vaultId,
                repayAmount,
                joinAddr,
                to,
                MCD_MANAGER_ADDR,
            );

            const sellAction = new dfs.actions.basic.SellAction(
                formatExchangeObj(
                    collToken,
                    fromToken,
                    '$1',
                    UNISWAP_WRAPPER,
                ),
                from,
                to,
            );

            const mcdPaybackAction = new dfs.actions.maker.MakerPaybackAction(vaultId, '$2', from, MCD_MANAGER_ADDR);

            const repayRecipe = new dfs.Recipe('RepayRecipe', [
                mcdWithdrawAction,
                sellAction,
                mcdPaybackAction,
            ]);

            const functionData = repayRecipe.encodeForDsProxyCall();

            await proxy['execute(address,bytes)'](taskExecutorAddr, functionData[1], { gasLimit: 3000000 });

            const ratioAfter = await getRatio(mcdView, vaultId);
            const info2 = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
            console.log(`Ratio before: ${ratioAfter.toFixed(2)}% (coll: ${info2.coll.toFixed(2)} ${tokenData.symbol}, debt: ${info2.debt.toFixed(2)} Dai)`);

            expect(ratioAfter).to.be.gt(ratioBefore);
            expect(info2.coll).to.be.lt(info.coll);
            expect(info2.debt).to.be.lt(info.debt);
        });

        it(`... should call a FL repay ${repayAmount} ${tokenData.symbol} on a ${ilkData.ilkLabel} vault`, async () => {
            // create a vault
            vaultId = await openVault(
                makerAddresses,
                proxy,
                joinAddr,
                tokenData,
                fetchAmountinUSDPrice(tokenData.symbol, '40000'),
                (parseInt(MIN_VAULT_DAI_AMOUNT, 10) + 500).toString(),
            );

            const flAmount = hre.ethers.utils.parseUnits('0.2', 18);

            const ratioBefore = await getRatio(mcdView, vaultId);
            const info = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
            console.log(`Ratio before: ${ratioBefore.toFixed(2)}% (coll: ${info.coll.toFixed(2)} ${tokenData.symbol}, debt: ${info.debt.toFixed(2)} Dai)`);

            const collToken = tokenData.address;
            const daiToken = makerAddresses.MCD_DAI;

            const exchangeOrder = formatExchangeObj(
                collToken,
                daiToken,
                flAmount,
                UNISWAP_WRAPPER,
            );

            const flAaveV2Action = new dfs.actions.flashloan.AaveV2FlashLoanAction(
                [flAmount],
                [collToken],
                [0],
                nullAddress,
                nullAddress,
                [],
            );

            const repayRecipe = new dfs.Recipe('FLRepayRecipe', [
                flAaveV2Action, // new dydxFLAction(flAmount, collToken, nullAddress, []),
                new SellAction(exchangeOrder, proxy.address, proxy.address),
                new McdPaybackAction(vaultId, '$2', proxy.address, MCD_MANAGER_ADDR),
                new McdWithdrawAction(vaultId, '$1', joinAddr, aaveV2FlAddr, MCD_MANAGER_ADDR),
            ]);

            const functionData = repayRecipe.encodeForDsProxyCall();

            await proxy['execute(address,bytes)'](taskExecutorAddr, functionData[1], { gasLimit: 3000000 });

            const ratioAfter = await getRatio(mcdView, vaultId);
            const info2 = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
            console.log(`Ratio before: ${ratioAfter.toFixed(2)}% (coll: ${info2.coll.toFixed(2)} ${tokenData.symbol}, debt: ${info2.debt.toFixed(2)} Dai)`);

            expect(ratioAfter).to.be.gt(ratioBefore);
            expect(info2.coll).to.be.lt(info.coll);
            expect(info2.debt).to.be.lt(info.debt);
        });
    }
});
