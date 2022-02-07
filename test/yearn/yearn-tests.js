const { expect } = require('chai');
const hre = require('hardhat');

const {
    getProxy,
    redeploy,
    balanceOf,
    fetchAmountinUSDPrice,
    WETH_ADDRESS,
    approve,
    UNISWAP_WRAPPER,
    depositToWeth,
    YEARN_REGISTRY_ADDRESS,
} = require('../utils');

const { yearnSupply, sell, yearnWithdraw } = require('../actions.js');

const yearnSupplyTest = async (testLength) => {
    describe('Yearn-Supply', function () {
        this.timeout(80000);

        let senderAcc; let
            proxy;
        let yearnRegistry;

        const yearnPairs = [
            { name: 'WETH', token: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
            { name: 'YFI', token: '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e' },
            { name: '3Crv', token: '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490' },
            { name: 'yDAI+yUSDC+yUSDT+yTUSD', token: '0xdF5e0e81Dff6FAF3A7e52BA697820c5e32D806A8' },
            { name: 'DAI', token: '0x6B175474E89094C44Da98b954EedeAC495271d0F' },
            { name: 'USDC', token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
            { name: 'USDT', token: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
            { name: 'WBTC', token: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' },
            { name: '1INCH', token: '0x111111111117dC0aa78b770fA6A738034120C302' },
        ];

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            yearnRegistry = await hre.ethers.getContractAt('IYearnRegistry', YEARN_REGISTRY_ADDRESS);
        });
        // eslint-disable-next-line no-param-reassign
        if (testLength === 0) testLength = yearnPairs.length;
        for (let i = 0; i < testLength; i++) {
            it(`... should supply ${yearnPairs[i].name} to Yearn`, async () => {
                const token = yearnPairs[i].token;
                const yToken = await yearnRegistry.latestVault(token);
                if (token !== WETH_ADDRESS) {
                    await sell(
                        proxy,
                        WETH_ADDRESS,
                        token,
                        hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '10000'), 18),
                        UNISWAP_WRAPPER,
                        senderAcc.address,
                        senderAcc.address,
                    );
                } else {
                    await depositToWeth(hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '10000'), 18));
                }

                const tokenAmountStart = await balanceOf(token, senderAcc.address);
                const yTokenAmountStart = await balanceOf(yToken, senderAcc.address);

                const amountToSupply = tokenAmountStart.div(10);
                await approve(token, proxy.address);
                await yearnSupply(
                    token, amountToSupply, senderAcc.address, senderAcc.address, proxy,
                );

                const tokenAmountAfterFirst = await balanceOf(token, senderAcc.address);
                const yTokenAmountAfterFirst = await balanceOf(yToken, senderAcc.address);

                expect(tokenAmountAfterFirst).to.be.eq(tokenAmountStart.sub(amountToSupply));
                expect(yTokenAmountAfterFirst).to.be.gt(yTokenAmountStart);

                await yearnSupply(token,
                    hre.ethers.constants.MaxUint256,
                    senderAcc.address,
                    senderAcc.address,
                    proxy);

                const tokenAmountEnd = await balanceOf(token, senderAcc.address);
                const yTokenAmountEnd = await balanceOf(yToken, senderAcc.address);

                expect(tokenAmountEnd).to.be.eq(0);
                expect(yTokenAmountEnd).to.be.gt(yTokenAmountAfterFirst);
            }).timeout(50000);
        }
    });
};

const yearnWithdrawTest = async (testLength) => {
    describe('Yearn-Withdraw', function () {
        this.timeout(80000);

        let senderAcc; let
            proxy;
        let yearnRegistry;

        const yearnPairs = [
            { name: 'WETH', token: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
            { name: 'YFI', token: '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e' },
            { name: '3Crv', token: '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490' },
            { name: 'yDAI+yUSDC+yUSDT+yTUSD', token: '0xdF5e0e81Dff6FAF3A7e52BA697820c5e32D806A8' },
            { name: 'DAI', token: '0x6B175474E89094C44Da98b954EedeAC495271d0F' },
            { name: 'USDC', token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
            { name: 'USDT', token: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
            { name: 'WBTC', token: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' },
            { name: '1INCH', token: '0x111111111117dC0aa78b770fA6A738034120C302' },
        ];

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            yearnRegistry = await hre.ethers.getContractAt('IYearnRegistry', YEARN_REGISTRY_ADDRESS);
        });

        // eslint-disable-next-line no-param-reassign
        if (testLength === 0) testLength = yearnPairs.length;
        for (let i = 0; i < testLength; i++) {
            it(`... should withdraw ${yearnPairs[i].name} from Yearn`, async () => {
                const token = yearnPairs[i].token;
                const yToken = await yearnRegistry.latestVault(token);
                if (token !== WETH_ADDRESS) {
                    await sell(
                        proxy,
                        WETH_ADDRESS,
                        token,
                        hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '10000'), 18),
                        UNISWAP_WRAPPER,
                        senderAcc.address,
                        senderAcc.address,
                    );
                } else {
                    await depositToWeth(hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '10000'), 18));
                }
                await approve(token, proxy.address);
                await yearnSupply(token,
                    hre.ethers.constants.MaxUint256,
                    senderAcc.address,
                    senderAcc.address,
                    proxy);

                const tokenAmountStart = await balanceOf(token, senderAcc.address);
                const yTokenAmountStart = await balanceOf(yToken, senderAcc.address);
                const amountToWithdraw = yTokenAmountStart.div(10);
                await approve(yToken, proxy.address);
                await yearnWithdraw(
                    yToken,
                    amountToWithdraw,
                    senderAcc.address,
                    senderAcc.address,
                    proxy,
                );

                const tokenAmountAfterFirst = await balanceOf(token, senderAcc.address);
                const yTokenAmountAfterFirst = await balanceOf(yToken, senderAcc.address);
                expect(yTokenAmountAfterFirst).to.be.eq(yTokenAmountStart.sub(amountToWithdraw));
                expect(tokenAmountAfterFirst).to.be.gt(tokenAmountStart);

                await yearnWithdraw(
                    yToken,
                    hre.ethers.constants.MaxUint256,
                    senderAcc.address,
                    senderAcc.address,
                    proxy,
                );

                const tokenAmountEnd = await balanceOf(token, senderAcc.address);
                const yTokenAmountEnd = await balanceOf(yToken, senderAcc.address);
                expect(tokenAmountEnd).to.be.gt(tokenAmountAfterFirst);
                expect(yTokenAmountEnd).to.be.eq(0);
            }).timeout(100000);
        }
    });
};

const yearnDeployContracts = async () => {
    await redeploy('YearnSupply');
    await redeploy('YearnWithdraw');
};

const yearnFullTest = async (testLength) => {
    await yearnDeployContracts();

    await yearnSupplyTest(testLength);
    await yearnWithdrawTest(testLength);
};

module.exports = {
    yearnSupplyTest,
    yearnWithdrawTest,
    yearnDeployContracts,
    yearnFullTest,
};
