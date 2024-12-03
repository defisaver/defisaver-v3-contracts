// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { ILendingPoolV2 } from "../../../interfaces/aaveV2/ILendingPoolV2.sol";
import { ILendingPoolAddressesProviderV2 } from "../../../interfaces/aaveV2/ILendingPoolAddressesProviderV2.sol";
import { IAaveProtocolDataProviderV2 } from "../../../interfaces/aaveV2/IAaveProtocolDataProviderV2.sol";
import { IAaveIncentivesController } from "../../../interfaces/aaveV2/IAaveIncentivesController.sol";
import { IStakedToken } from "../../../interfaces/aaveV2/IStakedToken.sol";
import { MainnetAaveAddresses } from "./MainnetAaveAddresses.sol";

/// @title Utility functions and data used in AaveV2 actions
contract AaveHelper is MainnetAaveAddresses {
    uint16 public constant AAVE_REFERRAL_CODE = 64;

    bytes32 public constant DATA_PROVIDER_ID =
        0x0100000000000000000000000000000000000000000000000000000000000000;
    
    IAaveIncentivesController constant public AaveIncentivesController = IAaveIncentivesController(STAKED_CONTROLLER_ADDR);

    IStakedToken constant public StakedToken = IStakedToken(STAKED_TOKEN_ADDR);

    /// @notice Enable/Disable a token as collateral for the specified Aave market
    function enableAsCollateral(
        address _market,
        address _tokenAddr,
        bool _useAsCollateral
    ) public {
        address lendingPool = ILendingPoolAddressesProviderV2(_market).getLendingPool();

        ILendingPoolV2(lendingPool).setUserUseReserveAsCollateral(_tokenAddr, _useAsCollateral);
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

    function getWholeDebt(address _market, address _tokenAddr, uint256 _borrowType, address _debtOwner) internal view returns (uint256 wholeDebt) {
        uint256 STABLE_ID = 1;
        uint256 VARIABLE_ID = 2;

        IAaveProtocolDataProviderV2 dataProvider = getDataProvider(_market);
        (, uint256 borrowsStable, uint256 borrowsVariable, , , , , , ) =
            dataProvider.getUserReserveData(_tokenAddr, _debtOwner);

        if (_borrowType == STABLE_ID) {
            wholeDebt = borrowsStable;
        } else if (_borrowType == VARIABLE_ID) {
            wholeDebt =  borrowsVariable;
        }
    }
}
