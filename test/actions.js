/* eslint-disable max-len */
const dfs = require('@defisaver/sdk');
const hre = require('hardhat');

const { getAssetInfo, ilks } = require('@defisaver/tokens');
const {
    approve,
    getAddrFromRegistry,
    nullAddress,
    WETH_ADDRESS,
    UNISWAP_WRAPPER,
    REGISTRY_ADDR,
    balanceOf,
    formatExchangeObj,
    isEth,
    depositToWeth,
    MAX_UINT128,
    fetchAmountinUSDPrice,
    setBalance,
    // getGasUsed,
    mineBlock,
    getGasUsed,
    formatExchangeObjCurve,
    addrs,
    USDC_ADDR,
    LUSD_ADDR,
    BLUSD_ADDR,
} = require('./utils');

const {
    getVaultsForUser,
    canGenerateDebt,
    getCropJoinVaultIds,
    MCD_MANAGER_ADDR,
} = require('./utils-mcd');
const { getSecondTokenAmount } = require('./utils-uni');
const { LiquityActionIds, getHints, getRedemptionHints } = require('./utils-liquity');
const { execShellCommand } = require('../scripts/hardhat-tasks-functions');

const network = hre.network.config.name;

const executeAction = async (actionName, functionData, proxy, regAddr = addrs[network].REGISTRY_ADDR) => {
    if (hre.network.config.type !== 'tenderly') {
        await hre.network.provider.send('hardhat_setNextBlockBaseFeePerGas', [
            '0x1', // 1 wei
        ]);
    }

    const actionAddr = await getAddrFromRegistry(actionName, regAddr);
    let receipt;
    try {
        mineBlock();
        receipt = await proxy['execute(address,bytes)'](actionAddr, functionData, {
            gasLimit: 10000000,
        });

        const gasUsed = await getGasUsed(receipt);
        console.log(`Gas used by ${actionName} action: ${gasUsed}`);
        return receipt;
    } catch (error) {
        console.log(error);
        const blockNum = await hre.ethers.provider.getBlockNumber();
        const block = await hre.ethers.provider.getBlockWithTransactions(blockNum);
        const txHash = block.transactions[0].hash;
        await execShellCommand(`tenderly export ${txHash}`);
        throw error;
    }
};

// eslint-disable-next-line max-len
const sell = async (proxy, sellAddr, buyAddr, sellAmount, wrapper, from, to, fee = 0, signer, regAddr = REGISTRY_ADDR, isCurve = false) => {
    let exchangeObject;
    if (!isCurve) {
        exchangeObject = formatExchangeObj(
            sellAddr,
            buyAddr,
            sellAmount.toString(),
            wrapper,
            0,
            fee,
        );
    } else {
        exchangeObject = await formatExchangeObjCurve(
            sellAddr,
            buyAddr,
            sellAmount.toString(),
            wrapper,
        );
    }

    const sellAction = new dfs.actions.basic.SellAction(exchangeObject, from, to);

    const functionData = sellAction.encodeForDsProxyCall()[1];

    if (isEth(sellAddr)) {
        await depositToWeth(sellAmount.toString(), signer);
    }

    await approve(sellAddr, proxy.address, signer);

    const tx = await executeAction('DFSSell', functionData, proxy, regAddr);
    return tx;
};

const paybackMcd = async (proxy, vaultId, amount, from, daiAddr, mcdManager = MCD_MANAGER_ADDR) => {
    await approve(daiAddr, proxy.address);

    const mcdPaybackAction = new dfs.actions.maker.MakerPaybackAction(
        vaultId,
        amount,
        from,
        mcdManager,
    );
    const functionData = mcdPaybackAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('McdPayback', functionData, proxy);
    return tx;
};
const updateSubData = async (proxy, subId, sub) => {
    const updateSubAction = new dfs.actions.basic.UpdateSubAction(
        subId,
        sub,
    );
    const functionData = updateSubAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('UpdateSub', functionData, proxy);
    return tx;
};

/*
     ___           ___   ____    ____  _______
    /   \         /   \  \   \  /   / |   ____|
   /  ^  \       /  ^  \  \   \/   /  |  |__
  /  /_\  \     /  /_\  \  \      /   |   __|
 /  _____  \   /  _____  \  \    /    |  |____
/__/     \__\ /__/     \__\  \__/     |_______|
*/
const supplyAave = async (proxy, market, amount, tokenAddr, from) => {
    await setBalance(tokenAddr, from, amount);
    await approve(tokenAddr, proxy.address);
    const aaveSupplyAction = new dfs.actions.aave.AaveSupplyAction(
        market,
        tokenAddr,
        amount,
        from,
        nullAddress,
    );
    const functionData = aaveSupplyAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('AaveSupply', functionData, proxy);
    return tx;
};
const withdrawAave = async (proxy, market, tokenAddr, amount, to) => {
    const aaveWithdrawAction = new dfs.actions.aave.AaveWithdrawAction(
        market,
        tokenAddr,
        amount,
        to,
    );
    const functionData = aaveWithdrawAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('AaveWithdraw', functionData, proxy);
    return tx;
};
const borrowAave = async (proxy, market, tokenAddr, amount, rateMode, to) => {
    const aaveBorrowAction = new dfs.actions.aave.AaveBorrowAction(
        market,
        tokenAddr,
        amount,
        rateMode,
        to,
        nullAddress,
    );
    const functionData = aaveBorrowAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('AaveBorrow', functionData, proxy);
    return tx;
};
const paybackAave = async (proxy, market, tokenAddr, amount, rateMode, from) => {
    if (isEth(tokenAddr)) {
        await depositToWeth(amount.toString());
    }
    await approve(tokenAddr, proxy.address);
    const aavePaybackAction = new dfs.actions.aave.AavePaybackAction(
        market,
        tokenAddr,
        amount,
        rateMode,
        from,
        nullAddress,
    );
    const functionData = aavePaybackAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('AavePayback', functionData, proxy);
    return tx;
};
const claimStkAave = async (proxy, assets, amount, to) => {
    const aaveClaimStkAaveAction = new dfs.actions.aave.AaveClaimStkAaveAction(assets, amount, to);
    const functionData = aaveClaimStkAaveAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('AaveClaimStkAave', functionData, proxy);
    return tx;
};
/*
.______       _______  _______  __       __________   ___  _______ .______
|   _  \     |   ____||   ____||  |     |   ____\  \ /  / |   ____||   _  \
|  |_)  |    |  |__   |  |__   |  |     |  |__   \  V  /  |  |__   |  |_)  |
|      /     |   __|  |   __|  |  |     |   __|   >   <   |   __|  |      /
|  |\  \----.|  |____ |  |     |  `----.|  |____ /  .  \  |  |____ |  |\  \----.
| _| `._____||_______||__|     |_______||_______/__/ \__\ |_______|| _| `._____|
*/
const reflexerOpen = async (proxy, adapterAddr) => {
    const openMySafe = new dfs.actions.reflexer.ReflexerOpenSafeAction(adapterAddr);
    const functionData = openMySafe.encodeForDsProxyCall()[1];

    const tx = await executeAction('ReflexerOpen', functionData, proxy);
    return tx;
};
const reflexerSupply = async (proxy, safeId, amount, adapterAddr, from) => {
    await approve(WETH_ADDRESS, proxy.address);
    const supplyMySafe = new dfs.actions.reflexer.ReflexerSupplyAction(
        safeId,
        amount,
        adapterAddr,
        from,
    );

    const functionData = supplyMySafe.encodeForDsProxyCall()[1];

    const tx = await executeAction('ReflexerSupply', functionData, proxy);
    return tx;
};
const reflexerPayback = async (proxy, safeId, amount, from, raiAddr) => {
    await approve(raiAddr, proxy.address);

    const reflexerPaybackAction = new dfs.actions.reflexer.ReflexerPaybackAction(
        safeId,
        amount,
        from,
    );
    const functionData = reflexerPaybackAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('ReflexerPayback', functionData, proxy);
    return tx;
};
const reflexerWithdraw = async (proxy, safeId, amount, adapterAddr, to) => {
    const reflexerWithdrawAction = new dfs.actions.reflexer.ReflexerWithdrawAction(
        safeId,
        amount,
        adapterAddr,
        to,
    );
    const functionData = reflexerWithdrawAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('ReflexerWithdraw', functionData, proxy);
    return tx;
};
const reflexerGenerate = async (proxy, safeId, amount, to) => {
    const reflexerGenerateAction = new dfs.actions.reflexer.ReflexerGenerateAction(
        safeId,
        amount,
        to,
    );
    const functionData = reflexerGenerateAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('ReflexerGenerate', functionData, proxy);
    return tx;
};
/*
.______        ___       __          ___      .__   __.   ______  _______ .______
|   _  \      /   \     |  |        /   \     |  \ |  |  /      ||   ____||   _  \
|  |_)  |    /  ^  \    |  |       /  ^  \    |   \|  | |  ,----'|  |__   |  |_)  |
|   _  <    /  /_\  \   |  |      /  /_\  \   |  . `  | |  |     |   __|  |      /
|  |_)  |  /  _____  \  |  `----./  _____  \  |  |\   | |  `----.|  |____ |  |\  \----.
|______/  /__/     \__\ |_______/__/     \__\ |__| \__|  \______||_______|| _| `._____|
*/

