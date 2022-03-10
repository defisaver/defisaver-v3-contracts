// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../../interfaces/mcd/ICropJoin.sol";
import "../../interfaces/mcd/ICropper.sol";
import "../../interfaces/mcd/ICdpRegistry.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/McdHelper.sol";

/// @title Claims bonus tokens in CropJoin type vaults
contract McdClaim is ActionBase, McdHelper {
    using TokenUtils for address;

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable override returns (bytes32) {
        (
            uint256 vaultId,
            address joinAddr,
            address to
        ) = parseInputs(_callData);

        vaultId = _parseParamUint(vaultId, _paramMapping[0], _subData, _returnValues);
        joinAddr = _parseParamAddr(joinAddr, _paramMapping[1], _subData, _returnValues);
        to = _parseParamAddr(to, _paramMapping[2], _subData, _returnValues);

        uint256 returnAmount = _mcdClaim(vaultId, joinAddr, to);

        return bytes32(returnAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        (
            uint256 vaultId,
            address joinAddr,
            address to
        ) = parseInputs(_callData);

        _mcdClaim(vaultId, joinAddr, to);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @dev The call will revert if the _joinAddr is not CropJoin compatible
    /// @notice Claims bonus tokens from CropJoin collateral
    /// @param _vaultId Id of the vault
    /// @param _joinAddr Join address of the maker collateral
    /// @param _to Address where to send the bonus tokens we withdrew
    function _mcdClaim(
        uint256 _vaultId,
        address _joinAddr,
        address _to
    ) internal returns (uint256) {
        address urn = ICdpRegistry(CDP_REGISTRY).owns(_vaultId);
        address bonusTokenAddr = address(ICropJoin(_joinAddr).bonus());

        uint256 bonusBeforeBalance = IERC20(bonusTokenAddr).balanceOf(address(this));

        // Join with 0 will just call crop and send bonus tokens to proxy
        ICropper(CROPPER).join(_joinAddr, urn, 0);

        uint256 bonusBeforeAfter = IERC20(bonusTokenAddr).balanceOf(address(this));

        uint256 amount = bonusBeforeAfter - bonusBeforeBalance;
        bonusTokenAddr.withdrawTokens(_to, amount);
        
        logger.Log(
            address(this),
            msg.sender,
            "McdClaim",
            abi.encode(_vaultId, _joinAddr, _to, amount)
        );

        return amount;
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            uint256 vaultId,
            address joinAddr,
            address to
        )
    {
        vaultId = abi.decode(_callData[0], (uint256));
        joinAddr = abi.decode(_callData[1], (address));
        to = abi.decode(_callData[2], (address));
    }
}
