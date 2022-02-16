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
        id: getNameId('McdRatioTrigger'),
        contractAddr: '0x05b104aB6BaE42d4a665bB1A407142f2ec5A6512',
        time: ONE_DAY_IN_SECONDS,
    },
];

const actionAddresses = {

    // utils
    WrapEth: '0x8EbBd35f84D7f0DFCBEf08fD30CD09176133251A',
    UnwrapEth: '0xDB6C8cFDd7c1C0F8895CDBC01Dbf4A6D4B6d2a29',
    PullToken: '0x254cA89a00d53ab61de2Ba5641DBDC01aE48aed4',
    SendToken: '0x5612e490c9549486dF16b34EBfD0E8b6cF6a1717',
    SumInputs: '0x70907d840aBBc984Fd949311d2f005e6aC4a4D7a',
    SubInputs: '0xe1804b756188F63f723d2FECc02988D0Cc1aB823',
    ChangeProxyOwner: '0x81cA52CfE66421d0ceF82d5F33230e43b5F23D2B',
    TokenBalance: '0xa92B177950F1460119940436515FD857C24494BC',
    AutomationV2Unsub: '0xe35Fb12fE9796847751076aCf5ee7d124108612C',

    // exchange
    DFSSell: '0x1abDDCae131ce200e66140d9fBd0C37F7a40e642',

    // maker
    McdGenerate: '0xe7F76594123683DE9178DE4496C553B50Ec95aBf',
    McdGive: '0xf9556A87BF424834FDe7De0547b58E36Cb42EF01',
    McdMerge: '0x6D06C6c2BCeaEC31b0F8Cd68C594120dDCcCC427',
    McdOpen: '0xE6C9Db562845aF046e3CA290b4110d8398ce71E9',
    McdPayback: '0xc210f2ba1eF46B02AfDA6F52F7376D13649a6B82',
    McdSupply: '0x6579a42BA0f17FB208047E5149d42e9D0BceFa78',
    McdWithdraw: '0x773b3454C5d4Afff8938748816d7E92d25841927',

    // reflexer
    ReflexerSupply: '0xd7a36CD4ce7CCc2F1376Dc5C48BaC84380A4f698',
    ReflexerWithdraw: '0xD8a14d447AB6789F3bf1Eb763b6306db3FC3d666',
    ReflexerPayback: '0xcC6838d8a61a4b29Ea565d39C38b830f1491cb29',
    ReflexerGenerate: '0x8e8Fd178A5FAE3A29F9CB1A06aBBBCFd5B83beb7',
    ReflexerOpen: '0x4704a7cBd4d913d1233765B70531D601b4384011',
    // aave
    AaveBorrow: '0x1B95E800a869bc3F89914470a7901D93D1401cD1',
    AavePayback: '0x066225964999F1D07C888c5Ac4a6C885bDa88b9A',
    AaveSupply: '0xEbB200a529058B561B42Eab510DA157a63243CEc',
    AaveWithdraw: '0x754C58fA92246414a448c1ed44ea3D1AD446d482',
    AaveCollateralSwitch: '0xFf5dfF1B90bd5Aa6E12768AB497dB90cc9DE6F5d',

    // compound
    CompBorrow: '0x8495579BF6Ae848f7E59686536F834f1d2CCd79C',
    CompClaim: '0x81F488cF7A0128A9DB5e7207042cCAB1CB0ac902',
    CompPayback: '0x2881590d5FfBd1e88BFc0Dc292f10e5377977f87',
    CompSupply: '0xB4CEDe40b249b756Ce0EAa3e14F6af89f25f9a3d',
    CompWithdraw: '0x3792F83D6A82091cb53052458038CC86e206463F',
    CompGetDebt: '0xc2B8f8423bc8Fe2e9A44cA9d364d835D1751b725',
    CompCollateralSwitch: '0xC3d89139508A3883775D3d1E62E2A0fea363b448',

    // flashloan
    FLAaveV2: '0x6fE6B0eeeeC7B05d663A99C0805E1A18FbdC6E59',
    FLDyDx: '0x08AC78B418fCB0DDF1096533856A757C28d430d7',
    FLMaker: '0xd393582bE148A45585aB202Fa7Cc789Fa5127223',
    FLBalancer: '0x5C7a9f4635AE4F95da2e45317311AAe255FB71B3',

    // uniswap
    UniSupply: '0x9935e12F0218E61c27D7f23eAC9A9D6881a078eC',
    UniWithdraw: '0xf8bb8F68b0A45DC315F3f7602a60cfb274B00951',

    // uniswap V3
    UniCollectV3: '0x331D7C3F6E710cB6cFE94c4Aa04AC3345AC00e00',
    UniMintV3: '0x3dF75BE8Fb0a6186BE9705cACaa6dD2a4Ec3e40C',
    UniSupplyV3: '0x0CA4255b37DD083dBD48Ca74d575F46037992520',
    UniWithdrawV3: '0xe06224593D9c860B2fBF39eEA3b9B8A85b77Fbc4',
    UniCreatePoolV3: '0x9058aAbEdEfe652b1d85DBBAB48Dfa78db613C44',

    // dydx
    DyDxWithdraw: '0x827089C5Fc7653655c4080c660Cd8f755F818443',

    // yearn
    YearnSupply: '0x837D6E7F469b3cC820B0a6Da25415D5aE0A861c4',
    YearnWithdraw: '0x563eF9b1075628E62aDc657702517dEA72ca08d6',

    // liquity
    LiquityClose: '0x4B2d174129789a88e92D46342201F207132144b7',
    LiquityBorrow: '0xF978d6C5c8af80a059AdB85EEb64F14C9c436D68',
    LiquityOpen: '0x4EFF392cc69B31Ad159EcfA10305251b2d8E40E0',
    LiquityPayback: '0x8fc7D24414e9740ed9841d9205D458e3677e71f7',
    LiquityWithdraw: '0x733F53579bEcdd3Ed07e745A55Ee9af8B9669048',
    LiquitySupply: '0xD539943e080C2a29e3f1DB2d45Ea7240d7ddDEE2',
    LiquitySPDeposit: '0x5aB0244a00a733f16E6b238B462bdF3538C698E1',
    LiquitySPWithdraw: '0xa71817957eaF993fAA9a1F4B5c2402c0aeFCd9C6',
    LiquityStake: '0x671280800B540cbF073561d84A297a2c4c5D529F',
    LiquityUnstake: '0x86FDD4A6438D448a794A44ABBe47D57590b3350d',
    LiquityEthGainToTrove: '0x65e19f967B3F3cB6466110aD238039F5423E3177',
    LiquityClaim: '0x526735aDcBe5c9059275c5ED2E0574b4a24b875e',
    LiquityRedeem: '0x20B78854658011394C931EF2BF3cEEA2Fe62E7f0',

    // lido
    LidoStake: '0x4a7dd38D2BcA817fb68165155F869ca4179d8060',
    LidoWrap: '0xE637544390db79EdDE0a9CAF352ED0FfF7451bDB',
    LidoUnwrap: '0x910F73Fb8C0Bd15423c0D0BaD9F1ed95187a48fD',

    // insta
    InstPullTokens: '0xf2c87782D6Eff0511e82007119BAC40e9ba86F69',

    // balancer
    BalancerV2Supply: '0xE48123018Db5e9075841C61EA702cEca51621191',
    BalancerV2Withdraw: '0xbED38692438b90AF738F8A7A3142C217DE8fB069',
    BalancerV2Claim: '0xEac7c5bEFaA6E17f1A2e86947eEd6419c74A7C03',

    // GUni
    GUniWithdraw: '0x6F7cD7C0Dd3634E14bAB91FDF3bCE0a4315b3C59',
    GUniDeposit: '0xb247cD4cab056800cCDa7cE1AFB781a8bFA9b57A',

    // Rari
    RariDeposit: '0x77A05c15f62F1fA6471D466001E21C1B189fcA9F',
    RariWithdraw: '0xa052eD427EFa63B5bb87c409449a47e7C50317e3',

    // mStable
    MStableDeposit: '0xdf24ed1250fbfa274316b50Bc9A009aFA8F61E16',
    MStableWithdraw: '0xa4d5d3e56012C1eD8aba4bE246964962DC3F735f',

    MStableClaim: '0xD56F0EC66267958e08c91547c259cCAC006BF118',

    McdRatioCheck: '0x3f09773e5e945C6Aa1bc8a8B3492f507620DE1e1',
    GasFeeTaker: '0x431F1E1A9859EF99953801dbdeB31d2846ADcc0d',
};

const actions = [];
// eslint-disable-next-line no-restricted-syntax
for (const [key, value] of Object.entries(actionAddresses)) {
    console.log(`${key}: ${value}`);
    actions.push({
        id: getNameId(key),
        contractAddr: value,
        time: ONE_DAY_IN_SECONDS,
    });
}

console.log(actions.map((d) => d.id));
console.log(actions.map((d) => d.contractAddr));
console.log(actions.map((d) => d.time));

// console.log(deploymentData.map((d) => d.id));
// console.log(deploymentData.map((d) => d.contractAddr));
// console.log(deploymentData.map((d) => d.time));
