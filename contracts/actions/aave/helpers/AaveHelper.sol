// SPDX-License-Identifier: MIT
pragma solidity =0.8.4;

import "../../../interfaces/aaveV2/ILendingPoolV2.sol";
import "../../../interfaces/aaveV2/IAaveProtocolDataProviderV2.sol";

/// @title Utility functions and data used in AaveV2 actions
contract AaveHelper {
    uint16 public constant AAVE_REFERRAL_CODE = 64;

    uint256 public constant STABLE_ID = 1;
    uint256 public constant VARIABLE_ID = 2;

    bytes32 public constant DATA_PROVIDER_ID =
        0x0100000000000000000000000000000000000000000000000000000000000000;

    /// @notice Enable/Disable a token as collateral for the specified Aave market
    function enableAsCollateral(
        address _market,
        address _tokenAddr,
        bool _useAsCollateral
    ) public {
        address lendingPool = ILendingPoolAddressesProviderV2(_market).getLendingPool();

        ILendingPoolV2(lendingPool).setUserUseReserveAsCollateral(_tokenAddr, _useAsCollateral);
    }

    /// @notice Switches the borrowing rate mode (stable/variable) for the user
    function switchRateMode(
        address _market,
        address _tokenAddr,
        uint256 _rateMode
    ) public {
        address lendingPool = ILendingPoolAddressesProviderV2(_market).getLendingPool();

        ILendingPoolV2(lendingPool).swapBorrowRateMode(_tokenAddr, _rateMode);
    }

    /// @notice Fetch the data provider for the specified market
    function getDataProvider(address _market) internal view returns (IAaveProtocolDataProviderV2) {
        return
            IAaveProtocolDataProviderV2(
                ILendingPoolAddressesProviderV2(_market).getAddress(DATA_PROVIDER_ID)
            );
    }

    /// @notice Returns the lending pool contract of the specified market
    function getLendingPool(address _market) internal view returns (ILendingPoolV2) {
        return ILendingPoolV2(ILendingPoolAddressesProviderV2(_market).getLendingPool());
    }
}
