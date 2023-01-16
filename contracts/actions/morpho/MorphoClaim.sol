// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../interfaces/morpho/IRewardsDistributor.sol";
import "../ActionBase.sol";
import "../../utils/TokenUtils.sol";
import "./helpers/MorphoHelper.sol";

/// @title Claims Morpho rewards on behalf of proxy
contract MorphoClaim is ActionBase, MorphoHelper {
    using TokenUtils for address;

    /// @param to Where the claimed will be sent
    /// @param claimable The overall claimable amount of token rewards
    /// @param proof The merkle proof that validates this claim
    struct Params {
        address to;
        uint256 claimable;
        bytes32[] proof;
    }

    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.to = _parseParamAddr(params.to, _paramMapping[0], _subData, _returnValues);

        (uint256 amount, bytes memory logData) = _claim(params);
        emit ActionEvent("MorphoClaim", logData);
        return bytes32(amount);
    }

    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _claim(params);
        logger.logActionDirectEvent("MorphoClaim", logData);
    }

    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function _claim(Params memory _params) internal returns (uint256 claimed, bytes memory logData) {
        uint256 alreadyClaimed = IRewardsDistributor(REWARDS_DISTRIBUTOR_ADDR).claimed(address(this));
        IRewardsDistributor(REWARDS_DISTRIBUTOR_ADDR).claim(address(this), _params.claimable, _params.proof);

        claimed = _params.claimable - alreadyClaimed;
        MORPHO_TOKEN_ADDR.withdrawTokens(_params.to, claimed);
        logData = abi.encode(_params, claimed);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}