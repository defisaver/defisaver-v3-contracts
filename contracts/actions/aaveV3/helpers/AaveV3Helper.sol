// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "./OptimismAaveV3Addresses.sol";

import "../../../interfaces/aaveV3/IL2PoolV3.sol";
import "../../../interfaces/aaveV3/IAaveProtocolDataProvider.sol";
import "../../../interfaces/aaveV3/IPoolAddressesProvider.sol";

/// @title Utility functions and data used in AaveV3 actions
contract AaveV3Helper is OptimismAaveV3Addresses {
    /// TODO: Change this later
    uint16 public constant AAVE_REFERRAL_CODE = 64;

    uint256 public constant STABLE_ID = 1;
    uint256 public constant VARIABLE_ID = 2;
    
    
    /// @notice Returns the lending pool contract of the specified market
    function getLendingPool(address _market) internal view returns (IL2PoolV3) {
        return IL2PoolV3(IPoolAddressesProvider(_market).getPool());
    }

    /// @notice Fetch the data provider for the specified market
    function getDataProvider(address _market) internal view returns (IAaveProtocolDataProvider) {
        return
            IAaveProtocolDataProvider(
                IPoolAddressesProvider(_market).getPoolDataProvider()
            );
    }

    function boolToBytes(bool x) internal pure returns (bytes1 r) {
       if (x) {
           r = bytes1(uint8(1));
       } else {
           r = bytes1(uint8(0));
       }
    }

    function bytesToBool(bytes1 x) internal pure returns (bool r) {
        if (uint8(x) == 0) {
            return false;
        }
        return true;
    }
    
    function getWholeDebt(address _market, address _tokenAddr, uint _borrowType, address _debtOwner) internal view returns (uint256) {
        IAaveProtocolDataProvider dataProvider = getDataProvider(_market);
        (, uint256 borrowsStable, uint256 borrowsVariable, , , , , , ) =
            dataProvider.getUserReserveData(_tokenAddr, _debtOwner);

        if (_borrowType == STABLE_ID) {
            return borrowsStable;
        } else if (_borrowType == VARIABLE_ID) {
            return borrowsVariable;
        }
    }
}