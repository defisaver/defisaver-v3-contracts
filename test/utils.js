/* eslint-disable no-param-reassign */
/* eslint-disable max-len */
/* eslint-disable no-else-return */
/* eslint-disable import/no-unresolved */
/* eslint-disable no-await-in-loop */
// const { default: curve } = require('@curvefi/api');
const curve = import('@curvefi/api');
const fs = require('fs');
const hre = require('hardhat');
const { getAssetInfo, getAssetInfoByAddress } = require('@defisaver/tokens');
const { expect } = require('chai');
const storageSlots = require('./storageSlots.json');

const { BigNumber } = hre.ethers;

const { getAllFiles } = require('../scripts/hardhat-tasks-functions');

const { deployAsOwner, deployContract } = require('../scripts/utils/deployer');

const { createSafe, executeSafeTx } = require('./utils-safe');

const strategyStorageBytecode = require('../artifacts/contracts/core/strategy/StrategyStorage.sol/StrategyStorage.json').deployedBytecode;
const subStorageBytecode = require('../artifacts/contracts/core/strategy/SubStorage.sol/SubStorage.json').deployedBytecode;
const subStorageBytecodeL2 = require('../artifacts/contracts/core/l2/SubStorageL2.sol/SubStorageL2.json').deployedBytecode;
const bundleStorageBytecode = require('../artifacts/contracts/core/strategy/BundleStorage.sol/BundleStorage.json').deployedBytecode;
const recipeExecutorBytecode = require('../artifacts/contracts/core/RecipeExecutor.sol/RecipeExecutor.json').deployedBytecode;
const proxyAuthBytecode = require('../artifacts/contracts/core/strategy/ProxyAuth.sol/ProxyAuth.json').deployedBytecode;
const mockChainlinkFeedRegistryBytecode = require('../artifacts/contracts/mocks/MockChainlinkFeedRegistry.sol/MockChainlinkFeedRegistry.json').deployedBytecode;