const balancerSupply = async (proxy, poolId, from, to, tokens, maxAmountsIn, userData) => {
    const balancerSupplyAction = new dfs.actions.balancer.BalancerV2SupplyAction(
        poolId,
        from,
        to,
        tokens,
        maxAmountsIn,
        userData,
    );
    const functionData = balancerSupplyAction.encodeForDsProxyCall()[1];
    const tx = await executeAction('BalancerV2Supply', functionData, proxy);
    return tx;
};
const balancerClaim = async (proxy, liquidityProvider, to, weeks, balances, merkleProofs) => {
    const balancerClaimAction = new dfs.actions.balancer.BalancerV2ClaimAction(
        liquidityProvider,
        to,
        weeks,
        balances,
        merkleProofs,
    );
    const functionData = balancerClaimAction.encodeForDsProxyCall()[1];
    const tx = await executeAction('BalancerV2Claim', functionData, proxy);
    return tx;
};
const balancerWithdraw = async (
    proxy,
    poolId,
    from,
    to,
    lpTokenAmount,
    tokens,
    minAmountsOut,
    userData,
) => {
    const balancerWithdrawAction = new dfs.actions.balancer.BalancerV2WithdrawAction(
        poolId,
        from,
        to,
        lpTokenAmount,
        tokens,
        minAmountsOut,
        userData,
    );
    const functionData = balancerWithdrawAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('BalancerV2Withdraw', functionData, proxy);
    return tx;
};
/*
  ______   ______   .___  ___. .______     ______    __    __  .__   __.  _______
 /      | /  __  \  |   \/   | |   _  \   /  __  \  |  |  |  | |  \ |  | |       \
|  ,----'|  |  |  | |  \  /  | |  |_)  | |  |  |  | |  |  |  | |   \|  | |  .--.  |
|  |     |  |  |  | |  |\/|  | |   ___/  |  |  |  | |  |  |  | |  . `  | |  |  |  |
|  `----.|  `--'  | |  |  |  | |  |      |  `--'  | |  `--'  | |  |\   | |  '--'  |
 \______| \______/  |__|  |__| | _|       \______/   \______/  |__| \__| |_______/
*/
const supplyComp = async (proxy, cTokenAddr, tokenAddr, amount, from) => {
    await setBalance(tokenAddr, from, amount);
    await approve(tokenAddr, proxy.address);
    if (tokenAddr.toLowerCase() === '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9'.toLowerCase()) {
        // eslint-disable-next-line no-use-before-define
        await sell(
            proxy,
            WETH_ADDRESS,
            tokenAddr,
            hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '15000'), 18),
            UNISWAP_WRAPPER,
            from,
            from,
        );
    }

    const compSupplyAction = new dfs.actions.compound.CompoundSupplyAction(
        cTokenAddr,
        amount,
        from,
        true,
    );

    const functionData = compSupplyAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('CompSupply', functionData, proxy);
    return tx;
};
const withdrawComp = async (proxy, cTokenAddr, amount, to) => {
    const compWithdrawAction = new dfs.actions.compound.CompoundWithdrawAction(
        cTokenAddr,
        amount,
        to,
    );
    const functionData = compWithdrawAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('CompWithdraw', functionData, proxy);
    return tx;
};

const borrowComp = async (proxy, cTokenAddr, amount, to) => {
    const compBorrowAction = new dfs.actions.compound.CompoundBorrowAction(cTokenAddr, amount, to);
    const functionData = compBorrowAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('CompBorrow', functionData, proxy);
    return tx;
};

const paybackComp = async (proxy, cTokenAddr, amount, from) => {
    if (cTokenAddr.toLowerCase() === getAssetInfo('cETH').address.toLowerCase()) {
        const wethBalance = await balanceOf(WETH_ADDRESS, from);
        if (wethBalance.lt(amount)) {
            await depositToWeth(amount.toString());
        }
    }

    await approve(cTokenAddr, proxy.address);

    const compPaybackAction = new dfs.actions.compound.CompoundPaybackAction(
        cTokenAddr,
        amount,
        from,
    );
    const functionData = compPaybackAction.encodeForDsProxyCall()[1];
    const tx = await executeAction('CompPayback', functionData, proxy);
    return tx;
};
const claimComp = async (proxy, cSupplyAddresses, cBorrowAddresses, from, to) => {
    const claimCompAction = new dfs.actions.compound.CompoundClaimAction(
        cSupplyAddresses, cBorrowAddresses, from, to,
    );

    const functionData = claimCompAction.encodeForDsProxyCall()[1];
    const tx = await executeAction('CompClaim', functionData, proxy);
    return tx;
};
/*
  ______   ______   .___  ___. .______     ______    __    __  .__   __.  _______   ___       ___  ____
 /      | /  __  \  |   \/   | |   _  \   /  __  \  |  |  |  | |  \ |  | |       \  \  \     /  / |___ \
|  ,----'|  |  |  | |  \  /  | |  |_)  | |  |  |  | |  |  |  | |   \|  | |  .--.  |  \  \   /  /    __) |
|  |     |  |  |  | |  |\/|  | |   ___/  |  |  |  | |  |  |  | |  . `  | |  |  |  |   \  \ /  /    |__ <
|  `----.|  `--'  | |  |  |  | |  |      |  `--'  | |  `--'  | |  |\   | |  '--'  |    \  V  /     ___) |
 \______| \______/  |__|  |__| | _|       \______/   \______/  |__| \__| |_______/      \___/     |____/
*/
const supplyCompV3 = async (market, proxy, tokenAddr, amount, from, onBehalf, isFork = false, signer) => {
    if (!isFork) {
        await setBalance(tokenAddr, from, amount);
    }
    await approve(tokenAddr, proxy.address, signer);

    const compSupplyAction = new dfs.actions.compoundV3.CompoundV3SupplyAction(
        market,
        tokenAddr,
        amount,
        from,
        onBehalf,
    );

    const functionData = compSupplyAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('CompV3Supply', functionData, proxy);
    return tx;
};

const borrowCompV3 = async (market, proxy, amount, onBehalf, to) => {
    const compBorrowAction = new dfs.actions.compoundV3.CompoundV3BorrowAction(market, amount, to, onBehalf);
    const functionData = compBorrowAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('CompV3Borrow', functionData, proxy);
    return tx;
};

const allowCompV3 = async (market, proxy, manager, isAllowed) => {
    const compAllowAction = new dfs.actions.compoundV3.CompoundV3AllowAction(market, manager, isAllowed);
    const functionData = compAllowAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('CompV3Allow', functionData, proxy);
    return tx;
};

const withdrawCompV3 = async (market, proxy, tokenAddr, amount, onBehalf, to) => {
    const compV3WithdrawAction = new dfs.actions.compoundV3.CompoundV3WithdrawAction(
        market,
        tokenAddr,
        amount,
        to,
        onBehalf,
    );
    const functionData = compV3WithdrawAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('CompV3Withdraw', functionData, proxy);
    return tx;
};

const claimCompV3 = async (market, proxy, src, to, shouldAccrue) => {
    const claimCompV3Action = new dfs.actions.compoundV3.CompoundV3ClaimAction(market, src, to, shouldAccrue);

    const functionData = claimCompV3Action.encodeForDsProxyCall()[1];
    const tx = await executeAction('CompV3Claim', functionData, proxy);
    return tx;
};

const paybackCompV3 = async (market, proxy, amount, from, onBehalf, token) => {
    await approve(USDC_ADDR, proxy.address);
    const paybackCompV3Action = new dfs.actions.compoundV3.CompoundV3PaybackAction(market, amount, from, onBehalf, token);

    const functionData = paybackCompV3Action.encodeForDsProxyCall()[1];
    const tx = await executeAction('CompV3Payback', functionData, proxy);
    return tx;
};

const transferCompV3 = async (market, proxy, from, to, asset, amount) => {
    const transferCompV3Action = new dfs.actions.compoundV3.CompoundV3TransferAction(market, from, to, asset, amount);

    const functionData = transferCompV3Action.encodeForDsProxyCall()[1];
    const tx = await executeAction('CompV3Transfer', functionData, proxy);
    return tx;
};

/*
.___  ___.      ___       __  ___  _______ .______
|   \/   |     /   \     |  |/  / |   ____||   _  \
|  \  /  |    /  ^  \    |  '  /  |  |__   |  |_)  |
|  |\/|  |   /  /_\  \   |    <   |   __|  |      /
|  |  |  |  /  _____  \  |  .  \  |  |____ |  |\  \----.
|__|  |__| /__/     \__\ |__|\__\ |_______|| _| `._____|
*/
const openMcd = async (proxy, joinAddr, mcdManager = MCD_MANAGER_ADDR) => {
    const openMyVault = new dfs.actions.maker.MakerOpenVaultAction(joinAddr, mcdManager);
    const functionData = openMyVault.encodeForDsProxyCall()[1];

    if (mcdManager === MCD_MANAGER_ADDR) {
        await executeAction('McdOpen', functionData, proxy);

        const vaultsAfter = await getVaultsForUser(proxy.address);

        return vaultsAfter.ids[vaultsAfter.ids.length - 1].toString();
    // eslint-disable-next-line no-else-return
    } else {
        let vaultIds = await getCropJoinVaultIds(proxy.address);

        if (vaultIds.length === 0) {
            await executeAction('McdOpen', functionData, proxy);
            vaultIds = await getCropJoinVaultIds(proxy.address);
        }
        return vaultIds[vaultIds.length - 1].toString();
    }
};
const supplyMcd = async (proxy, vaultId, amount, tokenAddr, joinAddr, from, regAddr = REGISTRY_ADDR, mcdManager = MCD_MANAGER_ADDR) => {
    // AAVE & renBTC
    if (
        tokenAddr.toLowerCase() === '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9'.toLowerCase()
    ) {
        await setBalance(WETH_ADDRESS, from, hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '1000000'), 18));
        await sell(
            proxy,
            WETH_ADDRESS,
            tokenAddr,
            hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '1000000'), 18),
            UNISWAP_WRAPPER,
            from,
            from,
        );
    } else if (hre.network.config.type === 'tenderly') {
        await depositToWeth(hre.ethers.utils.parseUnits('30', 18));
        await sell(
            proxy,
            WETH_ADDRESS,
            tokenAddr,
            hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '50000'), 18),
            UNISWAP_WRAPPER,
            from,
            from,
        );
    } else {
        await setBalance(tokenAddr, from, amount);
    }
    await approve(tokenAddr, proxy.address);
    const mcdSupplyAction = new dfs.actions.maker.MakerSupplyAction(
        vaultId,
        amount,
        joinAddr,
        from,
        mcdManager,
    );
    const functionData = mcdSupplyAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('McdSupply', functionData, proxy, regAddr);
    return tx;
};
const generateMcd = async (proxy, vaultId, amount, to, mcdManager = MCD_MANAGER_ADDR) => {
    const mcdGenerateAction = new dfs.actions.maker.MakerGenerateAction(
        vaultId,
        amount,
        to,
        mcdManager,
    );
    const functionData = mcdGenerateAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('McdGenerate', functionData, proxy);
    return tx;
};

