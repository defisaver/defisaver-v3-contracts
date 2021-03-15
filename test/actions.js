const axios = require('axios');
const dfs = require('@defisaver/sdk')

const makerVersion = "1.1.3";

const { getAssetInfo } = require('@defisaver/tokens');

const {
    redeploy,
    approve,
    getAddrFromRegistry,
    nullAddress,
    WETH_ADDRESS,
    ETH_ADDR,
    USDC_ADDR,
    UNISWAP_WRAPPER,
    balanceOf,
    send,
    formatExchangeObj,
    isEth,
    depositToWeth,
    DAI_ADDR,
} = require("./utils"); 

const { getVaultsForUser, MCD_MANAGER_ADDR } = require('./utils-mcd');

const { getSecondTokenAmount } = require('./utils-uni');

const { deployContract } = require("../scripts/utils/deployer");


const sell = async (proxy, sellAddr, buyAddr, sellAmount, wrapper, from, to) => {
    const dfsSellAddr = await getAddrFromRegistry('DFSSell');

    const exchangeObject = formatExchangeObj(
        sellAddr,
        buyAddr,
        sellAmount.toString(),
        wrapper
    );
    
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        from,
        to
    );

    const functionData = sellAction.encodeForDsProxyCall()[1];


    if (isEth(sellAddr)) {
        await depositToWeth(sellAmount.toString());
    } else {
        await approve(sellAddr, proxy.address);
    }

    await proxy['execute(address,bytes)'](dfsSellAddr, functionData, {gasLimit: 3000000});
};

const buy = async (proxy, sellAddr, buyAddr, sellAmount, buyAmount, wrapper, from, to) => {
    const dfsBuyAddr = await getAddrFromRegistry('DFSBuy');

    const exchangeObject = formatExchangeObj(
        sellAddr,
        buyAddr,
        sellAmount.toString(),
        wrapper,
        buyAmount
    );
    
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        from,
        to
    );

    const functionData = sellAction.encodeForDsProxyCall()[1];

    let value = '0';

    if (isEth(sellAddr)) {
        value = sellAmount.toString();
    } else {
        await approve(sellAddr, proxy.address);
    }

    await proxy['execute(address,bytes)'](dfsBuyAddr, functionData, {value, gasLimit: 3000000});
};

const openMcd = async (proxy, makerAddresses, joinAddr) => {
    const mcdOpenAddr = await getAddrFromRegistry('McdOpen');

    const openMyVault = new dfs.actions.maker.MakerOpenVaultAction(joinAddr, MCD_MANAGER_ADDR);
    const functionData = openMyVault.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](mcdOpenAddr, functionData, {gasLimit: 3000000});

    const vaultsAfter = await getVaultsForUser(proxy.address, makerAddresses);

    return vaultsAfter.ids[vaultsAfter.ids.length - 1].toString();
};

const supplyMcd = async (proxy, vaultId, amount, tokenAddr, joinAddr, from) => {
    const tokenBalance = await balanceOf(tokenAddr, from);

    if (tokenBalance.lt(amount)) {
        await sell(
            proxy,
            ETH_ADDR,
            tokenAddr,
            ethers.utils.parseUnits('5', 18),
            UNISWAP_WRAPPER,
            from,
            from
        );
    }

    let mcdSupplyAddr = await getAddrFromRegistry('McdSupply');

    let value = '0';
    if (isEth(tokenAddr)) {
        value = amount.toString();
    } else {
        await approve(tokenAddr, proxy.address);
    }

    const mcdSupplyAction = new dfs.actions.maker.MakerSupplyAction(vaultId, amount, joinAddr, from, MCD_MANAGER_ADDR);
    const functionData = mcdSupplyAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](mcdSupplyAddr, functionData, {value, gasLimit: 3000000});

};

const paybackMcd = async (proxy, vaultId, amount, from, daiAddr) => {
    const mcdPaybackAddr = await getAddrFromRegistry('McdPayback');

    await approve(daiAddr, proxy.address);

    const mcdPaybackAction = new dfs.actions.maker.MakerPaybackAction(vaultId, amount, from, MCD_MANAGER_ADDR);
    const functionData = mcdPaybackAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](mcdPaybackAddr, functionData, {gasLimit: 3000000});
};

