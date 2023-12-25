/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');

const {
    borrowCompV3, supplyCompV3,
} = require('../test/actions');

const {
    redeploy,
    addrs,
    network,
    setBalance,
    getProxy,
} = require('../test/utils');

const createCompV3Position = async (
    senderAddr, proxyAddr, proxy, market, collAddr, collAmount, borrowAmount,
) => {
    await setBalance(collAddr, senderAddr, collAmount);
    console.log('prosao balance');
    await supplyCompV3(
        market,
        proxy,
        collAddr,
        collAmount,
        senderAddr,
        proxyAddr,
    );
    console.log('prosao supply');
    await borrowCompV3(
        market,
        proxy,
        borrowAmount,
        proxyAddr,
        proxyAddr,
    );
    console.log('prosao borrow');
};

const USDC_MARKET = addrs[network].COMET_USDC_ADDR;
const ETH_MARKET = '0xA17581A9E3356d9A858b789D68B4d866e593aE94';

const WSETH = '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0';
const WETH = addrs[network].WETH_ADDRESS;
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    const senderAddr = senderAcc.address;
    const proxy = await getProxy(senderAcc.address);
    const proxyAddr = proxy.address;
    const compV3View = await redeploy('CompV3View');

    const collAmount = hre.ethers.utils.parseUnits('10', 18);
    const borrowAmount = hre.ethers.utils.parseUnits('1000', 6);
    await createCompV3Position(
        senderAddr, proxyAddr, proxy, USDC_MARKET, WETH, collAmount, borrowAmount,
    );
    // const collAmount = hre.ethers.utils.parseUnits('10', 18);
    // const borrowAmount = hre.ethers.utils.parseUnits('5', 18);
    // await createCompV3Position(
    //     senderAddr, proxyAddr, proxy, ETH_MARKET, WSETH, collAmount, borrowAmount,
    // );
    const loanData = await compV3View.getLoanData(USDC_MARKET, proxyAddr);
    console.log('Loan data:', loanData);
}

main();
