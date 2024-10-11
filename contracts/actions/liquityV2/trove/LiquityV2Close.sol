// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAddressesRegistry } from "../../../interfaces/liquityV2/IAddressesRegistry.sol";
import { IBorrowerOperations } from "../../../interfaces/liquityV2/IBorrowerOperations.sol";
import { ITroveManager } from "../../../interfaces/liquityV2/ITroveManager.sol";

import { LiquityV2Helper } from "../helpers/LiquityV2Helper.sol";
import { ActionBase } from "../../ActionBase.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";

contract LiquityV2Close is ActionBase, LiquityV2Helper {
    using TokenUtils for address;

    struct Params {
        address market;
        address from;
        address to;
        uint256 troveId;
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
        params.from = _parseParamAddr(params.from, _paramMapping[1], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[2], _subData, _returnValues);
        params.troveId = _parseParamUint(params.troveId, _paramMapping[3], _subData, _returnValues);

        (uint256 collAmount, bytes memory logData) = _close(params);
        emit ActionEvent("LiquityV2Close", logData);
        return bytes32(collAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _close(params);
        logger.logActionDirectEvent("LiquityV2Close", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _close(Params memory _params) internal returns (uint256, bytes memory) {
        address collToken = IAddressesRegistry(_params.market).collToken();
        address borrowerOperations = IAddressesRegistry(_params.market).borrowerOperations();
        address troveManager = IAddressesRegistry(_params.market).troveManager();

        ITroveManager.LatestTroveData memory troveData = ITroveManager(troveManager)
            .getLatestTroveData(_params.troveId);

        BOLD_ADDR.pullTokensIfNeeded(_params.from, troveData.entireDebt);

        IBorrowerOperations(borrowerOperations).closeTrove(_params.troveId);

        if (collToken == TokenUtils.WETH_ADDR) {
            collToken.withdrawTokens(_params.to, troveData.entireColl + ETH_GAS_COMPENSATION);
        } else {
            TokenUtils.WETH_ADDR.withdrawTokens(_params.to, ETH_GAS_COMPENSATION);
            collToken.withdrawTokens(_params.to, troveData.entireColl);
        }

        return (troveData.entireColl, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
