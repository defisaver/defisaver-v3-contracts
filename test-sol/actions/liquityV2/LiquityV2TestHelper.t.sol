// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { LiquityV2Helper } from "../../../contracts/actions/liquityV2/helpers/LiquityV2Helper.sol";
import { LiquityV2View } from "../../../contracts/views/LiquityV2View.sol";
import { IAddressesRegistry } from "../../../contracts/interfaces/liquityV2/IAddressesRegistry.sol";
import { ISortedTroves } from "../../../contracts/interfaces/liquityV2/ISortedTroves.sol";
import { IBorrowerOperations } from "../../../contracts/interfaces/liquityV2/IBorrowerOperations.sol";
import { Sqrt } from "../../../contracts/utils/math/Sqrt.sol";

contract LiquityV2TestHelper is LiquityV2Helper {
    using Sqrt for uint256;

    // @dev ordered by collateral index. Ith market will have Ith collateral index in CollateralRegistry
    function getMarkets() internal pure returns (IAddressesRegistry[] memory markets) {
        markets = new IAddressesRegistry[](2);
        markets[0] = IAddressesRegistry(address(0xc3fe668b43439525F70FE860F89882F0BE312504));
        markets[1] = IAddressesRegistry(address(0x9B27787Ff66Aa3CeA8dBC47772328459A1FA05aC));
    }

    function getInsertPosition(
        LiquityV2View _view,
        IAddressesRegistry _market,
        uint256 _collIndex,
        uint256 _interestRate
    ) internal view returns (uint256, uint256) {

        uint256 numTrials = ISortedTroves(_market.sortedTroves()).size().sqrt() * 15;
        uint256 seed = 42;
        
        return _view.getInsertPosition(
            address(_market),
            _collIndex,
            _interestRate,
            numTrials,
            seed
        );
    }

    // @dev msg.sender will be batch manager
    function registerBatchManager(IAddressesRegistry _market) internal {
        IBorrowerOperations borrowerOperations = IBorrowerOperations(_market.borrowerOperations());
        
        uint128 minInterestRate = 1e18 / 100; // 1%
        uint128 maxInterestRate = 1e18 / 4; // 25%
        uint128 currentInterestRate = 1e18 / 10; // 10%
        uint128 fee = 1e18 / 100; // 1%
        uint128 minInterestRateChangePeriod = 7 days;

        borrowerOperations.registerBatchManager(
            minInterestRate,
            maxInterestRate,
            currentInterestRate,
            fee,
            minInterestRateChangePeriod
        );
    }
}