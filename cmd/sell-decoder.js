
require('dotenv-safe').config();
const ethers = require('ethers');
const fs = require('fs');
const path = require('path');

const { program } = require('commander');

const { getAssetInfoByAddress } = require('@defisaver/tokens'); 

const EXECUTE_RECIPE_ID = '0c2c8750';
const DFS_SELL_ID = '0x7f2a0f35';
const EXECUTE_DIRECT_ID = '389f87ff';

const { chainIds, generateIds, MAX_UINT, MAX_UINT128 } = require('../test/utils');

const recipeExecutorAbi = require('../artifacts/contracts/core/RecipeExecutor.sol/RecipeExecutor.json').abi;
const dfsSellAbi = require('../artifacts/contracts/actions/exchange/DFSSell.sol/DFSSell.json').abi;

const percentageDiff = (a, b) => {
    return  100 * Math.abs( ( a - b ) / ( (a+b)/2 ) );
};

const exchangeTargetMapping = {
    '0x1111111254eeb25477b68fb85ed929f73a960582' : '1inch',
    '0xDEF1ABE32c034e558Cdd535791643C58a13aCC10' : '0x',
    '0x6131B5fae19EA4f9D964eAc0408E4408b66337b5' : 'kyber',
    '0xDEF171Fe48CF0115B1d80b88dc8eAB59176FEe57' : 'paraswap',
    '0xDef1C0ded9bec7F1a1670819833240f027b25EfF' : '0x'
};

let currChainId;
let network;

const printSellInfo = (txType, sellData, blockData) => {
    const dfsSellInterface = new ethers.utils.Interface(dfsSellAbi);
    const sellInputs = dfsSellInterface.decodeFunctionResult('parseInputs(bytes)', sellData);

    const srcInfo = getAssetInfoByAddress(sellInputs[0][0].srcAddr, currChainId);
    const destInfo = getAssetInfoByAddress(sellInputs[0][0].destAddr, currChainId);

    const formattedSellAmount = sellInputs[0][0].srcAmount / 10**srcInfo.decimals;

    const exchangeAddr = sellInputs[0][0].offchainData.exchangeAddr;

    const minPrice = sellInputs[0][0].minPrice.toString();
    const price = sellInputs[0][0].offchainData.price.toString();

    const minedAt = new Date(blockData.timestamp * 1000);
    const orderFetchedAt = new Date(parseInt(sellInputs[0][0].wrapperData, 16) * 1000);

    console.log('\n\n ******************* SELL DATA *******************\n');
    console.log('Tx type: ', txType);
    console.log(`Sell ${formattedSellAmount} ${srcInfo.symbol} for ${destInfo.symbol} with ${exchangeTargetMapping[exchangeAddr]} on ${network}`);
    console.log('Slippage set: ', percentageDiff(price / 10**destInfo.decimals, minPrice / 10**destInfo.decimals).toFixed(2), '%');
    console.log('Pending time: ', (minedAt.getTime() - orderFetchedAt.getTime()) / 1000, 's');
    console.log('Min price: ', minPrice);
    console.log('Price: ', price);
    console.log('Order fetched at: ', orderFetchedAt);
    console.log('Tx mined at:      ', minedAt);
    console.log('Sell token addr: ', sellInputs[0][0].srcAddr);
    console.log('Buy token addr: ', sellInputs[0][0].destAddr);
    console.log('\n\n');
};

// TODO: does not support Strategy txs and directActions that arent sell
const decodeSell = async (txHash, options) => {
    network = options.network.length === 0 ? 'mainnet' : options.network;
    currChainId = chainIds[network];

    const nodeName = network !== 'mainnet' ? `${network.toUpperCase()}_NODE` : 'ETHEREUM_NODE';

    const provider = new ethers.providers.WebSocketProvider(process.env[nodeName]);

    const txData = await provider.getTransaction(txHash);
    const blockData = await provider.getBlock(txData.blockNumber);

    const txInput = txData.data;

    let sellData;

    let indexOfSellData = txInput.indexOf(EXECUTE_RECIPE_ID); // check recipe function method

    let txType;

    // direct DFSSell
    if (indexOfSellData === -1) {
        indexOfSellData = txInput.indexOf(EXECUTE_DIRECT_ID);

        if (indexOfSellData === -1) {
            console.log('No sell data found');
            return;
        }


        const recipeData = txInput.slice(indexOfSellData);

        const iface = new ethers.utils.Interface(dfsSellAbi);
        const decoded = iface.decodeFunctionData(`0x${EXECUTE_DIRECT_ID}`, `0x${recipeData}`);

        sellData = decoded[0];
        txType = 'Direct DFSSell';
    } else {
        const recipeData = txInput.slice(indexOfSellData);

        const iface = new ethers.utils.Interface(recipeExecutorAbi);
        const decoded = iface.decodeFunctionData(`0x${EXECUTE_RECIPE_ID}`, `0x${recipeData}`);
    
        const sellIndex = decoded[0].actionIds.findIndex((id) => id === DFS_SELL_ID);
    
        if (sellIndex === -1) {
            console.log('No sell action found');
            return;
        }

        const idMap = generateIds();
        console.log('\n\n ******************* RECIPE DATA *******************\n');
        console.log("Recipe: ", decoded[0].name, '\n');

        // If not a strategy tx, from and to are eoa and proxy
        // TODO: handle diff. for strategy
        const walletAddr = txData.to;
        const userAddr = txData.from;

        decoded[0].actionIds.forEach((id, i) => {
            const actionId = idMap[id];

            if (actionId.fileName !== 'DFSSell' && actionId.fileName !== 'FLAction') {
                const filePath = path.join(__dirname, `../artifacts/${actionId.filePath}/${actionId.fileName}.json`);
                const fetchedAbi = fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' })
    
                const interface = new ethers.utils.Interface(JSON.parse(fetchedAbi).abi);
    
                const parsedAction = interface.decodeFunctionResult('parseInputs(bytes)', decoded[0].callData[i]);

                let numFuncParams = 0;
                let actionString = `${i + 1}. ${actionId.fileName}(`;
                for (let [key, value] of Object.entries(parsedAction[0])) {
                    if (isNaN(key)) {
                        if (value == walletAddr) value = 'proxy';
                        if (value == userAddr) value = 'eoa';

                        if (value == MAX_UINT) value = 'MAX_UINT';
                        if (value == MAX_UINT128) value = 'MAX_UINT128';

                        if (value.toString().startsWith('0x')) {
                            const assetInfo = getAssetInfoByAddress(value, currChainId);

                            if (assetInfo.symbol !== '?') value = assetInfo.symbol;
                        }

                        const paramMap = decoded[0].paramMapping[i][numFuncParams];
                        if (paramMap > 0) value = `$${paramMap}` 

                        actionString += `${key}: ${value},`;
                        numFuncParams++;
                    }
                }
                actionString = actionString.slice(0, -1);
                actionString += ')';

                console.log(actionString);
            } else {
                console.log(`${i + 1}. ${actionId.fileName}`);
            }

        });

        sellData = decoded[0].callData[sellIndex];
        txType = 'Recipe DFSSell';
    }

    printSellInfo(txType, sellData, blockData);

};

(async () => {

    program
        .command('decode <txHash>')
        .option('-n, --network <network>', 'Specify network (defaults to mainnet)', [])
        .description('Decodes dsf sell data from tx')
        .action(async (txHash, options) => {
            await decodeSell(txHash, options);
            process.exit(0);
        });

    program.parse(process.argv);
})();