const openVault = async (proxy, collType, collAmount, daiAmount) => {
    const ilkObj = ilks.find((i) => i.ilkLabel === collType);

    let asset = ilkObj.asset;
    if (asset === 'ETH') asset = 'WETH';
    const tokenData = getAssetInfo(asset);

    const vaultId = await openMcd(proxy, ilkObj.join);
    const from = proxy.signer.address;
    const to = proxy.signer.address;
    const amountDai = hre.ethers.utils.parseUnits(daiAmount, 18);
    const amountColl = hre.ethers.utils.parseUnits(collAmount, tokenData.decimals);

    const hasMoreDebt = await canGenerateDebt(ilkObj);

    if (!hasMoreDebt) {
        console.log('Cant open a vault not debt ceiling reached');
        return -1;
    }

    await supplyMcd(proxy, vaultId, amountColl, tokenData.address, ilkObj.join, from);
    await generateMcd(proxy, vaultId, amountDai, to);

    return vaultId;
};

const openVaultForExactAmountInDecimals = async (
    makerAddresses, proxy, joinAddr, tokenData, collAmount, daiAmount,
) => {
    const vaultId = await openMcd(proxy, joinAddr);
    const from = proxy.signer.address;
    const to = proxy.signer.address;
    const amountDai = hre.ethers.utils.parseUnits(daiAmount, 18);
    await supplyMcd(proxy, vaultId, collAmount, tokenData.address, joinAddr, from);
    await generateMcd(proxy, vaultId, amountDai, to);

    return vaultId;
};

const withdrawMcd = async (proxy, vaultId, amount, joinAddr, to, regAddr = REGISTRY_ADDR, mcdManager = MCD_MANAGER_ADDR) => {
    const mcdWithdrawAction = new dfs.actions.maker.MakerWithdrawAction(
        vaultId,
        amount,
        joinAddr,
        to,
        mcdManager,
    );
    const functionData = mcdWithdrawAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('McdWithdraw', functionData, proxy, regAddr);
    return tx;
};

const claimMcd = async (proxy, vaultId, joinAddr, to) => {
    const mcdClaimAction = new dfs.actions.maker.MakerClaimAction(
        vaultId,
        joinAddr,
        to,
    );
    const functionData = mcdClaimAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('McdClaim', functionData, proxy);
    return tx;
};

const mcdGive = async (proxy, vaultId, newOwner, createProxy) => {
    const mcdGiveAction = new dfs.actions.maker.MakerGiveAction(
        vaultId, newOwner.address, createProxy, MCD_MANAGER_ADDR,
    );

    const functionData = mcdGiveAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('McdGive', functionData, proxy);
    return tx;
};
const mcdMerge = async (proxy, srcVaultId, destVaultId) => {
    const mcdMergeAction = new dfs.actions.maker.MakerMergeAction(
        srcVaultId, destVaultId, MCD_MANAGER_ADDR,
    );

    const functionData = mcdMergeAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('McdMerge', functionData, proxy);
    return tx;
};

/*
  _______  __    __  .__   __.  __
 /  _____||  |  |  | |  \ |  | |  |
|  |  __  |  |  |  | |   \|  | |  |
|  | |_ | |  |  |  | |  . `  | |  |
|  |__| | |  `--'  | |  |\   | |  |
 \______|  \______/  |__| \__| |__|
*/

const gUniDeposit = async (poolAddr, token0, token1, amount0Max, amount1Max, from, proxy) => {
    const gUniAction = new dfs.actions.guni.GUniDeposit(
        poolAddr,
        token0,
        token1,
        amount0Max,
        amount1Max,
        0,
        0,
        from,
        from,
    );

    const functionData = gUniAction.encodeForDsProxyCall()[1];
    const tx = await executeAction('GUniDeposit', functionData, proxy);
    return tx;
};

const gUniWithdraw = async (poolAddr, burnAmount, from, proxy) => {
    const gUniAction = new dfs.actions.guni.GUniWithdraw(poolAddr, burnAmount, 0, 0, from, from);

    const functionData = gUniAction.encodeForDsProxyCall()[1];
    const tx = await executeAction('GUniWithdraw', functionData, proxy);
    return tx;
};

/*
 __    __  .__   __.  __       _______.____    __    ____  ___      .______
|  |  |  | |  \ |  | |  |     /       |\   \  /  \  /   / /   \     |   _  \
|  |  |  | |   \|  | |  |    |   (----` \   \/    \/   / /  ^  \    |  |_)  |
|  |  |  | |  . `  | |  |     \   \      \            / /  /_\  \   |   ___/
|  `--'  | |  |\   | |  | .----)   |      \    /\    / /  _____  \  |  |
 \______/  |__| \__| |__| |_______/        \__/  \__/ /__/     \__\ | _|
*/
const uniSupply = async (proxy, addrTokenA, tokenADecimals, addrTokenB, amount, from, to) => {
    const amountA = hre.ethers.utils.parseUnits(amount, tokenADecimals);
    const amountB = await getSecondTokenAmount(addrTokenA, addrTokenB, amountA);

    const amountAMin = amountA.div('2');
    const amountBMin = amountB.div('2');

    // buy tokens
    const tokenBalanceA = await balanceOf(addrTokenA, from);
    const tokenBalanceB = await balanceOf(addrTokenB, from);

    if (tokenBalanceA.lt(amountA)) {
        setBalance(addrTokenA, from, amountA);
    }

    if (tokenBalanceB.lt(amountB)) {
        setBalance(addrTokenB, from, amountB);
    }
    const deadline = Date.now() + Date.now();

    const uniObj = [
        addrTokenA,
        addrTokenB,
        from,
        to,
        amountA,
        amountB,
        amountAMin,
        amountBMin,
        deadline,
    ];

    const uniSupplyAction = new dfs.actions.uniswap.UniswapSupplyAction(...uniObj);

    await approve(addrTokenA, proxy.address);
    await approve(addrTokenB, proxy.address);

    const functionData = uniSupplyAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('UniSupply', functionData, proxy);
    return tx;
};

const uniWithdraw = async (proxy, addrTokenA, addrTokenB, lpAddr, liquidity, to, from) => {
    const amountAMin = 0;
    const amountBMin = 0;
    const deadline = Date.now() + Date.now();

    await approve(lpAddr, proxy.address);

    const uniObj = [addrTokenA, addrTokenB, liquidity, to, from, amountAMin, amountBMin, deadline];

    const uniWithdrawAction = new dfs.actions.uniswap.UniswapWithdrawAction(...uniObj);

    const functionData = uniWithdrawAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('UniWithdraw', functionData, proxy);
    return tx;
};

const uniV3CreatePool = async (
    proxy,
    token0,
    token1,
    fee,
    tickLower,
    tickUpper,
    amount0Desired,
    amount1Desired,
    recipient,
    from,
    sqrtPriceX96,
) => {
    const amount0Min = 0;
    const amount1Min = 0;
    // buy tokens
    const wethBalance = await balanceOf(WETH_ADDRESS, from);

    const wethAmountToDeposit = hre.ethers.utils.parseUnits('20', 18);

    if (wethBalance.lt(wethAmountToDeposit)) {
        await depositToWeth(wethAmountToDeposit);
    }
    const tokenBalance0 = await balanceOf(token0, from);
    const tokenBalance1 = await balanceOf(token1, from);
    if (tokenBalance0.lt(amount0Desired)) {
        await sell(
            proxy,
            WETH_ADDRESS,
            token0,
            wethAmountToDeposit.div(2),
            UNISWAP_WRAPPER,
            from,
            from,
        );
    }

    if (tokenBalance1.lt(amount1Desired)) {
        await sell(
            proxy,
            WETH_ADDRESS,
            token1,
            wethAmountToDeposit.div(2),
            UNISWAP_WRAPPER,
            from,
            from,
        );
    }
    const deadline = Date.now() + Date.now();
    const uniCreatePoolAction = new dfs.actions.uniswapV3.UniswapV3CreatePoolAction(
        token0,
        token1,
        fee,
        tickLower,
        tickUpper,
        amount0Desired,
        amount1Desired,
        amount0Min,
        amount1Min,
        recipient,
        deadline,
        from,
        sqrtPriceX96,
    );
    await approve(token0, proxy.address);
    await approve(token1, proxy.address);

    const functionData = uniCreatePoolAction.encodeForDsProxyCall()[1];
    const tx = await executeAction('UniCreatePoolV3', functionData, proxy);
    return tx;
};

