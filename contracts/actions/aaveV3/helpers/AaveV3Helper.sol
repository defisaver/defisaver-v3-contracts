// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "./MainnetAaveV3Addresses.sol";

import "../../../interfaces/aaveV3/IPoolV3.sol";
import "../../../interfaces/aaveV3/IAaveProtocolDataProvider.sol";

/// @title Utility functions and data used in AaveV3 actions
contract AaveV3Helper is MainnetAaveV3Addresses {
    /// TODO: Change this later
    uint16 public constant AAVE_REFERRAL_CODE = 64;

    uint256 public constant STABLE_ID = 1;
    uint256 public constant VARIABLE_ID = 2;
    
    /// @notice Returns the lending pool contract of the specified market
    function getLendingPool(address _market) internal view returns (IPoolV3) {
        return IPoolV3(IPoolAddressesProvider(_market).getPool());
    }

    /// @notice Fetch the data provider for the specified market
    function getDataProvider(address _market) internal view returns (IAaveProtocolDataProvider) {
        return
            IAaveProtocolDataProvider(
                IPoolAddressesProvider(_market).getPoolDataProvider()
            );
    }
}