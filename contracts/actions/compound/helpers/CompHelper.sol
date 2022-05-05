// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../../interfaces/compound/IComptroller.sol";
import "../../../interfaces/compound/ICToken.sol";
import "../../../utils/TokenUtils.sol";
import "./MainnetCompAddresses.sol";

/// @title Utility functions and data used in Compound actions
contract CompHelper is MainnetCompAddresses{

    uint256 constant NO_ERROR = 0;
    error CompEnterMarketError();
    error CompExitMarketError();

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
            revert CompExitMarketError();
        }
    }
}
