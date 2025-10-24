// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IUniversalRewardsDistributor } from "../../interfaces/morpho-blue/IUniversalRewardsDistributor.sol";

import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";

/// @title Claims rewards for MORPHO users
contract MorphoBlueClaim is ActionBase {
    using TokenUtils for address;

    /// @param to The address to which to send the reward tokens.
    /// @param token The address of the token to claim.
    /// @param distributor The address of the morpho distributor contract.
    /// @param claimable The overall claimable amount of token rewards.
    /// @param merkleProof The merkle proof to claim the rewards.
    struct Params {
        address to;
        address token;
        address distributor;
        uint256 claimable;
        bytes32[] merkleProof;
    }

    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.to = _parseParamAddr(params.to, _paramMapping[0], _subData, _returnValues);
        params.token = _parseParamAddr(params.token, _paramMapping[1], _subData, _returnValues);
        params.distributor = _parseParamAddr(params.distributor, _paramMapping[2], _subData, _returnValues);
        params.claimable = _parseParamUint(params.claimable, _paramMapping[3], _subData, _returnValues);

        (uint256 claimed, bytes memory logData) = _claim(params);
        emit ActionEvent("MorphoBlueClaim", logData);
        return bytes32(claimed);
    }

    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _claim(params);
        logger.logActionDirectEvent("MorphoBlueClaim", logData);
    }

    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function _claim(Params memory _params) internal returns (uint256, bytes memory) {
        uint256 claimed = IUniversalRewardsDistributor(_params.distributor)
            .claim(address(this), _params.token, _params.claimable, _params.merkleProof);

        _params.token.withdrawTokens(_params.to, claimed);

        return (claimed, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
