/* eslint-disable max-len */
const { network, redeploy } = require('../utils/utils');

const TEST_DATA = {
    mainnet: {
        BORROW_USER: '0x9600A48ed0f931d0c422D574e3275a90D8b22745',
        EARN_USER: '0x2fA6c95B69c10f9F52b8990b6C03171F13C46225',
        VAULT_ADDR: '0x1982CC7b1570C2503282d0A0B41F69b3B28fdcc3',
        NFT_ID: 1566,
        F_USDC_ADDR: '0x9Fb7b4477576Fe5B32be4C1843aFB1e55F251B33',
        SMART_COLL_VAULT: '0x4e564A29c1FC18ed9b66e5754A37fCa0C8a980ff',
        SMART_DEBT_VAULT: '0x01F0D07fdE184614216e76782c6b7dF663F5375e',
        SMART_COLL_DEBT_VAULT: '0x469D8c7990b9072EEF05d6349224621a71176213',
        SMART_COLL_USER: '0x90C290a07A52bE5B6340Dc971ca6c954d630bDcd',
        SMART_DEBT_USER: '0x4127143a866Bf5D8AD2AFb6de8e63164B8Ad5bF6',
        SMART_COLL_DEBT_USER: '0xc6dD9976066F3364b4D6A72cD4F1fA0468327Aa7',
    },
    arbitrum: {
        BORROW_USER: '0x20b58Af3E23cbb866ecA0c3e0bfD5d5954eFFEa7',
        EARN_USER: '0x0a0b4D654D967a00407F5329588a258b68a4f615',
        VAULT_ADDR: '0xb4F3bf2d96139563777C0231899cE06EE95Cc946',
        NFT_ID: 150,
        F_USDC_ADDR: '0x1A996cb54bb95462040408C06122D45D6Cdb6096',
        SMART_COLL_VAULT: '0x3996464c0fCCa8183e13ea5E5e74375e2c8744Dd',
        SMART_DEBT_VAULT: '0xF74cb9D69ada3559903149CFD60fD57cEAF95F30',
        SMART_COLL_DEBT_VAULT: '0x3A0b7c8840D74D39552EF53F586dD8c3d1234C40',
        SMART_COLL_USER: '0x9b1f1C854a8a670460AefC2d8ac888a99554855C',
        SMART_DEBT_USER: '0xb550a780442247D6d7d15Dc3A5856c73a2f1EC9e',
        SMART_COLL_DEBT_USER: '0x446442C3CADc9B8bb63757b72Dab33f9B0Cd91C6',
    },
    base: {
        BORROW_USER: '0x506e6B78f9b1C4598D95D5Aa632A4c3487c277BE',
        EARN_USER: '0x0Cd6E325f06E97ff1083b025df8a910A4Cc4a245',
        VAULT_ADDR: '0xdF16AdaF80584b2723F3BA1Eb7a601338Ba18c4e',
        NFT_ID: 150,
        F_USDC_ADDR: '0xf42f5795D9ac7e9D757dB633D693cD548Cfd9169',
        // Smart COLL/DEBT not supported on base atm
        SMART_COLL_VAULT: '0x0000000000000000000000000000000000000000',
        SMART_DEBT_VAULT: '0x0000000000000000000000000000000000000000',
        SMART_COLL_DEBT_VAULT: '0x0000000000000000000000000000000000000000',
        SMART_COLL_USER: '0x0000000000000000000000000000000000000000',
        SMART_DEBT_USER: '0x0000000000000000000000000000000000000000',
        SMART_COLL_DEBT_USER: '0x0000000000000000000000000000000000000000',
    },
};