const addrs = {
    mainnet: {
        PROXY_REGISTRY: '0x4678f0a6958e4D2Bc4F1BAF7Bc52E8F3564f3fE4',
        REGISTRY_ADDR: '0x287778F121F134C66212FB16c9b53eC991D32f5b',
        PROXY_AUTH_ADDR: '0x149667b6FAe2c63D1B4317C716b0D0e4d3E2bD70',
        OWNER_ACC: '0xBc841B0dE0b93205e912CFBBd1D0c160A1ec6F00',
        WETH_ADDRESS: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        DAI_ADDRESS: '0x6b175474e89094c44da98b954eedeac495271d0f',
        ETH_ADDR: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        TOKEN_GROUP_REGISTRY: '0xcA49e64FE1FE8be40ED30F682edA1b27a6c8611c',
        FEE_RECEIVER: '0x6467e807dB1E71B9Ef04E0E3aFb962E4B0900B2B',
        TX_SAVER_FEE_RECEIVER: '0x0eD7f3223266Ca1694F85C23aBe06E614Af3A479',
        FEE_RECIPIENT_ADDR: '0x39C4a92Dc506300c3Ea4c67ca4CA611102ee6F2A',
        EXCHANGE_OWNER_ADDR: '0xBc841B0dE0b93205e912CFBBd1D0c160A1ec6F00',
        WRAPPER_EXCHANGE_REGISTRY: '0x653893375dD1D942D2C429caB51641F2bf14d426',
        SubProxy: '0x88B8cEb76b88Ee0Fb7160E6e2Ad86055a32D72d4',
        UNISWAP_WRAPPER: '0x6cb48F0525997c2C1594c89e0Ca74716C99E3d54',
        UNISWAP_V3_WRAPPER: '0xfd077F7990AeE7A0F59b1aD98c6dBeB9aBFf0D7a',
        UNIV3_WRAPPER: '0xA250D449e8246B0be1ecF66E21bB98678448DEF5',
        FEED_REGISTRY: '0x47Fb2585D2C56Fe188D0E6ec628a38b74fCeeeDf',
        COMET_USDC_ADDR: '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
        COMET_USDC_REWARDS_ADDR: '0x1B0e765F6224C21223AeA2af16c1C46E38885a40',
        COMET_ETH_ADDR: '0xA17581A9E3356d9A858b789D68B4d866e593aE94',
        COMP_ADDR: '0xc00e94Cb662C3520282E6f5717214004A7f26888',
        CHICKEN_BONDS_VIEW: '0x809a93fd4a0d7d7906Ef6176f0b5518b418Da08f',
        AAVE_MARKET: '0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e',
        SPARK_MARKET: '0x02C3eA4e34C0cBd694D2adFa2c690EECbC1793eE',
        AAVE_V3_VIEW: '0xf4B715BB788cC4071061bd67dC8B56681460A2fF',
        ZRX_ALLOWLIST_ADDR: '0x4BA1f38427b33B8ab7Bb0490200dAE1F1C36823F',
        ZRX_ALLOWLIST_OWNER: '0xBc841B0dE0b93205e912CFBBd1D0c160A1ec6F00',
        AAVE_SUB_PROXY: '0xb9F73625AA64D46A9b2f0331712e9bEE19e4C3f7',
        CURVE_USD_WRAPPER: '0x3788B4Db5e99fF555e22a08241EB3cFc3a0ac149',
        ADMIN_VAULT: '0xCCf3d848e08b94478Ed8f46fFead3008faF581fD',
        ADMIN_ACC: '0x25eFA336886C74eA8E282ac466BdCd0199f85BB9',
        DFS_REG_CONTROLLER: '0x6F6DaE1bCB60F67B2Cb939dBE565e8fD03F6F002',
        AVG_GAS_PRICE: 100,
        AAVE_V3_POOL_DATA_PROVIDER: '0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3',
        CURVE_WRAPPER_V3: '0xdE73496DD6349829C6649aCaDe31FB1371528AC5',
        COMET_USDC_NATIVE_ADDR: '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
        EXCHANGE_AGGREGATOR_REGISTRY_ADDR: '0x7b67D9D7993A258C4b2C31CDD9E6cbD5Fb674985',
        STRATEGY_STORAGE_ADDR: '0xF52551F95ec4A2B4299DcC42fbbc576718Dbf933',
        BUNDLE_STORAGE_ADDR: '0x223c6aDE533851Df03219f6E3D8B763Bd47f84cf',
        ZEROX_WRAPPER: '0x11e048f19844B7bAa6D9eA4a20eD4fACF7b757b2',
        STRATEGY_EXECUTOR_ADDR: '0xFaa763790b26E7ea354373072baB02e680Eeb07F',
        REFILL_CALLER: '0x33fDb79aFB4456B604f376A45A546e7ae700e880',
        MORPHO_BLUE_VIEW: '0x10B621823D4f3E85fBDF759e252598e4e097C1fd',
        FLUID_VAULT_T1_RESOLVER_ADDR: '0x814c8C7ceb1411B364c2940c4b9380e739e06686',
    },
    optimism: {
        PROXY_REGISTRY: '0x283Cc5C26e53D66ed2Ea252D986F094B37E6e895',
        REGISTRY_ADDR: '0xAf707Ee480204Ed6e2640B53cE86F680D28Afcbd',
        OWNER_ACC: '0xC9a956923bfb5F141F1cd4467126b3ae91E5CC33',
        WETH_ADDRESS: '0x4200000000000000000000000000000000000006',
        DAI_ADDRESS: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
        USDC_ADDR: '0x0b2c639c533813f4aa9d7837caf62653d097ff85',
        EXCHANGE_OWNER_ADDR: '0xc9a956923bfb5f141f1cd4467126b3ae91e5cc33',
        WRAPPER_EXCHANGE_REGISTRY: '0x82b039Ca3c16E971132603f960a6E98582d8F021',
        PROXY_AUTH_ADDR: '0xD6ae16A1aF3002D75Cc848f68060dE74Eccc6043',
        AAVE_MARKET: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb',
        SubProxy: '0xFF9f0B8d0a4270f98C52842d163fd34728109692',
        UNISWAP_V3_WRAPPER: '0xF723B39fe2Aa9102dE45Bc8ECd3417805aAC79Aa',
        AAVE_V3_VIEW: '0xC20fA40Dd4f0D3f7431Eb4B6bc0614F36932F6Dc',
        AAVE_SUB_PROXY: '0x9E8aE909Af8A391b58f45819f0d36e4256991D19',
        AVG_GAS_PRICE: 0.001,
        TOKEN_GROUP_REGISTRY: '0x566b2a957D8FCE39D2744059d558F27aF52a70c0',
        ETH_ADDR: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        ZRX_ALLOWLIST_ADDR: '0x52F6ae5aE5a8a6316c970d3a02C50b74c1a50bB8',
        ZRX_ALLOWLIST_OWNER: '0xc9a956923bfb5f141f1cd4467126b3ae91e5cc33',
        ADMIN_VAULT: '0x136b1bEAfff362530F98f10E3D8C38f3a3F3d38C',
        ADMIN_ACC: '0x98118fD1Da4b3369AEe87778168e97044980632F',
        DFS_REG_CONTROLLER: '0x493C0dE902E6916128A223F66F37d3b6ee8fA408',
        AAVE_V3_POOL_DATA_PROVIDER: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
        EXCHANGE_AGGREGATOR_REGISTRY_ADDR: '0x79586d55DECB755B9Bb436B2287eFf93025E549D',
        STRATEGY_STORAGE_ADDR: '0xDdDE69c3Fd246D9D62f9712c814b333728f113A4',
        BUNDLE_STORAGE_ADDR: '0xc98C5312829006b2D4bBd47162d49B1aa6C275Ab',
        COMET_USDC_ADDR: '0x2e44e174f7D53F0212823acC11C01A11d58c5bCB',
        COMET_USDC_REWARDS_ADDR: '0x443EA0340cb75a160F31A440722dec7b5bc3C2E9',
        TX_SAVER_FEE_RECEIVER: '0x0eD7f3223266Ca1694F85C23aBe06E614Af3A479',
        ZEROX_WRAPPER: '0x031D6d3C95dD2188D1A1A57e8DcD8051f3B938ca',
        STRATEGY_EXECUTOR_ADDR: '0x2f54a62b18483f395779cCD81A598133aBb7775d',
        FEE_RECIPIENT_ADDR: '0x5b12C2B979CB3aB89DD4813837873bC4Dd1930D0',
        REFILL_CALLER: '0xaFdFC3814921d49AA412d6a22e3F44Cc555dDcC8',
    },
    arbitrum: {
        PROXY_REGISTRY: '0x283Cc5C26e53D66ed2Ea252D986F094B37E6e895',
        REGISTRY_ADDR: '0xBF1CaC12DB60819Bfa71A328282ecbc1D40443aA',
        OWNER_ACC: '0x926516E60521556F4ab5e7BF16A4d41a8539c7d1',
        WETH_ADDRESS: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        DAI_ADDRESS: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
        USDC_ADDR: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
        USDC_NATIVE_ADDR: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        EXCHANGE_OWNER_ADDR: '0x926516e60521556f4ab5e7bf16a4d41a8539c7d1',
        WRAPPER_EXCHANGE_REGISTRY: '0x4a0c7BDF7F58AA04852Da07CDb3d367521f81446',
        FEE_RECEIVER: '0xe000e3c9428D539566259cCd89ed5fb85e655A01',
        TX_SAVER_FEE_RECEIVER: '0x0eD7f3223266Ca1694F85C23aBe06E614Af3A479',
        FEE_RECIPIENT_ADDR: '0xe000e3c9428D539566259cCd89ed5fb85e655A01',
        TOKEN_GROUP_REGISTRY: '0xb03fe103f54841821C080C124312059c9A3a7B5c',
        PROXY_AUTH_ADDR: '0xF3A8479538319756e100C386b3E60BF783680d8f',
        AAVE_MARKET: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb',
        SubProxy: '0x2edB8eb14e29F3CF0bd50958b4664C9EB1583Ec9',
        AAVE_V3_VIEW: '0xA74a85407D5A940542915458616aC3cf3f404E3b',
        UNISWAP_V3_WRAPPER: '0x37236458C59F4dCF17b96Aa67FC07Bbf5578d873',
        ETH_ADDR: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        AAVE_SUB_PROXY: '0x29a172f04CF9C6a79EdF4dD2744F2d260b8b8FE4',
        UNISWAP_WRAPPER: '0x48ef488054b5c570cf3a2ac0a0697b0b0d34c431',
        ZRX_ALLOWLIST_ADDR: '0x5eD8e74b1caE57B0c68B3278B88589991FBa0750',
        ZRX_ALLOWLIST_OWNER: '0x926516e60521556f4ab5e7bf16a4d41a8539c7d1',
        COMET_USDC_ADDR: '0xA5EDBDD9646f8dFF606d7448e414884C7d905dCA',
        COMET_USDC_NATIVE_ADDR: '0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf',
        COMET_USDC_REWARDS_ADDR: '0x88730d254A2f7e6AC8388c3198aFd694bA9f7fae',
        COMP_ADDR: '0x354A6dA3fcde098F8389cad84b0182725c6C91dE',
        ADMIN_VAULT: '0xd47D8D97cAd12A866900eEc6Cde1962529F25351',
        ADMIN_ACC: '0x6AFEA85cFAB61e3a55Ad2e4537252Ec05796BEfa',
        DFS_REG_CONTROLLER: '0x7702fa16b0cED7e44fF7Baeed04bF165f58eE51D',
        AAVE_V3_POOL_DATA_PROVIDER: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
        EXCHANGE_AGGREGATOR_REGISTRY_ADDR: '0xcc0Ae28CC4ae2944B61d3b205F47F5f3aE5Ca204',
        AVG_GAS_PRICE: 0.5,
        STRATEGY_STORAGE_ADDR: '0x6aeA695fcd0655650323e9dc5f80Ac0b15A91Da2',
        BUNDLE_STORAGE_ADDR: '0x8332F2a50A9a6C85a476e1ea33031681291cB694',
        ZEROX_WRAPPER: '0x94a58e456F1De766b13e45104D79201A218c1607',
        STRATEGY_EXECUTOR_ADDR: '0xa4F087267828C3Ca8ac18b6fE7f456aB20781AA6',
        REFILL_CALLER: '0xcbA094ae1B2B363886CC7f428206dB1b116834A2',
        FLUID_VAULT_T1_RESOLVER_ADDR: '0xD6373b375665DE09533478E8859BeCF12427Bb5e',
    },
    base: {
        PROXY_REGISTRY: '0x425fA97285965E01Cc5F951B62A51F6CDEA5cc0d',
        REGISTRY_ADDR: '0x347FB634271F666353F23A3362f3935D96F97476',
        OWNER_ACC: '0xBaBe2409dBD359453E5292d684fF324A638801bF',
        WETH_ADDRESS: '0x4200000000000000000000000000000000000006',
        DAI_ADDRESS: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
        USDC_ADDR: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
        EXCHANGE_OWNER_ADDR: '0xC4D4b4F2Df76f9952E6e0Dc79861582A5b7269c3',
        WRAPPER_EXCHANGE_REGISTRY: '0x586328A3F24E2c1A41D9A3a5B2Ed123A156dB82e',
        PROXY_AUTH_ADDR: '0xD34BBE7398F7F08952b033bbaF2D2xC84231dCEdc',
        AAVE_MARKET: '0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D',
        SubProxy: '0xDC9441c4085B9B302506d64330e178E3C4890C87',
        UNISWAP_V3_WRAPPER: '0x914A50910fF1404Fe62D04846a559c49C55219c3',
        AAVE_V3_VIEW: '0x125b8b832BD7F2EBD77Eef148A6319AdE751C44b',
        AAVE_SUB_PROXY: '',
        AVG_GAS_PRICE: 0.001,
        TOKEN_GROUP_REGISTRY: '0xa898078f369A78CE6b8023715e8f6d2Ad7d2719f',
        ETH_ADDR: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        ZRX_ALLOWLIST_ADDR: '0x169D6E128238ebabF86032Ae9da65938eaD7F69e',
        ZRX_ALLOWLIST_OWNER: '',
        ADMIN_VAULT: '0xD8E67968d8a0df4beCf2D50daE1e34d4d80C701C',
        ADMIN_ACC: '0xF8EC1967A719027A95883a89579e7A77699899e4',
        DFS_REG_CONTROLLER: '0x50bCFC115283dF48Ab6382551B9B93b08E197747',
        AAVE_V3_POOL_DATA_PROVIDER: '0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac',
        EXCHANGE_AGGREGATOR_REGISTRY_ADDR: '0xB297cB5B1380cDD68A238cA38e8d54C809f3De32',
        STRATEGY_STORAGE_ADDR: '0x3Ca96CebC7779Ee86685c67c999d0f03158Ee9cA',
        BUNDLE_STORAGE_ADDR: '0x6AB90ff536f0E2a880DbCdef1bB665C2acC0eDdC',
        TX_SAVER_FEE_RECEIVER: '0x0eD7f3223266Ca1694F85C23aBe06E614Af3A479',
        ZEROX_WRAPPER: '0xdAB5cC8CDCBA602E7ACfab262A4B09fDEEC20b51',
        STRATEGY_EXECUTOR_ADDR: '0x0d099E38f6aF8778c5053349c350Aad906B1432F',
        FEE_RECIPIENT_ADDR: '0xEDFc68e2874B0AFc0963e18AE4D68522aEc7f97D',
        REFILL_CALLER: '0xBefc466abe547B1785f382883833330a47C573f7',
        MORPHO_BLUE_VIEW: '0x53c0E962bd0AC53928ca04703238b2ec2894195B',
        FLUID_VAULT_T1_RESOLVER_ADDR: '0x79B3102173EB84E6BCa182C7440AfCa5A41aBcF8',
    },
};

