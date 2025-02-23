// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { MorphoBlueHelper } from "./helpers/MorphoBlueHelper.sol";
import { MarketParams } from "../../interfaces/morpho-blue/IMorphoBlue.sol";
import { Withdrawal, IPublicAllocator } from "../../interfaces/morpho-blue/IPublicAllocator.sol";

/// @title Action that bundles calls to Morpho Blue Public Allocator to reallocate liquidity for additional borrowing
contract MorphoBlueReallocateLiquidity is ActionBase, MorphoBlueHelper {

    /// @param marketParams Market params for the Morpho Blue market where liquidity will be reallocated to.
    /// @param vaults List of vaults used for reallocation.
    /// @param withdrawals List of withdrawals for each vault.
    struct Params {
        MarketParams marketParams;
        address[] vaults;
        Withdrawal[][] withdrawals;
    }

    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.marketParams.loanToken = _parseParamAddr(params.marketParams.loanToken , _paramMapping[0], _subData, _returnValues);
        params.marketParams.collateralToken = _parseParamAddr(params.marketParams.collateralToken , _paramMapping[1], _subData, _returnValues);
        params.marketParams.oracle = _parseParamAddr(params.marketParams.oracle , _paramMapping[2], _subData, _returnValues);
        params.marketParams.irm = _parseParamAddr(params.marketParams.irm , _paramMapping[3], _subData, _returnValues);
        params.marketParams.lltv = _parseParamUint(params.marketParams.lltv, _paramMapping[4], _subData, _returnValues);

        bytes memory logData = _reallocate(params);
        emit ActionEvent("MorphoBlueReallocateLiquidity", logData);
        return bytes32(0);
    }

    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        bytes memory logData = _reallocate(params);
        logger.logActionDirectEvent("MorphoBlueReallocateLiquidity", logData);
    }

    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function _reallocate(Params memory _params) internal returns (bytes memory logData) {
        require(_params.vaults.length == _params.withdrawals.length);

        /** @dev
         * For reallocation to be successful, the following conditions must be met:
         * 1. Withdrawals for each call cannot be empty.
         * 2. No withdrawal amount can be zero.
         * 3. Each withdrawals array must be sorted by marketId in ascending order.
         * 4. No withdrawal amount can exceed the maxOut cap for that market within a particular vault.
         * 5. No withdrawal amount can exceed the liquidity available in the market for a particular vault.
        */
        for (uint256 i = 0; i < _params.vaults.length; i++) {
            IPublicAllocator(PUBLIC_ALLOCATOR).reallocateTo(
                _params.vaults[i],
                _params.withdrawals[i],
                _params.marketParams
            );
        }

        logData = abi.encode(_params);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}