// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ICropJoin } from "../../interfaces/mcd/ICropJoin.sol";
import { ICropper } from "../../interfaces/mcd/ICropper.sol";
import { ICdpRegistry } from "../../interfaces/mcd/ICdpRegistry.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";
import { ActionBase } from "../ActionBase.sol";
import { McdHelper } from "./helpers/McdHelper.sol";
import { IERC20 } from "../../interfaces/IERC20.sol";

/// @title Claims bonus tokens in CropJoin type vaults
contract McdClaim is ActionBase, McdHelper {
    using TokenUtils for address;

    /// @param vaultId Id of the vault
    /// @param joinAddr Join address of the maker collateral
    /// @param to Address where to send the bonus tokens we withdrew
    struct Params {
        uint256 vaultId;
        address joinAddr;
        address to;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.vaultId = _parseParamUint(inputData.vaultId, _paramMapping[0], _subData, _returnValues);
        inputData.joinAddr = _parseParamAddr(inputData.joinAddr, _paramMapping[1], _subData, _returnValues);
        inputData.to = _parseParamAddr(inputData.to, _paramMapping[2], _subData, _returnValues);

        (uint256 returnAmount, bytes memory logData) = _mcdClaim(inputData.vaultId, inputData.joinAddr, inputData.to);

        emit ActionEvent("McdClaim", logData);

        return bytes32(returnAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        (, bytes memory logData) = _mcdClaim(inputData.vaultId, inputData.joinAddr, inputData.to);
        logger.logActionDirectEvent("McdClaim", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice The call will revert if the _joinAddr is not CropJoin compatible
    /// @param _vaultId Id of the vault
    /// @param _joinAddr Join address of the maker collateral
    /// @param _to Address where to send the bonus tokens we withdrew
    function _mcdClaim(
        uint256 _vaultId,
        address _joinAddr,
        address _to
    ) internal returns (uint256, bytes memory) {
        address owner = ICdpRegistry(CDP_REGISTRY).owns(_vaultId);
        address bonusTokenAddr = address(ICropJoin(_joinAddr).bonus());

        uint256 bonusBeforeBalance = IERC20(bonusTokenAddr).balanceOf(address(this));

        // Join with 0 will just call crop and send bonus tokens to proxy
        ICropper(CROPPER).join(_joinAddr, owner, 0);

        uint256 bonusAfterBalance = IERC20(bonusTokenAddr).balanceOf(address(this));

        uint256 amount = bonusAfterBalance - bonusBeforeBalance;
        bonusTokenAddr.withdrawTokens(_to, amount);

        bytes memory logData = abi.encode(_vaultId, _joinAddr, _to, amount);

        return (amount, logData);
    }

    function parseInputs(bytes memory _callData)
        internal
        pure
        returns (Params memory inputData)
    {
        inputData = abi.decode(_callData, (Params));
    }
}
