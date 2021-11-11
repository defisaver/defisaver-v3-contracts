const CoinGecko = require('coingecko-api');
const fs = require('fs');

const CoinGeckoClient = new CoinGecko();

const req = CoinGeckoClient.simple.price({
    ids:
        'ethereum,aave,basic-attention-token,usd-coin,'
        + 'uniswap,nusd,binance-usd,augur,havven,'
        + 'republic-protocol,maker,enjincoin,dai,wrapped-bitcoin,weth,'
        + 'renbtc,0x,kyber-network,decentraland,paxos-standard,compound-governance-token,'
        + 'loopring,chainlink,tether,true-usd,balancer,'
        + 'gemini-dollar,yearn-finance,liquity-usd,kyber-network-crystal,liquity'
        + 'tornado-cash,rai',
    vs_currencies: 'usd',
});

req.then((result) => {
    fs.writeFileSync('test/prices.json', JSON.stringify(result.data));
});
