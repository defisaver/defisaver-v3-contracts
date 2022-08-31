/* eslint-disable no-await-in-loop */
const { expect } = require('chai');
const hre = require('hardhat');
const { getAssetInfoByAddress } = require('@defisaver/tokens');
const dfs = require('@defisaver/sdk');
const { executeAction, withdrawCompV3 } = require('../../actions');

const {
    getProxy,
    redeploy,
    setNewExchangeWrapper,
    fetchAmountinUSDPrice,
    USDC_ADDR,
    approve,
    getAddrFromRegistry,
    setBalance,
} = require('../../utils');

const { getSupportedAssets, COMET_ADDR } = require('../../utils-compV3');

describe('CompoundV3 Import recipe test', function () {
    this.timeout(80000);

    let uniWrapper;
    let senderAcc;
    let proxy;
    let compV3View;
    let comet;
    let assets;

    before(async () => {
        uniWrapper = await redeploy('UniswapWrapperV3');
        await redeploy('CompV3Supply');
        await redeploy('CompV3Withdraw');
        await redeploy('CompV3View');
        await redeploy('CompV3Payback');
        await redeploy('CompV3Borrow');
        await redeploy('CompV3Transfer');

        const compV3ViewAddr = await getAddrFromRegistry('CompV3View');
        compV3View = await hre.ethers.getContractAt('CompV3View', compV3ViewAddr);

        comet = await hre.ethers.getContractAt('IComet', COMET_ADDR);

        assets = await getSupportedAssets(compV3View);

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        await setNewExchangeWrapper(senderAcc, uniWrapper.address);
    });

    it('... should import position without debt ', async () => {
        let token = getAssetInfoByAddress(USDC_ADDR);
        let fetchedAmountWithUSD = fetchAmountinUSDPrice(token.symbol, '10000');
        const USDCamount = hre.ethers.utils.parseUnits(
            fetchedAmountWithUSD,
            token.decimals,
        );

        await setBalance(USDC_ADDR, senderAcc.address, USDCamount);
        await approve(USDC_ADDR, COMET_ADDR, senderAcc);

        await comet.connect(senderAcc).supply(USDC_ADDR, USDCamount);

        for (let i = 0; i < assets.length; i++) {
            token = getAssetInfoByAddress(assets[i].asset);

            fetchedAmountWithUSD = fetchAmountinUSDPrice(token.symbol, '10000');
            const amount = hre.ethers.utils.parseUnits(
                fetchedAmountWithUSD,
                token.decimals,
            );

            await setBalance(token.address, senderAcc.address, amount);
            await approve(token.address, COMET_ADDR, senderAcc);

            await comet.connect(senderAcc).supply(token.address, amount);
        }

        const userData = await compV3View.getLoanData(senderAcc.address);
        const userDeposit = userData.depositAmount;
        const userDepositValue = userData.depositValue;

        const oldProxyData = await compV3View.getLoanData(proxy.address);
        const oldProxyDepositValue = oldProxyData.depositValue;
        for (let i = 0; i < oldProxyData.collAmounts.length; i++) {
            await withdrawCompV3(
                proxy, proxy.address, oldProxyData.collAddr[i], oldProxyData.collAmounts[i],
            );
        }
        await comet.allow(proxy.address, true);

        const compV3TransferDepositAction = new dfs.actions.compoundV3.CompoundV3TransferAction(
            senderAcc.address,
            proxy.address,
            USDC_ADDR,
            userDeposit,
        );
        const collAmounts = userData.collAmounts;
        const transferCollateralActions = [];
        for (let i = 0; i < collAmounts.length; i++) {
            if (collAmounts[i] !== 0) {
                transferCollateralActions.push(new dfs.actions.compoundV3.CompoundV3TransferAction(
                    senderAcc.address,
                    proxy.address,
                    userData.collAddr[i],
                    collAmounts[i],
                ));
            }
        }
        const transferRecipe = new dfs.Recipe('TransferRecipe', [
            compV3TransferDepositAction,
            ...transferCollateralActions,
        ]);

        const functionData = transferRecipe.encodeForDsProxyCall();

        await executeAction('RecipeExecutor', functionData[1], proxy);

        const proxyData = await compV3View.getLoanData(proxy.address);
        const proxyDepositValue = proxyData.depositValue;
        const proxyCollateralAmounts = proxyData.collAmounts;
        for (let i = 0; i < collAmounts.length; i++) {
            expect(collAmounts[i]).to.be.equal(proxyCollateralAmounts[i]);
        }
        // eslint-disable-next-line max-len
        expect(userDepositValue.toString()).to.be.equal((proxyDepositValue - oldProxyDepositValue).toString());
    });
});