const REGISTRY_ADDR = '0x287778F121F134C66212FB16c9b53eC991D32f5b';
require('dotenv-safe').config();

const nullAddress = '0x0000000000000000000000000000000000000000';
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const EETH_ADDR = '0x35fA164735182de50811E8e2E824cFb9B6118ac2';
const ETHER_FI_LIQUIDITY_POOL = '0x308861A430be4cce5502d0A12724771Fc6DaF216';
const KYBER_WRAPPER = '0x71C8dc1d6315a48850E88530d18d3a97505d2065';
const UNISWAP_WRAPPER = '0x6cb48F0525997c2C1594c89e0Ca74716C99E3d54';
const OASIS_WRAPPER = '0x2aD7D86C56b7a09742213e1e649C727cB4991A54';
const ETH_ADDR = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const BTC_ADDR = '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB';
const DAI_ADDR = '0x6b175474e89094c44da98b954eedeac495271d0f';
const USDC_ADDR = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const RAI_ADDR = '0x03ab458634910AaD20eF5f1C8ee96F1D6ac54919';
const BAL_ADDR = '0xba100000625a3754423978a60c9317c58a424e3D';
const LOGGER_ADDR = '0xcE7a977Cac4a481bc84AC06b2Da0df614e621cf3';
const UNIV3ROUTER_ADDR = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
const UNIV3POSITIONMANAGER_ADDR = '0xC36442b4a4522E871399CD717aBDD847Ab11FE88';
const AAVE_MARKET = '0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5';
const YEARN_REGISTRY_ADDRESS = '0x50c1a2eA0a861A967D9d0FFE2AE4012c2E053804';
const STETH_ADDRESS = '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84';
const WSTETH_ADDRESS = '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0';
const A_WSETH_TOKEN_ADDR = '0x0B925eD163218f6662a35e0f0371Ac234f9E9371';
const UNIV2_ROUTER_ADDRESS = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
const FEED_REGISTRY_ADDRESS = '0x47Fb2585D2C56Fe188D0E6ec628a38b74fCeeeDf';
const USD_DENOMINATION = '0x0000000000000000000000000000000000000348';
const BLUSD_ADDR = '0xB9D7DdDca9a4AC480991865EfEf82E01273F79C3';
const BOND_NFT_ADDR = '0xa8384862219188a8f03c144953Cf21fc124029Ee';

const AAVE_V2_MARKET_ADDR = '0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5';

// optimism aave V3
const AAVE_MARKET_OPTIMISM = '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb';

// Dfs sdk won't accept 0x0 and we need some rand addr for testing
const placeHolderAddr = '0x0000000000000000000000000000000000000001';
const AUNI_ADDR = '0xb9d7cb55f463405cdfbe4e90a6d2df01c2b92bf1';
const AWETH_ADDR = '0x030ba81f1c18d280636f32af80b9aad02cf0854e';
const AWBTC_ADDR = '0x9ff58f4ffb29fa2266ab25e75e2a8b3503311656';
const ALINK_ADDR = '0xa06bc25b5805d5f8d82847d191cb4af5a3e873e0';
const ADAI_ADDR = '0x028171bca77440897b824ca71d1c56cac55b68a3';
const UNI_ADDR = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984';
const LINK_ADDR = '0x514910771af9ca656af840dff83e8264ecf986ca';
const WBTC_ADDR = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599';
const LUSD_ADDR = '0x5f98805A4E8be255a32880FDeC7F6728C6568bA0';
const BOLD_ADDR = '0xb01dd87b29d187f3e3a4bf6cdaebfb97f3d9ab98';

const USDT_ADDR = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const BUSD_ADDR = '0x4fabb145d64652a948d72533023f6e7a623c7c53';

const OWNER_ACC = '0xBc841B0dE0b93205e912CFBBd1D0c160A1ec6F00';
const ADMIN_ACC = '0x25eFA336886C74eA8E282ac466BdCd0199f85BB9';

const rariDaiFundManager = '0xB465BAF04C087Ce3ed1C266F96CA43f4847D9635';
const rdptAddress = '0x0833cfcb11A5ba89FbAF73a407831c98aD2D7648';

const rariUsdcFundManager = '0xC6BF8C8A55f77686720E0a88e2Fd1fEEF58ddf4a';
const rsptAddress = '0x016bf078ABcaCB987f0589a6d3BEAdD4316922B0';

const MAX_UINT = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
const MAX_UINT128 = '340282366920938463463374607431768211455';

const DFS_REG_CONTROLLER = '0xF8f8B3C98Cf2E63Df3041b73f80F362a4cf3A576';

const BALANCER_VAULT_ADDR = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';

const dydxTokens = ['WETH', 'USDC', 'DAI'];

let network = hre.network.config.name;

const setNetwork = (networkName) => {
    network = networkName;
};

const isNetworkFork = () => hre.network.name === 'fork';

const chainIds = {
    mainnet: 1,
    optimism: 10,
    arbitrum: 42161,
    base: 8453,
};

const AAVE_FL_FEE = 0.09; // TODO: can we fetch this dynamically
const AAVE_V3_FL_FEE = 0.05;
const MIN_VAULT_DAI_AMOUNT = '45010'; // TODO: can we fetch this dynamically
const MIN_VAULT_RAI_AMOUNT = '3000'; // TODO: can we fetch this dynamically

const getSparkFLFee = async () => {
    console.log(network, addrs[network].SPARK_MARKET);
    return hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].SPARK_MARKET)
        .then((addressProvider) => addressProvider.getPool())
        .then((poolAddr) => hre.ethers.getContractAt('IPoolV3', poolAddr))
        .then((pool) => pool.FLASHLOAN_PREMIUM_TOTAL());
};

const AVG_GAS_PRICE = 100; // gwei

const standardAmounts = {
    ETH: '4',
    WETH: '4',
    AAVE: '15',
    BAT: '8000',
    USDC: '8000',
    UNI: '100',
    SUSD: '8000',
    BUSD: '8000',
    SNX: '200',
    REP: '150',
    REN: '2000',
    MKR: '3',
    ENJ: '2000',
    DAI: '8000',
    WBTC: '0.15',
    RENBTC: '0.08',
    ZRX: '4000',
    KNC: '2000',
    MANA: '4000',
    PAXUSD: '8000',
    COMP: '10',
    LRC: '6000',
    LINK: '140',
    USDT: '4000',
    TUSD: '4000',
    BAL: '100',
    GUSD: '4000',
    YFI: '0.1',
};

const coinGeckoHelper = {
    GNO: 'gnosis',
    rETH: 'rocket-pool-eth',
    STETH: 'staked-ether',
    CRV: 'curve-dao-token',
    ETH: 'ethereum',
    WETH: 'weth',
    AAVE: 'aave',
    BAT: 'basic-attention-token',
    USDC: 'usd-coin',
    UNI: 'uniswap',
    SUSD: 'nusd',
    BUSD: 'binance-usd',
    SNX: 'havven',
    REP: 'augur',
    REN: 'republic-protocol',
    MKR: 'maker',
    ENJ: 'enjincoin',
    DAI: 'dai',
    WBTC: 'wrapped-bitcoin',
    RENBTC: 'renbtc',
    ZRX: '0x',
    KNCL: 'kyber-network',
    MANA: 'decentraland',
    PAXUSD: 'paxos-standard',
    USDP: 'paxos-standard',
    COMP: 'compound-governance-token',
    LRC: 'loopring',
    LINK: 'chainlink',
    USDT: 'tether',
    TUSD: 'true-usd',
    BAL: 'balancer',
    GUSD: 'gemini-dollar',
    YFI: 'yearn-finance',
    LUSD: 'liquity-usd',
    LQTY: 'liquity',
    TORN: 'tornado-cash',
    mUSD: 'musd',
    imUSD: 'imusd',
    RAI: 'rai',
    MATIC: 'matic-network',
    SUSHI: 'sushi',
    bLUSD: 'boosted-lusd',
    wstETH: 'wrapped-steth',
    stETH: 'steth',
    GMX: 'gmx',
    ARB: 'arbitrum',
    frxETH: 'frax-ether',
    sfrxETH: 'staked-frax-ether',
    tBTC: 'tbtc',
    crvUSD: 'crvusd',
    sUSDe: 'ethena-staked-usde',
    OP: 'optimism',
    cbETH: 'cb-eth',
    FRAX: 'frax',
    GHO: 'gho',
    sUSDS: 'sUSDS',
};

