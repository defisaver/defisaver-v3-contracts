// SPDX-License-Identifier: MIT


pragma solidity ^0.7.0;

import "../../../interfaces/aaveV2/ILendingPoolV2.sol";
import "../../../interfaces/aaveV2/IAaveProtocolDataProviderV2.sol";

contract AaveHelper {

    uint16 public constant AAVE_REFERRAL_CODE = 64;

    uint public constant STABLE_ID = 1;
    uint public constant VARIABLE_ID = 2;

    function setCollStateForToken(address _market, address _tokenAddr, bool _state) public {
        address lendingPool = ILendingPoolAddressesProviderV2(_market).getLendingPool();

        ILendingPoolV2(lendingPool).setUserUseReserveAsCollateral(_tokenAddr, _state);
    }

    function isTokenUsedAsColl(address _market, address _tokenAddr) public view returns (bool collateralEnabled) {
        IAaveProtocolDataProviderV2 dataProvider = getDataProvider(_market);
        (,,,,,,,,collateralEnabled) = dataProvider.getUserReserveData(_tokenAddr, address(this));
    }

    function setUserUseReserveAsCollateral(address _market, address _tokenAddr, bool _true) public {
        address lendingPool = ILendingPoolAddressesProviderV2(_market).getLendingPool();

        ILendingPoolV2(lendingPool).setUserUseReserveAsCollateral(_tokenAddr, _true);
    }

    function getDataProvider(address _market) internal view returns(IAaveProtocolDataProviderV2) {
        return IAaveProtocolDataProviderV2(ILendingPoolAddressesProviderV2(_market).getAddress(0x0100000000000000000000000000000000000000000000000000000000000000));
    }
}
