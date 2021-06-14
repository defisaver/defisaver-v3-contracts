// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;
import "./helpers/LiquityHelper.sol";
import "../../utils/TokenUtils.sol";
import "../../utils/SafeMath.sol";
import "../ActionBase.sol";

contract LiquityClose is ActionBase, LiquityHelper {
    using TokenUtils for address;
    using SafeMath for uint256;

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        (address from, address to) = parseInputs(_callData);

        from = _parseParamAddr(from, _paramMapping[0], _subData, _returnValues);
        to = _parseParamAddr(to, _paramMapping[1], _subData, _returnValues);

        uint256 coll = _liquityClose(from, to);
        return bytes32(coll);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable virtual override {
        (address from, address to) = parseInputs(_callData);

        _liquityClose(from, to);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Closes the trove
    /// @param _from Address where to pull the LUSD tokens from
    /// @param _to Address that will receive the collateral
    function _liquityClose(address _from, address _to) internal returns (uint256) {
        uint256 netDebt = TroveManager.getTroveDebt(address(this)).sub(LUSD_GAS_COMPENSATION);
        uint256 coll = TroveManager.getTroveColl(address(this));

        LUSDTokenAddr.pullTokensIfNeeded(_from, netDebt);

        BorrowerOperations.closeTrove();

        TokenUtils.depositWeth(coll);
        TokenUtils.WETH_ADDR.withdrawTokens(_to, coll);

        logger.Log(address(this), msg.sender, "LiquityClose", abi.encode(_from, _to, netDebt, coll));

        return uint256(coll);
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (address from, address to)
    {
        from = abi.decode(_callData[0], (address));
        to = abi.decode(_callData[1], (address));
    }
}
