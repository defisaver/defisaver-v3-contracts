// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../interfaces/mcd/IManager.sol";
import "../../interfaces/mcd/IVat.sol";
import "../../interfaces/mcd/IJoin.sol";
import "../../interfaces/mcd/IDaiJoin.sol";
import "../../DS/DSMath.sol";
import "../../utils/SafeERC20.sol";
import "../ActionBase.sol";
import "./helpers/McdHelper.sol";
import "../../utils/GasBurner.sol";

contract McdPayback is ActionBase, McdHelper, GasBurner {
    address public constant MANAGER_ADDRESS = 0x5ef30b9986345249bc32d8928B7ee64DE9435E39;
    address public constant VAT_ADDRESS = 0x35D1b3F3D7966A1DFe207aa4514C12a259A0492B;
    address public constant DAI_ADDRESS = 0x6B175474E89094C44Da98b954EedeAC495271d0F;

    address public constant DAI_JOIN_ADDRESS = 0x9759A6Ac90977b93B58547b4A71c78317f391A28;

    using SafeERC20 for IERC20;

    IManager public constant manager = IManager(MANAGER_ADDRESS);
    IVat public constant vat = IVat(VAT_ADDRESS);

    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public override payable returns (bytes32) {
        (uint256 vaultId, uint256 amount, address from) = parseInputs(_callData);

        vaultId = _parseParamUint(vaultId, _paramMapping[0], _subData, _returnValues);
        amount = _parseParamUint(amount, _paramMapping[1], _subData, _returnValues);
        from = _parseParamAddr(from, _paramMapping[2], _subData, _returnValues);

        amount = _mcdPayback(vaultId, amount, from);

        return bytes32(amount);
    }

    function executeActionDirect(bytes[] memory _callData) public override payable burnGas {
        (uint256 vaultId, uint256 amount, address from) = parseInputs(_callData);

        _mcdPayback(vaultId, amount, from);
    }

    function actionType() public override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function _mcdPayback(
        uint256 _vaultId,
        uint256 _amount,
        address _from
    ) internal returns (uint256) {
        address urn = manager.urns(_vaultId);
        bytes32 ilk = manager.ilks(_vaultId);

        uint256 wholeDebt = getAllDebt(VAT_ADDRESS, urn, urn, ilk);

        if (_amount > wholeDebt) {
            _amount = wholeDebt;
        }

        pullTokens(_from, _amount);

        if (IERC20(DAI_ADDRESS).allowance(address(this), DAI_JOIN_ADDRESS) == 0) {
            IERC20(DAI_ADDRESS).approve(DAI_JOIN_ADDRESS, uint256(-1));
        }

        IDaiJoin(DAI_JOIN_ADDRESS).join(urn, _amount);

        manager.frob(_vaultId, 0, normalizePaybackAmount(VAT_ADDRESS, urn, ilk));

        logger.Log(address(this), msg.sender, "McdPayback", abi.encode(_vaultId, _amount, _from));

        return _amount;
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            uint256 vaultId,
            uint256 amount,
            address from
        )
    {
        vaultId = abi.decode(_callData[0], (uint256));
        amount = abi.decode(_callData[1], (uint256));
        from = abi.decode(_callData[2], (address));
    }

    function pullTokens(address _from, uint256 _amount) internal {
        if (_from != address(0) && _from != address(this)) {
            IERC20(DAI_ADDRESS).safeTransferFrom(_from, address(this), _amount);
        }
    }
}