const BN2Float = hre.ethers.utils.formatUnits;

const Float2BN = hre.ethers.utils.parseUnits;

const getOwnerAddr = () => addrs[network].OWNER_ACC;

const getAdminAddr = () => addrs[network].ADMIN_ACC;

async function findBalancesSlot(tokenAddress) {
    const slotObj = storageSlots[tokenAddress];
    if (slotObj) {
        return { isVyper: slotObj.isVyper, num: slotObj.num };
    }

    const encode = (types, values) => hre.ethers.utils.defaultAbiCoder.encode(types, values);
    const account = hre.ethers.constants.AddressZero;
    const probeA = encode(['uint'], [1]);
    const probeB = encode(['uint'], [2]);
    const token = await hre.ethers.getContractAt(
        'IERC20',
        tokenAddress,
    );
    let setStorageMethod;
    if (hre.network.config.isAnvil) {
        setStorageMethod = 'anvil_setStorageAt';
    } else if (hre.network.config.type === 'tenderly') {
        setStorageMethod = 'tenderly_setStorageAt';
    } else {
        setStorageMethod = 'hardhat_setStorageAt';
    }

    for (let i = 0; i < 100; i++) {
        {
            let probedSlot = hre.ethers.utils.keccak256(
                encode(['address', 'uint'], [account, i]),
            );
            // remove padding for JSON RPC
            while (probedSlot.startsWith('0x0')) { probedSlot = `0x${probedSlot.slice(3)}`; }
            const prev = await hre.ethers.provider.send(
                'eth_getStorageAt',
                [tokenAddress, probedSlot, 'latest'],
            );
            // make sure the probe will change the slot value
            const probe = prev === probeA ? probeB : probeA;

            await hre.ethers.provider.send(setStorageMethod, [
                tokenAddress,
                probedSlot,
                probe,
            ]);

            const balance = await token.balanceOf(account);
            // reset to previous value
            await hre.ethers.provider.send(setStorageMethod, [
                tokenAddress,
                probedSlot,
                prev,
            ]);
            if (balance.eq(hre.ethers.BigNumber.from(probe))) {
                const result = { isVyper: false, num: i };
                storageSlots[tokenAddress] = result;
                // file path needs to be from top level folder
                fs.writeFileSync('test/storageSlots.json', JSON.stringify(storageSlots));
                return result;
            }
        }
        {
            let probedSlot = hre.ethers.utils.keccak256(
                encode(['uint', 'address'], [i, account]),
            );
            // remove padding for JSON RPC
            while (probedSlot.startsWith('0x0')) { probedSlot = `0x${probedSlot.slice(3)}`; }
            const prev = await hre.ethers.provider.send(
                'eth_getStorageAt',
                [tokenAddress, probedSlot, 'latest'],
            );
            // make sure the probe will change the slot value
            const probe = prev === probeA ? probeB : probeA;

            await hre.ethers.provider.send(setStorageMethod, [
                tokenAddress,
                probedSlot,
                probe,
            ]);

            const balance = await token.balanceOf(account);
            // reset to previous value
            await hre.ethers.provider.send(setStorageMethod, [
                tokenAddress,
                probedSlot,
                prev,
            ]);
            if (balance.eq(hre.ethers.BigNumber.from(probe))) {
                const result = { isVyper: true, num: i };
                storageSlots[tokenAddress] = result;
                // file path needs to be from top level folder
                fs.writeFileSync('test/storageSlots.json', JSON.stringify(storageSlots));
                return result;
            }
        }
    }
    console.log('Balance slot not found');
    return 0;
}

const toBytes32 = (bn) => hre.ethers.utils.hexlify(hre.ethers.utils.zeroPad(bn.toHexString(), 32));

const mineBlock = async () => {
    await hre.ethers.provider.send('evm_mine', []); // Just mines to the next block
};

const timeTravel = async (timeIncrease) => {
    await hre.network.provider.request({
        method: 'evm_increaseTime',
        params: [timeIncrease],
        id: (await hre.ethers.provider.getBlock('latest')).timestamp,
    });

    await mineBlock();
};

const setStorageAt = async (address, index, value) => {
    let prefix = 'hardhat';

    if (hre.network.config.type === 'tenderly') {
        prefix = 'tenderly';
    }

    await hre.ethers.provider.send(`${prefix}_setStorageAt`, [address, index, value]);
    await hre.ethers.provider.send('evm_mine', []); // Just mines to the next block
};

const setBalance = async (tokenAddr, userAddr, value) => {
    try {
        let tokenContract = await hre.ethers.getContractAt('IProxyERC20', tokenAddr);
        const newTokenAddr = await tokenContract.callStatic.target();

        tokenContract = await hre.ethers.getContractAt('IProxyERC20', newTokenAddr);
        const tokenState = await tokenContract.callStatic.tokenState();
        // eslint-disable-next-line no-param-reassign
        tokenAddr = tokenState;
    // eslint-disable-next-line no-empty
    } catch (error) {
    }
    const slotInfo = await findBalancesSlot(tokenAddr);
    let index;
    if (slotInfo.isVyper) {
        index = hre.ethers.utils.solidityKeccak256(
            ['uint256', 'uint256'],
            [slotInfo.num, userAddr], // key, slot
        );
    } else {
        index = hre.ethers.utils.solidityKeccak256(
            ['uint256', 'uint256'],
            [userAddr, slotInfo.num], // key, slot
        );
    }
    while (index.startsWith('0x0')) { index = `0x${index.slice(3)}`; }

    await setStorageAt(
        tokenAddr,
        index.toString(),
        toBytes32(value).toString(),
    );
};

let cachedTokenPrices = {};
const getLocalTokenPrice = (tokenSymbol) => {
    const cachedPrice = cachedTokenPrices[tokenSymbol];
    if (cachedPrice) return cachedPrice;

    const data = JSON.parse(fs.readFileSync('test/prices.json', 'utf8'));
    const tokenNames = Object.keys(data);
    for (let i = 0; i < tokenNames.length; i++) {
        if (tokenNames[i] === coinGeckoHelper[tokenSymbol]) {
            const tokenPrice = data[tokenNames[i]].usd;
            return tokenPrice;
        }
    }
    return 0;
};
const getTokenHelperContract = async () => {
    const contractName = chainIds[network] === 1 ? 'TokenPriceHelper' : 'TokenPriceHelperL2';
    console.log(`Deploying ${contractName}`);
    const tokenPriceHelperFactory = await hre.ethers.getContractFactory(contractName);
    const tokenHelper = await tokenPriceHelperFactory.deploy();
    await tokenHelper.deployed();
    return tokenHelper;
};
const fetchAmountInUSDPrice = async (tokenSymbol, amountUSD) => {
    const { decimals, address } = getAssetInfo(tokenSymbol, chainIds[network]);
    const tokenHelper = await getTokenHelperContract();

    const tokenPriceInUSD = await tokenHelper.getPriceInUSD(address);
    const tokenPriceInUSDFormatted = tokenPriceInUSD / 10 ** 8;

    const numOfTokens = (amountUSD / tokenPriceInUSDFormatted).toFixed(decimals);

    return hre.ethers.utils.parseUnits(numOfTokens, decimals);
};

const fetchTokenPriceInUSD = async (tokenSymbol) => {
    const { address } = getAssetInfo(tokenSymbol, chainIds[network]);
    const tokenHelper = await getTokenHelperContract();
    const tokenPriceInUSD = await tokenHelper.getPriceInUSD(address);
    return tokenPriceInUSD;
};

// TODO: remove once we replace it with fetchAmountInUSDPrice
const fetchAmountinUSDPrice = (tokenSymbol, amountUSD) => {
    const { decimals } = getAssetInfo(tokenSymbol);
    const tokenPrice = getLocalTokenPrice(tokenSymbol);
    return (amountUSD / tokenPrice).toFixed(decimals);
};

const fetchStandardAmounts = async () => standardAmounts;

const impersonateAccount = async (account) => {
    await hre.network.provider.request({
        method: hre.network.config.isAnvil
            ? 'anvil_impersonateAccount'
            : 'hardhat_impersonateAccount',
        params: [account],
    });
};

