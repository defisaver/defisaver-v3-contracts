const dfs = require('@defisaver/sdk');
const hre = require('hardhat');

const { getAssetInfo } = require('@defisaver/tokens');
const {
    approve,
    getAddrFromRegistry,
    nullAddress,
    WETH_ADDRESS,
    UNISWAP_WRAPPER,
    balanceOf,
    formatExchangeObj,
    isEth,
    depositToWeth,
    MAX_UINT128,
    fetchAmountinUSDPrice,
    setBalance,
    // getGasUsed,
    mineBlock,
} = require('./utils');
const { getVaultsForUser, MCD_MANAGER_ADDR } = require('./utils-mcd');
const { getSecondTokenAmount } = require('./utils-uni');
const { getHints, LiquityActionIds } = require('./utils-liquity');
const { execShellCommand } = require('../scripts/hardhat-tasks-functions');

const executeAction = async (actionName, functionData, proxy) => {
    await hre.network.provider.send('hardhat_setNextBlockBaseFeePerGas', [
        '0x1', // 1 wei
    ]);
    const actionAddr = await getAddrFromRegistry(actionName);
    let receipt;
    try {
        mineBlock();
        receipt = await proxy['execute(address,bytes)'](actionAddr, functionData, {
            gasLimit: 3000000,
        });
        // const gasUsed = await getGasUsed(receipt);
        // console.log(`Gas used by ${actionName} action; ${gasUsed}`);
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

const sell = async (proxy, sellAddr, buyAddr, sellAmount, wrapper, from, to, fee = 0) => {
    const dfsSellAddr = await getAddrFromRegistry('DFSSell');

    const exchangeObject = formatExchangeObj(
        sellAddr,
        buyAddr,
        sellAmount.toString(),
        wrapper,
        0,
        fee,
    );

    const sellAction = new dfs.actions.basic.SellAction(exchangeObject, from, to);

    const functionData = sellAction.encodeForDsProxyCall()[1];

    if (isEth(sellAddr)) {
        await depositToWeth(sellAmount.toString());
    }
    await approve(sellAddr, proxy.address);

    await proxy['execute(address,bytes)'](dfsSellAddr, functionData, { gasLimit: 3000000 });
};

const buy = async (
    proxy,
    sellAddr,
    buyAddr,
    sellAmount,
    buyAmount,
    wrapper,
    from,
    to,
    uniV3fee = 0,
) => {
    const dfsBuyAddr = await getAddrFromRegistry('DFSBuy');

    const exchangeObject = formatExchangeObj(
        sellAddr,
        buyAddr,
        sellAmount.toString(),
        wrapper,
        buyAmount,
        uniV3fee,
    );

    const sellAction = new dfs.actions.basic.SellAction(exchangeObject, from, to);

    const functionData = sellAction.encodeForDsProxyCall()[1];

    if (isEth(sellAddr)) {
        await depositToWeth(sellAmount.toString());
    }

    await approve(sellAddr, proxy.address);

    await proxy['execute(address,bytes)'](dfsBuyAddr, functionData, { gasLimit: 3000000 });
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
    const claimCompAction = new dfs.Action(
        'CompClaim',
        '0x0',
        ['address[]', 'address[]', 'address', 'address'],
        [cSupplyAddresses, cBorrowAddresses, from, to],
    );

    const functionData = claimCompAction.encodeForDsProxyCall()[1];
    const tx = await executeAction('CompClaim', functionData, proxy);
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
const openMcd = async (proxy, makerAddresses, joinAddr) => {
    const openMyVault = new dfs.actions.maker.MakerOpenVaultAction(joinAddr, MCD_MANAGER_ADDR);
    const functionData = openMyVault.encodeForDsProxyCall()[1];

    await executeAction('McdOpen', functionData, proxy);

    const vaultsAfter = await getVaultsForUser(proxy.address, makerAddresses);

    return vaultsAfter.ids[vaultsAfter.ids.length - 1].toString();
};
const supplyMcd = async (proxy, vaultId, amount, tokenAddr, joinAddr, from) => {
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
    } else {
        await setBalance(tokenAddr, from, amount);
    }
    await approve(tokenAddr, proxy.address);
    const mcdSupplyAction = new dfs.actions.maker.MakerSupplyAction(
        vaultId,
        amount,
        joinAddr,
        from,
        MCD_MANAGER_ADDR,
    );
    const functionData = mcdSupplyAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('McdSupply', functionData, proxy);
    return tx;
};
const generateMcd = async (proxy, vaultId, amount, to) => {
    const mcdGenerateAction = new dfs.actions.maker.MakerGenerateAction(
        vaultId,
        amount,
        to,
        MCD_MANAGER_ADDR,
    );
    const functionData = mcdGenerateAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('McdGenerate', functionData, proxy);
    return tx;
};
const paybackMcd = async (proxy, vaultId, amount, from, daiAddr) => {
    await approve(daiAddr, proxy.address);

    const mcdPaybackAction = new dfs.actions.maker.MakerPaybackAction(
        vaultId,
        amount,
        from,
        MCD_MANAGER_ADDR,
    );
    const functionData = mcdPaybackAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('McdPayback', functionData, proxy);
    return tx;
};
const withdrawMcd = async (proxy, vaultId, amount, joinAddr, to) => {
    const mcdWithdrawAction = new dfs.actions.maker.MakerWithdrawAction(
        vaultId,
        amount,
        joinAddr,
        to,
        MCD_MANAGER_ADDR,
    );
    const functionData = mcdWithdrawAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('McdWithdraw', functionData, proxy);
    return tx;
};
const mcdGive = async (proxy, vaultId, newOwner, createProxy) => {
    const mcdGiveAction = new dfs.Action(
        'McdGive',
        '0x0',
        ['uint256', 'address', 'bool', 'address'],
        [vaultId, newOwner.address, createProxy, MCD_MANAGER_ADDR],
    );

    const functionData = mcdGiveAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('McdGive', functionData, proxy);
    return tx;
};
const mcdMerge = async (proxy, srcVaultId, destVaultId) => {
    const mcdMergeAction = new dfs.Action(
        'McdMerge',
        '0x0',
        ['uint256', 'uint256', 'address'],
        [srcVaultId, destVaultId, MCD_MANAGER_ADDR],
    );

    const functionData = mcdMergeAction.encodeForDsProxyCall()[1];

    const tx = await executeAction('McdMerge', functionData, proxy);
    return tx;
};
const openVault = async (makerAddresses, proxy, joinAddr, tokenData, collAmount, daiAmount) => {
    const vaultId = await openMcd(proxy, makerAddresses, joinAddr);
    const from = proxy.signer.address;
    const to = proxy.signer.address;
    const amountDai = hre.ethers.utils.parseUnits(daiAmount, 18);
    const amountColl = hre.ethers.utils.parseUnits(collAmount, tokenData.decimals);

    await supplyMcd(proxy, vaultId, amountColl, tokenData.address, joinAddr, from);
    await generateMcd(proxy, vaultId, amountDai, to);
    return vaultId;
};
const openVaultForExactAmountInDecimals = async (
    makerAddresses,
    proxy,
    joinAddr,
    tokenData,
    collAmount,
    daiAmount,
) => {
    const vaultId = await openMcd(proxy, makerAddresses, joinAddr);
    const from = proxy.signer.address;
    const to = proxy.signer.address;
    const amountDai = hre.ethers.utils.parseUnits(daiAmount, 18);
    await supplyMcd(proxy, vaultId, collAmount, tokenData.address, joinAddr, from);
    await generateMcd(proxy, vaultId, amountDai, to);

    return vaultId;
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
    const uniSupplyAddr = await getAddrFromRegistry('UniSupply');

    const amountA = hre.ethers.utils.parseUnits(amount, tokenADecimals);
    const amountB = await getSecondTokenAmount(addrTokenA, addrTokenB, amountA);

    const amountAMin = amountA.div('2');
    const amountBMin = amountB.div('2');

    // buy tokens
    const tokenBalanceA = await balanceOf(addrTokenA, from);
    const tokenBalanceB = await balanceOf(addrTokenB, from);

    if (isEth(addrTokenA)) {
        await depositToWeth(amountA);
    }

    if (isEth(addrTokenB)) {
        await depositToWeth(amountB);
    }

    if (tokenBalanceA.lt(amountA)) {
        await sell(
            proxy,
            WETH_ADDRESS,
            addrTokenA,
            hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '15000'), 18),
            UNISWAP_WRAPPER,
            from,
            from,
        );
    }

    if (tokenBalanceB.lt(amountB)) {
        await sell(
            proxy,
            WETH_ADDRESS,
            addrTokenB,
            hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '15000'), 18),
            UNISWAP_WRAPPER,
            from,
            from,
        );
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

    await proxy['execute(address,bytes)'](uniSupplyAddr, functionData, {
        gasLimit: 3000000,
    });
};

