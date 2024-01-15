/* eslint-disable no-mixed-operators */
/* eslint-disable no-await-in-loop */
/* eslint-disable import/no-extraneous-dependencies */
const hre = require('hardhat');
const { start } = require('../utils/starter');
let liquityInfo = require('./liquity.json');
// data from liquity.defiexplore.com api
async function main() {
    liquityInfo = liquityInfo.data;
    const view = await (await hre.ethers.getContractFactory('PositionOwnerInfoView')).deploy();
    const liquityProtocolNumbers = {
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
    for (let i = 0; i < liquityInfo.length; i++) {
        console.log(`${i}/${liquityInfo.length}`);
        const walletInfo = await view.getInfoForAddress(liquityInfo[i].owner);
        const supplied = liquityInfo[i].collateral;
        const borrowed = liquityInfo[i].debt;

        liquityProtocolNumbers.suppliedTotal += supplied;
        liquityProtocolNumbers.borrowedTotal += borrowed;
        liquityProtocolNumbers.positionsTotal++;

        if (walletInfo.isEOA) {
            liquityProtocolNumbers.eoaPositions++;
            liquityProtocolNumbers.suppliedOnEOA += supplied;
            liquityProtocolNumbers.borrowedOnEOA += borrowed;
        }
        if (walletInfo.isProxy) {
            liquityProtocolNumbers.proxyPostions++;
            liquityProtocolNumbers.suppliedOnProxy += supplied;
            liquityProtocolNumbers.borrowedOnProxy += borrowed;
            if (walletInfo.isProxyOwnedBySafe) {
                liquityProtocolNumbers.proxyOwnedBySafePositions++;
                liquityProtocolNumbers.suppliedOnProxyOwnedBySafe += supplied;
                liquityProtocolNumbers.borrowedOnProxyOwnedBySafe += borrowed;
            }
        }
        if (walletInfo.isSafe) {
            liquityProtocolNumbers.safePositions++;
            liquityProtocolNumbers.suppliedOnSafe += supplied;
            liquityProtocolNumbers.borrowedOnSafe += borrowed;
        }
    }
    console.log(`In total there are ${liquityProtocolNumbers.positionsTotal} positions, with ${liquityProtocolNumbers.suppliedTotal.toFixed(0)} ETH supplied and ${liquityProtocolNumbers.borrowedTotal.toFixed(0)} LUSD borrowed`);
    console.log(`There are ${liquityProtocolNumbers.eoaPositions} positions owned by EOA, with ${liquityProtocolNumbers.suppliedOnEOA.toFixed(0)} ETH supplied and ${liquityProtocolNumbers.borrowedOnEOA.toFixed(0)} LUSD borrowed`);
    console.log(`They make up ${(liquityProtocolNumbers.eoaPositions / liquityProtocolNumbers.positionsTotal * 100).toFixed(1)}% of positions, ${(liquityProtocolNumbers.suppliedOnEOA / liquityProtocolNumbers.suppliedTotal * 100).toFixed(1)}% of supply and ${(liquityProtocolNumbers.borrowedOnEOA / liquityProtocolNumbers.borrowedTotal * 100).toFixed(1)}% of borrow`);
    console.log(`There are ${liquityProtocolNumbers.proxyPostions} positions owned by DSProxy, with ${liquityProtocolNumbers.suppliedOnProxy.toFixed(0)} ETH  supplied and ${liquityProtocolNumbers.borrowedOnProxy.toFixed(0)} LUSD borrowed`);
    console.log(`They make up ${(liquityProtocolNumbers.proxyPostions / liquityProtocolNumbers.positionsTotal * 100).toFixed(1)}% of positions, ${(liquityProtocolNumbers.suppliedOnProxy / liquityProtocolNumbers.suppliedTotal * 100).toFixed(1)}% of supply and ${(liquityProtocolNumbers.borrowedOnProxy / liquityProtocolNumbers.borrowedTotal * 100).toFixed(1)}% of borrow`);
    console.log(`There are ${liquityProtocolNumbers.safePositions} positions owned by Safe, with ${liquityProtocolNumbers.suppliedOnSafe.toFixed(0)} ETH  supplied and ${liquityProtocolNumbers.borrowedOnSafe.toFixed(0)} LUSD borrowed`);
    console.log(`They make up ${(liquityProtocolNumbers.safePositions / liquityProtocolNumbers.positionsTotal * 100).toFixed(1)}% of positions, ${(liquityProtocolNumbers.suppliedOnSafe / liquityProtocolNumbers.suppliedTotal * 100).toFixed(1)}% of supply and ${(liquityProtocolNumbers.borrowedOnSafe / liquityProtocolNumbers.borrowedTotal * 100).toFixed(1)}% of borrow`);

    console.log(`There are ${liquityProtocolNumbers.proxyOwnedBySafePositions} positions owned by a DSProxy owned by Safe, with ${liquityProtocolNumbers.suppliedOnProxyOwnedBySafe.toFixed(0)} ETH  supplied and ${liquityProtocolNumbers.borrowedOnProxyOwnedBySafe.toFixed(0)} LUSD borrowed`);

    process.exit(0);
}

start(main);
