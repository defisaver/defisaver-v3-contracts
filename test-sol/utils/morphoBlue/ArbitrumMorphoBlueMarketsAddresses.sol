// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { MarketParams } from "../../../contracts/interfaces/protocols/morpho-blue/IMorphoBlue.sol";

/// @notice Every MorphoBlue market DFS supports on Arbitrum (chainId 42161) - 11 markets.
contract ArbitrumMorphoBlueMarketsAddresses {
    function getMorphoBlueMarkets() internal pure returns (MarketParams[] memory markets) {
        markets = new MarketParams[](11);
        // syrupUSDC/USDC  0xf86f3edd6f16cd8211f4d206866dc4ecd41be6211063ac11f8508e1b7112ef40
        markets[0] = MarketParams({
            loanToken: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831,
            collateralToken: 0x41CA7586cC1311807B4605fBB748a3B8862b42b5,
            oracle: 0x8f30fF3d54e69D4dfD5E99a9937474FaDdf27009,
            irm: 0x66F30587FB8D4206918deb78ecA7d5eBbafD06DA,
            lltv: 915_000_000_000_000_000
        });
        // WBTC/USDC  0xe6392ff19d10454b099d692b58c361ef93e31af34ed1ef78232e07c78fe99169
        markets[1] = MarketParams({
            loanToken: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831,
            collateralToken: 0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f,
            oracle: 0x88193FcB705d29724A40Bb818eCAA47dD5F014d9,
            irm: 0x66F30587FB8D4206918deb78ecA7d5eBbafD06DA,
            lltv: 860_000_000_000_000_000
        });
        // wstETH/USDC  0x33e0c8ab132390822b07e5dc95033cf250c963153320b7ffca73220664da2ea0
        markets[2] = MarketParams({
            loanToken: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831,
            collateralToken: 0x5979D7b546E38E414F7E9822514be443A4800529,
            oracle: 0x8e02a9b9Cc29d783b2fCB71C3a72651B591cae31,
            irm: 0x66F30587FB8D4206918deb78ecA7d5eBbafD06DA,
            lltv: 860_000_000_000_000_000
        });
        // ETH/USDC  0xca83d02be579485cc10945c9597a6141e772f1cf0e0aa28d09a327b6cbd8642c
        markets[3] = MarketParams({
            loanToken: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831,
            collateralToken: 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1,
            oracle: 0x282FEB10549fde52bD61A6979424Ddf18A4971A2,
            irm: 0x66F30587FB8D4206918deb78ecA7d5eBbafD06DA,
            lltv: 860_000_000_000_000_000
        });
        // sUSDS/USDC  0x77fe2f7c2dd6f4da6bc5f445b06052ff8df55cb70cfce9afc16ec3c69a5fd3a3
        markets[4] = MarketParams({
            loanToken: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831,
            collateralToken: 0xdDb46999F8891663a8F2828d25298f70416d7610,
            oracle: 0x52CC7c3b27bb61D0a83785B5344acC919F8f7124,
            irm: 0x66F30587FB8D4206918deb78ecA7d5eBbafD06DA,
            lltv: 945_000_000_000_000_000
        });
        // weETH/USDC  0xd09404e9512e1341321c8ae3bd663fab7087582142ac61486635a6c072c2af12
        markets[5] = MarketParams({
            loanToken: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831,
            collateralToken: 0x35751007a407ca6FEFfE80b3cB397736D2cf4dbe,
            oracle: 0x4E49d73434a78866d217BE0B542CA868495CBc77,
            irm: 0x66F30587FB8D4206918deb78ecA7d5eBbafD06DA,
            lltv: 860_000_000_000_000_000
        });
        // sUSDS/USDT0  0xde895fd4a9d1ca693485fcfc2ee47d8c3b47f810bbce3c965c60d97b855d4ed2
        markets[6] = MarketParams({
            loanToken: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9,
            collateralToken: 0xdDb46999F8891663a8F2828d25298f70416d7610,
            oracle: 0x061126ba5a62DdF6dfFBA635AAEF64671f5251d7,
            irm: 0x66F30587FB8D4206918deb78ecA7d5eBbafD06DA,
            lltv: 945_000_000_000_000_000
        });
        // weETH/USDT0  0xe0432ceb599fbe41defbd62fe8e914824af9d891a0a92c39de7063176c8e480b
        markets[7] = MarketParams({
            loanToken: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9,
            collateralToken: 0x35751007a407ca6FEFfE80b3cB397736D2cf4dbe,
            oracle: 0xff135c74798c432B3172501a54fd56F85aA60A8A,
            irm: 0x66F30587FB8D4206918deb78ecA7d5eBbafD06DA,
            lltv: 860_000_000_000_000_000
        });
        // ETH/USDT0  0xac6a118134cc4208a22534b041a83f4ac5ca42e2ab9ea732ee53c44b7deebc62
        markets[8] = MarketParams({
            loanToken: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9,
            collateralToken: 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1,
            oracle: 0x282FEB10549fde52bD61A6979424Ddf18A4971A2,
            irm: 0x66F30587FB8D4206918deb78ecA7d5eBbafD06DA,
            lltv: 860_000_000_000_000_000
        });
        // wstETH/USDT0  0x209fa1520640f664f59f7c1f955d52e8b81ead826edf439b48254d21d24b97a9
        markets[9] = MarketParams({
            loanToken: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9,
            collateralToken: 0x5979D7b546E38E414F7E9822514be443A4800529,
            oracle: 0x979e4C611e4da2776404fE9346D77e95B01BfD82,
            irm: 0x66F30587FB8D4206918deb78ecA7d5eBbafD06DA,
            lltv: 860_000_000_000_000_000
        });
        // WBTC/USDT0  0xed06d9e82d7c35ca80d3983194e15462a96202bd875800af18183321f4611868
        markets[10] = MarketParams({
            loanToken: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9,
            collateralToken: 0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f,
            oracle: 0xEDcAE878827fc68B9bC9c700CA17c20F811b1612,
            irm: 0x66F30587FB8D4206918deb78ecA7d5eBbafD06DA,
            lltv: 860_000_000_000_000_000
        });
    }
}
