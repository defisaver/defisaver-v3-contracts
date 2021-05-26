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
} = require('./utils');

const { getVaultsForUser, MCD_MANAGER_ADDR } = require('./utils-mcd');

const { getSecondTokenAmount } = require('./utils-uni');

const { getHints, LiquityActionIds } = require('./utils-liquity');

const sell = async (proxy, sellAddr, buyAddr, sellAmount, wrapper, from, to) => {
    const dfsSellAddr = await getAddrFromRegistry('DFSSell');

    const exchangeObject = formatExchangeObj(sellAddr, buyAddr, sellAmount.toString(), wrapper);

    const sellAction = new dfs.actions.basic.SellAction(exchangeObject, from, to);

    const functionData = sellAction.encodeForDsProxyCall()[1];

    if (isEth(sellAddr)) {
        await depositToWeth(sellAmount.toString());
    }

    await approve(sellAddr, proxy.address);

    await proxy['execute(address,bytes)'](dfsSellAddr, functionData, { gasLimit: 3000000 });
};

const buy = async (proxy, sellAddr, buyAddr, sellAmount, buyAmount, wrapper, from, to) => {
    const dfsBuyAddr = await getAddrFromRegistry('DFSBuy');

    const exchangeObject = formatExchangeObj(
        sellAddr,
        buyAddr,
        sellAmount.toString(),
        wrapper,
        buyAmount,
    );

    const sellAction = new dfs.actions.basic.SellAction(exchangeObject, from, to);

    const functionData = sellAction.encodeForDsProxyCall()[1];

    if (isEth(sellAddr)) {
        await depositToWeth(sellAmount.toString());
    }

    await approve(sellAddr, proxy.address);

    await proxy['execute(address,bytes)'](dfsBuyAddr, functionData, { gasLimit: 3000000 });
};

const openMcd = async (proxy, makerAddresses, joinAddr) => {
    const mcdOpenAddr = await getAddrFromRegistry('McdOpen');

    const openMyVault = new dfs.actions.maker.MakerOpenVaultAction(joinAddr, MCD_MANAGER_ADDR);
    const functionData = openMyVault.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](mcdOpenAddr, functionData, { gasLimit: 3000000 });

    const vaultsAfter = await getVaultsForUser(proxy.address, makerAddresses);

    return vaultsAfter.ids[vaultsAfter.ids.length - 1].toString();
};

const supplyMcd = async (proxy, vaultId, amount, tokenAddr, joinAddr, from) => {
    const tokenBalance = await balanceOf(tokenAddr, from);

    if (tokenBalance.lt(amount)) {
        if (isEth(tokenAddr)) {
            await depositToWeth(amount.toString());
        } else {
            await sell(
                proxy,
                WETH_ADDRESS,
                tokenAddr,
                hre.ethers.utils.parseUnits('5', 18),
                UNISWAP_WRAPPER,
                from,
                from,
            );
        }
    }

    const mcdSupplyAddr = await getAddrFromRegistry('McdSupply');

    await approve(tokenAddr, proxy.address);

    const mcdSupplyAction = new dfs.actions.maker.MakerSupplyAction(
        vaultId,
        amount,
        joinAddr,
        from,
        MCD_MANAGER_ADDR,
    );
    const functionData = mcdSupplyAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](mcdSupplyAddr, functionData, { gasLimit: 3000000 });
};

const paybackMcd = async (proxy, vaultId, amount, from, daiAddr) => {
    const mcdPaybackAddr = await getAddrFromRegistry('McdPayback');

    await approve(daiAddr, proxy.address);

    const mcdPaybackAction = new dfs.actions.maker.MakerPaybackAction(
        vaultId,
        amount,
        from,
        MCD_MANAGER_ADDR,
    );
    const functionData = mcdPaybackAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](mcdPaybackAddr, functionData, { gasLimit: 3000000 });
};

const withdrawMcd = async (proxy, vaultId, amount, joinAddr, to) => {
    const mcdWithdrawAddr = await getAddrFromRegistry('McdWithdraw');

    const mcdWithdrawAction = new dfs.actions.maker.MakerWithdrawAction(
        vaultId,
        amount,
        joinAddr,
        to,
        MCD_MANAGER_ADDR,
    );
    const functionData = mcdWithdrawAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](mcdWithdrawAddr, functionData, { gasLimit: 3000000 });
};

