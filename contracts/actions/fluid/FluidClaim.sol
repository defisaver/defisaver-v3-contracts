// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidMerkleDistributor } from "../../interfaces/protocols/fluid/IFluidMerkleDistributor.sol";

import { FluidHelper } from "./helpers/FluidHelper.sol";

import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/token/TokenUtils.sol";

/// @title Claim rewards from Fluid protocol
contract FluidClaim is ActionBase, FluidHelper {
    using TokenUtils for address;

    /// @param to Address to send the claimed tokens to.
    /// @param cumulativeAmount Total cumulative amount of tokens to claim (Obtained from API).
    /// @param positionId The ID of the position. For earn positions, this will be fToken address padded with zeros (Obtained from API).
    /// @param positionType The type of the position (Obtained from API).
    /// @param cycle The cycle of the rewards program (Obtained from API).
    /// @param merkleProof The Merkle proof to claim the rewards (Obtained from API).
    /// @param metadata Additional metadata for the claim. (Obtained from API).
    struct Params {
        address to;
        uint256 cumulativeAmount;
        bytes32 positionId;
        uint8 positionType;
        uint256 cycle;
        bytes32[] merkleProof;
        bytes metadata;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.to = _parseParamAddr(params.to, _paramMapping[0], _subData, _returnValues);
        params.cumulativeAmount = _parseParamUint(params.cumulativeAmount, _paramMapping[1], _subData, _returnValues);
        params.positionId = _parseParamABytes32(params.positionId, _paramMapping[2], _subData, _returnValues);
        params.positionType = uint8(_parseParamUint(params.positionType, _paramMapping[3], _subData, _returnValues));
        params.cycle = _parseParamUint(params.cycle, _paramMapping[4], _subData, _returnValues);

        (uint256 amount, bytes memory logData) = _claim(params);
        emit ActionEvent("FluidClaim", logData);
        return bytes32(amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _claim(params);
        logger.logActionDirectEvent("FluidClaim", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _claim(Params memory _params) internal returns (uint256, bytes memory) {
        address rewardToken = IFluidMerkleDistributor(FLUID_MERKLE_DISTRIBUTOR).TOKEN();

        uint256 rewardTokenBalanceBefore = rewardToken.getBalance(address(this));

        IFluidMerkleDistributor(FLUID_MERKLE_DISTRIBUTOR)
            .claim(
                address(this), /* recipient_ */
                _params.cumulativeAmount,
                _params.positionType,
                _params.positionId,
                _params.cycle,
                _params.merkleProof,
                _params.metadata
            );

        uint256 claimed = rewardToken.getBalance(address(this)) - rewardTokenBalanceBefore;

        rewardToken.withdrawTokens(_params.to, claimed);

        return (claimed, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
