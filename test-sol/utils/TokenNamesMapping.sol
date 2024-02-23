// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

contract TokenNamesMapping {

    mapping(string => address) public map;

    bool private initialized = false;

    function init() public {
        if (!initialized) {
            map["WETH"] = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
            map["WBTC"] = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599;
            map["DAI"] = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
            map["USDC"] = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
            map["WSETH"] = 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0;
            map["LUSD"] = 0x5f98805A4E8be255a32880FDeC7F6728C6568bA0;
            map["LINK"] = 0x514910771AF9Ca656af840dff83E8264EcF986CA;
            map["AAVE"] = 0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9;

            initialized = true;
        }
    }

    function getTokenAddress(string memory _name) public returns (address) {
        init();
        return map[_name];
    }
}