const stopImpersonatingAccount = async (account) => {
    await hre.network.provider.request({
        method: hre.network.config.isAnvil
            ? 'anvil_stopImpersonatingAccount'
            : 'hardhat_stopImpersonatingAccount',
        params: [account],
    });
};

const getNameId = (name) => {
    const hash = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes(name));

    return hash.substr(0, 10);
};

const getAddrFromRegistry = async (name) => {
    const regAddr = addrs[network].REGISTRY_ADDR;
    const registryInstance = await hre.ethers.getContractFactory('DFSRegistry');
    const registry = registryInstance.attach(regAddr);

    // TODO: Write in registry later
    // if (name === 'SubProxy') {
    //     return addrs[network].SubProxy;
    // }
    const addr = await registry.getAddr(
        getNameId(name),
    );
    return addr;
};

const getProxyWithSigner = async (signer, addr) => {
    const proxyRegistry = await
    hre.ethers.getContractAt('IProxyRegistry', addrs[network].PROXY_REGISTRY);

    let proxyAddr = await proxyRegistry.proxies(addr);

    if (proxyAddr === nullAddress) {
        await proxyRegistry.build(addr);
        proxyAddr = await proxyRegistry.proxies(addr);
    }

    const dsProxy = await hre.ethers.getContractAt('IDSProxy', proxyAddr, signer);

    return dsProxy;
};

const getProxy = async (acc, isSafe = false) => {
    if (isSafe === false) {
        const proxyRegistry = await
        hre.ethers.getContractAt('IProxyRegistry', addrs[network].PROXY_REGISTRY);
        let proxyAddr = await proxyRegistry.proxies(acc);

        if (proxyAddr === nullAddress) {
            await proxyRegistry.build(acc);
            proxyAddr = await proxyRegistry.proxies(acc);
        }

        const dsProxy = await hre.ethers.getContractAt('IDSProxy', proxyAddr);

        return dsProxy;
    } else {
        // create safe
        const safeAddr = await createSafe(acc);
        const safe = await hre.ethers.getContractAt('ISafe', safeAddr);

        console.log(`Safe created ${safeAddr}`);

        return safe;
    }
};

const sendEther = async (signer, toAddress, amount) => {
    const valueAmount = hre.ethers.utils.parseUnits(amount, 18);
    await signer.sendTransaction({
        to: toAddress,
        value: valueAmount,
    });
};

const redeploy = async (name, isFork = false, ...args) => {
    const regAddr = addrs[network].REGISTRY_ADDR;
    if (!isFork) {
        const setBalanceMethod = hre.network.config.isAnvil ? 'anvil_setBalance' : 'hardhat_setBalance';
        await hre.network.provider.send(setBalanceMethod, [
            getOwnerAddr(),
            '0xC9F2C9CD04674EDEA40000000',
        ]);

        const setNextBlockBaseFeeMethod = hre.network.config.isAnvil
            ? 'anvil_setNextBlockBaseFeePerGas'
            : 'hardhat_setNextBlockBaseFeePerGas';
        await hre.network.provider.send(setNextBlockBaseFeeMethod, [
            '0x1', // 1 wei
        ]);

        await impersonateAccount(getOwnerAddr());

        const ethSender = (await hre.ethers.getSigners())[0];
        await sendEther(ethSender, getOwnerAddr(), '100');
    }

    const signer = await hre.ethers.provider.getSigner(getOwnerAddr());
    const registryInstance = await hre.ethers.getContractFactory('contracts/core/DFSRegistry.sol:DFSRegistry', signer);
    let registry = await registryInstance.attach(regAddr);

    registry = registry.connect(signer);
    const c = await deployAsOwner(name, signer, ...args);

    if (name === 'StrategyExecutor' || name === 'StrategyExecutorL2') {
        name = 'StrategyExecutorID';
    }
    if (name === 'KyberInputScalingHelperL2' && network !== 'mainnet') {
        name = 'KyberInputScalingHelper';
    }

    const id = getNameId(name);

    console.log(name, id);

    if (!(await registry.isRegistered(id))) {
        await registry.addNewContract(id, c.address, 0, { gasLimit: 2000000 });
    } else {
        await registry.startContractChange(id, c.address, { gasLimit: 2000000 });

        const entryData = await registry.entries(id);

        if (parseInt(entryData.waitPeriod, 10) > 0) {
            await timeTravel(parseInt(entryData.waitPeriod, 10) + 10);
        }

        await registry.approveContractChange(id, { gasLimit: 2000000 });
    }

    // for strategy deployment set open to public for easier testing
    if (name === 'StrategyStorage' || name === 'BundleStorage') {
        const storageContract = c.connect(signer);
        await storageContract.changeEditPermission(true);
    }

    if (!isFork) {
        await stopImpersonatingAccount(getOwnerAddr());
    }

    return c;
};

const approveContractInRegistry = async (name, regAddr = addrs[network].REGISTRY_ADDR) => {
    const signer = await hre.ethers.provider.getSigner(getOwnerAddr());
    const registryInstance = await hre.ethers.getContractFactory('contracts/core/DFSRegistry.sol:DFSRegistry', signer);
    let registry = await registryInstance.attach(regAddr);

    registry = registry.connect(signer);

    const id = getNameId(name);

    const entryData = await registry.entries(id);

    if (entryData.inContractChange) {
        if (parseInt(entryData.waitPeriod, 10) > 0) {
            await timeTravel(parseInt(entryData.waitPeriod, 10) + 10);
        }

        await registry.approveContractChange(id, { gasLimit: 2000000 });
    } else {
        console.log(`Contract ${name} not in change`);
    }
};

const getContractFromRegistry = async (
    name,
    isFork = false,
    ...args
) => {
    const contractAddr = await getAddrFromRegistry(name);
    if (contractAddr !== nullAddress) return hre.ethers.getContractAt(name, contractAddr);
    return redeploy(name, isFork, ...args);
};

const setCode = async (addr, code) => {
    const setCodeMethod = hre.network.config.isAnvil ? 'anvil_setCode' : 'hardhat_setCode';
    await hre.network.provider.send(setCodeMethod, [addr, code]);
};

const setContractAt = async ({ name, address, args = [] }) => {
    const contract = await deployContract(name, ...args);

    const deployedBytecode = await hre.network.provider.request({
        method: 'eth_getCode',
        params: [contract.address],
    });

    await setCode(address, deployedBytecode);

    return hre.ethers.getContractAt(name, address);
};

const redeployCore = async (isL2 = false) => {
    const strategyStorageAddr = await getAddrFromRegistry('StrategyStorage');
    await setCode(strategyStorageAddr, strategyStorageBytecode);

    const subStorageAddr = await getAddrFromRegistry('SubStorage');

    if (isL2) await setCode(subStorageAddr, subStorageBytecodeL2);
    else await setCode(subStorageAddr, subStorageBytecode);

    const bundleStorageAddr = await getAddrFromRegistry('BundleStorage');
    await setCode(bundleStorageAddr, bundleStorageBytecode);

    const recipeExecutorAddr = await getAddrFromRegistry('RecipeExecutor');
    await setCode(recipeExecutorAddr, recipeExecutorBytecode);

    await setCode(addrs[network].PROXY_AUTH_ADDR, proxyAuthBytecode);

    await redeploy('SubProxy');

    let strategyExecutorName = 'StrategyExecutor';
    if (isL2) strategyExecutorName = 'StrategyExecutorL2';

    const strategyExecutor = await redeploy(strategyExecutorName);

    return strategyExecutor;
};

const send = async (tokenAddr, to, amount) => {
    const tokenContract = await hre.ethers.getContractAt('IERC20', tokenAddr);

    await tokenContract.transfer(to, amount);
};

const approve = async (tokenAddr, to, signer) => {
    const tokenContract = await hre.ethers.getContractAt('IERC20', tokenAddr);

    const from = signer ? signer.address : tokenContract.signer.address;
    const allowance = await tokenContract.allowance(from, to);

    if (allowance.toString() === '0') {
        if (signer) {
            const tokenContractSigner = tokenContract.connect(signer);
            // eslint-disable-next-line max-len
            await tokenContractSigner.approve(to, hre.ethers.constants.MaxUint256, { gasLimit: 1000000 });
        } else {
            await tokenContract.approve(to, hre.ethers.constants.MaxUint256, { gasLimit: 1000000 });
        }
    }
};

const getAllowance = async (tokenAddr, from, to) => {
    const tokenContract = await hre.ethers.getContractAt('IERC20', tokenAddr);

    const allowance = await tokenContract.allowance(from, to);

    return allowance;
};

