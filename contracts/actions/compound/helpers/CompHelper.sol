// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../../../interfaces/compound/IComptroller.sol";
import "../../../interfaces/compound/ICToken.sol";
import "../../../utils/TokenUtils.sol";

/// @title Utility functions and data used in Compound actions
contract CompHelper {

    uint256 constant NO_ERROR = 0;
    error CompEnterMarketError();
    error CompExitMarketError();

    address public constant C_ETH_ADDR = 0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5;
    address public constant COMPTROLLER_ADDR = 0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B;

    // @notice Returns the underlying token address of the given cToken
    function getUnderlyingAddr(address _cTokenAddr) internal returns (address tokenAddr) {
        // cEth has no .underlying() method
        if (_cTokenAddr == C_ETH_ADDR) return TokenUtils.WETH_ADDR;

        tokenAddr = ICToken(_cTokenAddr).underlying();
    }

    /// @notice Enters the Compound market so it can be deposited/borrowed
    /// @dev Markets can be entered multiple times, without the code reverting
    /// @param _cTokenAddr CToken address of the token
    function enterMarket(address _cTokenAddr) public {
        address[] memory markets = new address[](1);
        markets[0] = _cTokenAddr;

        uint256[] memory errCodes = IComptroller(COMPTROLLER_ADDR).enterMarkets(markets);

        if (errCodes[0] != NO_ERROR){
            revert CompEnterMarketError();
        }
    }

    /// @notice Exits the Compound market
    /// @param _cTokenAddr CToken address of the token
    function exitMarket(address _cTokenAddr) public {
        if (IComptroller(COMPTROLLER_ADDR).exitMarket(_cTokenAddr) != NO_ERROR){
            revert CompExitmarketError();
        }
    }
}