const withdrawMcd = async (proxy, vaultId, amount, joinAddr, to) => {
    const mcdWithdrawAddr = await getAddrFromRegistry('McdWithdraw');

    const mcdWithdrawAction = new dfs.actions.maker.MakerWithdrawAction(vaultId, amount, joinAddr, to, MCD_MANAGER_ADDR);
    const functionData = mcdWithdrawAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](mcdWithdrawAddr, functionData, {gasLimit: 3000000});
};

const openVault = async (makerAddresses, proxy, joinAddr, tokenData, collAmount, daiAmount) => {
    const vaultId = await openMcd(proxy, makerAddresses, joinAddr);

    const from = proxy.signer.address;
    const to = proxy.signer.address;

    const amountDai = ethers.utils.parseUnits(daiAmount, 18);
    const amountColl = ethers.utils.parseUnits(collAmount, tokenData.decimals);

    await supplyMcd(proxy, vaultId, amountColl, tokenData.address, joinAddr, from);
    await generateMcd(proxy, vaultId, amountDai, to);

    return vaultId;
};

const supplyAave = async (proxy, market, amount, tokenAddr, from) => {    
    const tokenBalance = await balanceOf(tokenAddr, from);

    if (tokenBalance.lt(amount)) {
        if (isEth(tokenAddr)) {
            await depositToWeth(amount.toString());
        } else {
            await sell(
                proxy,
                ETH_ADDR,
                tokenAddr,
                ethers.utils.parseUnits('5', 18),
                UNISWAP_WRAPPER,
                from,
                from
            );
        }
    }

    let aaveSupplyAddr = await getAddrFromRegistry('AaveSupply');

    await approve(tokenAddr, proxy.address);

    const aaveSupplyAction = new dfs.actions.aave.AaveSupplyAction(
        market,
        tokenAddr,
        amount,
        from,
        nullAddress
    );

    const functionData = aaveSupplyAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](aaveSupplyAddr, functionData, { gasLimit: 3000000 });
};

const withdrawAave = async (proxy, market, tokenAddr, amount, to) => {
    const aaveWithdrawAddr = await getAddrFromRegistry('AaveWithdraw');

    const aaveWithdrawAction = new dfs.actions.aave.AaveWithdrawAction(market, tokenAddr, amount, to);
    const functionData = aaveWithdrawAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](aaveWithdrawAddr, functionData, {gasLimit: 3000000});
};

const borrowAave = async (proxy, market, tokenAddr, amount, rateMode, to) => {
    const aaveBorroweAddr = await getAddrFromRegistry('AaveBorrow');

    const aaveBorrowAction = new dfs.actions.aave.AaveBorrowAction(market,tokenAddr, amount, rateMode, to, nullAddress);
    const functionData = aaveBorrowAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](aaveBorroweAddr, functionData, {gasLimit: 3000000});
};

const paybackAave = async (proxy, market, tokenAddr, amount, rateMode, from) => {
    const aavePaybackAddr = await getAddrFromRegistry('AavePayback');

    let value = '0';
    if (isEth(tokenAddr)) {
        value = amount;
    } else {
        await approve(tokenAddr, proxy.address);
    }

    const aavePaybackAction = new dfs.actions.aave.AavePaybackAction(market, tokenAddr, amount, rateMode, from, nullAddress);
    const functionData = aavePaybackAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](aavePaybackAddr, functionData, {value, gasLimit: 4000000});
};

const supplyComp = async (proxy, cTokenAddr, tokenAddr, amount, from) => {    
    const tokenBalance = await balanceOf(tokenAddr, from);

    if (tokenBalance.lt(amount)) {
        if (isEth(tokenAddr)) {
            await depositToWeth(amount.toString());
        } else {
            await sell(
                proxy,
                ETH_ADDR,
                tokenAddr,
                ethers.utils.parseUnits('5', 18),
                UNISWAP_WRAPPER,
                from,
                from
            );
        }
    }

    let compSupplyAddr = await getAddrFromRegistry('CompSupply');

    await approve(tokenAddr, proxy.address);

    const compSupplyAction = new dfs.actions.compound.CompoundSupplyAction(
        cTokenAddr,
        amount,
        from,
        true
        );

    const functionData = compSupplyAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](compSupplyAddr, functionData, {gasLimit: 3000000});
};