const balanceOf = async (tokenAddr, addr) => {
    let balance = '';

    if (tokenAddr.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
        balance = await hre.ethers.provider.getBalance(addr);
    } else {
        const tokenContract = await hre.ethers.getContractAt('IERC20', tokenAddr);
        balance = await tokenContract.balanceOf(addr);
    }
    return balance;
};

const getNftOwner = async (nftAddr, tokenId) => {
    const tokenContract = await hre.ethers.getContractAt('IERC721', nftAddr);
    const owner = await tokenContract.ownerOf(tokenId);

    return owner;
};

const balanceOfOnTokenInBlock = async (tokenAddr, addr, block) => {
    const tokenContract = await hre.ethers.getContractAt('IERC20', tokenAddr);
    let balance = '';
    balance = await tokenContract.balanceOf(addr, { blockTag: block });
    return balance;
};

/// @notice formats exchange object and sets mock wrapper balance
const formatMockExchangeObj = async (
    srcTokenInfo,
    destTokenInfo,
    srcAmount,
    wrapper = undefined,
) => {
    if (!wrapper) {
        // eslint-disable-next-line no-param-reassign
        wrapper = await getContractFromRegistry('MockExchangeWrapper');
    }

    const rateDecimals = 18 + destTokenInfo.decimals - srcTokenInfo.decimals;
    const rate = Float2BN(
        (getLocalTokenPrice(srcTokenInfo.symbol)
        / getLocalTokenPrice(destTokenInfo.symbol)).toFixed(rateDecimals),
        rateDecimals,
    );

    const expectedOutput = hre.ethers.constants.MaxInt256;

    await setBalance(
        destTokenInfo.addresses[chainIds[network]],
        wrapper.address,
        expectedOutput,
    );

    return [
        srcTokenInfo.addresses[chainIds[network]],
        destTokenInfo.addresses[chainIds[network]],
        srcAmount,
        0,
        0,
        0,
        nullAddress,
        wrapper.address,
        hre.ethers.utils.defaultAbiCoder.encode(['uint256'], [rate]),
        [nullAddress, nullAddress, nullAddress, 0, 0, hre.ethers.utils.toUtf8Bytes('')],
    ];
};

/// @notice formats exchange object and sets mock wrapper balance.
/// Rate is calculated based on USD feeds inside TokenPriceHelper contract.
const formatMockExchangeObjUsdFeed = async (
    srcTokenInfo,
    destTokenInfo,
    srcAmount,
    wrapperContract,
) => {
    const tokenHelper = await getTokenHelperContract();
    const srcTokenPriceInUSD = await tokenHelper.getPriceInUSD(srcTokenInfo.addresses[chainIds[network]]);
    const destTokenPriceInUSD = await tokenHelper.getPriceInUSD(destTokenInfo.addresses[chainIds[network]]);

    const srcTokenPriceInUsdBN = BigNumber.from(srcTokenPriceInUSD);
    const destTokenPriceInUsdBN = BigNumber.from(destTokenPriceInUSD);
    const ten = BigNumber.from(10);
    const destScale = ten.pow(destTokenInfo.decimals);
    const srcScale = ten.pow(srcTokenInfo.decimals);

    const destTokenAmountBN = srcAmount
        .mul(srcTokenPriceInUsdBN)
        .mul(destScale)
        .div(destTokenPriceInUsdBN)
        .div(srcScale)
        .mul(2);

    console.log(destTokenAmountBN);

    await setBalance(
        destTokenInfo.addresses[chainIds[network]],
        wrapperContract.address,
        destTokenAmountBN,
    );

    return [
        srcTokenInfo.addresses[chainIds[network]],
        destTokenInfo.addresses[chainIds[network]],
        srcAmount,
        0,
        0,
        0,
        nullAddress,
        wrapperContract.address,
        hre.ethers.utils.defaultAbiCoder.encode(['uint256'], [0]),
        [nullAddress, nullAddress, nullAddress, 0, 0, hre.ethers.utils.toUtf8Bytes('')],
    ];
};

// eslint-disable-next-line max-len
const formatExchangeObj = (srcAddr, destAddr, amount, wrapper, destAmount = 0, uniV3fee, minPrice = 0) => {
    const abiCoder = new hre.ethers.utils.AbiCoder();

    let firstPath = srcAddr;
    let secondPath = destAddr;

    if (srcAddr.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
        firstPath = addrs[network].WETH_ADDRESS;
    }

    if (destAddr.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
        secondPath = addrs[network].WETH_ADDRESS;
    }

    // quick fix if we use strategy placeholder value
    if (firstPath[0] === '%' || firstPath[0] === '&') {
        firstPath = nullAddress;
        secondPath = nullAddress;
    }

    let path = abiCoder.encode(['address[]'], [[firstPath, secondPath]]);
    if (uniV3fee > 0) {
        if (destAmount > 0) {
            path = hre.ethers.utils.solidityPack(['address', 'uint24', 'address'], [secondPath, uniV3fee, firstPath]);
        } else {
            path = hre.ethers.utils.solidityPack(['address', 'uint24', 'address'], [firstPath, uniV3fee, secondPath]);
        }
    }
    return [
        srcAddr,
        destAddr,
        amount,
        destAmount,
        minPrice,
        0,
        nullAddress,
        wrapper,
        path,
        [nullAddress, nullAddress, nullAddress, 0, 0, hre.ethers.utils.toUtf8Bytes('')],
    ];
};

// eslint-disable-next-line no-underscore-dangle
let _curveObj;
const curveApiInit = async () => {
    if (!_curveObj) {
        _curveObj = ((await curve).default);
        await _curveObj.init('JsonRpc', { url: process.env.ETHEREUM_NODE }, { chaindId: '1' });
        // Fetch factory pools
        await _curveObj.factory.fetchPools(true);
        await _curveObj.crvUSDFactory.fetchPools(true);
        await _curveObj.EYWAFactory.fetchPools(true);
        await _curveObj.cryptoFactory.fetchPools(true);
        await _curveObj.tricryptoFactory.fetchPools(true);
    }
    return _curveObj;
};

const formatExchangeObjCurve = async (
    srcAddr,
    destAddr,
    amount,
    wrapper,
) => {
    const curveObj = await curveApiInit();

    const { route: sdkRoute } = await curveObj.router.getBestRouteAndOutput(
        srcAddr,
        destAddr,
        amount,
    );
    const args = curveObj.router.getArgs(sdkRoute);

    const exchangeData = hre.ethers.utils.defaultAbiCoder.encode(
        ['address[11]', 'uint256[5][5]', 'address[5]'],
        // eslint-disable-next-line no-underscore-dangle
        [args._route, args._swapParams, args._pools],
    );
    if (exchangeData.toString().includes('5e74c9036fb86bd7ecdcb084a0673efc32ea31cb')) {
        console.log('sETH used in curve route, may fail');
    }
    if (exchangeData.toString().includes('fe18be6b3bd88a2d2a7f928d00292e7a9963cfc6')) {
        console.log('sBTC used in curve route, may fail');
    }
    if (exchangeData.toString().includes('57Ab1ec28D129707052df4dF418D58a2D46d5f51')) {
        console.log('sUSD used in curve route, may fail');
    }
    return [
        srcAddr,
        destAddr,
        amount,
        0,
        0,
        0,
        nullAddress,
        wrapper,
        exchangeData,
        [nullAddress, nullAddress, nullAddress, 0, 0, hre.ethers.utils.toUtf8Bytes('')],
    ];
};

// TODO[LiquityV2] remove bold 'boldSrc' and 'boldDest' once deployed. This is only used for temporary testing
const formatExchangeObjSdk = async (
    srcAddr, destAddr, amount, wrapper, boldSrc = false, boldDest = false,
) => {
    const { AlphaRouter, SwapType } = await import('@uniswap/smart-order-router');
    const {
        CurrencyAmount,
        Token,
        TradeType,
        Percent,
    } = await import('@uniswap/sdk-core');
    const chainId = chainIds[network];
    const boldInfo = { decimals: 18, symbol: 'Bold', name: 'Bold Stablecoin' };
    const srcTokenInfo = boldSrc ? boldInfo : getAssetInfoByAddress(srcAddr, chainId);
    const srcToken = new Token(
        chainId,
        srcAddr,
        srcTokenInfo.decimals,
        srcTokenInfo.symbol,
        srcTokenInfo.name,
    );
    const destTokenInfo = boldDest ? boldInfo : getAssetInfoByAddress(destAddr, chainId);
    const destToken = new Token(
        chainId,
        destAddr,
        destTokenInfo.decimals,
        destTokenInfo.symbol,
        destTokenInfo.name,
    );
    const swapAmount = CurrencyAmount.fromRawAmount(srcToken, amount.toString());

    const router = new AlphaRouter({ chainId, provider: hre.ethers.provider });
    const { path } = await router.route(
        swapAmount, destToken, TradeType.EXACT_INPUT,
        {
            type: SwapType.SWAP_ROUTER_02,
            slippageTolerance: new Percent(5, 100),
        },
        {
            maxSplits: 0,
        },
    ).then(({ methodParameters }) => hre.ethers.utils.defaultAbiCoder.decode(
        ['(bytes path,address,uint256,uint256)'],
        `0x${methodParameters.calldata.slice(10)}`,
    )[0]);

    console.log({ path });

    return [
        srcAddr,
        destAddr,
        amount,
        0,
        0,
        0,
        nullAddress,
        wrapper,
        path,
        [nullAddress, nullAddress, nullAddress, 0, 0, hre.ethers.utils.toUtf8Bytes('')],
    ];
};