const uniWithdraw = async (proxy, addrTokenA, addrTokenB, lpAddr, liquidity, to, from) => {
    const uniWithdrawAddr = await getAddrFromRegistry('UniWithdraw');

    const amountAMin = 0;
    const amountBMin = 0;
    const deadline = Date.now() + Date.now();

    await approve(lpAddr, proxy.address);

    const uniObj = [addrTokenA, addrTokenB, liquidity, to, from, amountAMin, amountBMin, deadline];

    const uniWithdrawAction = new dfs.actions.uniswap.UniswapWithdrawAction(...uniObj);

    const functionData = uniWithdrawAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](uniWithdrawAddr, functionData, {
        gasLimit: 3000000,
    });
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
    const uniCreatePoolAddress = await getAddrFromRegistry('UniCreatePoolV3');
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
    return proxy['execute(address,bytes)'](uniCreatePoolAddress, functionData);
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
    const uniMintV3Address = await getAddrFromRegistry('UniMintV3');
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

    return proxy['execute(address,bytes)'](uniMintV3Address, functionData, { gasLimit: 3000000 });
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
    const uniSupplyV3Address = await getAddrFromRegistry('UniSupplyV3');

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
    return proxy['execute(address,bytes)'](uniSupplyV3Address, functionData, { gasLimit: 3000000 });
};

