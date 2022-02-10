const { getNameId } = require('../test/utils');

const SEVEN_DAYS_IN_SECONDS = 604800;
const ONE_DAY_IN_SECONDS = 86400;

const deploymentData = [
    {
        id: getNameId('ProxyAuth'),
        contractAddr: '0xD489FfAEEB46b2d7E377850d45E1F8cA3350fc82',
        time: SEVEN_DAYS_IN_SECONDS,
    },
    {
        id: getNameId('SubStorage'),
        contractAddr: '0x0a5e900E8261F826484BD96F0da564C5bB365Ffa',
        time: SEVEN_DAYS_IN_SECONDS,
    },
    {
        id: getNameId('StrategyStorage'),
        contractAddr: '0x172f1dB6c58C524A1Ab616a1E65c19B5DF5545ae',
        time: SEVEN_DAYS_IN_SECONDS,
    },
    {
        id: getNameId('BundleStorage'),
        contractAddr: '0x56eB74B9963BCbd6877ab4Bf8e68daBbEe13B2Bb',
        time: SEVEN_DAYS_IN_SECONDS,
    },
    {
        id: getNameId('BotAuth'),
        contractAddr: '0x537a021F3647a64A5a1FEFB7C4D5a5A6DCaE6b9f',
        time: SEVEN_DAYS_IN_SECONDS,
    },
    {
        id: getNameId('StrategyExecutor'),
        contractAddr: '0x6a1C1B8a27E7613a595Ffb7cCE225bdda7e04832',
        time: SEVEN_DAYS_IN_SECONDS,
    },
    {
        id: getNameId('RecipeExecutor'),
        contractAddr: '0xe822d76c2632FC52f3eaa686bDA9Cea3212579D8',
        time: SEVEN_DAYS_IN_SECONDS,
    },
    {
        id: getNameId('MStableWithdraw'),
        contractAddr: '0xa4d5d3e56012C1eD8aba4bE246964962DC3F735f',
        time: ONE_DAY_IN_SECONDS,
    },
    {
        id: getNameId('RariWithdraw'),
        contractAddr: '0xa052eD427EFa63B5bb87c409449a47e7C50317e3',
        time: ONE_DAY_IN_SECONDS,
    },
    {
        id: getNameId('YearnWithdraw'),
        contractAddr: '0x563eF9b1075628E62aDc657702517dEA72ca08d6',
        time: ONE_DAY_IN_SECONDS,
    },
    {
        id: getNameId('McdPayback'),
        contractAddr: '0xc210f2ba1eF46B02AfDA6F52F7376D13649a6B82',
        time: ONE_DAY_IN_SECONDS,
    },
    {
        id: getNameId('GasFeeTaker'),
        contractAddr: '0x431F1E1A9859EF99953801dbdeB31d2846ADcc0d',
        time: ONE_DAY_IN_SECONDS,
    },
    {
        id: getNameId('McdRatioTrigger'),
        contractAddr: '0x05b104aB6BaE42d4a665bB1A407142f2ec5A6512',
        time: ONE_DAY_IN_SECONDS,
    },

];

console.log(deploymentData.map((d) => d.id));
console.log(deploymentData.map((d) => d.contractAddr));
console.log(deploymentData.map((d) => d.time));
