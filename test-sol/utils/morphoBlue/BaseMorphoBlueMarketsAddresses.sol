// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { MarketParams } from "../../../contracts/interfaces/protocols/morpho-blue/IMorphoBlue.sol";

/// @notice Every MorphoBlue market DFS supports on Base (chainId 8453) - 29 markets.
contract BaseMorphoBlueMarketsAddresses {
    function getMorphoBlueMarkets() internal pure returns (MarketParams[] memory markets) {
        markets = new MarketParams[](29);
        // cbETH/USDC  0xdba352d93a64b17c71104cbddc6aef85cd432322a1446b5b65163cbbc615cd0c
        markets[0] = MarketParams({
            loanToken: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            collateralToken: 0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22,
            oracle: 0x4756c26E01E61c7c2F86b10f4316e179db8F9425,
            irm: 0x46415998764C29aB2a25CbeA6254146D50D22687,
            lltv: 860_000_000_000_000_000
        });
        // cbETH/USDC  0x1c21c59df9db44bf6f645d854ee710a8ca17b479451447e9f56758aee10a2fad
        markets[1] = MarketParams({
            loanToken: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            collateralToken: 0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22,
            oracle: 0xb40d93F44411D8C09aD17d7F88195eF9b05cCD96,
            irm: 0x46415998764C29aB2a25CbeA6254146D50D22687,
            lltv: 860_000_000_000_000_000
        });
        // wstETH/USDC  0xa066f3893b780833699043f824e5bb88b8df039886f524f62b9a1ac83cb7f1f0
        markets[2] = MarketParams({
            loanToken: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            collateralToken: 0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452,
            oracle: 0x957e76d8f2D3ab0B4f342cd5f4b03A6f6eF2ce5F,
            irm: 0x46415998764C29aB2a25CbeA6254146D50D22687,
            lltv: 860_000_000_000_000_000
        });
        // wstETH/USDC  0x13c42741a359ac4a8aa8287d2be109dcf28344484f91185f9a79bd5a805a55ae
        markets[3] = MarketParams({
            loanToken: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            collateralToken: 0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452,
            oracle: 0xD7A1abA119a236Fea5BBC5cAC6836465cbe9289A,
            irm: 0x46415998764C29aB2a25CbeA6254146D50D22687,
            lltv: 860_000_000_000_000_000
        });
        // ETH/USDC  0x8793cf302b8ffd655ab97bd1c695dbd967807e8367a65cb2f4edaf1380ba1bda
        markets[4] = MarketParams({
            loanToken: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            collateralToken: 0x4200000000000000000000000000000000000006,
            oracle: 0xFEa2D58cEfCb9fcb597723c6bAE66fFE4193aFE4,
            irm: 0x46415998764C29aB2a25CbeA6254146D50D22687,
            lltv: 860_000_000_000_000_000
        });
        // rETH/USDC  0xdb0bc9f10a174f29a345c5f30a719933f71ccea7a2a75a632a281929bba1b535
        markets[5] = MarketParams({
            loanToken: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            collateralToken: 0xB6fe221Fe9EeF5aBa221c348bA20A1Bf5e73624c,
            oracle: 0x7E1136C04372874cca9C3C9a2DbC461E3858b228,
            irm: 0x46415998764C29aB2a25CbeA6254146D50D22687,
            lltv: 860_000_000_000_000_000
        });
        // rETH/ETH  0xdc69cf2caae7b7d1783fb5a9576dc875888afad17ab3d1a3fc102f741441c165
        markets[6] = MarketParams({
            loanToken: 0x4200000000000000000000000000000000000006,
            collateralToken: 0xB6fe221Fe9EeF5aBa221c348bA20A1Bf5e73624c,
            oracle: 0x05f73c9910806EedE92C83DEb3f805b71C6098f2,
            irm: 0x46415998764C29aB2a25CbeA6254146D50D22687,
            lltv: 945_000_000_000_000_000
        });
        // cbBTC/ETH  0x5dffffc7d75dc5abfa8dbe6fad9cbdadf6680cbe1428bafe661497520c84a94c
        markets[7] = MarketParams({
            loanToken: 0x4200000000000000000000000000000000000006,
            collateralToken: 0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf,
            oracle: 0x10b95702a0ce895972C91e432C4f7E19811D320E,
            irm: 0x46415998764C29aB2a25CbeA6254146D50D22687,
            lltv: 915_000_000_000_000_000
        });
        // cbBTC/USDC  0x9103c3b4e834476c9a62ea009ba2c884ee42e94e6e314a26f04d312434191836
        markets[8] = MarketParams({
            loanToken: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            collateralToken: 0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf,
            oracle: 0x663BECd10daE6C4A3Dcd89F1d76c1174199639B9,
            irm: 0x46415998764C29aB2a25CbeA6254146D50D22687,
            lltv: 860_000_000_000_000_000
        });
        // cbBTC/EURC  0x67ebd84b2fb39e3bc5a13d97e4c07abe1ea617e40654826e9abce252e95f049e
        markets[9] = MarketParams({
            loanToken: 0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42,
            collateralToken: 0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf,
            oracle: 0xA857411CB2231a6A87a3bEF987a4cED8A067d799,
            irm: 0x46415998764C29aB2a25CbeA6254146D50D22687,
            lltv: 860_000_000_000_000_000
        });
        // wstETH/EURC  0xf7e40290f8ca1d5848b3c129502599aa0f0602eb5f5235218797a34242719561
        markets[10] = MarketParams({
            loanToken: 0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42,
            collateralToken: 0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452,
            oracle: 0xa54122f0E0766258377Ffe732e454A3248f454F4,
            irm: 0x46415998764C29aB2a25CbeA6254146D50D22687,
            lltv: 860_000_000_000_000_000
        });
        // LBTC/cbBTC  0x30767836635facec1282e6ef4a5981406ed4e72727b3a63a3a72c74e8279a8d7
        markets[11] = MarketParams({
            loanToken: 0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf,
            collateralToken: 0xecAc9C5F704e954931349Da37F60E39f515c11c1,
            oracle: 0x9Ae0E86e88AEE94B700240eBE0BD17D969BAD0EA,
            irm: 0x46415998764C29aB2a25CbeA6254146D50D22687,
            lltv: 945_000_000_000_000_000
        });
        // ETH/EURC  0xa9b5142fa687a24c275faf731f13b52faa9873252bb4e1cb6077aa1f412edb0b
        markets[12] = MarketParams({
            loanToken: 0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42,
            collateralToken: 0x4200000000000000000000000000000000000006,
            oracle: 0xE1bb8E5b4930eC9FeC7f7943FCF6227649F14B37,
            irm: 0x46415998764C29aB2a25CbeA6254146D50D22687,
            lltv: 860_000_000_000_000_000
        });
        // cbETH/EURC  0x7fc498ddcb7707d6f85f6dc81f61edb6dc8d7f1b47a83b55808904790564929a
        markets[13] = MarketParams({
            loanToken: 0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42,
            collateralToken: 0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22,
            oracle: 0x8C87DbD7A0c647A4291592Bc2994dbF95880fE2F,
            irm: 0x46415998764C29aB2a25CbeA6254146D50D22687,
            lltv: 860_000_000_000_000_000
        });
        // weETH/ETH  0xfd0895ba253889c243bf59bc4b96fd1e06d68631241383947b04d1c293a0cfea
        markets[14] = MarketParams({
            loanToken: 0x4200000000000000000000000000000000000006,
            collateralToken: 0x04C0599Ae5A44757c0af6F9eC3b93da8976c150A,
            oracle: 0xcE629400c6AEdb64f087CAC40Ae6a382AEEef490,
            irm: 0x46415998764C29aB2a25CbeA6254146D50D22687,
            lltv: 945_000_000_000_000_000
        });
        // weETH/ETH  0x78d11c03944e0dc298398f0545dc8195ad201a18b0388cb8058b1bcb89440971
        markets[15] = MarketParams({
            loanToken: 0x4200000000000000000000000000000000000006,
            collateralToken: 0x04C0599Ae5A44757c0af6F9eC3b93da8976c150A,
            oracle: 0xcE629400c6AEdb64f087CAC40Ae6a382AEEef490,
            irm: 0x46415998764C29aB2a25CbeA6254146D50D22687,
            lltv: 915_000_000_000_000_000
        });
        // AERO/USDC  0xdaa04f6819210b11fe4e3b65300c725c32e55755e3598671559b9ae3bac453d7
        markets[16] = MarketParams({
            loanToken: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            collateralToken: 0x940181a94A35A4569E4529A3CDfB74e38FD98631,
            oracle: 0x96F1485DAf396c2ab7e53DC76d7B330143Cb2269,
            irm: 0x46415998764C29aB2a25CbeA6254146D50D22687,
            lltv: 625_000_000_000_000_000
        });
        // weETH/USDC  0x6a331b22b56c9c0ee32a1a7d6f852d2c682ea8b27a1b0f99a9c484a37a951eb7
        markets[17] = MarketParams({
            loanToken: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            collateralToken: 0x04C0599Ae5A44757c0af6F9eC3b93da8976c150A,
            oracle: 0xaacbD2BbCA7927F772145f99EC942024Ddd0FAB0,
            irm: 0x46415998764C29aB2a25CbeA6254146D50D22687,
            lltv: 770_000_000_000_000_000
        });
        // ezETH/USDC  0xf24417ee06adc0b0836cf0dbec3ba56c1059f62f53a55990a38356d42fa75fa2
        markets[18] = MarketParams({
            loanToken: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            collateralToken: 0x2416092f143378750bb29b79eD961ab195CcEea5,
            oracle: 0x1BAaB21821c6468f8aee73ee60Fd8Fdc39c0C973,
            irm: 0x46415998764C29aB2a25CbeA6254146D50D22687,
            lltv: 770_000_000_000_000_000
        });
        // ezETH/ETH  0xdf13c46bf7bd41597f27e32ae9c306eb63859c134073cb81c796ff20b520c7cf
        markets[19] = MarketParams({
            loanToken: 0x4200000000000000000000000000000000000006,
            collateralToken: 0x2416092f143378750bb29b79eD961ab195CcEea5,
            oracle: 0x09ECeE1Ab6f37a3D8D01f93A622b7A3021A5D91F,
            irm: 0x46415998764C29aB2a25CbeA6254146D50D22687,
            lltv: 860_000_000_000_000_000
        });
        // bsdETH/ETH  0xdf6aa0df4eb647966018f324db97aea09d2a7dde0d3c0a72115e8b20d58ea81f
        markets[20] = MarketParams({
            loanToken: 0x4200000000000000000000000000000000000006,
            collateralToken: 0xCb327b99fF831bF8223cCEd12B1338FF3aA322Ff,
            oracle: 0x237a202192Ea0fDBC272198115ddf09cA33AebE2,
            irm: 0x46415998764C29aB2a25CbeA6254146D50D22687,
            lltv: 915_000_000_000_000_000
        });
        // USDe/USDC  0x54cf9be57fdfa6457a660991907434ff9d295c465a603a50126ff647d50b7354
        markets[21] = MarketParams({
            loanToken: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            collateralToken: 0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34,
            oracle: 0xF4b17C79492d68775e22e8Dd0a2Bb22854A39A47,
            irm: 0x46415998764C29aB2a25CbeA6254146D50D22687,
            lltv: 915_000_000_000_000_000
        });
        // cbETH/USDC  0x0ca10126f6c94cbd9cf0a48cc9516ae5e3dec5aa68303e6d988ee37c5149bf0d
        markets[22] = MarketParams({
            loanToken: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            collateralToken: 0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22,
            oracle: 0x97FF9CbD7E77348b2B8FfBB883bF29452aD18295,
            irm: 0x46415998764C29aB2a25CbeA6254146D50D22687,
            lltv: 770_000_000_000_000_000
        });
        // cbXRP/USDC  0xd4a903dc6d949519060c7707f9604fdc9772c046e05c2e3a8fce0bd7196e4109
        markets[23] = MarketParams({
            loanToken: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            collateralToken: 0xcb585250f852C6c6bf90434AB21A00f02833a4af,
            oracle: 0x031b2EFC8d70042Ac8d9f5c793c4149eC4b60fdE,
            irm: 0x46415998764C29aB2a25CbeA6254146D50D22687,
            lltv: 625_000_000_000_000_000
        });
        // wsuperOETHb/ETH  0x144bf18d6bf4c59602548a825034f73bf1d20177fc5f975fc69d5a5eba929b45
        markets[24] = MarketParams({
            loanToken: 0x4200000000000000000000000000000000000006,
            collateralToken: 0x7FcD174E80f264448ebeE8c88a7C4476AAF58Ea6,
            oracle: 0x28C964c985fe84736fAdc7Cf0bBd58B54bc7CF93,
            irm: 0x46415998764C29aB2a25CbeA6254146D50D22687,
            lltv: 915_000_000_000_000_000
        });
        // cbETH/ETH  0x84662b4f95b85d6b082b68d32cf71bb565b3f22f216a65509cc2ede7dccdfe8c
        markets[25] = MarketParams({
            loanToken: 0x4200000000000000000000000000000000000006,
            collateralToken: 0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22,
            oracle: 0xB03855Ad5AFD6B8db8091DD5551CAC4ed621d9E6,
            irm: 0x46415998764C29aB2a25CbeA6254146D50D22687,
            lltv: 945_000_000_000_000_000
        });
        // cbETH/ETH  0x6600aae6c56d242fa6ba68bd527aff1a146e77813074413186828fd3f1cdca91
        markets[26] = MarketParams({
            loanToken: 0x4200000000000000000000000000000000000006,
            collateralToken: 0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22,
            oracle: 0xB03855Ad5AFD6B8db8091DD5551CAC4ed621d9E6,
            irm: 0x46415998764C29aB2a25CbeA6254146D50D22687,
            lltv: 965_000_000_000_000_000
        });
        // wstETH/ETH  0x3a4048c64ba1b375330d376b1ce40e4047d03b47ab4d48af484edec9fec801ba
        markets[27] = MarketParams({
            loanToken: 0x4200000000000000000000000000000000000006,
            collateralToken: 0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452,
            oracle: 0x4A11590e5326138B514E08A9B52202D42077Ca65,
            irm: 0x46415998764C29aB2a25CbeA6254146D50D22687,
            lltv: 945_000_000_000_000_000
        });
        // wstETH/ETH  0x6aa81f51dfc955df598e18006deae56ce907ac02b0b5358705f1a28fcea23cc0
        markets[28] = MarketParams({
            loanToken: 0x4200000000000000000000000000000000000006,
            collateralToken: 0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452,
            oracle: 0xaE10cbdAa587646246c8253E4532A002EE4fa7A4,
            irm: 0x46415998764C29aB2a25CbeA6254146D50D22687,
            lltv: 965_000_000_000_000_000
        });
    }
}
