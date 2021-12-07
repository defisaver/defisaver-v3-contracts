const { getAssetInfo } = require('@defisaver/tokens');
const { sell, mStableDeposit } = require('./actions');
const {
    getProxy,
    fetchAmountinUSDPrice,
    Float2BN,
    UNISWAP_WRAPPER,
    balanceOf,
} = require('./utils');

const mUSD = '0xe2f2a5c287993345a840db3b0845fbc70f5935a5';
const imUSD = '0x30647a72Dc82d7Fbb1123EA74716aB8A317Eac19';
const imUSDVault = '0x78befca7de27d07dc6e71da295cc2946681a6c7b';
const MTA = '0xa3BeD4E1c75D00fa6f4E5E6922DB7261B5E9AcD2';

const buyCoinAndSave = async (senderAcc, stableCoinAddr, saveAmount, stake) => {
    const proxy = await getProxy(senderAcc.address);

    await sell(
        proxy,
        getAssetInfo('WETH').address,
        stableCoinAddr,
        Float2BN(fetchAmountinUSDPrice('WETH', saveAmount)),
        UNISWAP_WRAPPER,
        senderAcc.address,
        proxy.address,
    );

    const stableCoinAmount = await balanceOf(stableCoinAddr, proxy.address);

    await mStableDeposit(
        proxy,
        stableCoinAddr,
        mUSD,
        imUSD,
        imUSDVault,
        proxy.address,
        proxy.address,
        stableCoinAmount,
        0,
        stake,
    );
};

module.exports = {
    buyCoinAndSave,
    mUSD,
    imUSD,
    imUSDVault,
    MTA,
};