const withdrawComp = async (proxy, cTokenAddr, amount, to) => {
    const compWithdrawAddr = await getAddrFromRegistry('CompWithdraw');

    const compWithdrawAction = new dfs.actions.compound.CompoundWithdrawAction(cTokenAddr, amount, to);
    const functionData = compWithdrawAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](compWithdrawAddr, functionData, {gasLimit: 3000000});
};

const borrowComp = async (proxy, cTokenAddr, amount, to) => {
    const compBorrowAddr = await getAddrFromRegistry('CompBorrow');

    const compBorrowAction = new dfs.actions.compound.CompoundBorrowAction(cTokenAddr, amount, to);
    const functionData = compBorrowAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](compBorrowAddr, functionData, {gasLimit: 3000000});
};

const paybackComp = async (proxy, cTokenAddr, amount, from) => {
    const compPaybackAddr = await getAddrFromRegistry('CompPayback');

    let value = '0';
    if (cTokenAddr.toLowerCase() === getAssetInfo("cETH").address.toLowerCase()) {
        value = amount;
    } else {
        await approve(cTokenAddr, proxy.address);
    }

    const compPaybackAction = new dfs.actions.compound.CompoundPaybackAction(cTokenAddr, amount, from);
    const functionData = compPaybackAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](compPaybackAddr, functionData, {value, gasLimit: 4000000});
};

const generateMcd = async (proxy, vaultId, amount, to) => {
    const mcdGenerateAddr = await getAddrFromRegistry('McdGenerate');

    const mcdGenerateAction = new dfs.actions.maker.MakerGenerateAction(vaultId, amount, to, MCD_MANAGER_ADDR);
    const functionData = mcdGenerateAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](mcdGenerateAddr, functionData, {gasLimit: 3000000});
};

const buyGasTokens = async (proxy, senderAcc) => {
    const dfsSellAddr = await getAddrFromRegistry('DFSSell');
    const dfsSell = await hre.ethers.getContractAt("DFSSell", dfsSellAddr);

    const sellAddr = getAssetInfo('ETH').address;
    const buyAddr = '0x0000000000b3F879cb30FE243b4Dfee438691c04';

    const amount = ethers.utils.parseUnits('1', 18);

    const callData = await encodeDfsSellAction(
        dfsSell, sellAddr, buyAddr, amount, UNISWAP_WRAPPER, proxy.address, senderAcc.address);

    const DfsSell = await ethers.getContractFactory("DFSSell");
    const functionData = DfsSell.interface.encodeFunctionData(
        "executeAction",
         [callData, [], [0, 0, 0, 0, 0], []]
    );

    await proxy['execute(address,bytes)'](dfsSellAddr, functionData, {value: amount, gasLimit: 2000000});
};

