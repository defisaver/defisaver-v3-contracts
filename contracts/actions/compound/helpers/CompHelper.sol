// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "../../../interfaces/compound/IComptroller.sol";
import "../../../interfaces/compound/ICToken.sol";
import "../../../utils/TokenUtils.sol";

contract CompHelper {

    address public constant C_ETH_ADDR = 0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5;
    address public constant COMPTROLLER_ADDR = 0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B;

    function getUnderlyingAddr(address _cTokenAddr) internal returns (address tokenAddr) {
        if (_cTokenAddr == C_ETH_ADDR) return TokenUtils.WETH_ADDR;

        tokenAddr = ICToken(_cTokenAddr).underlying();
    }

    function isAlreadyInMarket(address _cToken) internal view returns (bool) {
        address[] memory addrInMarkets = 
            IComptroller(COMPTROLLER_ADDR).getAssetsIn(address(this));

        for (uint i = 0; i < addrInMarkets.length; ++i) {
            if (addrInMarkets[i] == _cToken) {
                return true;
            }
        }

        return false;
    }

    /// @notice Enters the Compound market so it can be deposited/borrowed
    /// @param _cTokenAddr CToken address of the token
    function enterMarket(address _cTokenAddr) public {
        address[] memory markets = new address[](1);
        markets[0] = _cTokenAddr;

        IComptroller(COMPTROLLER_ADDR).enterMarkets(markets);
    }
}