const uniV3Withdraw = async (proxy, tokenId, liquidity, recipient) => {
    const uniWithdrawV3Address = await getAddrFromRegistry('UniWithdrawV3');
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
    return proxy['execute(address,bytes)'](uniWithdrawV3Address, functionData, {
        gasLimit: 3000000,
    });
};

const uniV3Collect = async (proxy, tokenId, recipient, amount0Max, amount1Max) => {
    const uniCollectV3Address = await getAddrFromRegistry('UniCollectV3');
    const uniCollectV3Action = new dfs.actions.uniswapV3.UniswapV3CollectAction(
        tokenId,
        recipient,
        amount0Max,
        amount1Max,
        recipient,
    );
    const functionData = uniCollectV3Action.encodeForDsProxyCall()[1];

    return proxy['execute(address,bytes)'](uniCollectV3Address, functionData, {
        gasLimit: 3000000,
    });
};
/*
*
*
*
*
*
*
*
*
*
*
*
*/
const liquityOpen = async (proxy, maxFeePercentage, collAmount, LUSDAmount, from, to) => {
    const liquityOpenAddr = await getAddrFromRegistry('LiquityOpen');

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

    return proxy['execute(address,bytes)'](liquityOpenAddr, functionData, { gasLimit: 3000000 });
};

