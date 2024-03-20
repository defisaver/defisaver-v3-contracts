// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "./helpers/MerklHelper.sol";
import "../ActionBase.sol";
import "../../utils/TokenUtils.sol";

/// @title Claims Merkl rewards
contract MerklClaim is ActionBase, MerklHelper {
    using TokenUtils for address;

    struct Params {
        address[] users;
        address[] tokens;
        uint256[] amounts;
        bytes32[][] proofs;
        address[] distinctTokens;
        uint256[] amountsClaimedPerDistinctToken;
        address to;
    }

    function executeAction(
        bytes memory _callData,
        bytes32[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        (bytes memory logData) = _claim(params);
        emit ActionEvent("MerklClaim", logData);
        return bytes32(0);
    }

    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (bytes memory logData) = _claim(params);
        logger.logActionDirectEvent("MerklClaim", logData);
    }

    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function _claim(Params memory _params) internal returns (bytes memory logData) {
        merklDistributor.claim(_params.users, _params.tokens, _params.amounts, _params.proofs);
        for (uint256 i; i < _params.distinctTokens.length; ++i) {
            _params.distinctTokens[i].withdrawTokens(_params.to, _params.amountsClaimedPerDistinctToken[i]);
        }

        logData = abi.encode(_params.distinctTokens, _params.amountsClaimedPerDistinctToken);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}