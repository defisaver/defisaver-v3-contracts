/* eslint-disable no-mixed-operators */
/* eslint-disable no-await-in-loop */
/* eslint-disable import/no-extraneous-dependencies */
const hre = require('hardhat');
const { start } = require('../utils/starter');
const curveUsdInfo = require('./curveusd.json');
// data from https://community.chaoslabs.xyz/crv-usd/risk/wallets
async function main() {
    const view = await (await hre.ethers.getContractFactory('PositionOwnerInfoView')).deploy();
    const curveProtocolNumbers = {
        positionsTotal: 0,
        eoaPositions: 0,
        proxyPostions: 0,
        safePositions: 0,
        proxyOwnedBySafePositions: 0,
        suppliedTotal: 0,
        borrowedTotal: 0,
        suppliedOnEOA: 0,
        borrowedOnEOA: 0,
        suppliedOnProxy: 0,
        borrowedOnProxy: 0,
        suppliedOnProxyOwnedBySafe: 0,
        borrowedOnProxyOwnedBySafe: 0,
        suppliedOnSafe: 0,
        borrowedOnSafe: 0,
    };
    for (let i = 0; i < curveUsdInfo.length; i++) {
        console.log(`${i}/${curveUsdInfo.length}`);
        const walletInfo = await view.callStatic.getInfoForAddress(curveUsdInfo[i].Wallet);
        const supplied = curveUsdInfo[i]['Total Collateral'];
        const borrowed = curveUsdInfo[i]['Total Borrow'];

        curveProtocolNumbers.suppliedTotal += supplied;
        curveProtocolNumbers.borrowedTotal += borrowed;
        curveProtocolNumbers.positionsTotal++;

        if (walletInfo.isEOA) {
            curveProtocolNumbers.eoaPositions++;
            curveProtocolNumbers.suppliedOnEOA += supplied;
            curveProtocolNumbers.borrowedOnEOA += borrowed;
        }
        if (walletInfo.isProxy) {
            curveProtocolNumbers.proxyPostions++;
            curveProtocolNumbers.suppliedOnProxy += supplied;
            curveProtocolNumbers.borrowedOnProxy += borrowed;
            if (walletInfo.isProxyOwnedBySafe) {
                curveProtocolNumbers.proxyOwnedBySafePositions++;
                curveProtocolNumbers.suppliedOnProxyOwnedBySafe += supplied;
                curveProtocolNumbers.borrowedOnProxyOwnedBySafe += borrowed;
            }
        }
        if (walletInfo.isSafe) {
            curveProtocolNumbers.safePositions++;
            curveProtocolNumbers.suppliedOnSafe += supplied;
            curveProtocolNumbers.borrowedOnSafe += borrowed;
        }
    }
    console.log(`In total there are ${curveProtocolNumbers.positionsTotal} positions, with ${curveProtocolNumbers.suppliedTotal.toFixed(0)}$ supplied and ${curveProtocolNumbers.borrowedTotal.toFixed(0)}$ borrowed`);
    console.log(`There are ${curveProtocolNumbers.eoaPositions} positions owned by EOA, with ${curveProtocolNumbers.suppliedOnEOA.toFixed(0)}$ supplied and ${curveProtocolNumbers.borrowedOnEOA.toFixed(0)}$ borrowed`);
    console.log(`They make up ${(curveProtocolNumbers.eoaPositions / curveProtocolNumbers.positionsTotal * 100).toFixed(1)}% of positions, ${(curveProtocolNumbers.suppliedOnEOA / curveProtocolNumbers.suppliedTotal * 100).toFixed(1)}% of supply and ${(curveProtocolNumbers.borrowedOnEOA / curveProtocolNumbers.borrowedTotal * 100).toFixed(1)}% of borrow`);
    console.log(`There are ${curveProtocolNumbers.proxyPostions} positions owned by DSProxy, with ${curveProtocolNumbers.suppliedOnProxy.toFixed(0)}$ supplied and ${curveProtocolNumbers.borrowedOnProxy.toFixed(0)}$ borrowed`);
    console.log(`They make up ${(curveProtocolNumbers.proxyPostions / curveProtocolNumbers.positionsTotal * 100).toFixed(1)}% of positions, ${(curveProtocolNumbers.suppliedOnProxy / curveProtocolNumbers.suppliedTotal * 100).toFixed(1)}% of supply and ${(curveProtocolNumbers.borrowedOnProxy / curveProtocolNumbers.borrowedTotal * 100).toFixed(1)}% of borrow`);
    console.log(`There are ${curveProtocolNumbers.safePositions} positions owned by Safe, with ${curveProtocolNumbers.suppliedOnSafe.toFixed(0)}$ supplied and ${curveProtocolNumbers.borrowedOnSafe.toFixed(0)}$ borrowed`);
    console.log(`They make up ${(curveProtocolNumbers.safePositions / curveProtocolNumbers.positionsTotal * 100).toFixed(1)}% of positions, ${(curveProtocolNumbers.suppliedOnSafe / curveProtocolNumbers.suppliedTotal * 100).toFixed(1)}% of supply and ${(curveProtocolNumbers.borrowedOnSafe / curveProtocolNumbers.borrowedTotal * 100).toFixed(1)}% of borrow`);

    console.log(`There are ${curveProtocolNumbers.proxyOwnedBySafePositions} positions owned by a DSProxy owned by Safe, with ${curveProtocolNumbers.suppliedOnProxyOwnedBySafe.toFixed(0)}$ supplied and ${curveProtocolNumbers.borrowedOnProxyOwnedBySafe.toFixed(0)}$ borrowed`);

    process.exit(0);
}

start(main);