const supplyAave = async (proxy, market, amount, tokenAddr, from) => {
    const tokenBalance = await balanceOf(tokenAddr, from);

    if (tokenBalance.lt(amount)) {
        if (isEth(tokenAddr)) {
            await depositToWeth(amount.toString());
        } else {
            await sell(
                proxy,
                WETH_ADDRESS,
                tokenAddr,
                hre.ethers.utils.parseUnits('5', 18),
                UNISWAP_WRAPPER,
                from,
                from,
            );
        }
    }

    const aaveSupplyAddr = await getAddrFromRegistry('AaveSupply');

    await approve(tokenAddr, proxy.address);

    const aaveSupplyAction = new dfs.actions.aave.AaveSupplyAction(
        market,
        tokenAddr,
        amount,
        from,
        nullAddress,
    );

    const functionData = aaveSupplyAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](aaveSupplyAddr, functionData, { gasLimit: 3000000 });
};

const withdrawAave = async (proxy, market, tokenAddr, amount, to) => {
    const aaveWithdrawAddr = await getAddrFromRegistry('AaveWithdraw');

    const aaveWithdrawAction = new dfs.actions.aave.AaveWithdrawAction(
        market,
        tokenAddr,
        amount,
        to,
    );
    const functionData = aaveWithdrawAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](aaveWithdrawAddr, functionData, { gasLimit: 3000000 });
};

const borrowAave = async (proxy, market, tokenAddr, amount, rateMode, to) => {
    const aaveBorrowAddr = await getAddrFromRegistry('AaveBorrow');

    const aaveBorrowAction = new dfs.actions.aave.AaveBorrowAction(
        market,
        tokenAddr,
        amount,
        rateMode,
        to,
        nullAddress,
    );
    const functionData = aaveBorrowAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](aaveBorrowAddr, functionData, { gasLimit: 3000000 });
};

const paybackAave = async (proxy, market, tokenAddr, amount, rateMode, from) => {
    const aavePaybackAddr = await getAddrFromRegistry('AavePayback');

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

    await proxy['execute(address,bytes)'](aavePaybackAddr, functionData, { gasLimit: 4000000 });
};

const supplyComp = async (proxy, cTokenAddr, tokenAddr, amount, from) => {
    const tokenBalance = await balanceOf(tokenAddr, from);

    if (tokenBalance.lt(amount)) {
        if (isEth(tokenAddr)) {
            await depositToWeth(amount.toString());
        } else {
            await sell(
                proxy,
                WETH_ADDRESS,
                tokenAddr,
                hre.ethers.utils.parseUnits('5', 18),
                UNISWAP_WRAPPER,
                from,
                from,
            );
        }
    }

    const compSupplyAddr = await getAddrFromRegistry('CompSupply');

    await approve(tokenAddr, proxy.address);

    const compSupplyAction = new dfs.actions.compound.CompoundSupplyAction(
        cTokenAddr,
        amount,
        from,
        true,
    );

    const functionData = compSupplyAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](compSupplyAddr, functionData, { gasLimit: 3000000 });
};

const withdrawComp = async (proxy, cTokenAddr, amount, to) => {
    const compWithdrawAddr = await getAddrFromRegistry('CompWithdraw');

    const compWithdrawAction = new dfs.actions.compound.CompoundWithdrawAction(
        cTokenAddr,
        amount,
        to,
    );
    const functionData = compWithdrawAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](compWithdrawAddr, functionData, { gasLimit: 3000000 });
};

const borrowComp = async (proxy, cTokenAddr, amount, to) => {
    const compBorrowAddr = await getAddrFromRegistry('CompBorrow');

    const compBorrowAction = new dfs.actions.compound.CompoundBorrowAction(cTokenAddr, amount, to);
    const functionData = compBorrowAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](compBorrowAddr, functionData, { gasLimit: 3000000 });
};

const paybackComp = async (proxy, cTokenAddr, amount, from) => {
    const compPaybackAddr = await getAddrFromRegistry('CompPayback');

    if (cTokenAddr.toLowerCase() === getAssetInfo('cETH').address.toLowerCase()) {
        await depositToWeth(amount.toString());
    }

    await approve(cTokenAddr, proxy.address);

    const compPaybackAction = new dfs.actions.compound.CompoundPaybackAction(
        cTokenAddr,
        amount,
        from,
    );
    const functionData = compPaybackAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](compPaybackAddr, functionData, { gasLimit: 4000000 });
};

