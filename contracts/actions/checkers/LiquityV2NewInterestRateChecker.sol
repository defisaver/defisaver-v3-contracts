// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {ActionBase} from "../ActionBase.sol";
import { TransientStorage } from "../../utils/TransientStorage.sol";   
import { IAddressesRegistry } from "../../interfaces/liquityV2/IAddressesRegistry.sol";
import { ITroveManager } from "../../interfaces/liquityV2/ITroveManager.sol";

/// @title Action to check the new interest rate of the LiquityV2 position after strategy execution.
contract LiquityV2NewInterestRateChecker is ActionBase {

    TransientStorage public constant tempStorage = TransientStorage(TRANSIENT_STORAGE);

    error BadAfterRate(uint256 oldRate, uint256 newRate);

    /// @param market Market address.
    /// @param troveId Trove ID.
    /// @param targetRatio Target ratio.
    struct Params {
        address market;
        uint256 troveId;
        uint256 interestRateChange;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.market = _parseParamAddr(params.market, _paramMapping[0], _subData, _returnValues);
        params.troveId = _parseParamUint(params.troveId, _paramMapping[1], _subData, _returnValues);
        params.interestRateChange = _parseParamUint(params.interestRateChange, _paramMapping[2], _subData, _returnValues);

        uint256 startInterestRate = uint256(tempStorage.getBytes32("LIQUITY_V2_INTEREST_RATE"));

        IAddressesRegistry market = IAddressesRegistry(params.market);
        ITroveManager troveManager = ITroveManager(market.troveManager());
        ITroveManager.LatestTroveData memory troveData = troveManager.getLatestTroveData(params.troveId);
        
        if (troveData.annualInterestRate != (startInterestRate + params.interestRateChange)) {
            revert BadAfterRate(startInterestRate, troveData.annualInterestRate);
        }

        emit ActionEvent("LiquityV2NewInterestRateChecker", abi.encode(troveData.annualInterestRate));
        return bytes32(troveData.annualInterestRate);
    }

    /// @inheritdoc ActionBase
    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes memory _callData) public payable override {}

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.CHECK_ACTION);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