const isEth = (tokenAddr) => {
    if (tokenAddr.toLowerCase() === ETH_ADDR.toLowerCase()
    || tokenAddr.toLowerCase() === addrs[network].WETH_ADDRESS.toLowerCase()
    ) {
        return true;
    }

    return false;
};

const convertToWeth = (tokenAddr) => {
    if (isEth(tokenAddr)) {
        return addrs[network].WETH_ADDRESS;
    }

    return tokenAddr;
};

const getProxyAuth = async (proxyAddr, addrWithAuth) => {
    const dsAuth = await hre.ethers.getContractAt('DSAuth', proxyAddr);
    const authorityAddr = await dsAuth.authority();
    const dsGuard = await hre.ethers.getContractAt('DSAuthority', authorityAddr);
    const selector = '0x1cff79cd'; // execute selector

    const hasPermission = await dsGuard.canCall(addrWithAuth, proxyAddr, selector);

    return hasPermission;
};

const setNewExchangeWrapper = async (acc, newAddr, isFork = false) => {
    const ownerAddr = addrs[network].OWNER_ACC;
    if (!isFork) {
        await sendEther(acc, ownerAddr, '1');
        await impersonateAccount(ownerAddr);
    }

    const signer = await hre.ethers.provider.getSigner(ownerAddr);

    const registryInstance = await hre.ethers.getContractFactory('WrapperExchangeRegistry');
    const registry = await registryInstance.attach(addrs[network].WRAPPER_EXCHANGE_REGISTRY);
    const registryByOwner = registry.connect(signer);

    await registryByOwner.addWrapper(newAddr, { gasLimit: 300000 });
    if (!isFork) {
        await stopImpersonatingAccount(ownerAddr);
    }
};

const depositToWeth = async (amount, signer) => {
    const weth = await hre.ethers.getContractAt('IWETH', addrs[network].WETH_ADDRESS);

    if (signer) {
        const wethWithSigner = weth.connect(signer);
        await wethWithSigner.deposit({ value: amount });
    } else {
        await weth.deposit({ value: amount });
    }
};

const expectCloseEq = (expected, actual) => {
    expect(expected).to.be.closeTo(actual, (expected * 1e-6).toFixed(0));
};

const formatExchangeObjForOffchain = (
    srcAddr,
    destAddr,
    amount,
    wrapper,
    exchangeAddr,
    allowanceTarget,
    price,
    protocolFee,
    callData,
) => [
    srcAddr,
    destAddr,
    amount,
    0,
    0,
    0,
    nullAddress,
    wrapper,
    [],
    [wrapper, exchangeAddr, allowanceTarget, price, protocolFee, callData],
];

const addToExchangeAggregatorRegistry = async (acc, newAddr, isFork = false) => {
    const ownerAddr = addrs[network].OWNER_ACC;
    if (!isFork) {
        await sendEther(acc, ownerAddr, '1');
        await impersonateAccount(ownerAddr);
    }
    const signer = hre.ethers.provider.getSigner(ownerAddr);

    const registry = await hre.ethers.getContractAt(
        'ExchangeAggregatorRegistry', addrs[network].EXCHANGE_AGGREGATOR_REGISTRY_ADDR, signer,
    );

    await registry.setExchangeTargetAddr(newAddr, true);

    if (!isFork) {
        await stopImpersonatingAccount(ownerAddr);
    }
};

const getGasUsed = async (receipt) => {
    const parsed = await receipt.wait();

    return parsed.gasUsed.toString();
};

const callDataCost = (calldata) => {
    if (calldata.slice(0, 2) === '0x') {
        // eslint-disable-next-line no-param-reassign
        calldata = calldata.slice(2);
    }

    let cost = 0;
    for (let i = 0; i < calldata.length / 2; i++) {
        if (calldata.slice(2 * i, 2 * i + 2) === '00') {
            cost += 4;
        } else {
            cost += 16;
        }
    }

    return cost;
};

const calcGasToUSD = (gasUsed, gasPriceInGwei = 0, callData = 0) => {
    if (gasPriceInGwei === 0) {
        // eslint-disable-next-line no-param-reassign
        gasPriceInGwei = addrs[network].AVG_GAS_PRICE;
    }

    let extraCost = 0;

    if (callData !== 0) {
        const l1GasCost = callDataCost(callData);

        extraCost = ((l1GasCost) * addrs.mainnet.AVG_GAS_PRICE * 1000000000) / 1e18;

        console.log('L1 gas cost:', extraCost);
    }

    let ethSpent = ((gasUsed) * gasPriceInGwei * 1000000000) / 1e18;
    ethSpent += extraCost;

    console.log('Eth gas cost: ', ethSpent);

    return (ethSpent * getLocalTokenPrice('WETH')).toFixed(2);
};

const getChainLinkPrice = async (tokenAddr) => {
    const feedRegistry = await hre.ethers.getContractAt('IFeedRegistry', FEED_REGISTRY_ADDRESS);

    const data = await feedRegistry.latestRoundData(tokenAddr, USD_DENOMINATION);

    // const decimals = await feedRegistry.decimals(tokenAddr, USD_DENOMINATION);

    return data.answer.toString();
};

const cacheChainlinkPrice = async (tokenSymbol, tokenAddr) => {
    try {
        if (cachedTokenPrices[tokenSymbol]) return cachedTokenPrices[tokenSymbol];

        // eslint-disable-next-line no-param-reassign
        if (tokenAddr.toLowerCase() === WBTC_ADDR.toLowerCase()) tokenAddr = BTC_ADDR;

        let wstethMultiplier = '1';
        if (tokenAddr.toLowerCase() === WSTETH_ADDRESS.toLowerCase()) {
            // eslint-disable-next-line no-param-reassign
            tokenAddr = STETH_ADDRESS;
            wstethMultiplier = BN2Float(await hre.ethers.provider.call({
                to: WSTETH_ADDRESS,
                data: hre.ethers.utils.id('stEthPerToken()').slice(0, 10),
            }));
        }

        let tokenPrice = BN2Float(await getChainLinkPrice(tokenAddr), 8);
        tokenPrice = (+wstethMultiplier * +tokenPrice).toFixed(2);
        cachedTokenPrices[tokenSymbol] = tokenPrice;

        return tokenPrice;
    } catch (e) {
        console.log(e);
        console.log(`no chainlink feed found ${tokenSymbol} ${tokenAddr}`);
        return undefined;
    }
};

const takeSnapshot = async () => hre.network.provider.request({
    method: 'evm_snapshot',
});

const revertToSnapshot = async (snapshotId) => hre.network.provider.request({
    method: 'evm_revert',
    params: [snapshotId],
});

const getWeth = () => addrs[network].WETH_ADDRESS;

const openStrategyAndBundleStorage = async (isFork) => {
    const strategySubAddr = await getAddrFromRegistry('StrategyStorage');
    const bundleSubAddr = await getAddrFromRegistry('BundleStorage');

    const currOwnerAddr = getOwnerAddr();

    const ownerSigner = await hre.ethers.provider.getSigner(currOwnerAddr);

    if (!isFork) {
        await impersonateAccount(currOwnerAddr);
    }

    let strategyStorage = await hre.ethers.getContractAt('StrategyStorage', strategySubAddr);
    let bundleStorage = await hre.ethers.getContractAt('BundleStorage', bundleSubAddr);

    strategyStorage = strategyStorage.connect(ownerSigner);
    bundleStorage = bundleStorage.connect(ownerSigner);

    await strategyStorage.changeEditPermission(true);
    await bundleStorage.changeEditPermission(true);

    if (!isFork) {
        await stopImpersonatingAccount(currOwnerAddr);
    }
};

