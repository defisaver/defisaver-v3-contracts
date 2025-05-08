/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { start } = require('../utils/starter');

async function main() {
    const marketAddr = '0x7d2d2c79ec89c7f1d718ae1586363ad2c56ded9d';
    const troveId = '87461897962246178025218499999295362232501511360197764999439225905008603060516';
    const market = await hre.ethers.getContractAt('IAddressesRegistry', marketAddr);
    const troveManagerAddress = await market.troveManager();
    const sortedTrovesAddress = await market.sortedTroves();

    const trovesMappingSlot = 11;
    const troveStatusOffset = 3;

    const troveSlot = hre.ethers.utils.keccak256(
        hre.ethers.utils.defaultAbiCoder.encode(
            ['uint256', 'uint256'],
            [troveId, trovesMappingSlot],
        ),
    );
    const troveStatusSlot = hre.ethers.BigNumber.from(troveSlot).add(troveStatusOffset);

    await hre.ethers.provider.send('tenderly_setStorageAt', [
        troveManagerAddress,
        hre.ethers.utils.hexlify(troveStatusSlot),
        hre.ethers.utils.hexZeroPad(
            hre.ethers.BigNumber.from(4).toHexString(), 32,
        ),
    ]);

    const troveManager = await hre.ethers.getContractAt('contracts/interfaces/liquityV2/ITroveManager.sol:ITroveManager', troveManagerAddress);
    const status = await troveManager.getTroveStatus(troveId);
    console.log('Trove status:', status);

    const sizeSlot = hre.ethers.BigNumber.from(0);
    const nodesSlot = 1;

    const nodeTroveIdSlot = hre.ethers.utils.keccak256(
        hre.ethers.utils.defaultAbiCoder.encode(
            ['uint256', 'uint256'],
            [troveId, nodesSlot],
        ),
    );

    const nodeTroveIdNextIdSlot = nodeTroveIdSlot;
    const nodeTroveIdNextIdValue = await hre.ethers.provider.send('eth_getStorageAt', [
        sortedTrovesAddress,
        nodeTroveIdNextIdSlot,
        'latest',
    ]);

    const nodeTroveIdPrevIdSlot = hre.ethers.BigNumber.from(nodeTroveIdSlot).add(1);
    const nodeTroveIdPrevIdValue = await hre.ethers.provider.send('eth_getStorageAt', [
        sortedTrovesAddress,
        hre.ethers.utils.hexlify(nodeTroveIdPrevIdSlot),
        'latest',
    ]);

    const sortedTroves = await hre.ethers.getContractAt('contracts/interfaces/liquityV2/ISortedTroves.sol:ISortedTroves', sortedTrovesAddress);
    const currentSize = await sortedTroves.size();

    console.log('Current size:', currentSize.toString());
    console.log('Next ID:', nodeTroveIdNextIdValue);
    console.log('Prev ID:', nodeTroveIdPrevIdValue);

    await hre.ethers.provider.send('tenderly_setStorageAt', [
        sortedTrovesAddress,
        hre.ethers.utils.hexZeroPad(sizeSlot.toHexString(), 32),
        hre.ethers.utils.hexZeroPad(
            hre.ethers.BigNumber.from(currentSize.sub(1)).toHexString(), 32,
        ),
    ]);

    const sizeAfter = await sortedTroves.size();
    console.log('Size after:', sizeAfter.toString());

    await hre.ethers.provider.send('tenderly_setStorageAt', [
        sortedTrovesAddress,
        hre.ethers.utils.hexZeroPad(
            hre.ethers.utils.keccak256(
                hre.ethers.utils.defaultAbiCoder.encode(
                    ['uint256', 'uint256'],
                    [hre.ethers.BigNumber.from(nodeTroveIdPrevIdValue), nodesSlot],
                ),
            ),
            32,
        ),
        nodeTroveIdNextIdValue,
    ]);

    await hre.ethers.provider.send('tenderly_setStorageAt', [
        sortedTrovesAddress,
        hre.ethers.utils.hexZeroPad(
            hre.ethers.BigNumber.from(
                hre.ethers.utils.keccak256(
                    hre.ethers.utils.defaultAbiCoder.encode(
                        ['uint256', 'uint256'],
                        [hre.ethers.BigNumber.from(nodeTroveIdNextIdValue), nodesSlot],
                    ),
                ),
            ).add(1).toHexString(),
            32,
        ),
        nodeTroveIdPrevIdValue,
    ]);

    await hre.ethers.provider.send('tenderly_setStorageAt', [
        sortedTrovesAddress,
        hre.ethers.utils.hexZeroPad(nodeTroveIdSlot, 32),
        hre.ethers.constants.HashZero,
    ]);

    await hre.ethers.provider.send('tenderly_setStorageAt', [
        sortedTrovesAddress,
        hre.ethers.utils.hexZeroPad(nodeTroveIdPrevIdSlot.toHexString(), 32),
        hre.ethers.constants.HashZero,
    ]);

    await hre.ethers.provider.send('tenderly_setStorageAt', [
        sortedTrovesAddress,
        hre.ethers.utils.hexZeroPad(
            hre.ethers.BigNumber.from(nodeTroveIdSlot).add(2).toHexString(),
            32,
        ),
        hre.ethers.constants.HashZero,
    ]);

    console.log('Trove status updated to zombie and removed from sorted list');

    process.exit(0);
}

start(main);
