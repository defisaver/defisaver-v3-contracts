const { expect } = require('chai');
const hre = require('hardhat');

const dfs = require('@defisaver/sdk');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    WETH_ADDRESS,
    impersonateAccount,
    AWETH_ADDR,
    nullAddress,
    AAVE_MARKET,
    ALINK_ADDR,
    LINK_ADDR,
    USDT_ADDR,
    BUSD_ADDR,
    sendEther,
    AWBTC_ADDR,
    WBTC_ADDR,
    balanceOf,
    DAI_ADDR,
    resetForkToBlock,
} = require('../../utils');
const { executeAction } = require('../../actions');

describe('Inst Aave position shift', function () {
    this.timeout(80000);

    let proxy;
    let ownerAcc;
    let dydxFlAddr;
    let flMaker;

    /// @notice run on block number 13172393
    before(async () => {
        await resetForkToBlock(13172393);
        await redeploy('InstPullTokens');
        await redeploy('AaveCollateralSwitch');
        await redeploy('TokenBalance');
        await redeploy('FLDyDx');
        await redeploy('AaveSupply');
        await redeploy('AaveBorrow');
        await redeploy('AavePayback');
        flMaker = await redeploy('FLMaker');
        await redeploy('SendToken');
        await redeploy('TaskExecutor');
        dydxFlAddr = await getAddrFromRegistry('FLDyDx');
    });

    it('... Migrate aave position from INST (COLL : WETH, WBTC | DEBT : USDT)', async () => {
        const OWNER_ACC = '0x2Ee8670d2b936985D5fb1EE968810c155D3bB9cA';
        const dsaAddress = '0x63bf1D484d7D799722b1BA9c91f5ffa6d416D60A';
        const dsaContract = await hre.ethers.getContractAt('IInstaAccountV2', dsaAddress);
        sendEther((await hre.ethers.getSigners())[0], OWNER_ACC, '10');
        proxy = await getProxy(OWNER_ACC);
        // Approve dsproxy to have authoritiy over DSA account!
        await impersonateAccount(OWNER_ACC);
        ownerAcc = await hre.ethers.provider.getSigner(OWNER_ACC);
        const dsaContractImpersonated = await dsaContract.connect(ownerAcc);
        const ABI = [
            'function add(address)',
        ];
        const iface = new hre.ethers.utils.Interface(ABI);
        const data = iface.encodeFunctionData('add', [proxy.address]);
        await dsaContractImpersonated.cast(['AUTHORITY-A'], [data], OWNER_ACC);
        // create recipe
        const impersonatedProxy = proxy.connect(ownerAcc);
        // flashloan enough to repay all debt

        /*
        const flashloanAction = new dfs.actions.flashloan.DyDxFlashLoanAction(
            hre.ethers.utils.parseUnits('1000', 18),
            WETH_ADDRESS,
            nullAddress,
            [],
        );
    */
        const flashloanAction = new dfs.actions.flashloan.MakerFlashLoanAction(
            hre.ethers.utils.parseUnits('1000000', 18),
            nullAddress,
            [],
        );
        const balanceCheckerActionUSDT = new dfs.actions.basic.TokenBalanceAction(
            '0x531842cEbbdD378f8ee36D171d6cC9C4fcf475Ec', // VARIABLE DEBT USDT
            dsaAddress,
        );
        // supply eth to aave
        const aaveSupplyAction = new dfs.actions.aave.AaveSupplyAction(
            AAVE_MARKET,
            DAI_ADDR,
            '$1',
            proxy.address,
            nullAddress,
            true,
        );
        const aaveBorrowActionUSDT = new dfs.actions.aave.AaveBorrowAction(
            AAVE_MARKET,
            USDT_ADDR,
            '$2',
            2,
            proxy.address,
            nullAddress,
        );
        const aaveRepayActionUSDT = new dfs.actions.aave.AavePaybackAction(
            AAVE_MARKET,
            USDT_ADDR,
            '$2',
            2,
            proxy.address,
            dsaAddress,
        );
        const instTokenPullAction = new dfs.actions.insta.InstPullTokensAction(
            dsaAddress,
            [AWETH_ADDR, AWBTC_ADDR],
            [
                hre.ethers.constants.MaxUint256,
                hre.ethers.constants.MaxUint256,
            ],
            proxy.address,
        );
        const aaveSetAsCollateral = new dfs.actions.aave.AaveCollateralSwitchAction(
            '0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5',
            [WBTC_ADDR, WETH_ADDRESS],
            [true, true],
        );
        // withdraw flashloan eth
        const aaveWithdrawAction = new dfs.actions.aave.AaveWithdrawAction(
            AAVE_MARKET,
            DAI_ADDR,
            '$1',
            flMaker.address,
        );
        // repay flashloan
        const transferRecipe = new dfs.Recipe('TransferAavePositionFromInstadapp', [
            flashloanAction,
            balanceCheckerActionUSDT,
            aaveSupplyAction,
            aaveBorrowActionUSDT,
            aaveRepayActionUSDT,
            instTokenPullAction,
            aaveSetAsCollateral,
            aaveWithdrawAction,
        ]);
        const functionData = transferRecipe.encodeForDsProxyCall();

        const usdtDebtAmount = await balanceOf('0x531842cEbbdD378f8ee36D171d6cC9C4fcf475Ec', dsaAddress);
        const wbtcCollAmount = await balanceOf(AWBTC_ADDR, dsaAddress);
        const wethCollAmount = await balanceOf(AWETH_ADDR, dsaAddress);

        await executeAction('TaskExecutor', functionData[1], impersonatedProxy);
        const usdtDebtAmountAfter = await balanceOf('0x531842cEbbdD378f8ee36D171d6cC9C4fcf475Ec', proxy.address);
        const wbtcCollAmountAfter = await balanceOf(AWBTC_ADDR, proxy.address);
        const wethCollAmountAfter = await balanceOf(AWETH_ADDR, proxy.address);

        expect(wbtcCollAmount).to.be.lte(wbtcCollAmountAfter);
        expect(wethCollAmount).to.be.lte(wethCollAmountAfter);
        console.log(usdtDebtAmount);
        console.log(usdtDebtAmountAfter);
    }).timeout(1000000);
    it('... Migrate aave position from INST (COLL : WETH, LINK | DEBT : USDT, BUSD) ', async () => {
        const OWNER_ACC = '0xb5fDB9c33C4EbbF020eDE0138EdE8d7563dFe71A';
        const dsaAddress = '0x2E15905711635118da35D5aB9a0f994f2cfb304C';
        const dsaContract = await hre.ethers.getContractAt('IInstaAccountV2', dsaAddress);

        sendEther((await hre.ethers.getSigners())[0], OWNER_ACC, '10');
        proxy = await getProxy(OWNER_ACC);
        // Approve dsproxy to have authoritiy over DSA account!
        await impersonateAccount(OWNER_ACC);
        ownerAcc = await hre.ethers.provider.getSigner(OWNER_ACC);
        const dsaContractImpersonated = await dsaContract.connect(ownerAcc);
        const ABI = [
            'function add(address)',
        ];
        const iface = new hre.ethers.utils.Interface(ABI);
        const data = iface.encodeFunctionData('add', [proxy.address]);
        await dsaContractImpersonated.cast(['AUTHORITY-A'], [data], OWNER_ACC);
        // create recipe
        const impersonatedProxy = proxy.connect(ownerAcc);
        // flashloan enough to repay all debt

        const flashloanAction = new dfs.actions.flashloan.DyDxFlashLoanAction(
            hre.ethers.utils.parseUnits('1000', 18),
            WETH_ADDRESS,
            nullAddress,
            [],
        );
        const balanceCheckerActionBUSD = new dfs.actions.basic.TokenBalanceAction(
            '0xbA429f7011c9fa04cDd46a2Da24dc0FF0aC6099c', // VARIABLE DEBT BUSD
            dsaAddress,
        );
        const balanceCheckerActionUSDT = new dfs.actions.basic.TokenBalanceAction(
            '0x531842cEbbdD378f8ee36D171d6cC9C4fcf475Ec', // VARIABLE DEBT USDT
            dsaAddress,
        );
        // supply eth to aave
        const aaveSupplyAction = new dfs.actions.aave.AaveSupplyAction(
            AAVE_MARKET,
            WETH_ADDRESS,
            '$1',
            proxy.address,
            nullAddress,
            true,
        );
        // borrow enough to payback dsa debt
        const aaveBorrowActionBUSD = new dfs.actions.aave.AaveBorrowAction(
            AAVE_MARKET,
            BUSD_ADDR,
            '$2',
            2,
            proxy.address,
            nullAddress,
        );
        const aaveBorrowActionUSDT = new dfs.actions.aave.AaveBorrowAction(
            AAVE_MARKET,
            USDT_ADDR,
            '$3',
            2,
            proxy.address,
            nullAddress,
        );
        // repay dsa debt
        const aaveRepayActionBUSD = new dfs.actions.aave.AavePaybackAction(
            AAVE_MARKET,
            BUSD_ADDR,
            '$2',
            2,
            proxy.address,
            dsaAddress,
        );
        const aaveRepayActionUSDT = new dfs.actions.aave.AavePaybackAction(
            AAVE_MARKET,
            USDT_ADDR,
            '$3',
            2,
            proxy.address,
            dsaAddress,
        );
        const instTokenPullAction = new dfs.actions.insta.InstPullTokensAction(
            dsaAddress,
            [ALINK_ADDR, AWETH_ADDR],
            [
                hre.ethers.constants.MaxUint256,
                hre.ethers.constants.MaxUint256,
            ],
            proxy.address,
        );
        const aaveSetAsCollateral = new dfs.actions.aave.AaveCollateralSwitchAction(
            '0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5',
            [LINK_ADDR, WETH_ADDRESS],
            [true, true],
        );
        // withdraw flashloan eth
        // repay flashloan
        const aaveWithdrawAction = new dfs.actions.aave.AaveWithdrawAction(
            AAVE_MARKET,
            WETH_ADDRESS,
            '$1',
            dydxFlAddr,
        );
        const transferRecipe = new dfs.Recipe('TransferDebtlessAaveFromInstadapp', [
            flashloanAction,
            balanceCheckerActionBUSD,
            balanceCheckerActionUSDT,
            aaveSupplyAction,
            aaveBorrowActionBUSD,
            aaveBorrowActionUSDT,
            aaveRepayActionBUSD,
            aaveRepayActionUSDT,
            instTokenPullAction,
            aaveSetAsCollateral,
            aaveWithdrawAction,
        ]);
        const functionData = transferRecipe.encodeForDsProxyCall();

        const busdDebtAmount = await balanceOf('0xbA429f7011c9fa04cDd46a2Da24dc0FF0aC6099c', dsaAddress);
        const usdtDebtAmount = await balanceOf('0x531842cEbbdD378f8ee36D171d6cC9C4fcf475Ec', dsaAddress);
        const linkCollAmount = await balanceOf(ALINK_ADDR, dsaAddress);
        const wethCollAmount = await balanceOf(AWETH_ADDR, dsaAddress);
        await executeAction('TaskExecutor', functionData[1], impersonatedProxy);
        const busdDebtAmountAfter = await balanceOf('0xbA429f7011c9fa04cDd46a2Da24dc0FF0aC6099c', proxy.address);
        const usdtDebtAmountAfter = await balanceOf('0x531842cEbbdD378f8ee36D171d6cC9C4fcf475Ec', proxy.address);
        const linkCollAmountAfter = await balanceOf(ALINK_ADDR, proxy.address);
        const wethCollAmountAfter = await balanceOf(AWETH_ADDR, proxy.address);
        expect(linkCollAmount).to.be.lte(linkCollAmountAfter);
        expect(wethCollAmount).to.be.lte(wethCollAmountAfter);
        console.log(usdtDebtAmount);
        console.log(usdtDebtAmountAfter);
        console.log(busdDebtAmount);
        console.log(busdDebtAmountAfter);
    }).timeout(1000000);
});
