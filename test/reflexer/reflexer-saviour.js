const { expect } = require('chai');
const hre = require('hardhat');
const {
    getProxy,
    redeploy,
    depositToWeth,
    WETH_ADDRESS,
    MIN_VAULT_RAI_AMOUNT,
    RAI_ADDR,
    fetchAmountinUSDPrice,
    approve,
    balanceOf,
    UNIV2_ROUTER_ADDRESS,
} = require('../utils');

const {
    lastSafeID,
    ADAPTER_ADDRESS,
    REFLEXER_SAFE_MANAGER_ADDR,
    NATIVE_UNDERLYING_UNI_V_TWO_SAVIOUR_ADDRESS,
    RAI_WETH_LP_TOKEN_ADDRESS,
} = require('../utils-reflexer.js');

const {
    reflexerOpen,
    reflexerSupply,
    reflexerGenerate,
    reflexerSaviourDeposit,
    reflexerSaviourWithdraw,
} = require('../actions.js');

describe('Reflexer-Generate', () => {
    let senderAcc;
    let proxy;
    let saviour;
    let uniRouter;
    let safeManager;
    before(async () => {
        await redeploy('ReflexerOpen');
        await redeploy('ReflexerSupply');
        await redeploy('ReflexerWithdraw');
        await redeploy('ReflexerGenerate');
        await redeploy('RaiLoanInfo');
        await redeploy('ReflexerNativeUniV2SaviourDeposit');
        await redeploy('ReflexerNativeUniV2SaviourWithdraw');

        saviour = await hre.ethers.getContractAt(
            'ISAFESaviour',
            NATIVE_UNDERLYING_UNI_V_TWO_SAVIOUR_ADDRESS,
        );
        safeManager = await hre.ethers.getContractAt('ISAFEManager', REFLEXER_SAFE_MANAGER_ADDR);
        uniRouter = await hre.ethers.getContractAt('IUniswapRouter', UNIV2_ROUTER_ADDRESS);
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    it('... deposit LP tokens to reflexer saviour and then withdraw them', async () => {
        await reflexerOpen(proxy, ADAPTER_ADDRESS);
        const safeID = await lastSafeID(proxy.address);
        const safeHandler = await safeManager.safes(safeID);

        const amountRai = hre.ethers.utils.parseUnits(MIN_VAULT_RAI_AMOUNT, 18);
        const amountWETH = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '10000'), 18);
        await depositToWeth(amountWETH.toString());

        const from = senderAcc.address;
        await reflexerSupply(proxy, safeID, amountWETH, ADAPTER_ADDRESS, from);

        const to = senderAcc.address;
        await reflexerGenerate(proxy, safeID, amountRai, to);

        // exchange RAI and WETH for RAI-WETH LP tokens
        await depositToWeth(amountWETH.toString());
        await approve(RAI_ADDR, UNIV2_ROUTER_ADDRESS);
        await approve(WETH_ADDRESS, UNIV2_ROUTER_ADDRESS);
        await uniRouter.addLiquidity(
            RAI_ADDR,
            WETH_ADDRESS,
            amountRai,
            amountWETH,
            0,
            0,
            to,
            hre.ethers.constants.MaxUint256,
        );
        const lpTokenAmount = await balanceOf(RAI_WETH_LP_TOKEN_ADDRESS, to);

        await approve(RAI_WETH_LP_TOKEN_ADDRESS, proxy.address);
        // deposit half
        await reflexerSaviourDeposit(
            proxy,
            from,
            safeID,
            lpTokenAmount.div(2),
        );
        let saviourBalance = await saviour.lpTokenCover(safeHandler);
        expect(saviourBalance).to.be.eq(lpTokenAmount.div(2));

        // deposit uint max
        await reflexerSaviourDeposit(
            proxy,
            from,
            safeID,
            hre.ethers.constants.MaxUint256,
        );
        saviourBalance = await saviour.lpTokenCover(safeHandler);
        expect(saviourBalance).to.be.eq(lpTokenAmount);

        expect(await balanceOf(RAI_WETH_LP_TOKEN_ADDRESS, to)).to.be.eq(0);
        // withdraw tokens
        await reflexerSaviourWithdraw(proxy, to, safeID, saviourBalance);
        const lpTokenAmountAfterWithdraw = await balanceOf(RAI_WETH_LP_TOKEN_ADDRESS, to);
        expect(lpTokenAmount).to.be.eq(lpTokenAmountAfterWithdraw);
    }).timeout(1000000);
});
