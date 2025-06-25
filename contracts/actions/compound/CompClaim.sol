// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { TokenUtils } from "../../utils/TokenUtils.sol";
import { ActionBase } from "../ActionBase.sol";
import { CompHelper } from "./helpers/CompHelper.sol";
import { IComptroller } from "../../interfaces/compound/IComptroller.sol";

/// @title Claims Comp reward for the specified user.
contract CompClaim is ActionBase, CompHelper {
    using TokenUtils for address;

    /// @param cTokensSupply Array of cTokens which the user supplied and has earned rewards
    /// @param cTokensBorrow Array of cTokens which the user borrowed and has earned rewards
    /// @param from The address that is claiming the rewards
    /// @param to The address that will receive the rewards
    struct Params {
        address[] cTokensSupply;
        address[] cTokensBorrow;
        address from;
        address to;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        // the first 2 inputs are not mappable, just the last two
        params.from = _parseParamAddr(params.from, _paramMapping[0], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);

        (uint256 compClaimed, bytes memory logData) = _claim(params.cTokensSupply, params.cTokensBorrow, params.from, params.to);
        emit ActionEvent("CompClaim", logData);
        return bytes32(compClaimed);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _claim(params.cTokensSupply, params.cTokensBorrow, params.from, params.to);
        logger.logActionDirectEvent("CompClaim", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Claims comp for _from address and for specified cTokens.
    /// @dev if _from != user's wallet, the receiver will always be the _from and not the _to addr
    /// @param _cTokensSupply Array of cTokens which _from supplied and has earned rewards
    /// @param _cTokensBorrow Array of cTokens which _from supplied and has earned rewards
    /// @param _from For which user we are claiming the tokens
    /// @param _to Where we are sending the Comp to (if _from is user's wallet)
    function _claim(
        address[] memory _cTokensSupply,
        address[] memory _cTokensBorrow,
        address _from,
        address _to
    ) internal returns (uint256 compClaimed, bytes memory logData) {
        address[] memory users = new address[](1);
        users[0] = _from;

        uint256 compBalanceBefore = COMP_ADDR.getBalance(_from);

        IComptroller(COMPTROLLER_ADDR).claimComp(users, _cTokensSupply, false, true);
        IComptroller(COMPTROLLER_ADDR).claimComp(users, _cTokensBorrow, true, false);

        uint256 compBalanceAfter = COMP_ADDR.getBalance(_from);

        compClaimed = compBalanceAfter - compBalanceBefore;

        if (_from == address(this)) {
            COMP_ADDR.withdrawTokens(_to, compClaimed);
        }

        logData = abi.encode(_from, _to, compClaimed);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
