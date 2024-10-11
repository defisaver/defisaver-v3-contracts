// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAddressesRegistry } from "../../../interfaces/liquityV2/IAddressesRegistry.sol";
import { IStabilityPool } from "../../../interfaces/liquityV2/IStabilityPool.sol";

import { LiquityV2Helper } from "../helpers/LiquityV2Helper.sol";
import { ActionBase } from "../../ActionBase.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";

// This action is only needed in the case a user has no deposit but still has remaining stashed Coll gains.
contract LiquityV2SPClaimColl is ActionBase, LiquityV2Helper {
    using TokenUtils for address;

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

        (uint256 claimedCollAmount, bytes memory logData) = _spClaimCollGains(params);
        emit ActionEvent("LiquityV2SPClaimColl", logData);
        return bytes32(claimedCollAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _spClaimCollGains(params);
        logger.logActionDirectEvent("LiquityV2SPClaimColl", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _spClaimCollGains(Params memory _params) internal returns (uint256, bytes memory) {
        address stabilityPool = IAddressesRegistry(_params.market).stabilityPool();
        address collToken = IAddressesRegistry(_params.market).collToken();

        uint256 collGain = IStabilityPool(stabilityPool).stashedColl(address(this));

        // will revert if user has some bold deposited
        IStabilityPool(stabilityPool).claimAllCollGains();

        collToken.withdrawTokens(_params.to, collGain);

        return (collGain, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
