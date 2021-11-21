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
    approve,
    DAI_ADDR,
    USDC_ADDR,
    balanceOf,
} = require('../../utils');

const {
    fetchMakerAddresses,
    getRatio,
    getVaultInfo,
    MCD_MANAGER_ADDR,
} = require('../../utils-mcd');

const {
    openVault,
    buyTokenIfNeeded,
    gUniDeposit,
    openVaultForExactAmountInDecimals,
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

    it('... should call a repay for GUNIV3DAIUSDC1-A vault', async () => {
        const GUNIV3DAIUSDC = '0xabddafb225e10b90d798bb8a886238fb835e2053';
        const joinAddr = '0xbFD445A97e7459b0eBb34cfbd3245750Dba4d7a4';

        const daiAmount = hre.ethers.utils.parseUnits('28000', 18);
        const usdtAmount = hre.ethers.utils.parseUnits('28000', 6);
        await buyTokenIfNeeded(DAI_ADDR, senderAcc, proxy, daiAmount, uniWrapper.address);

        await buyTokenIfNeeded(USDC_ADDR, senderAcc, proxy, usdtAmount, uniWrapper.address);

        await approve(DAI_ADDR, proxy.address);
        await approve(USDC_ADDR, proxy.address);
        await gUniDeposit(
            GUNIV3DAIUSDC,
            DAI_ADDR,
            USDC_ADDR,
            daiAmount,
            usdtAmount,
            senderAcc.address,
            proxy,
        );

        const poolTokensBalanceAfter = await balanceOf(GUNIV3DAIUSDC, senderAcc.address);

        await approve(GUNIV3DAIUSDC, proxy.address);

        const vaultId = await openVaultForExactAmountInDecimals(
            makerAddresses,
            proxy,
            joinAddr,
            { address: GUNIV3DAIUSDC, decimals: 18 },
            poolTokensBalanceAfter.toString(),
            (parseInt(MIN_VAULT_DAI_AMOUNT, 10) + 200).toString(),
        );

        const ratioBefore = await getRatio(mcdView, vaultId);
        const info = await getVaultInfo(mcdView, vaultId, '0x47554e49563344414955534443312d4100000000000000000000000000000000');
        console.log(`Ratio before: ${ratioBefore.toFixed(2)}% (coll: ${info.coll.toFixed(2)} GUNIV3DAIUSDC1, debt: ${info.debt.toFixed(2)} Dai)`);

        const proxyAddr = proxy.address;
        const fromToken = makerAddresses.MCD_DAI;
        // REPAY -> WITHDRAW GUNI from COLL, GUNIWITHDRAW burn tokens, sell USDC for DAI, REPAY DAI

        const amountToWithdraw = poolTokensBalanceAfter.div(10).toString();
        console.log((amountToWithdraw / 1e18).toString());

        const mcdWithdrawAction = new dfs.actions.maker.MakerWithdrawAction(
            vaultId,
            amountToWithdraw,
            joinAddr,
            proxyAddr,
            MCD_MANAGER_ADDR,
        );
        const guniBurnAction = new dfs.actions.guni.GUniWithdraw(
            GUNIV3DAIUSDC, '$1', 0, 0, proxyAddr, proxyAddr,
        );
        const usdcTokenBalanceAction = new dfs.actions.basic.TokenBalanceAction(
            USDC_ADDR, proxyAddr,
        );
        const sellAction = new dfs.actions.basic.SellAction(
            formatExchangeObj(
                USDC_ADDR,
                fromToken,
                '$3',
                uniWrapper.address,
            ),
            proxyAddr,
            proxyAddr,
        );
        const daiTokenBalanceAction = new dfs.actions.basic.TokenBalanceAction(
            DAI_ADDR, proxyAddr,
        );
        const mcdPaybackAction = new dfs.actions.maker.MakerPaybackAction(vaultId, '$5', proxyAddr, MCD_MANAGER_ADDR);
        const repayRecipe = new dfs.Recipe('RepayRecipe', [
            mcdWithdrawAction,
            guniBurnAction,
            usdcTokenBalanceAction,
            sellAction,
            daiTokenBalanceAction,
            mcdPaybackAction,
        ]);
        const functionData = repayRecipe.encodeForDsProxyCall();

        await proxy['execute(address,bytes)'](taskExecutorAddr, functionData[1], { gasLimit: 3000000 });

        const ratioAfter = await getRatio(mcdView, vaultId);
        const info2 = await getVaultInfo(mcdView, vaultId, '0x47554e49563344414955534443312d4100000000000000000000000000000000');
        console.log(`Ratio after: ${ratioAfter.toFixed(2)}% (coll: ${info2.coll.toFixed(2)} GUNIV3DAIUSDC1, debt: ${info2.debt.toFixed(2)} Dai)`);
        expect(ratioAfter).to.be.gt(ratioBefore);
        expect(info2.coll).to.be.lt(info.coll);
        expect(info2.debt).to.be.lt(info.debt);
    }).timeout(300000);
});
