const { redeploy } = require('../utils/utils');

const liquityV2ViewTest = async () => {
    describe('LiquityV2-View', function () {
        this.timeout(100000);
        let viewContract;
        before(async () => {
            viewContract = await redeploy('LiquityV2View');
        });
        it('...test view calls', async () => {
            const wethMarket = '0x38e1F07b954cFaB7239D7acab49997FBaAD96476';
            const wstEthMarket = '0x2D4ef56cb626E9a4C90c156018BA9CE269573c61';
            const manager = '0x0000000000b1B2EA2ECDaEd0C7A3c402218E3CB0';
            const troveId =
                '94475724957201766309293177327232136323947474751316324443378021355493015469143';
            const troveIdInBatch =
                '100971632194317813901703704274499391669891555930010698877408310628094817035824';

            const troveData = await viewContract.callStatic.getTroveInfo(wethMarket, troveId);
            console.log(troveData);

            const troveDataBatch = await viewContract.callStatic.getTroveInfo(
                wstEthMarket,
                troveIdInBatch,
            );
            console.log(troveDataBatch);

            const marketData = await viewContract.callStatic.getMarketData(wethMarket);
            console.log(marketData);

            const sortedTrovesData = await viewContract.getMultipleSortedTroves(wethMarket, 0, 10);
            console.log(sortedTrovesData);

            const batchManagerData = await viewContract.getBatchManagerInfo(wethMarket, manager);
            console.log(batchManagerData);
        });
    });
};

describe('LiquityV2-View', function () {
    this.timeout(80000);
    it('...test LiquityV2 view', async () => {
        await liquityV2ViewTest();
    }).timeout(50000);
});