const uniSupply = async (proxy, addrTokenA, tokenADecimals, addrTokenB, amount, from, to) => {
    const uniSupplyAddr = await getAddrFromRegistry("UniSupply");

    const amountA = ethers.utils.parseUnits(amount, tokenADecimals);
    const amountB = await getSecondTokenAmount(
        addrTokenA,
        addrTokenB,
        amountA
    );

    const amountAMin = amountA.div("2");
    const amountBMin = amountB.div("2");

    // buy tokens
    const tokenBalanceA = await balanceOf(addrTokenA, from);
    const tokenBalanceB = await balanceOf(addrTokenB, from);
 
    if (tokenBalanceA.lt(amountA)) {
        await sell(
            proxy,
            ETH_ADDR,
            addrTokenA,
            ethers.utils.parseUnits('5', 18),
            UNISWAP_WRAPPER,
            from,
            from
        );
    }

    if (tokenBalanceB.lt(amountB)) {
        await sell(
            proxy,
            ETH_ADDR,
            addrTokenB,
            ethers.utils.parseUnits('5', 18),
            UNISWAP_WRAPPER,
            from,
            from
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

    const uniSupply = new dfs.actions.uniswap.UniswapSupplyAction(uniObj);

    let value = 0;

    if (isEth(addrTokenA)) {
        value = amountA;
    } else {
        await approve(addrTokenA, proxy.address);
    }

    if (isEth(addrTokenB)) {
        value = amountB;
    } else {
        await approve(addrTokenB, proxy.address);
    }

    const functionData = uniSupply.encodeForDsProxyCall()[1];

    await proxy["execute(address,bytes)"](uniSupplyAddr, functionData, {
        value,
        gasLimit: 3000000,
    });
};

const uniWithdraw = async (proxy, addrTokenA, addrTokenB, lpAddr, liquidity, to, from) => {
    const uniWithdrawAddr = await getAddrFromRegistry("UniWithdraw");

    const amountAMin = 0;
    const amountBMin = 0;
    const deadline = Date.now() + Date.now();

    await approve(lpAddr, proxy.address);

    const uniObj = [
        addrTokenA,
        addrTokenB,
        liquidity,
        to,
        from,
        amountAMin,
        amountBMin,
        deadline,
    ];

    const uniWithdraw = new dfs.actions.uniswap.UniswapWithdrawAction(uniObj);

    const functionData = uniWithdraw.encodeForDsProxyCall()[1];

    await proxy["execute(address,bytes)"](uniWithdrawAddr, functionData, {
        gasLimit: 3000000,
    });
};

// send dust amount of tokens to dydx so we have enough for the 2 wei calc. issue
const addFlDust = async (proxy, senderAcc, flDyDxAddr) => {

    const amount = ethers.utils.parseUnits('0.001', 18);
    const amountUsdc = ethers.utils.parseUnits('0.001', 6);
    const from = senderAcc.address;

    // send weth
    await depositToWeth(amount);
    await send(WETH_ADDRESS, flDyDxAddr, amount);

    // send dai
    const daiBalance = await balanceOf(DAI_ADDR, from);
    if (daiBalance.lt(amount)) {
        await sell(proxy, ETH_ADDR, DAI_ADDR, ethers.utils.parseUnits('1', 18), UNISWAP_WRAPPER, from, from);
    }

    await send(DAI_ADDR, flDyDxAddr, amount);

    // send usdc
    const usdcBalance = await balanceOf(USDC_ADDR, from);
    if (usdcBalance.lt(amountUsdc)) {
        await sell(proxy, ETH_ADDR, USDC_ADDR, ethers.utils.parseUnits('1', 18), UNISWAP_WRAPPER, from, from);
    }

    await send(USDC_ADDR, flDyDxAddr, amountUsdc);
};

const claimComp = async (proxy, cSupplyAddresses, cBorrowAddresses, from, to) => {
    const compClaimAddr = await getAddrFromRegistry("CompClaim");

    const claimComp = new dfs.Action("CompClaim", "0x0", 
    ["address[]", "address[]", "address", "address"], [cSupplyAddresses, cBorrowAddresses, from, to]);

    const functionData = claimComp.encodeForDsProxyCall()[1];

    await proxy["execute(address,bytes)"](compClaimAddr, functionData, {
        gasLimit: 3000000,
    });
};

const mcdGive = async (proxy, vaultId, newOwner, createProxy) => {
    const mcdGiveAddr = await getAddrFromRegistry("McdGive");

    const mcdGive = new dfs.Action("McdGive", "0x0", 
    ["uint256", "address", "bool", "address"], [vaultId, newOwner.address, createProxy, MCD_MANAGER_ADDR]);

    const functionData = mcdGive.encodeForDsProxyCall()[1];

    await proxy["execute(address,bytes)"](mcdGiveAddr, functionData, {
        gasLimit: 3000000,
    });
};

const mcdMerge = async (proxy, srcVaultId, destVaultId) => {
    const mcdMergeAddr = await getAddrFromRegistry("McdMerge");

    const mcdMerge = new dfs.Action("McdMerge", "0x0", 
    ["uint256", "uint256", "address"], [srcVaultId, destVaultId, MCD_MANAGER_ADDR]);

    const functionData = mcdMerge.encodeForDsProxyCall()[1];

    await proxy["execute(address,bytes)"](mcdMergeAddr, functionData, {
        gasLimit: 3000000,
    });
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

    buyGasTokens,

    uniSupply,
    uniWithdraw,

    addFlDust,
};