async function setForkForTesting() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    const setBalanceMethod = hre.network.config.isAnvil ? 'anvil_setBalance' : 'hardhat_setBalance';
    await hre.network.provider.send(setBalanceMethod, [
        senderAcc.address,
        '0xC9F2C9CD04674EDEA40000000',
    ]);
    await hre.network.provider.send(setBalanceMethod, [
        OWNER_ACC,
        '0xC9F2C9CD04674EDEA40000000',
    ]);

    const setNextBlockBaseFeeMethod = hre.network.config.isAnvil
        ? 'anvil_setNextBlockBaseFeePerGas'
        : 'hardhat_setNextBlockBaseFeePerGas';

    await hre.network.provider.send(setNextBlockBaseFeeMethod, [
        '0x1', // 1 wei
    ]);
}

const resetForkToBlock = async (block) => {
    cachedTokenPrices = {};
    let rpcUrl = process.env.ETHEREUM_NODE;

    if (network !== 'mainnet') {
        rpcUrl = process.env[`${network.toUpperCase()}_NODE`];
    }

    const resetMethod = hre.network.config.isAnvil ? 'anvil_reset' : 'hardhat_reset';

    if (block) {
        await hre.network.provider.request({
            method: resetMethod,
            params: [
                {
                    forking: {
                        jsonRpcUrl: rpcUrl,
                        blockNumber: block,
                    },
                },
            ],
        });
    } else {
        await hre.network.provider.request({
            method: resetMethod,
            params: [
                {
                    forking: {
                        jsonRpcUrl: rpcUrl,
                    },
                },
            ],
        });
    }
    await setForkForTesting();
};

const mockChainlinkPriceFeed = async () => {
    await setCode(addrs[network].FEED_REGISTRY, mockChainlinkFeedRegistryBytecode);

    const registryInstance = await hre.ethers.getContractFactory('MockChainlinkFeedRegistry');
    const registry = await registryInstance.attach(addrs[network].FEED_REGISTRY);

    return registry;
};

const setMockPrice = async (mockContract, roundId, token, price) => {
    const USD_QUOTE = '0x0000000000000000000000000000000000000348';
    const formattedPrice = price * 1e8;
    const c = await hre.ethers.getContractAt(
        'MockChainlinkFeedRegistry',
        addrs[network].FEED_REGISTRY,
    );
    await c.setRoundData(token, USD_QUOTE, roundId, formattedPrice);
};

const filterEthersObject = (obj) => {
    if (typeof obj !== 'object') return obj;
    if (obj instanceof hre.ethers.BigNumber) return obj.toString();

    const keys = Object.keys(obj);
    const stringKeys = keys.filter((key, i) => +key !== i);

    if (stringKeys.length !== 0) {
        return stringKeys.reduce(
            (acc, key) => ({ ...acc, [key]: filterEthersObject(obj[key]) }),
            {},
        );
    }
    return keys.map((key) => filterEthersObject(obj[key]));
};

const isProxySafe = (proxy) => proxy.functions.nonce !== undefined;

// executes tx through safe or dsproxy depending the type
const executeTxFromProxy = async (proxy, targetAddr, callData, ethValue = 0) => {
    let receipt;
    if (isProxySafe(proxy)) {
        console.log('proxy signer address');
        receipt = await executeSafeTx(
            proxy.signer.address,
            proxy,
            targetAddr,
            callData,
            1,
            ethValue,
        );
    } else {
        receipt = await proxy['execute(address,bytes)'](targetAddr, callData, {
            gasLimit: 10000000,
            value: ethValue,
        });
    }

    return receipt;
};

const WALLETS = ['DS_PROXY', 'SAFE'];
const isWalletNameDsProxy = (w) => w === 'DS_PROXY';

const generateIds = () => {
    const idsMap = {};
    const files = getAllFiles('./contracts');

    // add extra non-contract name ids
    files.push('/StrategyExecutorID.sol');
    files.push('/FLActionL2.sol');
    files.push('/MStableDeposit.sol');
    files.push('/MStableWithdraw.sol');
    files.push('/RariDeposit.sol');
    files.push('/RariWithdraw.sol');
    files.push('/FLMorphoBlue.sol');
    files.push('/FLAaveV3.sol');
    files.push('/FLAaveV3WithFee.sol');
    files.push('/FLAaveV2.sol');
    files.push('/FLMaker.sol');
    files.push('/FLBalancer.sol');
    files.push('/BalancerV2Supply.sol');
    files.push('/BalancerV2Withdraw.sol');
    files.push('/BalancerV2Claim.sol');

    files.forEach((filePath) => {
        const fileName = filePath.split('/').pop().split('.')[0];
        const id = getNameId(fileName);

        idsMap[id] = { fileName, filePath };
        // add id if it's contract name + New at the end
        idsMap[`${id}New`] = { fileName: `${fileName}New`, filePath };
    });

    return idsMap;
};

module.exports = {
    addToExchangeAggregatorRegistry,
    getAddrFromRegistry,
    getProxy,
    getProxyWithSigner,
    redeploy,
    send,
    approve,
    balanceOf,
    formatExchangeObj,
    formatExchangeObjSdk,
    formatExchangeObjForOffchain,
    formatMockExchangeObjUsdFeed,
    isEth,
    sendEther,
    impersonateAccount,
    stopImpersonatingAccount,
    convertToWeth,
    depositToWeth,
    timeTravel,
    fetchStandardAmounts,
    setNewExchangeWrapper,
    fetchAmountinUSDPrice,
    getGasUsed,
    getNameId,
    getChainLinkPrice,
    getLocalTokenPrice,
    calcGasToUSD,
    getProxyAuth,
    getAllowance,
    openStrategyAndBundleStorage,
    redeployCore,
    getOwnerAddr,
    getAdminAddr,
    getWeth,
    BN2Float,
    Float2BN,
    callDataCost,
    mockChainlinkPriceFeed,
    setMockPrice,
    getNftOwner,
    isProxySafe,
    getSparkFLFee,
    setNetwork,
    setBalance,
    takeSnapshot,
    revertToSnapshot,
    mineBlock,
    setForkForTesting,
    resetForkToBlock,
    balanceOfOnTokenInBlock,
    formatExchangeObjCurve,
    formatMockExchangeObj,
    cacheChainlinkPrice,
    expectCloseEq,
    setContractAt,
    getContractFromRegistry,
    filterEthersObject,
    curveApiInit,
    executeTxFromProxy,
    generateIds,
    approveContractInRegistry,
    isWalletNameDsProxy,
    fetchAmountInUSDPrice,
    fetchTokenPriceInUSD,
    isNetworkFork,
    setCode,
    addrs,
    AVG_GAS_PRICE,
    standardAmounts,
    nullAddress,
    dydxTokens,
    REGISTRY_ADDR,
    AAVE_MARKET,
    DAI_ADDR,
    KYBER_WRAPPER,
    UNISWAP_WRAPPER,
    OASIS_WRAPPER,
    WETH_ADDRESS,
    ETH_ADDR,
    OWNER_ACC,
    ADMIN_ACC,
    USDC_ADDR,
    AAVE_FL_FEE,
    AAVE_V3_FL_FEE,
    MIN_VAULT_DAI_AMOUNT,
    MIN_VAULT_RAI_AMOUNT,
    RAI_ADDR,
    MAX_UINT,
    MAX_UINT128,
    LOGGER_ADDR,
    UNIV3ROUTER_ADDR,
    UNIV3POSITIONMANAGER_ADDR,
    YEARN_REGISTRY_ADDRESS,
    placeHolderAddr,
    STETH_ADDRESS,
    UNIV2_ROUTER_ADDRESS,
    DFS_REG_CONTROLLER,
    BAL_ADDR,
    AUNI_ADDR,
    AWETH_ADDR,
    ADAI_ADDR,
    UNI_ADDR,
    ALINK_ADDR,
    LINK_ADDR,
    USDT_ADDR,
    BUSD_ADDR,
    AWBTC_ADDR,
    WBTC_ADDR,
    WSTETH_ADDRESS,
    A_WSETH_TOKEN_ADDR,
    LUSD_ADDR,
    rariDaiFundManager,
    rdptAddress,
    rariUsdcFundManager,
    rsptAddress,
    AAVE_MARKET_OPTIMISM,
    network,
    chainIds,
    BLUSD_ADDR,
    BOND_NFT_ADDR,
    AAVE_V2_MARKET_ADDR,
    WALLETS,
    BOLD_ADDR,
    BALANCER_VAULT_ADDR,
    EETH_ADDR,
    ETHER_FI_LIQUIDITY_POOL,
};
