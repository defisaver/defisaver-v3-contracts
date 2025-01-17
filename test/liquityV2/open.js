/* eslint-disable max-len */
const hre = require('hardhat');
const {
    getOwnerAddr,
    setBalance,
    approve,
} = require('../utils');
const { topUp } = require('../../scripts/utils/fork');

const open = async () => {
    describe('EOA open', function () {
        this.timeout(100000);
        let isFork;
        let senderAcc;
        let viewContract;

        const markets = [
            '0xd7199b16945f1ebaa0b301bf3d05bf489caa408b',
            '0x0d22113a543826eeaf2ae0fc9d10aea66efba156',
        ];

        before(async () => {
            isFork = true;
            senderAcc = (await hre.ethers.getSigners())[0];
            if (isFork) {
                await topUp(senderAcc.address);
                await topUp(getOwnerAddr());
                viewContract = await hre.ethers.getContractAt('LiquityV2View', '0x88bBa5Ce5cE20286Cf866b9f310354FFB701A296');
            }
        });
        for (let i = 0; i < markets.length; i++) {
            it(`...test open on ${markets[i]}`, async () => {
                const signer = hre.ethers.provider.getSigner(senderAcc.address);
                const marketContract = await hre.ethers.getContractAt('IAddressesRegistry', markets[i]);
                const collToken = await marketContract.collToken();
                const wethToken = await marketContract.WETH();
                const borrowOpsAddr = await marketContract.borrowerOperations();
                const borrowOpsContract = await hre.ethers.getContractAt('contracts/interfaces/liquityV2/IBorrowerOperations.sol:IBorrowerOperations', borrowOpsAddr, signer);
                const collAmount = hre.ethers.utils.parseUnits('50', 18);
                const borrowAmount = hre.ethers.utils.parseUnits('32000', 18);

                console.log('Collateral:', collToken);
                console.log('WETH:', wethToken);
                console.log('BorrowOps:', borrowOpsAddr);
                console.log('Collateral amount:', collAmount);
                console.log('Borrow amount:', borrowAmount);
                console.log('Sender:', senderAcc.address);

                const testAmount = hre.ethers.utils.parseUnits('100000', 18);
                const WETH = await hre.ethers.getContractAt('IWETH', wethToken, signer);

                if (collToken === wethToken) {
                    await WETH.deposit({ value: testAmount });
                    await approve(collToken, borrowOpsAddr, senderAcc);
                } else {
                    await setBalance(collToken, senderAcc.address, testAmount);
                    await WETH.deposit({ value: testAmount });
                    await approve(collToken, borrowOpsAddr, senderAcc);
                    await approve(wethToken, borrowOpsAddr, senderAcc);
                }

                const ownerIndex = 0;
                const tx = await borrowOpsContract.openTrove(
                    senderAcc.address,
                    ownerIndex,
                    collAmount,
                    borrowAmount,
                    0,
                    0,
                    hre.ethers.utils.parseUnits('1', 16),
                    hre.ethers.utils.parseUnits('10000', 18),
                    hre.ethers.constants.AddressZero,
                    hre.ethers.constants.AddressZero,
                    hre.ethers.constants.AddressZero,
                );
                await tx.wait();

                const encodedData = hre.ethers.utils.defaultAbiCoder.encode(
                    ['address', 'uint256'],
                    [senderAcc.address, ownerIndex],
                );
                const troveId = hre.ethers.utils.keccak256(encodedData);
                const troveData = await viewContract.getTroveInfo(markets[i], troveId);
                console.log(troveData);
                const marketData = await viewContract.getMarketData(markets[i]);
                console.log(marketData);
            });
        }
    });
};

describe('LiquityV2-Eoa-Open', function () {
    this.timeout(300000);

    it('...test LiquityV2 Eoa open', async () => {
        await open();
    }).timeout(300000);
});
