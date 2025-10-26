// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAddressesRegistry } from "../../../interfaces/protocols/liquityV2/IAddressesRegistry.sol";
import { IBorrowerOperations } from "../../../interfaces/protocols/liquityV2/IBorrowerOperations.sol";
import { ICollSurplusPool } from "../../../interfaces/protocols/liquityV2/ICollSurplusPool.sol";

import { LiquityV2Helper } from "../helpers/LiquityV2Helper.sol";
import { ActionBase } from "../../ActionBase.sol";
import { TokenUtils } from "../../../utils/token/TokenUtils.sol";

/// @title Claims the caller’s accumulated collateral from their liquidated Troves after collateral seizure at liquidation
/// @notice This action will revert on zero claimable collateral
contract LiquityV2Claim is ActionBase, LiquityV2Helper {
    using TokenUtils for address;

    /// @param market The address of the LiquityV2 market (collateral branch)
    /// @param to The address to send the tokens to
    struct Params {
        address market;
        address to;
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
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);

        (uint256 claimedColl, bytes memory logData) = _claim(params);
        emit ActionEvent("LiquityV2Claim", logData);
        return bytes32(claimedColl);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _claim(params);
        logger.logActionDirectEvent("LiquityV2Claim", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _claim(Params memory _params) internal returns (uint256, bytes memory) {
        address borrowerOperations = IAddressesRegistry(_params.market).borrowerOperations();
        address collToken = IAddressesRegistry(_params.market).collToken();
        address collSurplusPool = IAddressesRegistry(_params.market).collSurplusPool();

        uint256 claimableColl = ICollSurplusPool(collSurplusPool).getCollateral(address(this));

        /// @dev Reverts on zero claimable collateral
        IBorrowerOperations(borrowerOperations).claimCollateral();

        collToken.withdrawTokens(_params.to, claimableColl);

        return (claimableColl, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
