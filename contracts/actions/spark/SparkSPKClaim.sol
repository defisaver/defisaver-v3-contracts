// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";
import { ISparkRewards } from "../../interfaces/protocols/spark/ISparkRewards.sol";

/// @title Claims SPK token from Spark Rewards contract
contract SparkSPKClaim is ActionBase {
    using TokenUtils for address;

    /// @param rewardContract Address of the Spark Rewards contract
    /// @param to Address to send the SPK token to
    /// @param epoch The epoch number for which to claim rewards
    /// @param account Address of the account claiming rewards
    /// @param token Token address being claimed
    /// @param cumulativeAmount Total amount claimable up to this point
    /// @param expectedMerkleRoot Expected merkle root for verification
    /// @param merkleProof Merkle proof for verification
    struct Params {
        address rewardContract;
        address to;
        uint256 epoch;
        address account;
        address token;
        uint256 cumulativeAmount;
        bytes32 expectedMerkleRoot;
        bytes32[] merkleProof;
    }

    function executeAction(bytes memory _callData, bytes32[] memory, uint8[] memory, bytes32[] memory)
        public
        payable
        virtual
        override
        returns (bytes32)
    {
        Params memory params = parseInputs(_callData);

        (uint256 claimedAmount, bytes memory logData) = _claim(params);
        emit ActionEvent("SparkSPKClaim", logData);
        return bytes32(claimedAmount);
    }

    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _claim(params);
        logger.logActionDirectEvent("SparkSPKClaim", logData);
    }

    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }

    function _claim(Params memory _params) internal returns (uint256 claimedAmount, bytes memory logData) {
        claimedAmount = ISparkRewards(_params.rewardContract)
            .claim(
                _params.epoch,
                _params.account,
                _params.token,
                _params.cumulativeAmount,
                _params.expectedMerkleRoot,
                _params.merkleProof
            );

        _params.token.withdrawTokens(_params.to, claimedAmount);

        return (claimedAmount, abi.encode(claimedAmount, _params));
    }
}
