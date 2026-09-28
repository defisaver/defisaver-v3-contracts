// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { MarketParams } from "../../../contracts/interfaces/protocols/morpho-blue/IMorphoBlue.sol";

/// @notice Every MorphoBlue market DFS supports on Mainnet (chainId 1) - 79 markets.
contract MainnetMorphoBlueMarketsAddresses {
    function getMorphoBlueMarkets() internal pure returns (MarketParams[] memory markets) {
        markets = new MarketParams[](79);
        // wstETH/USDC  0xb323495f7e4148be5643a4ea4a8221eef163e4bccfdedc2a6f4696baacbc86cc
        markets[0] = MarketParams({
            loanToken: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            collateralToken: 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0,
            oracle: 0x48F7E36EB6B826B2dF4B2E630B62Cd25e89E40e2,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // sDAI/USDC  0x06f2842602373d247c4934f7656e513955ccc4c377f0febc0d9ca2c3bcc191b1
        markets[1] = MarketParams({
            loanToken: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            collateralToken: 0x83F20F44975D03b1b09e64809B757c47f942BEeA,
            oracle: 0x6CAFE228eC0B0bC2D076577d56D35Fe704318f6d,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 965_000_000_000_000_000
        });
        // WBTC/USDC  0x3a85e619751152991742810df6ec69ce473daef99e28a64ab2340d7b7ccfee49
        markets[2] = MarketParams({
            loanToken: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            collateralToken: 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599,
            oracle: 0xDddd770BADd886dF3864029e4B377B5F6a2B6b83,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // ETH/USDC  0xf9acc677910cc17f650416a22e2a14d5da7ccb9626db18f1bf94efe64f92b372
        markets[3] = MarketParams({
            loanToken: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            collateralToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
            oracle: 0xdC6fd5831277c693b1054e19E94047cB37c77615,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 915_000_000_000_000_000
        });
        // ETH/USDC  0x7dde86a1e94561d9690ec678db673c1a6396365f7d1d65e129c5fff0990ff758
        markets[4] = MarketParams({
            loanToken: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            collateralToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
            oracle: 0xdC6fd5831277c693b1054e19E94047cB37c77615,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // WBTC/USDT  0xa921ef34e2fc7a27ccc50ae7e4b154e16c9799d3387076c421423ef52ac4df99
        markets[5] = MarketParams({
            loanToken: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            collateralToken: 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599,
            oracle: 0x008bF4B1cDA0cc9f0e882E0697f036667652E1ef,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // wstETH/USDT  0xe7e9694b754c4d4f7e21faf7223f6fa71abaeb10296a4c43a54a7977149687d2
        markets[6] = MarketParams({
            loanToken: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            collateralToken: 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0,
            oracle: 0x95DB30fAb9A3754e42423000DF27732CB2396992,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // wstETH/USDA  0x423cb007534ac88febb8ce39f544ab303e8b757f8415ed891fc76550f8f4c965
        markets[7] = MarketParams({
            loanToken: 0x0000206329b97DB379d5E1Bf586BbDB969C63274,
            collateralToken: 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0,
            oracle: 0xBC693693fDBB177Ad05ff38633110016BC043AC5,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // wstETH/PYUSD  0x124ddf1fa02a94085d1fcc35c46c7e180ddb8a0d3ec1181cf67a75341501c9e6
        markets[8] = MarketParams({
            loanToken: 0x6c3ea9036406852006290770BEdFcAbA0e23A0e8,
            collateralToken: 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0,
            oracle: 0x27679a17b7419fB10Bd9D143f21407760fdA5C53,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // weETH/ETH  0x37e7484d642d90f14451f1910ba4b7b8e4c3ccdd0ec28f8b2bdb35479e472ba7
        markets[9] = MarketParams({
            loanToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
            collateralToken: 0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee,
            oracle: 0xbDd2F2D473E8D63d1BFb0185B5bDB8046ca48a72,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 945_000_000_000_000_000
        });
        // WBTC/PYUSD  0x9337a95dcb09d10abb33fdb955dd27b46e345f5510d54d9403f570f8f37b5983
        markets[10] = MarketParams({
            loanToken: 0x6c3ea9036406852006290770BEdFcAbA0e23A0e8,
            collateralToken: 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599,
            oracle: 0xc53c90d6E9A5B69E4ABf3d5Ae4c79225C7FeF3d2,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // WBTC/ETH  0x138eec0e4a1937eb92ebc70043ed539661dd7ed5a89fb92a720b341650288a40
        markets[11] = MarketParams({
            loanToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
            collateralToken: 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599,
            oracle: 0xc29B3Bc033640baE31ca53F8a0Eb892AdF68e663,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 915_000_000_000_000_000
        });
        // USDe/USDT  0xcec858380cba2d9ca710fce3ce864d74c3f620d53826f69d08508902e09be86f
        markets[12] = MarketParams({
            loanToken: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            collateralToken: 0x4c9EDD5852cd905f086C759E8383e09bff1E68B3,
            oracle: 0xAf5060C11D3E8325a8ECF84c07fAB7Ac2297A72d,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 915_000_000_000_000_000
        });
        // sUSDe/USDT  0xdc5333039bcf15f1237133f74d5806675d83d9cf19cfd4cfdd9be674842651bf
        markets[13] = MarketParams({
            loanToken: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            collateralToken: 0x9D39A5DE30e57443BfF2A8307A4256c8797A3497,
            oracle: 0xE47E36457D0cF83A74AE1e45382B7A044f7abd99,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 915_000_000_000_000_000
        });
        // ezETH/ETH  0x49bb2d114be9041a787432952927f6f144f05ad3e83196a7d062f374ee11d0ee
        markets[14] = MarketParams({
            loanToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
            collateralToken: 0xbf5495Efe5DB9ce00f80364C8B423567e58d2110,
            oracle: 0x61025e2B0122ac8bE4e37365A4003d87ad888Cc3,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // ezETH/ETH  0xa0534c78620867b7c8706e3b6df9e69a2bc67c783281b7a77e034ed75cee012e
        markets[15] = MarketParams({
            loanToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
            collateralToken: 0xbf5495Efe5DB9ce00f80364C8B423567e58d2110,
            oracle: 0x94f93f1eADb8a2f73C415AD4C19cB791e6D0192b,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 945_000_000_000_000_000
        });
        // MKR/USDC  0x97bb820669a19ba5fa6de964a466292edd67957849f9631eb8b830c382f58b7f
        markets[16] = MarketParams({
            loanToken: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            collateralToken: 0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2,
            oracle: 0x6686788B4315A4F93d822c1Bf73910556FCe2d5a,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 770_000_000_000_000_000
        });
        // tBTC/USDC  0xe4cfbee9af4ad713b41bf79f009ca02b17c001a0c0e7bd2e6a89b1111b3d3f08
        markets[17] = MarketParams({
            loanToken: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            collateralToken: 0x18084fbA666a33d37592fA2633fD49a74DD93a88,
            oracle: 0x57bfdF6aB73995C5af58A95A16798190e366CA5b,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 770_000_000_000_000_000
        });
        // cbBTC/ETH  0x2cbfb38723a8d9a2ad1607015591a78cfe3a5949561b39bde42c242b22874ec0
        markets[18] = MarketParams({
            loanToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
            collateralToken: 0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf,
            oracle: 0x8F653cCFEbA16cF2c0B0D16bc82Bd6756C64f5D4,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 915_000_000_000_000_000
        });
        // cbBTC/USDC  0x64d65c9a2d91c36d56fbc42d69e979335320169b3df63bf92789e2c8883fcc64
        markets[19] = MarketParams({
            loanToken: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            collateralToken: 0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf,
            oracle: 0xA6D6950c9F177F1De7f7757FB33539e3Ec60182a,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // sUSDe/USDC  0x85c7f4374f3a403b36d54cc284983b2b02bbd8581ee0f3c36494447b87d9fcab
        markets[20] = MarketParams({
            loanToken: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            collateralToken: 0x9D39A5DE30e57443BfF2A8307A4256c8797A3497,
            oracle: 0x873CD44b860DEDFe139f93e12A4AcCa0926Ffb87,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 915_000_000_000_000_000
        });
        // LBTC/WBTC  0xf6a056627a51e511ec7f48332421432ea6971fc148d8f3c451e14ea108026549
        markets[21] = MarketParams({
            loanToken: 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599,
            collateralToken: 0x8236a87084f8B84306f72007F36F2618A5634494,
            oracle: 0xa98105B8227E0f2157816Feb7A331364A9B74F80,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 945_000_000_000_000_000
        });
        // USR/USDC  0x8e7cc042d739a365c43d0a52d5f24160fa7ae9b7e7c9a479bd02a56041d4cf77
        markets[22] = MarketParams({
            loanToken: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            collateralToken: 0x66a1E37c9b0eAddca17d3662D6c05F4DECf3e110,
            oracle: 0x8875ceb24E656FCA062759BDCF870F59A2B0187b,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 915_000_000_000_000_000
        });
        // syrupUSDC/USDC  0x729badf297ee9f2f6b3f717b96fd355fc6ec00422284ce1968e76647b258cf44
        markets[23] = MarketParams({
            loanToken: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            collateralToken: 0x80ac24aA929eaF5013f6436cdA2a7ba190f5Cc0b,
            oracle: 0x80032f4cb6E3573b9ed61E888AF658E48Fb790cC,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 915_000_000_000_000_000
        });
        // LBTC/USDC  0xbf02d6c6852fa0b8247d5514d0c91e6c1fbde9a168ac3fd2033028b5ee5ce6d0
        markets[24] = MarketParams({
            loanToken: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            collateralToken: 0x8236a87084f8B84306f72007F36F2618A5634494,
            oracle: 0xDCc04fFaCD7B49035cCdBbbA59a5f955944129DB,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // LBTC/cbBTC  0x444bbce85350aae535b037d090c8bdf6cc4cfc6d79e17725413b4cb0f6183ad4
        markets[25] = MarketParams({
            loanToken: 0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf,
            collateralToken: 0x8236a87084f8B84306f72007F36F2618A5634494,
            oracle: 0x1Ce1a1e68F26019CAf5E823A56e300755D70D078,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 945_000_000_000_000_000
        });
        // sUSDS/USDT  0x3274643db77a064abd3bc851de77556a4ad2e2f502f4f0c80845fa8f909ecf0b
        markets[26] = MarketParams({
            loanToken: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            collateralToken: 0xa3931d71877C0E7a3148CB7Eb4463524FEc27fbD,
            oracle: 0x0C426d174FC88B7A25d59945Ab2F7274Bf7B4C79,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 965_000_000_000_000_000
        });
        // MORPHO/USDC  0x6d95bf5fad1b0427205ee2b595f80b52e22394173de0832efa79fde88abb8525
        markets[27] = MarketParams({
            loanToken: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            collateralToken: 0x58D97B57BB95320F9a05dC918Aef65434969c2B2,
            oracle: 0xEEcD66e6C723c1506532a5f646cC8a502c026A2E,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 625_000_000_000_000_000
        });
        // sUSDe/USDTb  0x88a18b2f4d94e7ad27a381b15531c06abf05a7c99dd5d3c3679875fed6f7e742
        markets[28] = MarketParams({
            loanToken: 0xC139190F447e929f090Edeb554D95AbB8b18aC1C,
            collateralToken: 0x9D39A5DE30e57443BfF2A8307A4256c8797A3497,
            oracle: 0x67BcC03438D7d71c39343d7AD21cb73Dc19aDB89,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 915_000_000_000_000_000
        });
        // USDe/USDTb  0xba5bb3ccec8df00a56ac1f4d97ae0fd1461f262b6d4f29631bdec717fa6017fd
        markets[29] = MarketParams({
            loanToken: 0xC139190F447e929f090Edeb554D95AbB8b18aC1C,
            collateralToken: 0x4c9EDD5852cd905f086C759E8383e09bff1E68B3,
            oracle: 0xaE4750d0813B5E37A51f7629beedd72AF1f9cA35,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 915_000_000_000_000_000
        });
        // ETH/USDT  0xdbffac82c2dc7e8aa781bd05746530b0068d80929f23ac1628580e27810bc0c5
        markets[30] = MarketParams({
            loanToken: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            collateralToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
            oracle: 0xe9eE579684716c7Bb837224F4c7BeEfA4f1F3d7f,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 915_000_000_000_000_000
        });
        // rsETH/ETH  0xba761af4134efb0855adfba638945f454f0a704af11fc93439e20c7c5ebab942
        markets[31] = MarketParams({
            loanToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
            collateralToken: 0xA1290d69c65A6Fe4DF752f95823fae25cB99e5A7,
            oracle: 0x2A2658Fc208Ed00e11D96d3F7470618924466877,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 945_000_000_000_000_000
        });
        // rswETH/ETH  0xcacd4c39af872ddecd48b650557ff5bcc7d3338194c0f5b2038e0d4dec5dc022
        markets[32] = MarketParams({
            loanToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
            collateralToken: 0xFAe103DC9cf190eD75350761e95403b7b8aFa6c0,
            oracle: 0x56e2d0957d2376dF4A0519b91D1Fa19D2d63bd9b,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 945_000_000_000_000_000
        });
        // weETH/ETH  0x698fe98247a40c5771537b5786b2f3f9d78eb487b4ce4d75533cd0e94d88a115
        markets[33] = MarketParams({
            loanToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
            collateralToken: 0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee,
            oracle: 0x3fa58b74e9a8eA8768eb33c8453e9C2Ed089A40a,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // osETH/ETH  0xd5211d0e3f4a30d5c98653d988585792bb7812221f04801be73a44ceecb11e89
        markets[34] = MarketParams({
            loanToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
            collateralToken: 0xf1C9acDc66974dFB6dEcB12aA385b9cD01190E38,
            oracle: 0x224F2F1333b45E34fFCfC3bD01cE43C73A914498,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // WOETH/ETH  0xea023e57814fb9a814a5a9ee9f3e7ece5b771dd8cc703e50b911e9cde064a12d
        markets[35] = MarketParams({
            loanToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
            collateralToken: 0xDcEe70654261AF21C44c093C300eD3Bb97b78192,
            oracle: 0xb7948b5bEEe825E609990484A99340D8767B420e,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // PTWEETH/USDA  0xcc7b191903e4750ad71898a1594d912adbb5bb1c6effcde9c38f0a798112edd1
        markets[36] = MarketParams({
            loanToken: 0x0000206329b97DB379d5E1Bf586BbDB969C63274,
            collateralToken: 0xc69Ad9baB1dEE23F4605a82b3354F8E40d1E5966,
            oracle: 0x5441731eED05A8208e795086a5dF41416DD34104,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // swBTC/WBTC  0x514efda728a646dcafe4fdc9afe4ea214709e110ac1b2b78185ae00c1782cc82
        markets[37] = MarketParams({
            loanToken: 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599,
            collateralToken: 0x8DB2350D78aBc13f5673A411D4700BCF87864dDE,
            oracle: 0x99ADb404Ec05f43B897Ae2f917BfA7C5FDd24708,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 945_000_000_000_000_000
        });
        // MKR/DAI  0x578996c3c3ac4f100c4284b5c239673b04840e07945d04b681763c7b3401997c
        markets[38] = MarketParams({
            loanToken: 0x6B175474E89094C44Da98b954EedeAC495271d0F,
            collateralToken: 0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2,
            oracle: 0x20565E2B5633Dabc3f94FEfb573DfE956F6c435d,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 770_000_000_000_000_000
        });
        // wstETH/ETH  0xc54d7acf14de29e0e5527cabd7a576506870346a78a11a6762e2cca66322ec41
        markets[39] = MarketParams({
            loanToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
            collateralToken: 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0,
            oracle: 0x2a01EB9496094dA03c4E364Def50f5aD1280AD72,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 945_000_000_000_000_000
        });
        // wstETH/ETH  0xd0e50cdac92fe2172043f5e0c36532c6369d24947e40968f34a5e8819ca9ec5d
        markets[40] = MarketParams({
            loanToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
            collateralToken: 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0,
            oracle: 0xbD60A6770b27E084E8617335ddE769241B0e71D8,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 945_000_000_000_000_000
        });
        // wstETH/ETH  0xb8fc70e82bc5bb53e773626fcc6a23f7eefa036918d7ef216ecfb1950a94a85e
        markets[41] = MarketParams({
            loanToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
            collateralToken: 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0,
            oracle: 0xbD60A6770b27E084E8617335ddE769241B0e71D8,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 965_000_000_000_000_000
        });
        // sUSDe/DAI  0x39d11026eae1c6ec02aa4c0910778664089cdd97c3fd23f68f7cd05e2e95af48
        markets[42] = MarketParams({
            loanToken: 0x6B175474E89094C44Da98b954EedeAC495271d0F,
            collateralToken: 0x9D39A5DE30e57443BfF2A8307A4256c8797A3497,
            oracle: 0x5D916980D5Ae1737a8330Bf24dF812b2911Aae25,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // sUSDe/DAI  0x1247f1c237eceae0602eab1470a5061a6dd8f734ba88c7cdc5d6109fb0026b28
        markets[43] = MarketParams({
            loanToken: 0x6B175474E89094C44Da98b954EedeAC495271d0F,
            collateralToken: 0x9D39A5DE30e57443BfF2A8307A4256c8797A3497,
            oracle: 0x5D916980D5Ae1737a8330Bf24dF812b2911Aae25,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 915_000_000_000_000_000
        });
        // sUSDe/DAI  0xe475337d11be1db07f7c5a156e511f05d1844308e66e17d2ba5da0839d3b34d9
        markets[44] = MarketParams({
            loanToken: 0x6B175474E89094C44Da98b954EedeAC495271d0F,
            collateralToken: 0x9D39A5DE30e57443BfF2A8307A4256c8797A3497,
            oracle: 0x5D916980D5Ae1737a8330Bf24dF812b2911Aae25,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 945_000_000_000_000_000
        });
        // sUSDe/DAI  0x42dcfb38bb98767afb6e38ccf90d59d0d3f0aa216beb3a234f12850323d17536
        markets[45] = MarketParams({
            loanToken: 0x6B175474E89094C44Da98b954EedeAC495271d0F,
            collateralToken: 0x9D39A5DE30e57443BfF2A8307A4256c8797A3497,
            oracle: 0x5D916980D5Ae1737a8330Bf24dF812b2911Aae25,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 770_000_000_000_000_000
        });
        // USDe/DAI  0xc581c5f70bd1afa283eed57d1418c6432cbff1d862f94eaf58fdd4e46afbb67f
        markets[46] = MarketParams({
            loanToken: 0x6B175474E89094C44Da98b954EedeAC495271d0F,
            collateralToken: 0x4c9EDD5852cd905f086C759E8383e09bff1E68B3,
            oracle: 0xaE4750d0813B5E37A51f7629beedd72AF1f9cA35,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // USDe/DAI  0x8e6aeb10c401de3279ac79b4b2ea15fc94b7d9cfc098d6c2a1ff7b2b26d9d02c
        markets[47] = MarketParams({
            loanToken: 0x6B175474E89094C44Da98b954EedeAC495271d0F,
            collateralToken: 0x4c9EDD5852cd905f086C759E8383e09bff1E68B3,
            oracle: 0xaE4750d0813B5E37A51f7629beedd72AF1f9cA35,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 915_000_000_000_000_000
        });
        // USDe/DAI  0xdb760246f6859780f6c1b272d47a8f64710777121118e56e0cdb4b8b744a3094
        markets[48] = MarketParams({
            loanToken: 0x6B175474E89094C44Da98b954EedeAC495271d0F,
            collateralToken: 0x4c9EDD5852cd905f086C759E8383e09bff1E68B3,
            oracle: 0xaE4750d0813B5E37A51f7629beedd72AF1f9cA35,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 945_000_000_000_000_000
        });
        // USDe/DAI  0xfd8493f09eb6203615221378d89f53fcd92ff4f7d62cca87eece9a2fff59e86f
        markets[49] = MarketParams({
            loanToken: 0x6B175474E89094C44Da98b954EedeAC495271d0F,
            collateralToken: 0x4c9EDD5852cd905f086C759E8383e09bff1E68B3,
            oracle: 0xaE4750d0813B5E37A51f7629beedd72AF1f9cA35,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 770_000_000_000_000_000
        });
        // PRIME/PYUSD  0x41c41d0c9aadbf4751f5ee215ed5a16954a4b34e1b70fca5393d4b08858fa3fa
        markets[50] = MarketParams({
            loanToken: 0x6c3ea9036406852006290770BEdFcAbA0e23A0e8,
            collateralToken: 0x19ebb35279A16207Ec4ba82799CC64715065F7F6,
            oracle: 0x335e5718bC20028d5e357473a3736C187Ca6b07e,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // kBTC/RLUSD  0x15bb2a6af0c909eed19fb1f2ceeead34ecbdcba626de752c6b09389ee14eec32
        markets[51] = MarketParams({
            loanToken: 0x8292Bb45bf1Ee4d140127049757C2E0fF06317eD,
            collateralToken: 0x73E0C0d45E048D25Fc26Fa3159b0aA04BfA4Db98,
            oracle: 0xBCC3D9834b84B32Cf540DBE948DEd4B47bec5ddb,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // kBTC/PYUSD  0xe51f9aaad25d0e755429cf77076b3c2d37cb1228ed81f8a5482f2102c220eef5
        markets[52] = MarketParams({
            loanToken: 0x6c3ea9036406852006290770BEdFcAbA0e23A0e8,
            collateralToken: 0x73E0C0d45E048D25Fc26Fa3159b0aA04BfA4Db98,
            oracle: 0x007db14ca0d171fA583955fEF3917B2b9A95CF18,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // wstETH/USDC  0x7e585a933ffe8443c371b4f8cfeb4430f5f6a14c2f32a898c26662c67a1cb8b8
        markets[53] = MarketParams({
            loanToken: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            collateralToken: 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0,
            oracle: 0xe087AD7FE989cF63F8383579D160a20Ee7e69F9F,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // syrupUSDC/PYUSD  0xc9629945524f3fde56c7e8854a6c3d48e76b9d97236abbe73c750fcc7aeb8501
        markets[54] = MarketParams({
            loanToken: 0x6c3ea9036406852006290770BEdFcAbA0e23A0e8,
            collateralToken: 0x80ac24aA929eaF5013f6436cdA2a7ba190f5Cc0b,
            oracle: 0xc8043d248551Ed19B33cbc89dCCd69148c827039,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 915_000_000_000_000_000
        });
        // WBTC/USDC  0x09dc9e7eb5d8fc54b2bc41d1135fd4e99057a580f680321faeb90c7a21e631c1
        markets[55] = MarketParams({
            loanToken: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            collateralToken: 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599,
            oracle: 0xf1561bC4b3D1bA49053986Fb9ee88D4fE22d0Cf4,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // cbBTC/USDC  0xbc99de6a88904cd0e69042ad6f266e63182801f030c636507c3caf590ffd84fe
        markets[56] = MarketParams({
            loanToken: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            collateralToken: 0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf,
            oracle: 0x9F983115741D0F7F2EAE07831415057AD3de34d2,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // weETH/RLUSD  0xea4bfb18df0ee6bffb7b3f0270899a8adb92ab6b684709634c8276128813cfd4
        markets[57] = MarketParams({
            loanToken: 0x8292Bb45bf1Ee4d140127049757C2E0fF06317eD,
            collateralToken: 0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee,
            oracle: 0x6ab351FfDe101BB24a97332f4f7162C1711f110b,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // weETH/PYUSD  0x85d59152eeeab7ca024804895b358868d8dd1e134171be400d7792d5604a212c
        markets[58] = MarketParams({
            loanToken: 0x6c3ea9036406852006290770BEdFcAbA0e23A0e8,
            collateralToken: 0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee,
            oracle: 0x221898dA0890Fc5fb6c890Fcdc051FA97946eE11,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // cbBTC/USDT  0x4fe72543c5c95cd6b5f3cb516cd235ba882e2e705fe3424db6f99dfe5811d0d3
        markets[59] = MarketParams({
            loanToken: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            collateralToken: 0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf,
            oracle: 0x9F983115741D0F7F2EAE07831415057AD3de34d2,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // LBTC/PYUSD  0x6a7e36eb088bd501d73f7ab4c5b8671358559341a78ce521c9e499dc0bc642b9
        markets[60] = MarketParams({
            loanToken: 0x6c3ea9036406852006290770BEdFcAbA0e23A0e8,
            collateralToken: 0x8236a87084f8B84306f72007F36F2618A5634494,
            oracle: 0x0AeAa9320d78a5Edb9387A08682d1738BCc64b1f,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // sUSDe/PYUSD  0x90ef0c5a0dc7c4de4ad4585002d44e9d411d212d2f6258e94948beecf8b4c0d5
        markets[61] = MarketParams({
            loanToken: 0x6c3ea9036406852006290770BEdFcAbA0e23A0e8,
            collateralToken: 0x9D39A5DE30e57443BfF2A8307A4256c8797A3497,
            oracle: 0xE6212D05cB5aF3C821Fef1C1A233a678724F9E7E,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 915_000_000_000_000_000
        });
        // WBTC/USDT  0x3c5a244b778095e1e1b2e44b7c2ecc9bf4fda9cd85cc22740e09205a7a4bf510
        markets[62] = MarketParams({
            loanToken: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            collateralToken: 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599,
            oracle: 0xf1561bC4b3D1bA49053986Fb9ee88D4fE22d0Cf4,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // wstETH/USDT  0x6a57d77b9a173c5ed10d432e7009dd1ee9a97fac62a7bc970b4bd715e2fff5c8
        markets[63] = MarketParams({
            loanToken: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            collateralToken: 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0,
            oracle: 0xe087AD7FE989cF63F8383579D160a20Ee7e69F9F,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // syrupUSDC/RLUSD  0xc0ae375fd761ff19b3f04de5534c0f1ec110f80e1c2ede27c42c1c43c3040394
        markets[64] = MarketParams({
            loanToken: 0x8292Bb45bf1Ee4d140127049757C2E0fF06317eD,
            collateralToken: 0x80ac24aA929eaF5013f6436cdA2a7ba190f5Cc0b,
            oracle: 0xf766F4F1Bcb0CBBF4EEF5E26FF7c7f66a713c1B5,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 915_000_000_000_000_000
        });
        // weETH/USDC  0x34377fc4f617c51818e92c79df31ff270c6a91bc94ad32e367fdf59b9f4ac5dd
        markets[65] = MarketParams({
            loanToken: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            collateralToken: 0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee,
            oracle: 0xa3A7A3ceFee206f9d7Fe00eC3C83324ED4228411,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 770_000_000_000_000_000
        });
        // ETH/USDC  0x94b823e6bd8ea533b4e33fbc307faea0b307301bc48763acc4d4aa4def7636cd
        markets[66] = MarketParams({
            loanToken: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            collateralToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
            oracle: 0x0F948CBa8231Db7898ef36A4212581Ad7b1B4580,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // USD3/USDC  0xe3df58f9d3011b7481ff36b939fa5f8da642f34ea5792d25d3958dbf1efa26d7
        markets[67] = MarketParams({
            loanToken: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            collateralToken: 0x056B269Eb1f75477a8666ae8C7fE01b64dD55eCc,
            oracle: 0x68b4c2B2b2e245AB54a3bD55DfD5A9d84f029C06,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 915_000_000_000_000_000
        });
        // stUSDS/USDC  0xd570c19c0dc0fbe4ab7faf4a37c4150e1c141c8aada8ca3e1b4b6c1b712af93d
        markets[68] = MarketParams({
            loanToken: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            collateralToken: 0x99CD4Ec3f88A45940936F469E4bB72A2A701EEB9,
            oracle: 0xba3D2Dc1670763c6729CC923A922C7513C0f9DD0,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // cbBTC/RLUSD  0xffd010618ed3cb39bb2c5de0e3e58d3d2ec9f52187a180f29723c31756a939bc
        markets[69] = MarketParams({
            loanToken: 0x8292Bb45bf1Ee4d140127049757C2E0fF06317eD,
            collateralToken: 0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf,
            oracle: 0x8b36909dD84d310CBDe90cb286d9dAB285a245bd,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // WBTC/ETH  0x62aad0b7cfadc9d66eafe559ecd2a084f74062f396c193973b124db9fee481c4
        markets[70] = MarketParams({
            loanToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
            collateralToken: 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599,
            oracle: 0x46D18c1240dbC050d5e1224663EA22037df3A009,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 915_000_000_000_000_000
        });
        // cbBTC/ETH  0x12dbf4937132ff2c6445212519295ce9afbee3c765ba626af5b197fe6c3941a0
        markets[71] = MarketParams({
            loanToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
            collateralToken: 0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf,
            oracle: 0x998Eaa364282Ad9Ac33F934e97bef3d660389366,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 915_000_000_000_000_000
        });
        // weETH/USDT  0xc2c53d2b868e163da71de14a5113cc2743fc9b5ad7488334720ed2846566a8f6
        markets[72] = MarketParams({
            loanToken: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            collateralToken: 0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee,
            oracle: 0x631bEa187ae9D90B76ccf91aa8F5E3EE1cDc0F87,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // syrupUSDT/USDT  0xa4774e3e693fff2ebd1dcbbd69b1b0a5b9bb0ccc753bfda5dd07bdac97c4818a
        markets[73] = MarketParams({
            loanToken: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            collateralToken: 0x356B8d89c1e1239Cbbb9dE4815c39A1474d5BA7D,
            oracle: 0x34e50151c21c5f3499AcE66c7157aA547892e997,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 915_000_000_000_000_000
        });
        // cbBTC/PYUSD  0xd8a8e6667f58aa9229e8979bd619742b1660ee856c200a93e407dbccb7222323
        markets[74] = MarketParams({
            loanToken: 0x6c3ea9036406852006290770BEdFcAbA0e23A0e8,
            collateralToken: 0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf,
            oracle: 0x7681692A9F228fd7dAc0679238D467729Af4E9ca,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // weETH/USDT  0x19cc9b90c4ecde78f4644f4d5ebc938fbadf30f6e4cae95485192f038b23e1f3
        markets[75] = MarketParams({
            loanToken: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            collateralToken: 0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee,
            oracle: 0xa3A7A3ceFee206f9d7Fe00eC3C83324ED4228411,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 770_000_000_000_000_000
        });
        // ETH/USDT  0x3758a9e2abbd67b5621f23ec482608f2f98b3c792874661ce49df7843aadcfd2
        markets[76] = MarketParams({
            loanToken: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            collateralToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
            oracle: 0x0F948CBa8231Db7898ef36A4212581Ad7b1B4580,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // WBTC/RLUSD  0xa128dddc761075df9a9a60689f3a41a989b245aad506352c509c0c3a76a9ec6b
        markets[77] = MarketParams({
            loanToken: 0x8292Bb45bf1Ee4d140127049757C2E0fF06317eD,
            collateralToken: 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599,
            oracle: 0xF58725eb213161E9054C97F970DC80b2d0327E8d,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
        // WBTC/PYUSD  0xbe50eed784490d6c32f398902b55eb5e1bd5af89e1f554993ad5fea899be090b
        markets[78] = MarketParams({
            loanToken: 0x6c3ea9036406852006290770BEdFcAbA0e23A0e8,
            collateralToken: 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599,
            oracle: 0x4124b5Cb815A21E26fF86c8A6A0A074c7fa2Dd1D,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860_000_000_000_000_000
        });
    }
}