const liquityBorrow = async (proxy, maxFeePercentage, LUSDAmount, to) => {
    const liquityBorrowAddr = await getAddrFromRegistry('LiquityBorrow');

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

    return proxy['execute(address,bytes)'](liquityBorrowAddr, functionData, { gasLimit: 3000000 });
};

const liquityPayback = async (proxy, LUSDAmount, from) => {
    const liquityPaybackAddr = await getAddrFromRegistry('LiquityPayback');

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

    return proxy['execute(address,bytes)'](liquityPaybackAddr, functionData, { gasLimit: 3000000 });
};

const liquitySupply = async (proxy, collAmount, from) => {
    const liquitySupplyAddr = await getAddrFromRegistry('LiquitySupply');

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

    return proxy['execute(address,bytes)'](liquitySupplyAddr, functionData, { gasLimit: 3000000 });
};

const liquityWithdraw = async (proxy, collAmount, to) => {
    const liquityWithdrawAddr = await getAddrFromRegistry('LiquityWithdraw');

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

    return proxy['execute(address,bytes)'](liquityWithdrawAddr, functionData, {
        gasLimit: 3000000,
    });
};

const liquityClose = async (proxy, from, to) => {
    const liquityCloseAddr = await getAddrFromRegistry('LiquityClose');

    const LiquityCloseAction = new dfs.actions.liquity.LiquityCloseAction(from, to);

    const functionData = LiquityCloseAction.encodeForDsProxyCall()[1];

    return proxy['execute(address,bytes)'](liquityCloseAddr, functionData, { gasLimit: 3000000 });
};

const liquityRedeem = async (proxy, lusdAmount, from, to, maxFeePercentage) => {
    const maxIterations = 0;
    const liquityRedeemAddr = await getAddrFromRegistry('LiquityRedeem');

    const liquityViewAddr = await getAddrFromRegistry('LiquityView');
    const liquityView = await hre.ethers.getContractAt('LiquityView', liquityViewAddr);
    const { collPrice } = await liquityView['getTroveInfo(address)'](proxy.address);
    const {
        firstRedemptionHint,
        partialRedemptionHintNICR,
        truncatedLUSDamount,
    } = await liquityView['getRedemptionHints(uint256,uint256,uint256)'](
        lusdAmount,
        collPrice,
        maxIterations,
    );
    const { hintAddress } = await liquityView['getApproxHint(uint256,uint256,uint256)'](
        partialRedemptionHintNICR,
        200,
        42,
    );
    const { upperHint, lowerHint } = await liquityView[
        'findInsertPosition(uint256,address,address)'
    ](partialRedemptionHintNICR, hintAddress, hintAddress);

    const liquityRedeemAction = new dfs.actions.liquity.LiquityRedeemAction(
        truncatedLUSDamount,
        from,
        to,
        firstRedemptionHint,
        upperHint,
        lowerHint,
        partialRedemptionHintNICR,
        maxIterations,
        maxFeePercentage,
    );

    const functionData = liquityRedeemAction.encodeForDsProxyCall()[1];

    return proxy['execute(address,bytes)'](liquityRedeemAddr, functionData, { gasLimit: 3000000 });
};

const liquityStake = async (proxy, lqtyAmount, from, wethTo, lusdTo) => {
    const liquityStakeAddr = await getAddrFromRegistry('LiquityStake');

    const LiquityStakeAction = new dfs.actions.liquity.LiquityStakeAction(
        lqtyAmount,
        from,
        wethTo,
        lusdTo,
    );

    const functionData = LiquityStakeAction.encodeForDsProxyCall()[1];

    return proxy['execute(address,bytes)'](liquityStakeAddr, functionData, { gasLimit: 3000000 });
};

