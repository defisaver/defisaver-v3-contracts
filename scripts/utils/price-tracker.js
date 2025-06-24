/* eslint-disable import/no-extraneous-dependencies */
const CoinGecko = require('coingecko-api');
const fs = require('fs');

const CoinGeckoClient = new CoinGecko();

const req = CoinGeckoClient.simple.price({
    ids:
        'staked-ether,curve-dao-token,ethereum,aave,basic-attention-token,usd-coin,'
        + 'uniswap,nusd,binance-usd,augur,havven,'
        + 'republic-protocol,maker,enjincoin,dai,wrapped-bitcoin,weth,'
        + 'renbtc,0x,kyber-network,decentraland,paxos-standard,compound-governance-token,'
        + 'gemini-dollar,yearn-finance,liquity-usd,liquity,tornado-cash,musd,imusd,rai,'
        + 'loopring,chainlink,tether,true-usd,balancer,musd,imusd,pax-dollar,arbitrum,gmx,'
        + 'gemini-dollar,yearn-finance,liquity-usd,liquity,tornado-cash,sushi,matic-network,boosted-lusd,wrapped-steth,'
        + 'gnosis,rocket-pool-eth,frax-ether,staked-frax-ether,tbtc,crvusd,ethena-staked-usde,optimism',
    vs_currencies: 'usd',
});

req.then((result) => {
    fs.writeFileSync('test/prices.json', JSON.stringify(result.data));
});