const uniV3Mint = async (
    proxy,
    token0,
    token1,
    fee,
    tickLower,
    tickUpper,
    amount0Desired,
    amount1Desired,
    recipient,
    from,
) => {
    const amount0Min = 0;
    const amount1Min = 0;
    // buy tokens
    const wethBalance = await balanceOf(WETH_ADDRESS, from);

    const wethAmountToDeposit = hre.ethers.utils.parseUnits('20', 18);

    if (wethBalance.lt(wethAmountToDeposit)) {
        await depositToWeth(wethAmountToDeposit);
    }
    const tokenBalance0 = await balanceOf(token0, from);
    const tokenBalance1 = await balanceOf(token1, from);
    if (tokenBalance0.lt(amount0Desired)) {
        await sell(
            proxy,
            WETH_ADDRESS,
            token0,
            wethAmountToDeposit.div(2),
            UNISWAP_WRAPPER,
            from,
            from,
        );
    }
    if (tokenBalance1.lt(amount1Desired)) {
        await sell(
            proxy,
            WETH_ADDRESS,
            token1,
            wethAmountToDeposit.div(2),
            UNISWAP_WRAPPER,
            from,
            from,
        );
    }
    const deadline = Date.now() + Date.now();
    const uniMintV3Action = new dfs.actions.uniswapV3.UniswapV3MintAction(
        token0,
        token1,
        fee,
        tickLower,
        tickUpper,
        amount0Desired,
        amount1Desired,
        amount0Min,
        amount1Min,
        recipient,
        deadline,
        from,
    );
    await approve(token0, proxy.address);
    await approve(token1, proxy.address);

    const functionData = uniMintV3Action.encodeForDsProxyCall()[1];

    const tx = await executeAction('UniMintV3', functionData, proxy);
    return tx;
};

const uniV3Supply = async (
    proxy,
    tokenId,
    amount0Desired,
    amount1Desired,
    from,
    token0,
    token1,
) => {
    const amount0Min = 0;
    const amount1Min = 0;

    const wethAmountToDeposit = hre.ethers.utils.parseUnits('20', 18);

    const wethBalance = await balanceOf(WETH_ADDRESS, from);
    if (wethBalance.lt(wethAmountToDeposit)) {
        await depositToWeth(wethAmountToDeposit);
    }

    const tokenBalance0 = await balanceOf(token0, from);
    const tokenBalance1 = await balanceOf(token1, from);

    // buy tokens
    if (tokenBalance0.lt(amount0Desired)) {
        await sell(
            proxy,
            WETH_ADDRESS,
            token0,
            wethAmountToDeposit.div(2),
            UNISWAP_WRAPPER,
            from,
            from,
        );
    }

    if (tokenBalance1.lt(amount1Desired)) {
        await sell(
            proxy,
            WETH_ADDRESS,
            token1,
            wethAmountToDeposit.div(2),
            UNISWAP_WRAPPER,
            from,
            from,
        );
    }
    const deadline = Date.now() + Date.now();

    const uniSupplyV3Action = new dfs.actions.uniswapV3.UniswapV3SupplyAction(
        tokenId,
        amount0Desired,
        amount1Desired,
        amount0Min,
        amount1Min,
        deadline,
        from,
        token0,
        token1,
    );
    await approve(token0, proxy.address);
    await approve(token1, proxy.address);

    const functionData = uniSupplyV3Action.encodeForDsProxyCall()[1];
    const tx = await executeAction('UniSupplyV3', functionData, proxy);
    return tx;
};

const uniV3Withdraw = async (proxy, tokenId, liquidity, recipient) => {
    const deadline = Date.now() + Date.now();
    const uniWithdrawV3Action = new dfs.actions.uniswapV3.UniswapV3WithdrawAction(
        tokenId,
        liquidity,
        0,
        0,
        deadline,
        recipient,
        MAX_UINT128,
        MAX_UINT128,
        recipient,
    );
    const functionData = uniWithdrawV3Action.encodeForDsProxyCall()[1];
    const tx = await executeAction('UniWithdrawV3', functionData, proxy);
    return tx;
};
const uniV3Collect = async (proxy, tokenId, recipient, amount0Max, amount1Max) => {
    const uniCollectV3Action = new dfs.actions.uniswapV3.UniswapV3CollectAction(
        tokenId,
        recipient,
        amount0Max,
        amount1Max,
        recipient,
    );
    const functionData = uniCollectV3Action.encodeForDsProxyCall()[1];

    const tx = await executeAction('UniCollectV3', functionData, proxy);
    return tx;
};
/*
____    ____  _______     ___      .______      .__   __.
\   \  /   / |   ____|   /   \     |   _  \     |  \ |  |
 \   \/   /  |  |__     /  ^  \    |  |_)  |    |   \|  |
  \_    _/   |   __|   /  /_\  \   |      /     |  . `  |
    |  |     |  |____ /  _____  \  |  |\  \----.|  |\   |
    |__|     |_______/__/     \__\ | _| `._____||__| \__|
*/
const yearnSupply = async (token, amount, from, to, proxy) => {
    const yearnSupplyAction = new dfs.actions.yearn.YearnSupplyAction(token, amount, from, to);
    const functionData = yearnSupplyAction.encodeForDsProxyCall()[1];
    const tx = await executeAction('YearnSupply', functionData, proxy);
    return tx;
};
const yearnWithdraw = async (token, amount, from, to, proxy) => {
    const yearnWithdrawAction = new dfs.actions.yearn.YearnWithdrawAction(token, amount, from, to);
    const functionData = yearnWithdrawAction.encodeForDsProxyCall()[1];
    const tx = await executeAction('YearnWithdraw', functionData, proxy);
    return tx;
};
/*
*
*
*
*
*/
const liquityOpen = async (proxy, maxFeePercentage, collAmount, LUSDAmount, from, to) => {
    const { upperHint, lowerHint } = await getHints(
        proxy.address,
        LiquityActionIds.Open,
        from,
        collAmount,
        LUSDAmount,
    );

    const liquityOpenAction = new dfs.actions.liquity.LiquityOpenAction(
        maxFeePercentage,
        collAmount,
        LUSDAmount,
        from,
        to,
        upperHint,
        lowerHint,
    );

    const functionData = liquityOpenAction.encodeForDsProxyCall()[1];
    const tx = await executeAction('LiquityOpen', functionData, proxy);
    return tx;
};

const liquityBorrow = async (proxy, maxFeePercentage, LUSDAmount, to) => {
    const { upperHint, lowerHint } = await getHints(
        proxy.address,
        LiquityActionIds.Borrow,
        hre.ethers.constants.AddressZero,
        0,
        LUSDAmount,
    );

    const liquityBorrowAction = new dfs.actions.liquity.LiquityBorrowAction(
        maxFeePercentage,
        LUSDAmount,
        to,
        upperHint,
        lowerHint,
    );

    const functionData = liquityBorrowAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('LiquityBorrow', functionData, proxy);
    return tx;
};

const liquityPayback = async (proxy, LUSDAmount, from) => {
    const { upperHint, lowerHint } = await getHints(
        proxy.address,
        LiquityActionIds.Payback,
        from,
        0,
        LUSDAmount,
    );

    const liquityPaybackAction = new dfs.actions.liquity.LiquityPaybackAction(
        LUSDAmount,
        from,
        upperHint,
        lowerHint,
    );

    const functionData = liquityPaybackAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('LiquityPayback', functionData, proxy);
    return tx;
};

const liquitySupply = async (proxy, collAmount, from) => {
    const { upperHint, lowerHint } = await getHints(
        proxy.address,
        LiquityActionIds.Supply,
        from,
        collAmount,
        0,
    );

    const liquitySupplyAction = new dfs.actions.liquity.LiquitySupplyAction(
        collAmount,
        from,
        upperHint,
        lowerHint,
    );

    const functionData = liquitySupplyAction.encodeForDsProxyCall()[1];
    const tx = await executeAction('LiquitySupply', functionData, proxy);
    return tx;
};

const liquityWithdraw = async (proxy, collAmount, to) => {
    const { upperHint, lowerHint } = await getHints(
        proxy.address,
        LiquityActionIds.Withdraw,
        hre.ethers.constants.AddressZero,
        collAmount,
        0,
    );

    const liquityWithdrawAction = new dfs.actions.liquity.LiquityWithdrawAction(
        collAmount,
        to,
        upperHint,
        lowerHint,
    );

    const functionData = liquityWithdrawAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('LiquityWithdraw', functionData, proxy);
    return tx;
};

const liquityClose = async (proxy, from, to) => {
    const LiquityCloseAction = new dfs.actions.liquity.LiquityCloseAction(from, to);

    const functionData = LiquityCloseAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('LiquityClose', functionData, proxy);
    return tx;
};

const liquityRedeem = async (proxy, lusdAmount, from, to, maxFeePercentage) => {
    const {
        firstRedemptionHint,
        partialRedemptionHintNICR,
        truncatedLUSDamount,
        upperHint,
        lowerHint,
    } = await getRedemptionHints(lusdAmount, from);

    const liquityRedeemAction = new dfs.actions.liquity.LiquityRedeemAction(
        truncatedLUSDamount,
        from,
        to,
        firstRedemptionHint,
        upperHint,
        lowerHint,
        partialRedemptionHintNICR,
        0,
        maxFeePercentage,
    );

    const functionData = liquityRedeemAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('LiquityRedeem', functionData, proxy);
    return tx;
};