const liquityUnstake = async (proxy, lqtyAmount, to, wethTo, lusdTo) => {
    const liquityUnstakeAddr = await getAddrFromRegistry('LiquityUnstake');

    const LiquityUnstakeAction = new dfs.actions.liquity.LiquityUnstakeAction(
        lqtyAmount,
        to,
        wethTo,
        lusdTo,
    );

    const functionData = LiquityUnstakeAction.encodeForDsProxyCall()[1];

    return proxy['execute(address,bytes)'](liquityUnstakeAddr, functionData, { gasLimit: 3000000 });
};

const liquitySPDeposit = async (proxy, LUSDAmount, from, wethTo, lqtyTo) => {
    const liquitySPDepositAddr = await getAddrFromRegistry('LiquitySPDeposit');

    const liquitySPDepositAction = new dfs.actions.liquity.LiquitySPDepositAction(
        LUSDAmount,
        from,
        wethTo,
        lqtyTo,
    );

    const functionData = liquitySPDepositAction.encodeForDsProxyCall()[1];

    return proxy['execute(address,bytes)'](liquitySPDepositAddr, functionData, {
        gasLimit: 3000000,
    });
};

const liquitySPWithdraw = async (proxy, LUSDAmount, to, wethTo, lqtyTo) => {
    const liquitySPWithdrawAddr = await getAddrFromRegistry('LiquitySPWithdraw');

    const liquitySPWithdrawAction = new dfs.actions.liquity.LiquitySPWithdrawAction(
        LUSDAmount,
        to,
        wethTo,
        lqtyTo,
    );

    const functionData = liquitySPWithdrawAction.encodeForDsProxyCall()[1];

    return proxy['execute(address,bytes)'](liquitySPWithdrawAddr, functionData, {
        gasLimit: 3000000,
    });
};

const liquityEthGainToTrove = async (proxy, lqtyTo) => {
    const liquityEthGainToTroveAddr = await getAddrFromRegistry('LiquityEthGainToTrove');

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

    return proxy['execute(address,bytes)'](liquityEthGainToTroveAddr, functionData, {
        gasLimit: 3000000,
    });
};

const dydxSupply = async (proxy, tokenAddr, amount, from) => {
    await approve(tokenAddr, proxy.address);

    const dydxSupplyAddr = await getAddrFromRegistry('DyDxSupply');

    const dydxSupplyAction = new dfs.actions.dydx.DyDxSupplyAction(tokenAddr, amount, from);
    const functionData = dydxSupplyAction.encodeForDsProxyCall()[1];

    return proxy['execute(address,bytes)'](dydxSupplyAddr, functionData, { gasLimit: 3000000 });
};

