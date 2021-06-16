// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;
import "../../DS/DSMath.sol";
import "../../interfaces/IWETH.sol";
import "../../interfaces/compound/ICToken.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/CompHelper.sol";

/// @title Withdraw a token from Compound
contract CompWithdraw is ActionBase, CompHelper, DSMath {
    using TokenUtils for address;
    struct Params {
        address cTokenAddr;
        uint256 amount;
        address to;
    }

    string public constant ERR_COMP_REDEEM = "Comp redeem failed";
    string public constant ERR_COMP_REDEEM_UNDERLYING = "Underlying comp redeem failed";

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.cTokenAddr = _parseParamAddr(params.cTokenAddr, _paramMapping[0], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[1], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[2], _subData, _returnValues);

        uint256 withdrawAmount = _withdraw(params.cTokenAddr, params.amount, params.to);

        return bytes32(withdrawAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);

        _withdraw(params.cTokenAddr, params.amount, params.to);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Withdraws a underlying token amount from compound
    /// @dev Send type(uint).max to withdraw whole balance
    /// @param _cTokenAddr cToken address
    /// @param _amount Amount of underlying tokens to withdraw
    /// @param _to Address where to send the tokens to (can be left on proxy)
    function _withdraw(
        address _cTokenAddr,
        uint256 _amount,
        address _to
    ) internal returns (uint256) {
        address tokenAddr = getUnderlyingAddr(_cTokenAddr);

        // because comp returns native eth we need to check the balance of that
        if (tokenAddr == TokenUtils.WETH_ADDR) {
            tokenAddr = TokenUtils.ETH_ADDR;
        }

        uint256 tokenBalanceBefore = tokenAddr.getBalance(address(this));

        // if _amount type(uint).max that means take out proxy whole balance
        if (_amount == type(uint256).max) {
            _amount = _cTokenAddr.getBalance(address(this));
            require(ICToken(_cTokenAddr).redeem(_amount) == NO_ERROR, ERR_COMP_REDEEM);
        } else {
            require(
                ICToken(_cTokenAddr).redeemUnderlying(_amount) == NO_ERROR,
                ERR_COMP_REDEEM_UNDERLYING
            );
        }

        uint256 tokenBalanceAfter = tokenAddr.getBalance(address(this));

        // used to return the precise amount of tokens returned
        _amount = sub(tokenBalanceAfter, tokenBalanceBefore);

        // always return WETH, never native Eth
        if (tokenAddr == TokenUtils.ETH_ADDR) {
            TokenUtils.depositWeth(_amount);
            tokenAddr = TokenUtils.WETH_ADDR; // switch back to weth
        }

        // If tokens needs to be send to the _to address
        tokenAddr.withdrawTokens(_to, _amount);

        logger.Log(address(this), msg.sender, "CompWithdraw", abi.encode(tokenAddr, _amount, _to));

        return _amount;
    }

    function parseInputs(bytes memory _callData) internal pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
