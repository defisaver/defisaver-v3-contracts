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

    function executeAction(uint, bytes memory _callData, bytes32[] memory _returnValues) override public payable returns (bytes32) {
        (uint cdpId, uint amount, address from) = parseParamData(_callData, _returnValues);

        pullTokens(from, amount);

        address urn = manager.urns(cdpId);
        bytes32 ilk = manager.ilks(cdpId);

        uint wholeDebt = getAllDebt(VAT_ADDRESS, urn, urn, ilk);

        if (amount > wholeDebt) {
            IERC20(DAI_ADDRESS).transfer(getOwner(manager, cdpId), sub(amount, wholeDebt));
            amount = wholeDebt;
        }

        if (IERC20(DAI_ADDRESS).allowance(address(this), DAI_JOIN_ADDRESS) == 0) {
            IERC20(DAI_ADDRESS).approve(DAI_JOIN_ADDRESS, uint(-1));
        }

        IDaiJoin(DAI_JOIN_ADDRESS).join(urn, amount);

        manager.frob(cdpId, 0, normalizePaybackAmount(VAT_ADDRESS, urn, ilk));

        logger.Log(address(this), msg.sender, "McdPayback", abi.encode(cdpId, amount, from));

        return bytes32(amount);
    }

    function actionType() override public pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function parseParamData(
        bytes memory _data,
        bytes32[] memory _returnValues
    ) public pure returns (uint cdpId,uint amount, address from) {
        uint8[] memory inputMapping;

        (cdpId, amount, from, inputMapping) = abi.decode(_data, (uint256,uint256,address,uint8[]));

        // mapping return values to new inputs
        if (inputMapping.length > 0 && _returnValues.length > 0) {
            for (uint i = 0; i < inputMapping.length; i += 2) {
                bytes32 returnValue = _returnValues[inputMapping[i + 1]];

                if (inputMapping[i] == 0) {
                    cdpId = uint(returnValue);
                } else if (inputMapping[i] == 1) {
                    amount = uint(returnValue);
                } else if (inputMapping[i] == 2) {
                    from = address(bytes20(returnValue));
                }
            }
        }
    }

    function pullTokens(address _from, uint _amount) internal {
        if (_from != address(0)) {
            IERC20(DAI_ADDRESS).safeTransferFrom(_from, address(this), _amount);
        }
    }
}
