// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../DS/DSMath.sol";
import "../interfaces/aaveV2/IFlashLoanParamsGetter.sol";
import "../interfaces/aave/ILendingPoolAddressesProvider.sol";
import "../interfaces/aave/ILendingPool.sol";

/// @title Getter contract for positions from Aave protocol
contract AaveV1FullPositionView is DSMath, IFlashLoanParamsGetter {

    address public constant AAVE_V1_LENDING_POOL_ADDRESSES = 0x24a42fD28C976A61Df5D00D0599C34c4f90748c8;

    struct UserBorrows {
        address[] borrowAddr;
        uint256[] borrowAmounts;
        uint256[] borrowRateModes;
    }

    function getUserBorrows(address _user, address[] memory _borrTokens) public view returns (UserBorrows memory borrowsData) {
        address lendingPoolAddress = ILendingPoolAddressesProvider(AAVE_V1_LENDING_POOL_ADDRESSES).getLendingPool();

        borrowsData = UserBorrows({
            borrowAddr: new address[](_borrTokens.length),
            borrowAmounts: new uint[](_borrTokens.length),
            borrowRateModes: new uint[](_borrTokens.length)
        });

        uint64 borrowPos = 0;

        for (uint64 i = 0; i < _borrTokens.length; i++) {
            address reserve = _borrTokens[i];

            (,uint256 borrowBalance,,uint256 borrowRateMode,,,uint256 originationFee,,,) = ILendingPool(lendingPoolAddress).getUserReserveData(reserve, _user);

            // Sum up debt in Eth
            if (borrowBalance > 0) {
                borrowsData.borrowAddr[borrowPos] = reserve;
                borrowsData.borrowAmounts[borrowPos] = borrowBalance + originationFee;
                borrowsData.borrowRateModes[borrowPos] = borrowRateMode;
                borrowPos++;
            }
        }

        return borrowsData;
    }


    function getFlashLoanParams(bytes memory _data) public view override returns (address[] memory tokens, uint256[] memory amount, uint256[] memory modes) {
        (address account, address[] memory borrTokens) = abi.decode(_data, (address,address[]));

        UserBorrows memory borrowsData = getUserBorrows(account, borrTokens);

        return (borrowsData.borrowAddr, borrowsData.borrowAmounts, borrowsData.borrowRateModes);
    }
}