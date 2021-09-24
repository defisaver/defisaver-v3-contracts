// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

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

    struct Params {
        uint256 vaultId;
        uint256 amount;
        address to;
        address mcdManager;
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
        inputData.amount = _parseParamUint(inputData.amount, _paramMapping[1], _subData, _returnValues);
        inputData.to = _parseParamAddr(inputData.to, _paramMapping[2], _subData, _returnValues);

        inputData.amount = _mcdGenerate(inputData.vaultId, inputData.amount, inputData.to, inputData.mcdManager);

        return bytes32(inputData.amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _mcdGenerate(inputData.vaultId, inputData.amount, inputData.to, inputData.mcdManager);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Generates dai from a specified vault
    /// @param _vaultId Id of the vault
    /// @param _amount Amount of dai to be generated
    /// @param _to Address which will receive the dai
    /// @param _mcdManager The manager address we are using [mcd, b.protocol]
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

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