const liquityStake = async (proxy, lqtyAmount, from, wethTo, lusdTo) => {
    const LiquityStakeAction = new dfs.actions.liquity.LiquityStakeAction(
        lqtyAmount,
        from,
        wethTo,
        lusdTo,
    );

    const functionData = LiquityStakeAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('LiquityStake', functionData, proxy);
    return tx;
};

const liquityUnstake = async (proxy, lqtyAmount, to, wethTo, lusdTo) => {
    const LiquityUnstakeAction = new dfs.actions.liquity.LiquityUnstakeAction(
        lqtyAmount,
        to,
        wethTo,
        lusdTo,
    );

    const functionData = LiquityUnstakeAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('LiquityUnstake', functionData, proxy);
    return tx;
};

const liquitySPDeposit = async (proxy, LUSDAmount, from, wethTo, lqtyTo) => {
    const liquitySPDepositAction = new dfs.actions.liquity.LiquitySPDepositAction(
        LUSDAmount,
        from,
        wethTo,
        lqtyTo,
    );

    const functionData = liquitySPDepositAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('LiquitySPDeposit', functionData, proxy);
    return tx;
};

const liquitySPWithdraw = async (proxy, LUSDAmount, to, wethTo, lqtyTo) => {
    const liquitySPWithdrawAction = new dfs.actions.liquity.LiquitySPWithdrawAction(
        LUSDAmount,
        to,
        wethTo,
        lqtyTo,
    );

    const functionData = liquitySPWithdrawAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('LiquitySPWithdraw', functionData, proxy);
    return tx;
};

const liquityEthGainToTrove = async (proxy, lqtyTo) => {
    const liquityViewAddr = await getAddrFromRegistry('LiquityView');
    const liquityView = await hre.ethers.getContractAt('LiquityView', liquityViewAddr);

    const { ethGain } = await liquityView['getDepositorInfo(address)'](proxy.address);
    const { upperHint, lowerHint } = await getHints(
        proxy.address,
        LiquityActionIds.Supply,
        '0x0000000000000000000000000000000000000000',
        ethGain,
        0,
    );

    const liquityEthGainToTroveAction = new dfs.actions.liquity.LiquityEthGainToTroveAction(
        lqtyTo,
        upperHint,
        lowerHint,
    );

    const functionData = liquityEthGainToTroveAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('LiquityEthGainToTrove', functionData, proxy);
    return tx;
};

/*
 _____ _     _      _               ______                 _
/  __ \ |   (_)    | |              | ___ \               | |
| /  \/ |__  _  ___| | _____ _ __   | |_/ / ___  _ __   __| |___
| |   | '_ \| |/ __| |/ / _ \ '_ \  | ___ \/ _ \| '_ \ / _` / __|
| \__/\ | | | | (__|   <  __/ | | | | |_/ / (_) | | | | (_| \__ \
 \____/_| |_|_|\___|_|\_\___|_| |_| \____/ \___/|_| |_|\__,_|___/

 */

const createChickenBond = async (proxy, lusdAmount, from) => {
    await approve(LUSD_ADDR, proxy.address);

    const createCBAction = new dfs.actions.chickenBonds.CBCreateAction(
        lusdAmount,
        from,
    );

    const functionData = createCBAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('CBCreate', functionData, proxy);
    return tx;
};

const chickenOut = async (proxy, bondID, minAmount, to) => {
    const chickenOutAction = new dfs.actions.chickenBonds.CBChickenOutAction(
        bondID,
        minAmount,
        to,
    );

    const functionData = chickenOutAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('CBChickenOut', functionData, proxy);
    return tx;
};

const chickenIn = async (proxy, bondID, to) => {
    const chickenInAction = new dfs.actions.chickenBonds.CBChickenInAction(
        bondID,
        to,
    );

    const functionData = chickenInAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('CBChickenIn', functionData, proxy);
    return tx;
};

const chickenRedeem = async (proxy, bLUSDAmount, minLUSDFromSP, from, to) => {
    await approve(BLUSD_ADDR, proxy.address);

    const cbRedeemAction = new dfs.actions.chickenBonds.CBRedeemAction(
        bLUSDAmount,
        minLUSDFromSP,
        from,
        to,
    );

    const functionData = cbRedeemAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('CBRedeem', functionData, proxy);
    return tx;
};

const transferNFT = async (proxy, nftAddr, tokenId, from, to) => {
    const createCBAction = new dfs.actions.basic.TransferNFTAction(
        nftAddr,
        from,
        to,
        tokenId,
    );

    const functionData = createCBAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('TransferNFT', functionData, proxy);
    return tx;
};

const dydxSupply = async (proxy, tokenAddr, amount, from) => {
    await approve(tokenAddr, proxy.address);

    const dydxSupplyAction = new dfs.actions.dydx.DyDxSupplyAction(tokenAddr, amount, from);
    const functionData = dydxSupplyAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('DyDxSupply', functionData, proxy);
    return tx;
};

const dydxWithdraw = async (proxy, tokenAddr, amount, to) => {
    const dydxWithdrawAction = new dfs.actions.dydx.DyDxWithdrawAction(tokenAddr, amount, to);
    const functionData = dydxWithdrawAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('DyDxWithdraw', functionData, proxy);
    return tx;
};

const buyTokenIfNeeded = async (
    tokenAddr,
    senderAcc,
    proxy,
    standardAmount,
    wrapper = UNISWAP_WRAPPER,
) => {
    const tokenBalance = await balanceOf(tokenAddr, senderAcc.address);
    if (tokenBalance.lt(standardAmount)) {
        if (isEth(tokenAddr)) {
            await depositToWeth(standardAmount.toString());
        } else {
            await sell(
                proxy,
                WETH_ADDRESS,
                tokenAddr,
                hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '55000'), 18),
                wrapper,
                senderAcc.address,
                senderAcc.address,
            );
        }
    }
};

const lidoStake = async (amount, from, to, proxy) => {
    const lidoStakeAction = new dfs.actions.lido.LidoStakeAction(amount, from, to);
    const functionData = lidoStakeAction.encodeForDsProxyCall()[1];
    const tx = await executeAction('LidoStake', functionData, proxy);
    return tx;
};
const lidoUnwrap = async (amount, from, to, proxy) => {
    const lidoUnwrapAction = new dfs.actions.lido.LidoUnwrapAction(amount, from, to);
    const functionData = lidoUnwrapAction.encodeForDsProxyCall()[1];
    const tx = await executeAction('LidoUnwrap', functionData, proxy);
    return tx;
};

const lidoWrap = async (amount, from, to, useEth, proxy) => {
    const lidoWrapAction = new dfs.actions.lido.LidoWrapAction(amount, from, to, useEth);
    const functionData = lidoWrapAction.encodeForDsProxyCall()[1];
    const tx = await executeAction('LidoWrap', functionData, proxy);
    return tx;
};

const reflexerSaviourDeposit = async (proxy, from, safeId, lpTokenAmount) => {
    // eslint-disable-next-line max-len
    const reflexerSaviourDepositAction = new dfs.actions.reflexer.ReflexerNativeUniV2SaviourDepositAction(
        from,
        safeId,
        lpTokenAmount,
    );
    const functionData = reflexerSaviourDepositAction.encodeForDsProxyCall()[1];
    const tx = await executeAction('ReflexerNativeUniV2SaviourDeposit', functionData, proxy);
    return tx;
};

const reflexerSaviourWithdraw = async (proxy, to, safeId, lpTokenAmount) => {
    // eslint-disable-next-line max-len
    const reflexerSaviourWithdrawAction = new dfs.actions.reflexer.ReflexerNativeUniV2SaviourWithdrawAction(
        to,
        safeId,
        lpTokenAmount,
    );
    const functionData = reflexerSaviourWithdrawAction.encodeForDsProxyCall()[1];
    const tx = await executeAction('ReflexerNativeUniV2SaviourWithdraw', functionData, proxy);
    return tx;
};

const pullTokensInstDSA = async (proxy, dsaAddress, tokens, amounts, to) => {
    const instPullTokenAction = new dfs.actions.insta.InstPullTokensAction(
        dsaAddress,
        tokens,
        amounts,
        to,
    );
    const functionData = instPullTokenAction.encodeForDsProxyCall()[1];
    const tx = await executeAction('InstPullTokens', functionData, proxy);
    return tx;
};

const changeProxyOwner = async (proxy, newOwner) => {
    const changeProxyOwnerAction = new dfs.actions.basic.ChangeProxyOwnerAction(newOwner);
    const functionData = changeProxyOwnerAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('ChangeProxyOwner', functionData, proxy);
    return tx;
};

const curveDeposit = async (
    proxy,
    sender,
    receiver,
    poolAddr,
    minMintAmount,
    useUnderlying,
    amounts,
) => {
    const curveDepositAction = new dfs.actions.curve.CurveDepositAction(
        sender,
        receiver,
        poolAddr,
        minMintAmount,
        useUnderlying,
        amounts,
    );

    const functionData = curveDepositAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('CurveDeposit', functionData, proxy);
    return tx;
};