const fluidViewTest = async () => {
    describe('Fluid-View', function () {
        this.timeout(100000);
        let viewContract;

        const isZeroAddress = (address) => address === '0x0000000000000000000000000000000000000000';

        before(async () => {
            viewContract = await redeploy('FluidView', false);
        });
        it('... should call getUserPositions', async () => {
            const userPositions = await viewContract.callStatic.getUserPositions(TEST_DATA[network].BORROW_USER);
            console.log(userPositions);
        });
        it('... should call getUserNftIds', async () => {
            const userNftIds = await viewContract.getUserNftIds(TEST_DATA[network].BORROW_USER);
            console.log(userNftIds);
        });
        it('... should call getUserNftIdsWithVaultIds', async () => {
            const userNftIdsWithVaultIds = await viewContract.getUserNftIdsWithVaultIds(TEST_DATA[network].BORROW_USER);
            console.log(userNftIdsWithVaultIds);
        });
        it('... should call getPositionByNftId', async () => {
            const positionByNftId = await viewContract.callStatic.getPositionByNftId(TEST_DATA[network].NFT_ID);
            console.log(positionByNftId);
        });
        it('... should call getVaultData', async () => {
            const vaultData = await viewContract.callStatic.getVaultData(TEST_DATA[network].VAULT_ADDR);
            console.log(vaultData);
        });
        it('... should call getAllFTokens', async () => {
            const fTokens = await viewContract.getAllFTokens();
            console.log(fTokens);
        });
        it('... should call getFTokenData', async () => {
            const fTokenData = await viewContract.getFTokenData(TEST_DATA[network].F_USDC_ADDR);
            console.log(fTokenData);
        });
        it('... should call getAllFTokensData', async () => {
            const allFTokensData = await viewContract.getAllFTokensData();
            console.log(allFTokensData);
        });
        it('... should call getUserEarnPosition', async () => {
            const userEarnPosition = await viewContract.getUserEarnPosition(TEST_DATA[network].F_USDC_ADDR, TEST_DATA[network].EARN_USER);
            console.log(userEarnPosition);
        });
        it('... should call getUserEarnPositionWithFToken', async () => {
            const userEarnPositionWithFToken = await viewContract.getUserEarnPositionWithFToken(TEST_DATA[network].F_USDC_ADDR, TEST_DATA[network].EARN_USER);
            console.log(userEarnPositionWithFToken);
        });
        it('... should call getAllUserEarnPositionsWithFTokens', async () => {
            const allUserPositionsWithFTokens = await viewContract.getAllUserEarnPositionsWithFTokens(TEST_DATA[network].EARN_USER);
            console.log(allUserPositionsWithFTokens);
        });
        it('... should call getVaultData for smart coll vault', async () => {
            if (isZeroAddress(TEST_DATA[network].SMART_COLL_VAULT)) return;
            const vaultData = await viewContract.callStatic.getVaultData(TEST_DATA[network].SMART_COLL_VAULT);
            console.log(vaultData);
        });
        it('... should call getVaultData for smart debt vault', async () => {
            if (isZeroAddress(TEST_DATA[network].SMART_DEBT_VAULT)) return;
            const vaultData = await viewContract.callStatic.getVaultData(TEST_DATA[network].SMART_DEBT_VAULT);
            console.log(vaultData);
        });
        it('... should call getVaultData for smart coll and debt vault', async () => {
            if (isZeroAddress(TEST_DATA[network].SMART_COLL_DEBT_VAULT)) return;
            const vaultData = await viewContract.callStatic.getVaultData(TEST_DATA[network].SMART_COLL_DEBT_VAULT);
            console.log(vaultData);
        });
        it('... should call getVaultData for smart coll user', async () => {
            if (isZeroAddress(TEST_DATA[network].SMART_COLL_USER)) return;
            const vaultData = await viewContract.callStatic.getUserPositions(TEST_DATA[network].SMART_COLL_USER);
            console.log(vaultData);
        });
        it('... should call getVaultData for smart debt user', async () => {
            if (isZeroAddress(TEST_DATA[network].SMART_DEBT_USER)) return;
            const vaultData = await viewContract.callStatic.getUserPositions(TEST_DATA[network].SMART_DEBT_USER);
            console.log(vaultData);
        });
        it('... should call getVaultData for smart coll and debt user', async () => {
            if (isZeroAddress(TEST_DATA[network].SMART_COLL_DEBT_USER)) return;
            const vaultData = await viewContract.callStatic.getUserPositions(TEST_DATA[network].SMART_COLL_DEBT_USER);
            console.log(vaultData);
        });
        it('... get dex shares rates', async () => {
            if (!isZeroAddress(TEST_DATA[network].SMART_COLL_VAULT)) {
                const smartCollVaultRates = await viewContract.callStatic.getDexShareRates(TEST_DATA[network].SMART_COLL_VAULT);
                console.log(smartCollVaultRates);
            }
            if (!isZeroAddress(TEST_DATA[network].SMART_DEBT_VAULT)) {
                const smartDebtVaultRates = await viewContract.callStatic.getDexShareRates(TEST_DATA[network].SMART_DEBT_VAULT);
                console.log(smartDebtVaultRates);
            }
            if (!isZeroAddress(TEST_DATA[network].SMART_COLL_DEBT_VAULT)) {
                const smartCollDebtVaultRates = await viewContract.callStatic.getDexShareRates(TEST_DATA[network].SMART_COLL_DEBT_VAULT);
                console.log(smartCollDebtVaultRates);
            }
        });
    });
};

describe('fluidViewTest', function () {
    this.timeout(80000);
    it('fluidViewTest', async () => {
        await fluidViewTest();
    }).timeout(50000);
});