const generateMcd = async (proxy, vaultId, amount, to) => {
    const mcdGenerateAddr = await getAddrFromRegistry('McdGenerate');

    const mcdGenerateAction = new dfs.actions.maker.MakerGenerateAction(
        vaultId,
        amount,
        to,
        MCD_MANAGER_ADDR,
    );
    const functionData = mcdGenerateAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](mcdGenerateAddr, functionData, { gasLimit: 3000000 });
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
            hre.ethers.utils.parseUnits('5', 18),
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
            hre.ethers.utils.parseUnits('5', 18),
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

const claimComp = async (proxy, cSupplyAddresses, cBorrowAddresses, from, to) => {
    const compClaimAddr = await getAddrFromRegistry('CompClaim');

    const claimCompAction = new dfs.Action(
        'CompClaim',
        '0x0',
        ['address[]', 'address[]', 'address', 'address'],
        [cSupplyAddresses, cBorrowAddresses, from, to],
    );

    const functionData = claimCompAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](compClaimAddr, functionData, {
        gasLimit: 3000000,
    });
};

const mcdGive = async (proxy, vaultId, newOwner, createProxy) => {
    const mcdGiveAddr = await getAddrFromRegistry('McdGive');

    const mcdGiveAction = new dfs.Action(
        'McdGive',
        '0x0',
        ['uint256', 'address', 'bool', 'address'],
        [vaultId, newOwner.address, createProxy, MCD_MANAGER_ADDR],
    );

    const functionData = mcdGiveAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](mcdGiveAddr, functionData, {
        gasLimit: 3000000,
    });
};

const mcdMerge = async (proxy, srcVaultId, destVaultId) => {
    const mcdMergeAddr = await getAddrFromRegistry('McdMerge');

    const mcdMergeAction = new dfs.Action(
        'McdMerge',
        '0x0',
        ['uint256', 'uint256', 'address'],
        [srcVaultId, destVaultId, MCD_MANAGER_ADDR],
    );

    const functionData = mcdMergeAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](mcdMergeAddr, functionData, {
        gasLimit: 3000000,
    });
};

const reflexerOpen = async (proxy, adapterAddr) => {
    const reflexerOpenAddr = await getAddrFromRegistry('ReflexerOpen');

    const openMySafe = new dfs.actions.reflexer.ReflexerOpenSafeAction(adapterAddr);
    const functionData = openMySafe.encodeForDsProxyCall()[1];

    return proxy['execute(address,bytes)'](reflexerOpenAddr, functionData, { gasLimit: 3000000 });
};

const reflexerSupply = async (proxy, safeId, amount, adapterAddr, from) => {
    await approve(WETH_ADDRESS, proxy.address);

    const reflexerSupplyAddr = await getAddrFromRegistry('ReflexerSupply');

    const supplyMySafe = new dfs.actions.reflexer.ReflexerSupplyAction(
        safeId,
        amount,
        adapterAddr,
        from,
    );

    const functionData = supplyMySafe.encodeForDsProxyCall()[1];

    return proxy['execute(address,bytes)'](reflexerSupplyAddr, functionData, { gasLimit: 3000000 });
};

const reflexerPayback = async (proxy, safeId, amount, from, raiAddr) => {
    const reflexerPaybackAddress = await getAddrFromRegistry('ReflexerPayback');

    await approve(raiAddr, proxy.address);

    const reflexerPaybackAction = new dfs.actions.reflexer.ReflexerPaybackAction(
        safeId,
        amount,
        from,
    );
    const functionData = reflexerPaybackAction.encodeForDsProxyCall()[1];

    return proxy['execute(address,bytes)'](reflexerPaybackAddress, functionData, { gasLimit: 3000000 });
};

const reflexerWithdraw = async (proxy, safeId, amount, adapterAddr, to) => {
    const reflexerWithdrawAddr = await getAddrFromRegistry('ReflexerWithdraw');

    const reflexerWithdrawAction = new dfs.actions.reflexer.ReflexerWithdrawAction(
        safeId,
        amount,
        adapterAddr,
        to,
    );
    const functionData = reflexerWithdrawAction.encodeForDsProxyCall()[1];

    return proxy['execute(address,bytes)'](reflexerWithdrawAddr, functionData, { gasLimit: 3000000 });
};

