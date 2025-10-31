// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { TransientStorageCancun } from "../../utils/transient/TransientStorageCancun.sol";
import { IAddressesRegistry } from "../../interfaces/protocols/liquityV2/IAddressesRegistry.sol";
import { ITroveManager } from "../../interfaces/protocols/liquityV2/ITroveManager.sol";

/// @title LiquityV2 New Interest Rate Checker Action
/// @notice Validates that the interest rate of a LiquityV2 trove was correctly adjusted after strategy execution.
/// @dev This action checks that the new interest rate matches the expected rate (old rate + interest rate change)
///      and reverts if the adjustment was not successful. It reads the original interest rate from transient storage
///      and compares it with the current trove interest rate.
/// @author DeFi Saver
contract LiquityV2NewInterestRateChecker is ActionBase {
    /// @notice Transient storage contract for storing temporary data during execution
    TransientStorageCancun public constant tempStorage =
        TransientStorageCancun(TRANSIENT_STORAGE_CANCUN);

    /// @notice Error thrown when the interest rate after adjustment doesn't match the expected rate
    /// @param oldRate The original interest rate before adjustment
    /// @param newRate The actual interest rate after adjustment
    error BadAfterRate(uint256 oldRate, uint256 newRate);

    /// @notice Parameters for the LiquityV2 new interest rate checker action
    /// @param market Address of the LiquityV2 market containing the trove
    /// @param troveId ID of the trove to check the interest rate for
    /// @param interestRateChange Expected interest rate change amount (in basis points or wei)
    struct Params {
        address market;
        uint256 troveId;
        uint256 interestRateChange;
    }

    /// @notice Executes the interest rate validation check
    /// @dev Reads the original interest rate from transient storage, gets the current trove interest rate,
    ///      and validates that the new rate equals the old rate plus the expected change.
    ///      Reverts with BadAfterRate error if validation fails.
    /// @param _callData Encoded Params struct containing market, troveId, and interestRateChange
    /// @param _subData Subscription data for parameter mapping
    /// @param _paramMapping Parameter mapping array
    /// @param _returnValues Return values from previous actions
    /// @return bytes32 The new interest rate as bytes32
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.market = _parseParamAddr(params.market, _paramMapping[0], _subData, _returnValues);
        params.troveId = _parseParamUint(params.troveId, _paramMapping[1], _subData, _returnValues);
        params.interestRateChange =
            _parseParamUint(params.interestRateChange, _paramMapping[2], _subData, _returnValues);

        uint256 startInterestRate = uint256(tempStorage.getBytes32("LIQUITY_V2_INTEREST_RATE"));

        IAddressesRegistry market = IAddressesRegistry(params.market);
        ITroveManager troveManager = ITroveManager(market.troveManager());
        ITroveManager.LatestTroveData memory troveData =
            troveManager.getLatestTroveData(params.troveId);

        if (troveData.annualInterestRate != (startInterestRate + params.interestRateChange)) {
            revert BadAfterRate(startInterestRate, troveData.annualInterestRate);
        }

        emit ActionEvent(
            "LiquityV2NewInterestRateChecker", abi.encode(troveData.annualInterestRate)
        );
        return bytes32(troveData.annualInterestRate);
    }

    /// @notice Direct execution of the action (not implemented for checker actions)
    /// @param _callData Encoded call data
    function executeActionDirect(bytes memory _callData) public payable override { }

    /// @notice Returns the action type for this contract
    /// @return uint8 The action type (CHECK_ACTION)
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.CHECK_ACTION);
    }

    /// @notice Parses the call data into Params struct
    /// @param _callData Encoded parameters
    /// @return inputData Decoded Params struct
    function parseInputs(bytes memory _callData) public pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