const curveWithdraw = async (
    proxy,
    sender,
    receiver,
    poolAddr,
    minMintAmount,
    useUnderlying,
    withdrawExact,
    amounts,
) => {
    const curveWithdrawAction = new dfs.actions.curve.CurveWithdrawAction(
        sender,
        receiver,
        poolAddr,
        minMintAmount,
        useUnderlying,
        withdrawExact,
        amounts,
    );

    const functionData = curveWithdrawAction.encodeForDsProxyCall()[1];
    const tx = await executeAction('CurveWithdraw', functionData, proxy);
    return tx;
};

const curveGaugeDeposit = async (proxy, gaugeAddr, lpToken, sender, onBehalfOf, amount) => {
    const curveGaugeDepositAction = new dfs.actions.curve.CurveGaugeDepositAction(
        gaugeAddr,
        lpToken,
        sender,
        onBehalfOf,
        amount,
    );

    const functionData = curveGaugeDepositAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('CurveGaugeDeposit', functionData, proxy);
    return tx;
};

const curveGaugeWithdraw = async (proxy, gaugeAddr, lpToken, receiver, amount) => {
    const curveGaugeWithdrawAction = new dfs.actions.curve.CurveGaugeWithdrawAction(
        gaugeAddr,
        lpToken,
        receiver,
        amount,
    );

    const functionData = curveGaugeWithdrawAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('CurveGaugeWithdraw', functionData, proxy);
    return tx;
};

const curveMintCrv = async (proxy, gaugeAddrs, receiver) => {
    const curveMintCrvAction = new dfs.actions.curve.CurveMintCrvAction(gaugeAddrs, receiver);

    const functionData = curveMintCrvAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('CurveMintCrv', functionData, proxy);
    return tx;
};

const curveClaimFees = async (proxy, claimFor, receiver) => {
    const curveClaimFeesAction = new dfs.actions.curve.CurveClaimFeesAction(claimFor, receiver);

    const functionData = curveClaimFeesAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('CurveClaimFees', functionData, proxy);
    return tx;
};

const curveStethPoolDeposit = async (
    proxy,
    from,
    to,
    amounts,
    minMintAmount,
) => {
    const curveStethPoolDepositAction = new dfs.actions.curve.CurveStethPoolDepositAction(
        from,
        to,
        amounts,
        minMintAmount,
    );

    const functionData = curveStethPoolDepositAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('CurveStethPoolDeposit', functionData, proxy);
    const receipt = await tx.wait();
    console.log(`Gas used: ${receipt.gasUsed}`);
    return tx;
};

const curveStethPoolWithdraw = async (
    proxy,
    from,
    to,
    amounts,
    minBurnAmount,
    returnValue,
) => {
    const curveStethPoolWithdrawAction = new dfs.actions.curve.CurveStethPoolWithdrawAction(
        from,
        to,
        amounts,
        minBurnAmount,
        returnValue,
    );

    const functionData = curveStethPoolWithdrawAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('CurveStethPoolWithdraw', functionData, proxy);
    const receipt = await tx.wait();
    console.log(`Gas used: ${receipt.gasUsed}`);
    return tx;
};

const automationV2Unsub = async (proxy, protocol, cdpId = 0) => {
    const automationV2UnsubAction = new dfs.actions.basic.AutomationV2Unsub(protocol, cdpId);

    const functionData = automationV2UnsubAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('AutomationV2Unsub', functionData, proxy);
    return tx;
};

const mStableDeposit = async (
    proxy,
    bAsset,
    mAsset,
    saveAddress,
    vaultAddress,
    from,
    to,
    amount,
    minOut,
    assetPair,
) => {
    const mStableAction = new dfs.actions.mstable.MStableDepositAction(
        bAsset,
        mAsset,
        saveAddress,
        vaultAddress,
        from,
        to,
        amount,
        minOut,
        assetPair,
    );

    const functionData = mStableAction.encodeForDsProxyCall()[1];
    const tx = await executeAction('MStableDeposit', functionData, proxy);
    return tx;
};

const mStableWithdraw = async (
    proxy,
    bAsset,
    mAsset,
    saveAddress,
    vaultAddress,
    from,
    to,
    amount,
    minOut,
    assetPair,
) => {
    const mStableAction = new dfs.actions.mstable.MStableWithdrawAction(
        bAsset,
        mAsset,
        saveAddress,
        vaultAddress,
        from,
        to,
        amount,
        minOut,
        assetPair,
    );

    const functionData = mStableAction.encodeForDsProxyCall()[1];
    const tx = await executeAction('MStableWithdraw', functionData, proxy);
    return tx;
};

const mStableClaim = async (proxy, vaultAddress, to, first, last) => {
    const mStableAction = new dfs.actions.mstable.MStableClaimAction(vaultAddress, to, first, last);

    const functionData = mStableAction.encodeForDsProxyCall()[1];
    const tx = await executeAction('MStableClaim', functionData, proxy);
    return tx;
};

const rariDeposit = async (fundManager, token, poolToken, amount, from, to, proxy) => {
    const rariDepositAction = new dfs.actions.rari.RariDepositAction(
        fundManager,
        token,
        poolToken,
        amount,
        from,
        to,
    );

    const functionData = rariDepositAction.encodeForDsProxyCall()[1];
    const tx = await executeAction('RariDeposit', functionData, proxy);
    return tx;
};

const rariWithdraw = async (
    fundManager,
    poolTokenAddress,
    poolTokensAmountToPull,
    from,
    stablecoinAddress,
    stablecoinAmountToWithdraw,
    to,
    proxy,
) => {
    const rariWithdrawAction = new dfs.actions.rari.RariWithdrawAction(
        fundManager,
        poolTokenAddress,
        poolTokensAmountToPull,
        from,
        stablecoinAddress,
        stablecoinAmountToWithdraw,
        to,
    );

    const functionData = rariWithdrawAction.encodeForDsProxyCall()[1];
    const tx = await executeAction('RariWithdraw', functionData, proxy);
    return tx;
};
const qiDaoOpen = async (
    proxy,
    vaultId,
) => {
    dfs.configure({
        chainId: 10,
    });
    const qidaoOpenAction = new dfs.actions.qidao.QiDaoOpenVaultAction(
        vaultId,
    );
    const functionData = qidaoOpenAction.encodeForDsProxyCall()[1];
    const tx = await executeAction('QiDaoOpen', functionData, proxy);
    return tx;
};
const qiDaoSupply = async (
    proxy,
    vaultId,
    userVaultId,
    tokenAddress,
    amount,
    from,
) => {
    dfs.configure({
        chainId: 10,
    });
    const qiDaoSupplyAction = new dfs.actions.qidao.QiDaoSupplyAction(
        vaultId,
        userVaultId,
        amount,
        from,
        tokenAddress,
    );
    const functionData = qiDaoSupplyAction.encodeForDsProxyCall()[1];
    const tx = await executeAction('QiDaoSupply', functionData, proxy);
    return tx;
};
const qiDaoWithdraw = async (
    proxy,
    vaultId,
    userVaultid,
    amount,
    to,
) => {
    dfs.configure({
        chainId: 10,
    });
    const qiDaoWithdrawAction = new dfs.actions.qidao.QiDaoWithdrawAction(
        vaultId,
        userVaultid,
        amount,
        to,
    );
    const functionData = qiDaoWithdrawAction.encodeForDsProxyCall()[1];
    const tx = await executeAction('QiDaoWithdraw', functionData, proxy);
    return tx;
};

const qiDaoGenerate = async (
    proxy,
    vaultId,
    userVaultId,
    amount,
    to,
) => {
    dfs.configure({
        chainId: 10,
    });
    const qiDaoGenerateAction = new dfs.actions.qidao.QiDaoGenerateAction(
        vaultId,
        userVaultId,
        amount,
        to,
    );
    const functionData = qiDaoGenerateAction.encodeForDsProxyCall()[1];
    const tx = await executeAction('QiDaoGenerate', functionData, proxy);
    return tx;
};
const qiDaoPayback = async (
    proxy,
    vaultId,
    userVaultId,
    amount,
    from,
) => {
    dfs.configure({
        chainId: 10,
    });
    const qiDaoGenerateAction = new dfs.actions.qidao.QiDaoPaybackAction(
        vaultId,
        userVaultId,
        amount,
        from,
    );
    const functionData = qiDaoGenerateAction.encodeForDsProxyCall()[1];
    const tx = await executeAction('QiDaoPayback', functionData, proxy);
    return tx;
};

const convexDeposit = async (
    proxy,
    from,
    to,
    curveLp,
    amount,
    option,
) => {
    const action = new dfs.actions.convex.ConvexDepositAction(
        from,
        to,
        curveLp,
        amount,
        option,
    );

    const assets = await action.getAssetsToApprove();
    await Promise.all(
        assets.map(
            (e) => approve(e.asset, proxy.address),
        ),
    );

    const functionData = action.encodeForDsProxyCall()[1];
    return executeAction('ConvexDeposit', functionData, proxy);
};

const convexWithdraw = async (
    proxy,
    from,
    to,
    curveLp,
    amount,
    option,
) => {
    const action = new dfs.actions.convex.ConvexWithdrawAction(
        from,
        to,
        curveLp,
        amount,
        option,
    );

    const assets = await action.getAssetsToApprove();
    await Promise.all(
        assets.map(
            (e) => approve(e.asset, proxy.address),
        ),
    );

    const functionData = action.encodeForDsProxyCall()[1];
    return executeAction('ConvexWithdraw', functionData, proxy);
};

const convexClaim = async (
    proxy,
    from,
    to,
    curveLp,
) => {
    const action = new dfs.actions.convex.ConvexClaimAction(
        from,
        to,
        curveLp,
    );

    const assets = await action.getAssetsToApprove();
    await Promise.all(
        assets.map(
            (e) => approve(e.asset, proxy.address),
        ),
    );

    const functionData = action.encodeForDsProxyCall()[1];
    return executeAction('ConvexClaim', functionData, proxy);
};

