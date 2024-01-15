/* eslint-disable max-len */
/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { start } = require('./utils/starter');

const {
    approve, setBalance, getProxy, nullAddress, redeploy, addrs,
} = require('../test/utils');

const { topUp } = require('./utils/fork');
const { morphoBlueBorrow } = require('../test/actions');

async function main() {
    // replace hardhat_setStorage to hardhat_setStorage accross the repo
    // RUN SCRIPT WITH: node scripts/deploy-morphoBlue --network fork

    // const lsvView = await redeploy('LSVView', addrs.mainnet.REGISTRY_ADDR, true, true);

    // console.log('LSVView deployed to:', lsvView.address);
    const marketParams = [
        '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
        '0x2a01eb9496094da03c4e364def50f5ad1280ad72',
        '0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC',
        '945000000000000000',
    ];
    const wallet = await hre.ethers.provider.getSigner('0xEA57Dc30959eb17c506E4dA095fa9181f3E0Ac6D');
    console.log(wallet.address);
    wallet.address = wallet._address;
    let proxy = await getProxy(wallet.address);
    proxy = proxy.connect(wallet);
    await topUp(wallet.address);
    const morphoBlue = await hre.ethers.getContractAt('IMorphoBlue', '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb');
    /*
    await setBalance('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', wallet.address, hre.ethers.utils.parseUnits('10000'));
    await approve('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', morphoBlue.address, wallet);
    await morphoBlue.connect(wallet).supply(marketParams, hre.ethers.utils.parseUnits('1000'), '0', wallet.address, [], { gasLimit: 3000000 });
*/
    await setBalance('0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0', wallet.address, hre.ethers.utils.parseUnits('10000'));
    await approve('0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0', morphoBlue.address, wallet);
    await morphoBlue.connect(wallet).supplyCollateral(marketParams, hre.ethers.utils.parseUnits('100'), wallet.address, [], { gasLimit: 3000000 });
    await morphoBlue.connect(wallet).borrow(marketParams, hre.ethers.utils.parseUnits('100'), '0', wallet.address, wallet.address, { gasLimit: 3000000 });
    await morphoBlue.connect(wallet).supplyCollateral(marketParams, hre.ethers.utils.parseUnits('100'), proxy.address, [], { gasLimit: 3000000 });
    await morphoBlueBorrow(
        proxy, marketParams, hre.ethers.utils.parseUnits('100'), nullAddress, wallet.address,
    );
    process.exit(0);
}

start(main);