const reflexerGenerate = async (proxy, safeId, amount, to) => {
    const reflexerGenerateAddr = await getAddrFromRegistry('ReflexerGenerate');

    const reflexerGenerateAction = new dfs.actions.reflexer.ReflexerGenerateAction(
        safeId,
        amount,
        to,
    );
    const functionData = reflexerGenerateAction.encodeForDsProxyCall()[1];

    return proxy['execute(address,bytes)'](reflexerGenerateAddr, functionData, { gasLimit: 3000000 });
};

const liquityOpen = async (proxy, maxFeePercentage, collAmount, LUSDAmount, from, to) => {
    const liquityOpenAddr = await getAddrFromRegistry('LiquityOpen');

    const { upperHint, lowerHint } = await getHints(
        proxy.address, LiquityActionIds.Open, from, collAmount, LUSDAmount,
    );

    const liquityOpenAction = new dfs.actions.liquity.LiquityOpenAction(
        maxFeePercentage, collAmount, LUSDAmount, from, to, upperHint, lowerHint,
    );

    const functionData = liquityOpenAction.encodeForDsProxyCall()[1];

    return proxy['execute(address,bytes)'](liquityOpenAddr, functionData, { gasLimit: 3000000 });
};

const liquityBorrow = async (proxy, maxFeePercentage, LUSDAmount, to) => {
    const liquityBorrowAddr = await getAddrFromRegistry('LiquityBorrow');

    const { upperHint, lowerHint } = await getHints(
        proxy.address, LiquityActionIds.Borrow, hre.ethers.constants.AddressZero, 0, LUSDAmount,
    );

    const liquityBorrowAction = new dfs.actions.liquity.LiquityBorrowAction(
        maxFeePercentage, LUSDAmount, to, upperHint, lowerHint,
    );

    const functionData = liquityBorrowAction.encodeForDsProxyCall()[1];

    return proxy['execute(address,bytes)'](liquityBorrowAddr, functionData, { gasLimit: 3000000 });
};

const liquityPayback = async (proxy, LUSDAmount, from) => {
    const liquityPaybackAddr = await getAddrFromRegistry('LiquityPayback');

    const { upperHint, lowerHint } = await getHints(
        proxy.address, LiquityActionIds.Payback, from, 0, LUSDAmount,
    );

    const liquityPaybackAction = new dfs.actions.liquity.LiquityPaybackAction(
        LUSDAmount, from, upperHint, lowerHint,
    );

    const functionData = liquityPaybackAction.encodeForDsProxyCall()[1];

    return proxy['execute(address,bytes)'](liquityPaybackAddr, functionData, { gasLimit: 3000000 });
};

const liquitySupply = async (proxy, collAmount, from) => {
    const liquitySupplyAddr = await getAddrFromRegistry('LiquitySupply');

    const { upperHint, lowerHint } = await getHints(
        proxy.address, LiquityActionIds.Supply, from, collAmount, 0,
    );

    const liquitySupplyAction = new dfs.actions.liquity.LiquitySupplyAction(
        collAmount, from, upperHint, lowerHint,
    );

    const functionData = liquitySupplyAction.encodeForDsProxyCall()[1];

    return proxy['execute(address,bytes)'](liquitySupplyAddr, functionData, { gasLimit: 3000000 });
};

const liquityWithdraw = async (proxy, collAmount, to) => {
    const liquityWithdrawAddr = await getAddrFromRegistry('LiquityWithdraw');

    const { upperHint, lowerHint } = await getHints(
        proxy.address, LiquityActionIds.Withdraw, hre.ethers.constants.AddressZero, collAmount, 0,
    );

    const liquityWithdrawAction = new dfs.actions.liquity.LiquityWithdrawAction(
        collAmount, to, upperHint, lowerHint,
    );

    const functionData = liquityWithdrawAction.encodeForDsProxyCall()[1];

    return proxy['execute(address,bytes)'](liquityWithdrawAddr, functionData, { gasLimit: 3000000 });
};

const liquityClose = async (proxy, from, to) => {
    const liquityCloseAddr = await getAddrFromRegistry('LiquityClose');

    const LiquityCloseAction = new dfs.actions.liquity.LiquityCloseAction(
        from, to,
    );

    const functionData = LiquityCloseAction.encodeForDsProxyCall()[1];

    return proxy['execute(address,bytes)'](liquityCloseAddr, functionData, { gasLimit: 3000000 });
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

    supplyAave,
    withdrawAave,
    borrowAave,
    paybackAave,

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

    liquityOpen,
    liquityBorrow,
    liquityPayback,
    liquitySupply,
    liquityWithdraw,
    liquityClose,
};