const dydxWithdraw = async (proxy, tokenAddr, amount, to) => {
    const dydxWithdrawAddr = await getAddrFromRegistry('DyDxWithdraw');

    const dydxWithdrawAction = new dfs.actions.dydx.DyDxWithdrawAction(tokenAddr, amount, to);
    const functionData = dydxWithdrawAction.encodeForDsProxyCall()[1];

    return proxy['execute(address,bytes)'](dydxWithdrawAddr, functionData, { gasLimit: 3000000 });
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

const yearnSupply = async (token, amount, from, to, proxy) => {
    const yearnSupplyAddress = await getAddrFromRegistry('YearnSupply');
    const yearnSupplyAction = new dfs.actions.yearn.YearnSupplyAction(token, amount, from, to);
    const functionData = yearnSupplyAction.encodeForDsProxyCall()[1];
    return proxy['execute(address,bytes)'](yearnSupplyAddress, functionData, { gasLimit: 3000000 });
};

const yearnWithdraw = async (token, amount, from, to, proxy) => {
    const yearnWithdrawAddress = await getAddrFromRegistry('YearnWithdraw');
    const yearnWithdrawAction = new dfs.actions.yearn.YearnWithdrawAction(token, amount, from, to);
    const functionData = yearnWithdrawAction.encodeForDsProxyCall()[1];
    return proxy['execute(address,bytes)'](yearnWithdrawAddress, functionData, {
        gasLimit: 3000000,
    });
};

const lidoStake = async (amount, from, to, proxy) => {
    const lidoStakeAddress = await getAddrFromRegistry('LidoStake');
    const lidoStakeAction = new dfs.actions.lido.LidoStakeAction(amount, from, to);
    const functionData = lidoStakeAction.encodeForDsProxyCall()[1];
    return proxy['execute(address,bytes)'](lidoStakeAddress, functionData, { gasLimit: 3000000 });
};
const lidoUnwrap = async (amount, from, to, proxy) => {
    const lidoUnwrapAddress = await getAddrFromRegistry('LidoUnwrap');
    const lidoUnwrapAction = new dfs.actions.lido.LidoUnwrapAction(amount, from, to);
    const functionData = lidoUnwrapAction.encodeForDsProxyCall()[1];
    return proxy['execute(address,bytes)'](lidoUnwrapAddress, functionData, { gasLimit: 3000000 });
};

const lidoWrap = async (amount, from, to, useEth, proxy) => {
    const lidoWrapAddress = await getAddrFromRegistry('LidoWrap');
    const lidoWrapAction = new dfs.actions.lido.LidoWrapAction(amount, from, to, useEth);
    const functionData = lidoWrapAction.encodeForDsProxyCall()[1];
    return proxy['execute(address,bytes)'](lidoWrapAddress, functionData, { gasLimit: 3000000 });
};

const reflexerSaviourDeposit = async (proxy, from, safeId, lpTokenAmount) => {
    const reflexerSaviourDepositAddress = await getAddrFromRegistry(
        'ReflexerNativeUniV2SaviourDeposit',
    );
    // eslint-disable-next-line max-len
    const reflexerSaviourDepositAction = new dfs.actions.reflexer.ReflexerNativeUniV2SaviourDepositAction(
        from,
        safeId,
        lpTokenAmount,
    );
    const functionData = reflexerSaviourDepositAction.encodeForDsProxyCall()[1];
    return proxy['execute(address,bytes)'](reflexerSaviourDepositAddress, functionData, {
        gasLimit: 3000000,
    });
};

const reflexerSaviourWithdraw = async (proxy, to, safeId, lpTokenAmount) => {
    const reflexerSaviourWithdrawAddress = await getAddrFromRegistry(
        'ReflexerNativeUniV2SaviourWithdraw',
    );
    // eslint-disable-next-line max-len
    const reflexerSaviourWithdrawAction = new dfs.actions.reflexer.ReflexerNativeUniV2SaviourWithdrawAction(
        to,
        safeId,
        lpTokenAmount,
    );
    const functionData = reflexerSaviourWithdrawAction.encodeForDsProxyCall()[1];
    return proxy['execute(address,bytes)'](reflexerSaviourWithdrawAddress, functionData, {
        gasLimit: 3000000,
    });
};

const claimInstMaker = async (proxy, index, vaultId, reward, networth, merkle, owner, to) => {
    const claimInstMakerAddress = await getAddrFromRegistry('ClaimInstMaker');
    const claimInstMakerAction = new dfs.actions.insta.ClaimInstMakerAction(
        index,
        vaultId,
        reward,
        networth,
        merkle,
        owner,
        to,
    );
    const functionData = claimInstMakerAction.encodeForDsProxyCall()[1];
    return proxy['execute(address,bytes)'](claimInstMakerAddress, functionData);
};

const pullTokensInstDSA = async (proxy, dsaAddress, tokens, amounts, to) => {
    const instPulLTokenAddress = await getAddrFromRegistry('InstPullTokens');
    const instPullTokenAction = new dfs.actions.insta.InstPullTokensAction(
        dsaAddress,
        tokens,
        amounts,
        to,
    );
    const functionData = instPullTokenAction.encodeForDsProxyCall()[1];
    return proxy['execute(address,bytes)'](instPulLTokenAddress, functionData);
};

const changeProxyOwner = async (proxy, newOwner) => {
    const changeProxyOwnerAddress = await getAddrFromRegistry('ChangeProxyOwner');
    const changeProxyOwnerAction = new dfs.actions.basic.ChangeProxyOwnerAction(newOwner);
    const functionData = changeProxyOwnerAction.encodeForDsProxyCall()[1];
    return proxy['execute(address,bytes)'](changeProxyOwnerAddress, functionData);
};

const curveDeposit = async (
    proxy,
    sender,
    receiver,
    depositTarget,
    lpToken,
    minMintAmount,
    amounts,
    tokens,
    useUnderlying,
) => {
    const curveDepositAddr = await getAddrFromRegistry('CurveDeposit');
    const curveViewAddr = await getAddrFromRegistry('CurveView');
    const curveView = await hre.ethers.getContractAt('CurveView', curveViewAddr);
    const sig = await curveView['curveDepositSig(uint256,bool)'](tokens.length, useUnderlying);

    const curveDepositAction = new dfs.actions.curve.CurveDepositAction(
        sender,
        receiver,
        depositTarget,
        lpToken,
        sig,
        minMintAmount,
        amounts,
        tokens,
        useUnderlying,
    );

    const functionData = curveDepositAction.encodeForDsProxyCall()[1];

    return proxy['execute(address,bytes)'](curveDepositAddr, functionData, { gasLimit: 3000000 });
};

const curveWithdraw = async (
    proxy,
    sender,
    receiver,
    pool,
    lpToken,
    burnAmount,
    minAmounts,
    tokens,
    withdrawExact,
    useUnderlying,
) => {
    const curveWithdrawAddr = await getAddrFromRegistry('CurveWithdraw');
    const curveViewAddr = await getAddrFromRegistry('CurveView');
    const curveView = await hre.ethers.getContractAt('CurveView', curveViewAddr);
    let sig;
    if (withdrawExact) {
        sig = await curveView.curveWithdrawImbalanceSig(tokens.length, useUnderlying);
    } else {
        sig = await curveView.curveWithdrawSig(tokens.length, useUnderlying);
    }

    const curveWithdrawAction = new dfs.actions.curve.CurveWithdrawAction(
        sender,
        receiver,
        pool,
        lpToken,
        sig,
        burnAmount,
        minAmounts,
        tokens,
        withdrawExact,
        useUnderlying,
    );

    const functionData = curveWithdrawAction.encodeForDsProxyCall()[1];
    return proxy['execute(address,bytes)'](curveWithdrawAddr, functionData, { gasLimit: 3000000 });
};

const curveGaugeDeposit = async (proxy, gaugeAddr, lpToken, sender, onBehalfOf, amount) => {
    const curveGaugeDepositAddr = await getAddrFromRegistry('CurveGaugeDeposit');

    const curveGaugeDepositAction = new dfs.actions.curve.CurveGaugeDepositAction(
        gaugeAddr,
        lpToken,
        sender,
        onBehalfOf,
        amount,
    );

    const functionData = curveGaugeDepositAction.encodeForDsProxyCall()[1];

    return proxy['execute(address,bytes)'](curveGaugeDepositAddr, functionData, {
        gasLimit: 3000000,
    });
};

const curveGaugeWithdraw = async (proxy, gaugeAddr, lpToken, receiver, amount) => {
    const curveGaugeWithdrawAddr = await getAddrFromRegistry('CurveGaugeWithdraw');

    const curveGaugeWithdrawAction = new dfs.actions.curve.CurveGaugeWithdrawAction(
        gaugeAddr,
        lpToken,
        receiver,
        amount,
    );

    const functionData = curveGaugeWithdrawAction.encodeForDsProxyCall()[1];

    return proxy['execute(address,bytes)'](curveGaugeWithdrawAddr, functionData, {
        gasLimit: 3000000,
    });
};

const curveMintCrv = async (proxy, gaugeAddrs, receiver) => {
    const curveMintCrvAddr = await getAddrFromRegistry('CurveMintCrv');

    const curveMintCrvAction = new dfs.actions.curve.CurveMintCrvAction(gaugeAddrs, receiver);

    const functionData = curveMintCrvAction.encodeForDsProxyCall()[1];

    return proxy['execute(address,bytes)'](curveMintCrvAddr, functionData, { gasLimit: 3000000 });
};

const curveClaimFees = async (proxy, claimFor, receiver) => {
    const curveClaimFeesAddr = await getAddrFromRegistry('CurveClaimFees');

    const curveClaimFeesAction = new dfs.actions.curve.CurveClaimFeesAction(claimFor, receiver);

    const functionData = curveClaimFeesAction.encodeForDsProxyCall()[1];

    return proxy['execute(address,bytes)'](curveClaimFeesAddr, functionData, { gasLimit: 3000000 });
};

const automationV2Unsub = async (proxy, protocol, cdpId = 0) => {
    const automationV2UnsubAddr = await getAddrFromRegistry('AutomationV2Unsub');

    const automationV2UnsubAction = new dfs.actions.basic.AutomationV2Unsub(protocol, cdpId);

    const functionData = automationV2UnsubAction.encodeForDsProxyCall()[1];

    return proxy['execute(address,bytes)'](automationV2UnsubAddr, functionData, {
        gasLimit: 3000000,
    });
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
    unstake,
) => {
    const mStableAddr = await getAddrFromRegistry('MStableDeposit');

    const mStableAction = new dfs.actions.mstable.MStableDepositAction(
        bAsset,
        mAsset,
        saveAddress,
        vaultAddress,
        from,
        to,
        amount,
        minOut,
        unstake,
    );

    const functionData = mStableAction.encodeForDsProxyCall()[1];
    return proxy['execute(address,bytes)'](mStableAddr, functionData, { gasLimit: 3000000 });
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
    unstake,
) => {
    const mStableAddr = await getAddrFromRegistry('MStableWithdraw');

    const mStableAction = new dfs.actions.mstable.MStableWithdrawAction(
        bAsset,
        mAsset,
        saveAddress,
        vaultAddress,
        from,
        to,
        amount,
        minOut,
        unstake,
    );

    const functionData = mStableAction.encodeForDsProxyCall()[1];
    return proxy['execute(address,bytes)'](mStableAddr, functionData, { gasLimit: 3000000 });
};

const mStableClaim = async (proxy, vaultAddress, to, first, last) => {
    const mStableAddr = await getAddrFromRegistry('MStableClaim');

    const mStableAction = new dfs.actions.mstable.MStableClaimAction(vaultAddress, to, first, last);

    const functionData = mStableAction.encodeForDsProxyCall()[1];
    return proxy['execute(address,bytes)'](mStableAddr, functionData, { gasLimit: 3000000 });
};

const rariDeposit = async (fundManager, token, poolToken, amount, from, to, proxy) => {
    const rariDepositAddr = await getAddrFromRegistry('RariDeposit');
    const rariDepositAction = new dfs.actions.rari.RariDepositAction(
        fundManager,
        token,
        poolToken,
        amount,
        from,
        to,
    );

    const functionData = rariDepositAction.encodeForDsProxyCall()[1];
    return proxy['execute(address,bytes)'](rariDepositAddr, functionData, { gasLimit: 3000000 });
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
    const rariWithdrawAddr = await getAddrFromRegistry('RariWithdraw');
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
    return proxy['execute(address,bytes)'](rariWithdrawAddr, functionData, { gasLimit: 3000000 });
};

module.exports = {
    sell,
    buy,

    openMcd,
    supplyMcd,
    generateMcd,
    paybackMcd,
    withdrawMcd,
    openVault,
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

    buyTokenIfNeeded,
    claimInstMaker,
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
};
