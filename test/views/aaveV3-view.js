/* eslint-disable max-len */
const hre = require('hardhat');
const { redeploy } = require('../utils/utils');

const STK_USDC_USER = '0xc6D252fe5624d7656BED08dc7c7e507AF390100e';
const UMBRELLA_ADDRESS = '0xD400fc38ED4732893174325693a63C30ee3881a8';
const AAVE_ORACLE_ADDRESS = '0x54586bE62E3c3580375aE3723C145253060Ca0C2';
const UMBRELLA_DATA_AGGREGATOR_ADDRESS = '0xcc8FD820B1b9C5EBACA8615927f2fFc1f74B9dB3';

const aaveV3ViewTest = async () => {
    describe('AaveV3View', function () {
        this.timeout(100000);
        let viewContract;
        let aggregatorContract;

        before(async () => {
            aggregatorContract = await hre.ethers.getContractAt('IUmbrellaDataAggregator', UMBRELLA_DATA_AGGREGATOR_ADDRESS);
            viewContract = await redeploy('AaveV3View', false);
        });
        it.skip('... should call getTokensAggregatedData', async () => {
            const data = await aggregatorContract.getTokensAggregatedData(
                UMBRELLA_ADDRESS,
                AAVE_ORACLE_ADDRESS,
            );
            console.log(data[0].rewardsTokenData);
        });
        it.skip('... should call getUserAggregatedData', async () => {
            const data = await aggregatorContract.getUserAggregatedData(
                UMBRELLA_ADDRESS,
                STK_USDC_USER,
            );
            console.log(data[0].rewardsTokenUserData);
        });
        it('... should call getAdditionalUmbrellaStakingData on AaveV3View', async () => {
            const data = await viewContract.getAdditionalUmbrellaStakingData(
                UMBRELLA_ADDRESS,
            );
            console.log(data);
        });
    });
};

describe('AaveV3View', function () {
    this.timeout(80000);
    it('AaveV3View', async () => {
        await aaveV3ViewTest();
    }).timeout(50000);
});
