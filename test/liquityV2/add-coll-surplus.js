const hre = require('hardhat');
const {
    getOwnerAddr,
    setBalance,
} = require('../utils');
const { topUp } = require('../../scripts/utils/fork');

const addCollateralSurplus = async () => {
    describe('Add collateral surplus', function () {
        this.timeout(100000);

        before(async () => {
            await topUp(getOwnerAddr());

            // weth
            const troveManagerAddr = '0x432b5177dc698db7e6472dadaf0c5b5e0352d529';
            const collSurplusPoolAddr = '0x81c14cf983f1b3b5c6348d5359b91d810e891db4';
            const collateralAddr = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';

            // wstETH
            // const troveManagerAddr = '0x3c7227426adff80d31f039575407b2007477e1ce';
            // const collSurplusPoolAddr = '0x4853c13bd807c4e8b3294c318554a283070df2d6';
            // const collateralAddr = '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0';

            const account = '0xA0Fb34B9702B7DF5c5B6dEecF07442F39C1ca83d';
            const claimableColl = hre.ethers.utils.parseEther('10');

            const troveManagerSigner = await hre.ethers.getSigner(troveManagerAddr);
            const collSurplusPoolContract = await hre.ethers.getContractAt(
                'contracts/interfaces/liquityV2/ICollSurplusPool.sol:ICollSurplusPool',
                collSurplusPoolAddr,
                troveManagerSigner,
            );
            collSurplusPoolContract.accountSurplus(account, claimableColl);
            await setBalance(collateralAddr, collSurplusPoolAddr, claimableColl.mul(100));
        });

        it('...test', async () => {});
    });
};

describe('Add collateral surplus', function () {
    this.timeout(80000);
    it('... add collateral surplus', async () => {
        await addCollateralSurplus();
    }).timeout(50000);
});
