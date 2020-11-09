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

contract McdPayback is ActionBase, McdHelper {
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
    ) override public payable returns (bytes32) {
        uint cdpId = abi.decode(_callData[0], (uint256));
        uint amount = abi.decode(_callData[1], (uint256));
        address from = abi.decode(_callData[2], (address));

        cdpId = _parseParamUint(cdpId, _paramMapping[0], _subData, _returnValues);
        amount = _parseParamUint(amount, _paramMapping[1], _subData, _returnValues);
        from = _parseParamAddr(from, _paramMapping[2], _subData, _returnValues);

        pullTokens(from, amount);

        amount = mcdPayback(cdpId, amount);

        logger.Log(address(this), msg.sender, "McdPayback", abi.encode(cdpId, amount, from));

        return bytes32(amount);
    }

    function actionType() override public pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function mcdPayback(uint _cdpId, uint _amount) internal returns (uint) {
        address urn = manager.urns(_cdpId);
        bytes32 ilk = manager.ilks(_cdpId);

        uint wholeDebt = getAllDebt(VAT_ADDRESS, urn, urn, ilk);

        if (_amount > wholeDebt) {
            IERC20(DAI_ADDRESS).transfer(getOwner(manager, _cdpId), sub(_amount, wholeDebt));
            _amount = wholeDebt;
        }

        if (IERC20(DAI_ADDRESS).allowance(address(this), DAI_JOIN_ADDRESS) == 0) {
            IERC20(DAI_ADDRESS).approve(DAI_JOIN_ADDRESS, uint(-1));
        }

        IDaiJoin(DAI_JOIN_ADDRESS).join(urn, _amount);

        manager.frob(_cdpId, 0, normalizePaybackAmount(VAT_ADDRESS, urn, ilk));

        return _amount;
    }

    function pullTokens(address _from, uint _amount) internal {
        if (_from != address(0)) {
            IERC20(DAI_ADDRESS).safeTransferFrom(_from, address(this), _amount);
        }
    }
}
