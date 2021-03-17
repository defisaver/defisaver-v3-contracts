// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../interfaces/mcd/IManager.sol";
import "../../interfaces/mcd/ISpotter.sol";
import "../../interfaces/mcd/IVat.sol";
import "../../interfaces/mcd/IDaiJoin.sol";
import "../../interfaces/mcd/IJug.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/McdHelper.sol";

/// @title Generate dai from a Maker Vault
contract McdGenerate is ActionBase, McdHelper {
    using TokenUtils for address;

    address public constant JUG_ADDRESS = 0x19c0976f590D67707E62397C87829d896Dc0f1F1;
    ISpotter public constant spotter = ISpotter(0x65C79fcB50Ca1594B025960e539eD7A9a6D434A3);

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable override returns (bytes32) {
        (uint256 cdpId, uint256 amount, address to, address mcdManager) = parseInputs(_callData);

        cdpId = _parseParamUint(cdpId, _paramMapping[0], _subData, _returnValues);
        amount = _parseParamUint(amount, _paramMapping[1], _subData, _returnValues);
        to = _parseParamAddr(to, _paramMapping[2], _subData, _returnValues);

        amount = _mcdGenerate(cdpId, amount, to, mcdManager);

        return bytes32(amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        (uint256 cdpId, uint256 amount, address to, address mcdManager) = parseInputs(_callData);

        _mcdGenerate(cdpId, amount, to, mcdManager);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Generates dai from a specified vault
    /// @dev The actual generated amount might differ, as it will generate up to max debt for vault
    /// @param _vaultId Id of the vault
    /// @param _amount Amount of dai to be generated
    /// @param _to Address which will receive the dai
    /// @param _mcdManager The manager address we are using
    function _mcdGenerate(
        uint256 _vaultId,
        uint256 _amount,
        address _to,
        address _mcdManager
    ) internal returns (uint256) {
        IManager mcdManager = IManager(_mcdManager);

        uint256 rate = IJug(JUG_ADDRESS).drip(mcdManager.ilks(_vaultId));
        uint256 daiVatBalance = vat.dai(mcdManager.urns(_vaultId));


        // Generate dai and move to proxy balance
        mcdManager.frob(
            _vaultId,
            int256(0),
            normalizeDrawAmount(_amount, rate, daiVatBalance)
        );
        mcdManager.move(_vaultId, address(this), toRad(_amount));


        // add auth so we can exit the dai
        if (vat.can(address(this), address(DAI_JOIN_ADDR)) == 0) {
            vat.hope(DAI_JOIN_ADDR);
        }


        // exit dai from join and send _to if needed
        IDaiJoin(DAI_JOIN_ADDR).exit(_to, _amount);


        logger.Log(
            address(this),
            msg.sender,
            "McdGenerate",
            abi.encode(_vaultId, _amount, _to, _mcdManager)
        );

        return _amount;
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            uint256 vaultId,
            uint256 amount,
            address to,
            address mcdManager
        )
    {
        vaultId = abi.decode(_callData[0], (uint256));
        amount = abi.decode(_callData[1], (uint256));
        to = abi.decode(_callData[2], (address));
        mcdManager = abi.decode(_callData[3], (address));
    }
}