const aaveV3Supply = async (
    proxy, market, amount, tokenAddr, assetId, from, signer,
) => {
    const aaveSupplyAddr = await getAddrFromRegistry('AaveV3Supply');

    const aaveSupplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
        amount.toString(), from, tokenAddr, assetId, true, true, false, nullAddress, nullAddress,
    );

    await approve(tokenAddr, proxy.address, signer);
    const functionData = aaveSupplyAction.encodeForDsProxyCall()[1];

    console.log('call supply');

    const receipt = await proxy['execute(address,bytes)'](aaveSupplyAddr, functionData, { gasLimit: 3000000 });

    const gasUsed = await getGasUsed(receipt);
    console.log(`GasUsed aaveV3Supply: ${gasUsed}`);
    return receipt;
};
const aaveV3SupplyCalldataOptimised = async (
    proxy, market, amount, tokenAddr, assetId, from,
) => {
    console.log(from);
    const aaveSupplyAddr = await getAddrFromRegistry('AaveV3Supply');
    let contract = await hre.ethers.getContractAt('AaveV3Supply', aaveSupplyAddr);
    const signer = (await hre.ethers.getSigners())[0];
    contract = await contract.connect(signer);
    const encodedInput = await contract.encodeInputs(
        [amount, from, assetId, true, true, false, nullAddress, nullAddress],
    );

    const aaveSupplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
        amount.toString(), from, tokenAddr, assetId, true, true, false, nullAddress, nullAddress,
    );

    const functionData = aaveSupplyAction.encodeForDsProxyCall()[1];
    console.log(functionData.toLowerCase() === encodedInput);

    await approve(tokenAddr, proxy.address);

    const receipt = await proxy['execute(address,bytes)'](aaveSupplyAddr, encodedInput, { gasLimit: 3000000 });

    const gasUsed = await getGasUsed(receipt);
    console.log(`GasUsed aaveV3SupplyCalldataOptimised: ${gasUsed}`);
    return receipt;
};
const aaveV3Withdraw = async (
    proxy, market, assetId, amount, to,
) => {
    const aaveWithdrawAddr = await getAddrFromRegistry('AaveV3Withdraw');

    const aaveWithdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        assetId, true, amount.toString(), to, nullAddress,
    );
    const functionData = aaveWithdrawAction.encodeForDsProxyCall()[1];
    const receipt = await proxy['execute(address,bytes)'](aaveWithdrawAddr, functionData, { gasLimit: 3000000 });

    const gasUsed = await getGasUsed(receipt);
    console.log(`GasUsed aaveV3Withdraw: ${gasUsed}`);
    return receipt;
};
const aaveV3WithdrawCalldataOptimised = async (
    proxy, market, assetId, amount, to,
) => {
    const aaveWithdrawAddr = await getAddrFromRegistry('AaveV3Withdraw');
    let contract = await hre.ethers.getContractAt('AaveV3Withdraw', aaveWithdrawAddr);
    const signer = (await hre.ethers.getSigners())[0];
    contract = await contract.connect(signer);

    const encodedInput = await contract.encodeInputs(
        [assetId, true, amount, to, nullAddress],
    );

    const aaveWithdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        assetId, true, amount.toString(), to, nullAddress,
    );
    const functionData = aaveWithdrawAction.encodeForDsProxyCall()[1];
    console.log(functionData.toLowerCase() === encodedInput);

    const receipt = await proxy['execute(address,bytes)'](aaveWithdrawAddr, encodedInput, { gasLimit: 3000000 });

    const gasUsed = await getGasUsed(receipt);
    console.log(`GasUsed aaveV3WithdrawCalldataOptimised: ${gasUsed}`);
    return receipt;
};
const aaveV3Borrow = async (
    proxy, market, amount, to, rateMode, assetId,
) => {
    const aaveBorrowAddr = await getAddrFromRegistry('AaveV3Borrow');

    const aaveBorrowAction = new dfs.actions.aaveV3.AaveV3BorrowAction(
        true, nullAddress, amount.toString(), to, rateMode, assetId, true, nullAddress,
    );
    const functionData = aaveBorrowAction.encodeForDsProxyCall()[1];
    const receipt = await proxy['execute(address,bytes)'](aaveBorrowAddr, functionData, { gasLimit: 3000000 });

    const gasUsed = await getGasUsed(receipt);
    console.log(`GasUsed aaveV3Borrow: ${gasUsed}`);
    return receipt;
};
const aaveV3BorrowCalldataOptimised = async (
    proxy, market, amount, to, rateMode, assetId,
) => {
    const aaveBorrowAddr = await getAddrFromRegistry('AaveV3Borrow');
    let contract = await hre.ethers.getContractAt('AaveV3Borrow', aaveBorrowAddr);
    const signer = (await hre.ethers.getSigners())[0];
    contract = await contract.connect(signer);

    const encodedInput = await contract.encodeInputs(
        [amount, to, rateMode, assetId, true, true, nullAddress, nullAddress],
    );
    const aaveBorrowAction = new dfs.actions.aaveV3.AaveV3BorrowAction(
        true, nullAddress, amount.toString(), to, rateMode, assetId, true, nullAddress,
    );
    const functionData = aaveBorrowAction.encodeForDsProxyCall()[1];

    console.log(functionData.toLowerCase() === encodedInput);

    const receipt = await proxy['execute(address,bytes)'](aaveBorrowAddr, encodedInput, { gasLimit: 3000000 });

    const gasUsed = await getGasUsed(receipt);
    console.log(`GasUsed aaveV3BorrowCalldataOptimised: ${gasUsed}`);
    return receipt;
};
const aaveV3SwapBorrowRate = async (
    proxy, assetId, rateMode,
) => {
    const aaveSwapRateAddr = await getAddrFromRegistry('AaveV3SwapBorrowRateMode');

    const aaveSwapRateAction = new dfs.actions.aaveV3.AaveV3SwapBorrowRateModeAction(
        rateMode, assetId, true, nullAddress,
    );
    const functionData = aaveSwapRateAction.encodeForDsProxyCall()[1];
    const receipt = await proxy['execute(address,bytes)'](aaveSwapRateAddr, functionData, { gasLimit: 3000000 });

    const gasUsed = await getGasUsed(receipt);
    console.log(`GasUsed aaveV3SwapRate: ${gasUsed}`);
    return receipt;
};
const aaveV3SwapBorrowRateCalldataOptimised = async (
    proxy, assetId, rateMode,
) => {
    const aaveSwapRateAddr = await getAddrFromRegistry('AaveV3SwapBorrowRateMode');
    let contract = await hre.ethers.getContractAt('AaveV3SwapBorrowRateMode', aaveSwapRateAddr);
    const signer = (await hre.ethers.getSigners())[0];
    contract = await contract.connect(signer);

    const encodedInput = await contract.encodeInputs(
        [rateMode, assetId, true, nullAddress],
    );
    const aaveSwapRateAction = new dfs.actions.aaveV3.AaveV3SwapBorrowRateModeAction(
        rateMode, assetId, true, nullAddress,
    );
    const functionData = aaveSwapRateAction.encodeForDsProxyCall()[1];

    console.log(functionData.toLowerCase() === encodedInput);

    const receipt = await proxy['execute(address,bytes)'](aaveSwapRateAddr, encodedInput, { gasLimit: 3000000 });

    const gasUsed = await getGasUsed(receipt);
    console.log(`GasUsed aaveV3SwapRateOptimised: ${gasUsed}`);
    return receipt;
};

