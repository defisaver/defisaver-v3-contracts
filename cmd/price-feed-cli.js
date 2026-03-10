const ethers = require('ethers');

const fs = require('fs');

const { program } = require('commander');

const L2S = ['arbitrum', 'optimism', 'base'];
const ABI = ['function getFeed(address base, address quote) view returns (address)'];
const AggregatorABI = [
    'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
];

const RPC = {
    arbitrum: 'https://arb1.arbitrum.io/rpc',
    optimism: 'https://mainnet.optimism.io',
    base: 'https://mainnet.base.org',
};

async function checkPriceFeedAddresses() {
    for (let i = 0; i < L2S.length; i++) {
        const l2 = L2S[i];

        const registryFilePath = `addresses/${l2}.json`;
        const priceFeedsFilePath = `addresses/priceFeeds/${l2}.json`;

        const registryData = JSON.parse(fs.readFileSync(registryFilePath));
        const priceFeeds = JSON.parse(fs.readFileSync(priceFeedsFilePath));

        const registry = registryData.find((e) => e.name === 'PriceFeedRegistry');
        if (!registry) {
            console.warn(`No PriceFeedRegistry found for ${l2}`);
            continue;
        }

        const provider = new ethers.providers.JsonRpcProvider(RPC[l2]);
        const contract = new ethers.Contract(registry.address, ABI, provider);

        console.log(`\n--- ${l2.toUpperCase()} ---`);
        for (let j = 0; j < priceFeeds.length; j++) {
            const { name, base, quote, feedAddress } = priceFeeds[j];

            const onChainFeed = await contract.getFeed(base, quote);
            const feed = new ethers.Contract(onChainFeed, AggregatorABI, provider);

            try {
                const latestData = await feed.latestRoundData();
                const currTimestamp = Math.floor(Date.now() / 1000);
                const lastUpdatedTimestamp = latestData.updatedAt;

                const diffInHours = (currTimestamp - lastUpdatedTimestamp) / 3600;
                if (diffInHours > 24) {
                    console.log("ALERT: Price feed hasn't been updated in 24 hours");
                }
            } catch (error) {
                console.log(`Could not fetch data for: ${priceFeeds[j].name} on ${l2} network`);
            }

            const match = onChainFeed.toLowerCase() === feedAddress.toLowerCase();
            console.log(
                `${name}: ${match ? '✅' : `❌ got ${onChainFeed}, expected ${feedAddress}`}`,
            );
        }
    }
}

(async () => {
    program
        .command('check-l2-price-feeds')
        .description('Checks if L2 price feeds addresses are stale')
        .action(async () => {
            await checkPriceFeedAddresses();
            process.exit(0);
        });
    program.parse(process.argv);
})();
