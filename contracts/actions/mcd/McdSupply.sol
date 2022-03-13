// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../../interfaces/mcd/IManager.sol";
import "../../interfaces/mcd/IVat.sol";
import "../../interfaces/mcd/IJoin.sol";
import "../../interfaces/mcd/ICropJoin.sol";
import "../../interfaces/mcd/ICropper.sol";
import "../../interfaces/mcd/ICdpRegistry.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/McdHelper.sol";

/// @title Supply collateral to a Maker vault
contract McdSupply is ActionBase, McdHelper {
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
            uint256 amount,
            address joinAddr,
            address from,
            address mcdManager
        ) = parseInputs(_callData);

        vaultId = _parseParamUint(vaultId, _paramMapping[0], _subData, _returnValues);
        amount = _parseParamUint(amount, _paramMapping[1], _subData, _returnValues);
        joinAddr = _parseParamAddr(joinAddr, _paramMapping[2], _subData, _returnValues);
        from = _parseParamAddr(from, _paramMapping[3], _subData, _returnValues);

        uint256 returnAmount = _mcdSupply(vaultId, amount, joinAddr, from, mcdManager);

        return bytes32(returnAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        (
            uint256 vaultId,
            uint256 amount,
            address joinAddr,
            address from,
            address mcdManager
        ) = parseInputs(_callData);

        _mcdSupply(vaultId, amount, joinAddr, from, mcdManager);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Supplies collateral to the vault
    /// @param _vaultId Id of the vault
    /// @param _amount Amount of tokens to supply
    /// @param _joinAddr Join address of the maker collateral
    /// @param _from Address where to pull the collateral from
    /// @param _mcdManager The manager address we are using [mcd, b.protocol]
    function _mcdSupply(
        uint256 _vaultId,
        uint256 _amount,
        address _joinAddr,
        address _from,
        address _mcdManager
    ) internal returns (uint256) {
        address tokenAddr = getTokenFromJoin(_joinAddr);

        // if amount type(uint).max, pull current _from balance
        if (_amount == type(uint256).max) {
            _amount = tokenAddr.getBalance(_from);
        }

        // Pull the underlying token and join the maker join pool
        tokenAddr.pullTokensIfNeeded(_from, _amount);

        // format the amount we need for frob
        int256 vatAmount = toPositiveInt(convertTo18(_joinAddr, _amount));

        if (_mcdManager == CROPPER) {         
            _cropperSupply(_vaultId, tokenAddr, _joinAddr, _amount, vatAmount);
        } else {
            _mcdManagerSupply(_mcdManager, _vaultId, tokenAddr, _joinAddr, _amount, vatAmount);
        }

        logger.Log(
            address(this),
            msg.sender,
            "McdSupply",
            abi.encode(_vaultId, _amount, _joinAddr, _from, _mcdManager)
        );

        return _amount;
    }

    function _cropperSupply(
        uint256 _vaultId,
        address _tokenAddr,
        address _joinAddr,
        uint256 _amount,
        int256 _vatAmount
    ) internal {
        bytes32 ilk = ICdpRegistry(CDP_REGISTRY).ilks(_vaultId);
        address owner = ICdpRegistry(CDP_REGISTRY).owns(_vaultId);

        _tokenAddr.approveToken(CROPPER, _amount);

        ICropper(CROPPER).join(_joinAddr, owner, _amount);
        ICropper(CROPPER).frob(ilk, owner, owner, owner, _vatAmount, 0);
    }

    function _mcdManagerSupply(
        address _mcdManager,
        uint256 _vaultId,
        address _tokenAddr,
        address _joinAddr,
        uint256 _amount,
        int256 _vatAmount
    ) internal {
        IManager mcdManager = IManager(_mcdManager);

        _tokenAddr.approveToken(_joinAddr, _amount);
        IJoin(_joinAddr).join(address(this), _amount);

        // Supply to the vault balance
        vat.frob(
            mcdManager.ilks(_vaultId),
            mcdManager.urns(_vaultId),
            address(this),
            address(this),
            _vatAmount,
            0
        );
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            uint256 vaultId,
            uint256 amount,
            address joinAddr,
            address from,
            address mcdManager
        )
    {
        vaultId = abi.decode(_callData[0], (uint256));
        amount = abi.decode(_callData[1], (uint256));
        joinAddr = abi.decode(_callData[2], (address));
        from = abi.decode(_callData[3], (address));
        mcdManager = abi.decode(_callData[4], (address));
    }
}