const aaveV3Payback = async (
    proxy, market, amount, from, rateMode, assetId, tokenAddr,
) => {
    const aavePaybackAddr = await getAddrFromRegistry('AaveV3Payback');

    const aavePaybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
        true, nullAddress, amount.toString(), from, rateMode, tokenAddr, assetId, false, nullAddress,
    );
    const functionData = aavePaybackAction.encodeForDsProxyCall()[1];
    const receipt = await proxy['execute(address,bytes)'](aavePaybackAddr, functionData, { gasLimit: 3000000 });

    const gasUsed = await getGasUsed(receipt);
    console.log(`GasUsed aaveV3Payback: ${gasUsed}`);
    return receipt;
};
const aaveV3PaybackCalldataOptimised = async (
    proxy, market, amount, from, rateMode, assetId, tokenAddr,
) => {
    const aavePaybackAddr = await getAddrFromRegistry('AaveV3Payback');
    let contract = await hre.ethers.getContractAt('AaveV3Payback', aavePaybackAddr);
    const signer = (await hre.ethers.getSigners())[0];
    contract = await contract.connect(signer);

    const encodedInput = await contract.encodeInputs(
        [amount, from, rateMode, assetId, true, false, nullAddress, nullAddress],
    );

    const aavePaybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
        true, nullAddress, amount.toString(), from, rateMode, tokenAddr, assetId, false, nullAddress,
    );
    const functionData = aavePaybackAction.encodeForDsProxyCall()[1];
    console.log(functionData.toLowerCase() === encodedInput);

    const receipt = await proxy['execute(address,bytes)'](aavePaybackAddr, encodedInput, { gasLimit: 3000000 });

    const gasUsed = await getGasUsed(receipt);
    console.log(`GasUsed aaveV3PaybackCalldataOptimised: ${gasUsed}`);
    return receipt;
};
const aaveV3ATokenPayback = async (
    proxy, market, amount, from, rateMode, assetId, aTokenAddr,
) => {
    const aavePaybackAddr = await getAddrFromRegistry('AaveV3ATokenPayback');

    const aavePaybackAction = new dfs.actions.aaveV3.AaveV3ATokenPaybackAction(
        true, nullAddress, amount.toString(), from, rateMode, aTokenAddr, assetId,
    );
    const functionData = aavePaybackAction.encodeForDsProxyCall()[1];
    const receipt = await proxy['execute(address,bytes)'](aavePaybackAddr, functionData, { gasLimit: 3000000 });

    const gasUsed = await getGasUsed(receipt);
    console.log(`GasUsed aaveV3ATokenPayback: ${gasUsed}`);
    return receipt;
};
const aaveV3ATokenPaybackCalldataOptimised = async (
    proxy, market, amount, from, rateMode, assetId, aTokenAddr,
) => {
    const aavePaybackAddr = await getAddrFromRegistry('AaveV3ATokenPayback');
    let contract = await hre.ethers.getContractAt('AaveV3ATokenPayback', aavePaybackAddr);
    const signer = (await hre.ethers.getSigners())[0];
    contract = await contract.connect(signer);

    const encodedInput = await contract.encodeInputs(
        [amount, from, rateMode, assetId, true, nullAddress],
    );

    const aavePaybackAction = new dfs.actions.aaveV3.AaveV3ATokenPaybackAction(
        true, nullAddress, amount.toString(), from, rateMode, aTokenAddr, assetId,
    );
    const functionData = aavePaybackAction.encodeForDsProxyCall()[1];
    console.log(functionData.toLowerCase() === encodedInput);

    const receipt = await proxy['execute(address,bytes)'](aavePaybackAddr, encodedInput, { gasLimit: 3000000 });

    const gasUsed = await getGasUsed(receipt);
    console.log(`GasUsed aaveV3ATokenPaybackCalldataOptimised: ${gasUsed}`);
    return receipt;
};
const aaveV3SetEMode = async (
    proxy, market, categoryId,
) => {
    const aaveSetEModeAddr = await getAddrFromRegistry('AaveV3SetEMode');

    const aaveSetEModeAction = new dfs.actions.aaveV3.AaveV3SetEModeAction(
        categoryId, true, nullAddress,
    );
    const functionData = aaveSetEModeAction.encodeForDsProxyCall()[1];
    const receipt = await proxy['execute(address,bytes)'](aaveSetEModeAddr, functionData, { gasLimit: 3000000 });

    const gasUsed = await getGasUsed(receipt);
    console.log(`GasUsed aaveV3SetEMode: ${gasUsed}`);
    return receipt;
};
const aaveV3SetEModeCalldataOptimised = async (
    proxy, market, categoryId,
) => {
    const aaveSetEModeAddr = await getAddrFromRegistry('AaveV3SetEMode');
    let contract = await hre.ethers.getContractAt('AaveV3SetEMode', aaveSetEModeAddr);
    const signer = (await hre.ethers.getSigners())[0];
    contract = await contract.connect(signer);

    const encodedInput = await contract.encodeInputs(
        [categoryId, true, nullAddress],
    );
    const aaveSetEModeAction = new dfs.actions.aaveV3.AaveV3SetEModeAction(
        categoryId, true, nullAddress,
    );
    const functionData = aaveSetEModeAction.encodeForDsProxyCall()[1];
    console.log(functionData.toLowerCase() === encodedInput);

    const receipt = await proxy['execute(address,bytes)'](aaveSetEModeAddr, encodedInput, { gasLimit: 3000000 });

    const gasUsed = await getGasUsed(receipt);
    console.log(`GasUsed aaveV3SetEModeCalldataOptimised: ${gasUsed}`);
    return receipt;
};
const aaveV3ClaimRewards = async (
    proxy, assets, amount, to, rewardsAsset,
) => {
    const aaveClaimRewardsAction = new dfs.actions.aaveV3.AaveV3ClaimRewardsAction(
        assets.length,
        amount,
        to,
        rewardsAsset,
        assets,
    );

    const functionData = aaveClaimRewardsAction.encodeForDsProxyCall()[1];
    const tx = await executeAction('AaveV3ClaimRewards', functionData, proxy);
    return tx;
};

const aaveV3SwitchCollateral = async (
    proxy, market, arrayLength, tokens, useAsCollateral,
) => {
    const aaveSwitchCollateralAddr = await getAddrFromRegistry('AaveV3CollateralSwitch');
    const aaveSwithCollAction = new dfs.actions.aaveV3.AaveV3CollateralSwitchAction(
        true, nullAddress, arrayLength, tokens, useAsCollateral,
    );
    const functionData = aaveSwithCollAction.encodeForDsProxyCall()[1];
    const receipt = await proxy['execute(address,bytes)'](aaveSwitchCollateralAddr, functionData, { gasLimit: 3000000 });

    const gasUsed = await getGasUsed(receipt);
    console.log(`GasUsed aaveV3SwitchCollateral: ${gasUsed}`);
    return receipt;
};
const aaveV3SwitchCollateralCallDataOptimised = async (
    proxy, market, arrayLength, tokens, useAsCollateral,
) => {
    const aaveSwitchCollateralAddr = await getAddrFromRegistry('AaveV3CollateralSwitch');
    let contract = await hre.ethers.getContractAt('AaveV3CollateralSwitch', aaveSwitchCollateralAddr);
    const signer = (await hre.ethers.getSigners())[0];
    contract = await contract.connect(signer);

    const encodedInput = await contract.encodeInputs(
        [arrayLength, true, tokens, useAsCollateral, nullAddress],
    );

    const aaveSwithCollAction = new dfs.actions.aaveV3.AaveV3CollateralSwitchAction(
        true, nullAddress, arrayLength, tokens, useAsCollateral,
    );
    const functionData = aaveSwithCollAction.encodeForDsProxyCall()[1];

    console.log(encodedInput);
    console.log(functionData);
    console.log(functionData.toLowerCase() === encodedInput);

    const receipt = await proxy['execute(address,bytes)'](aaveSwitchCollateralAddr, encodedInput, { gasLimit: 3000000 });

    const gasUsed = await getGasUsed(receipt);
    console.log(`GasUsed aaveV3SwitchCollateralCallDataOptimised: ${gasUsed}`);
    return receipt;
};

module.exports = {
    executeAction,
    sell,

    openMcd,
    supplyMcd,
    generateMcd,
    paybackMcd,
    withdrawMcd,
    openVault,
    claimMcd,
    mcdGive,
    mcdMerge,
    openVaultForExactAmountInDecimals,

    supplyAave,
    withdrawAave,
    borrowAave,
    paybackAave,
    claimStkAave,

    supplyComp,
    withdrawComp,
    borrowComp,
    paybackComp,
    claimComp,

    supplyCompV3,
    borrowCompV3,
    allowCompV3,
    withdrawCompV3,
    claimCompV3,
    paybackCompV3,
    transferCompV3,

    uniSupply,
    uniWithdraw,

    reflexerOpen,
    reflexerSupply,
    reflexerWithdraw,
    reflexerPayback,
    reflexerGenerate,
    reflexerSaviourDeposit,
    reflexerSaviourWithdraw,

    liquityOpen,
    liquityBorrow,
    liquityPayback,
    liquitySupply,
    liquityWithdraw,
    liquityClose,
    liquityRedeem,
    liquityStake,
    liquityUnstake,
    liquitySPDeposit,
    liquitySPWithdraw,
    liquityEthGainToTrove,

    uniV3Mint,
    uniV3Supply,
    uniV3Withdraw,
    uniV3Collect,
    uniV3CreatePool,

    dydxSupply,
    dydxWithdraw,

    yearnSupply,
    yearnWithdraw,

    lidoStake,
    lidoWrap,
    lidoUnwrap,

    curveDeposit,
    curveWithdraw,

    curveGaugeDeposit,
    curveGaugeWithdraw,
    curveMintCrv,
    curveClaimFees,

    curveStethPoolDeposit,
    curveStethPoolWithdraw,

    buyTokenIfNeeded,
    pullTokensInstDSA,

    balancerSupply,
    balancerWithdraw,
    balancerClaim,

    changeProxyOwner,
    automationV2Unsub,

    gUniDeposit,
    gUniWithdraw,

    mStableDeposit,
    mStableWithdraw,
    mStableClaim,

    rariDeposit,
    rariWithdraw,

    qiDaoOpen,
    qiDaoSupply,
    qiDaoGenerate,
    qiDaoPayback,
    qiDaoWithdraw,

    aaveV3Supply,
    aaveV3SupplyCalldataOptimised,
    aaveV3Withdraw,
    aaveV3WithdrawCalldataOptimised,
    aaveV3Borrow,
    aaveV3BorrowCalldataOptimised,
    aaveV3Payback,
    aaveV3PaybackCalldataOptimised,
    aaveV3ATokenPayback,
    aaveV3ATokenPaybackCalldataOptimised,
    aaveV3SetEMode,
    aaveV3SetEModeCalldataOptimised,
    aaveV3SwitchCollateral,
    aaveV3SwitchCollateralCallDataOptimised,
    aaveV3SwapBorrowRate,
    aaveV3SwapBorrowRateCalldataOptimised,
    aaveV3ClaimRewards,

    updateSubData,

    convexDeposit,
    convexWithdraw,
    convexClaim,

    createChickenBond,
    chickenIn,
    chickenOut,
    chickenRedeem,
    transferNFT,
};
